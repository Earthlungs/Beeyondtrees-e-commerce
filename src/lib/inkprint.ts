// Turns a phone photo of an INKED thumbprint into a clean black-on-white
// impression — the look of a thumb pressed in ink onto paper, which is what
// gets stamped into the contract footer.
//
// This only ever *cleans up* a real print: contrast, threshold, despeckle,
// crop. It never invents ridge detail. A synthetic ridge pattern on a land
// agreement would read as biometric evidence while being fabricated, so the
// ridges in the output are the ridges that were in the photograph, or none.
//
// The pixel maths below is deliberately free of canvas/DOM so it can be tested
// outside a browser; extractInkPrint() is the thin canvas wrapper around it.

export interface InkPrintOptions {
  // Longest edge of the working image. Phone photos are far larger than needed
  // and the pipeline is O(pixels).
  maxSize?: number
  // How much darker than its neighbourhood a pixel must be to count as ink.
  // Higher = stricter = less paper texture mistaken for ridges.
  threshold?: number
}

// Otsu's method: the grey level that best splits the image into two classes,
// plus each class's mean. The GAP between those means is what tells real ink
// apart from paper grain — on blank paper the two classes are both paper, so
// they sit close together however much the contrast is stretched.
function otsuSplit(gray: Float32Array): { threshold: number; darkMean: number; lightMean: number } {
  const hist = new Float64Array(256)
  for (let p = 0; p < gray.length; p++) hist[Math.max(0, Math.min(255, Math.round(gray[p])))]++

  const total = gray.length
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]

  let wB = 0, sumB = 0, best = -1, threshold = 128
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += i * hist[i]
    const mB = sumB / wB
    const mF = (sumAll - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > best) { best = between; threshold = i }
  }

  let dSum = 0, dN = 0, lSum = 0, lN = 0
  for (let i = 0; i < 256; i++) {
    if (i <= threshold) { dSum += i * hist[i]; dN += hist[i] }
    else { lSum += i * hist[i]; lN += hist[i] }
  }
  return {
    threshold,
    darkMean: dN ? dSum / dN : 0,
    lightMean: lN ? lSum / lN : 255,
  }
}

// Threshold each pixel against its LOCAL average (so one shadowed corner does
// not turn the whole print black), gated by an absolute darkness limit derived
// from Otsu (so paper grain is never mistaken for ridges). Returns 1 = ink,
// 0 = paper — all zeros when the photo holds no real print.
// `gray` is modified in place.
export function inkMaskFromGray(
  gray: Float32Array,
  w: number,
  h: number,
  threshold = 8,
  minSeparation = 35
): Uint8Array {
  // 1 ── Is there ink here at all? Measured on the ORIGINAL levels, before any
  // contrast stretch — stretching blank paper to full range would manufacture
  // exactly the contrast this test is looking for.
  const { threshold: otsu, darkMean, lightMean } = otsuSplit(gray)
  if (lightMean - darkMean < minSeparation) return new Uint8Array(w * h)

  let lo = Infinity, hi = -Infinity
  for (let p = 0; p < gray.length; p++) {
    if (gray[p] < lo) lo = gray[p]
    if (gray[p] > hi) hi = gray[p]
  }
  const span = Math.max(1, hi - lo)

  const toStretched = (v: number) => ((v - lo) / span) * 255
  // The absolute ceiling for ink: a pixel must be at least this dark AND darker
  // than its neighbourhood to count.
  const absGate = toStretched(otsu + (lightMean - otsu) * 0.15)
  // …but a pixel sitting deep in the ink class is ink regardless of its
  // neighbours. Without this, the middle of a heavily-inked thumb has no local
  // contrast and the print comes out as a hollow outline.
  const hardInk = toStretched(darkMean + (otsu - darkMean) * 0.5)

  // 2 ── stretch whatever range the photo actually used to full black..white,
  // so a flat, dim picture still separates ink from paper.
  for (let p = 0; p < gray.length; p++) gray[p] = ((gray[p] - lo) / span) * 255

  // 2 ── integral image, so the box average at every pixel is O(1) rather than
  // O(window²).
  const iw = w + 1
  const integral = new Float64Array(iw * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x]
      integral[(y + 1) * iw + (x + 1)] = integral[y * iw + (x + 1)] + rowSum
    }
  }
  const radius = Math.max(6, Math.floor(Math.min(w, h) / 16))
  const boxMean = (cx: number, cy: number): number => {
    const x0 = Math.max(0, cx - radius), y0 = Math.max(0, cy - radius)
    const x1 = Math.min(w - 1, cx + radius), y1 = Math.min(h - 1, cy + radius)
    const sum =
      integral[(y1 + 1) * iw + (x1 + 1)] - integral[y0 * iw + (x1 + 1)] -
      integral[(y1 + 1) * iw + x0] + integral[y0 * iw + x0]
    return sum / ((x1 - x0 + 1) * (y1 - y0 + 1))
  }

  // 4 ── ink is darker than its own neighbourhood AND absolutely dark enough.
  // The local test follows the lighting; the absolute gate rejects grain.
  const ink = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (gray[p] < hardInk || (gray[p] < absGate && gray[p] < boxMean(x, y) - threshold)) ink[p] = 1
    }
  }

  // 5 ── despeckle: sensor noise survives step 4 as lone pixels; real ridge
  // lines always run alongside their neighbours.
  const cleaned = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x
      if (!ink[p]) continue
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx || dy) n += ink[p + dy * w + dx]
        }
      }
      if (n >= 3) cleaned[p] = 1
    }
  }
  return cleaned
}

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

// Tight box around the ink, with a little breathing room. null = no ink at all.
export function cropBounds(mask: Uint8Array, w: number, h: number, padRatio = 0.06): Bounds | null {
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * padRatio) + 2
  return {
    minX: Math.max(0, minX - pad),
    minY: Math.max(0, minY - pad),
    maxX: Math.min(w - 1, maxX + pad),
    maxY: Math.min(h - 1, maxY + pad),
  }
}

export function coverageOf(mask: Uint8Array): number {
  let dark = 0
  for (let p = 0; p < mask.length; p++) dark += mask[p]
  return dark / mask.length
}

// Canvas wrapper: photo in, cropped black-on-white print canvas out.
export function extractInkPrint(
  source: CanvasImageSource & { width: number; height: number },
  { maxSize = 800, threshold = 7 }: InkPrintOptions = {}
): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height))
  const w = Math.max(1, Math.round(source.width * scale))
  const h = Math.max(1, Math.round(source.height * scale))

  const work = document.createElement("canvas")
  work.width = w
  work.height = h
  const wg = work.getContext("2d")!
  wg.drawImage(source, 0, 0, w, h)
  const { data } = wg.getImageData(0, 0, w, h)

  const gray = new Float32Array(w * h)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  const mask = inkMaskFromGray(gray, w, h, threshold)
  const box = cropBounds(mask, w, h)
  if (!box) {
    // Nothing crossed the threshold — a blank page, or no print in frame. Hand
    // back an empty canvas; the caller reports it rather than saving a blank
    // "signature".
    const empty = document.createElement("canvas")
    empty.width = 1
    empty.height = 1
    return empty
  }

  const cw = box.maxX - box.minX + 1
  const ch = box.maxY - box.minY + 1
  const out = document.createElement("canvas")
  out.width = cw
  out.height = ch
  const og = out.getContext("2d")!
  const outImg = og.createImageData(cw, ch)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const v = mask[(y + box.minY) * w + (x + box.minX)] ? 24 : 255 // ink on paper
      const o = (y * cw + x) * 4
      outImg.data[o] = v
      outImg.data[o + 1] = v
      outImg.data[o + 2] = v
      outImg.data[o + 3] = 255
    }
  }
  og.putImageData(outImg, 0, 0)
  return out
}

// Share of the cropped image that is ink, read back off a rendered canvas.
// A usable thumbprint sits roughly in the 2–72% band: below and the photo caught
// almost nothing, above and it is a blob or a shadow rather than ridges.
export function inkCoverage(canvas: HTMLCanvasElement): number {
  if (canvas.width < 2 || canvas.height < 2) return 0
  const g = canvas.getContext("2d")
  if (!g) return 0
  const { data } = g.getImageData(0, 0, canvas.width, canvas.height)
  let dark = 0
  for (let i = 0; i < data.length; i += 4) if (data[i] < 128) dark++
  return dark / (canvas.width * canvas.height)
}
