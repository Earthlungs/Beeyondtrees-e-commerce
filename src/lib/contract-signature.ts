import { createHash } from "crypto"

// Farmer contract signatures.
//
// WHAT THIS IS: the farmer's own thumbprint, captured as an IMAGE — either
// pressed straight onto the phone touchscreen or photographed from an inked
// print. It is the traditional mark used on smallholder agreements, and it is
// what gets stamped into the contract's footer on every download.
//
// WHAT IT IS NOT: a scanned biometric template. No web browser can read a
// fingerprint sensor's raw data, and no minutiae are extracted or matched here.
// The mark is evidentiary — it shows who put their thumb on the agreement, in
// front of which officer, and when — not a biometric identity check.

// One uploaded agreement held against a farmer. The four original fields are
// unchanged; the signature fields are all optional so every contract filed
// before this feature keeps working untouched.
export interface Contract {
  url: string
  filename: string
  uploadedAt: string
  uploadedBy: string
  // Stored thumbprint image (a /api/attachments/<id>.png URL).
  thumbprintUrl?: string
  // Who put their thumb on it, when, and which officer witnessed it.
  signerName?: string
  signedAt?: string
  witnessedBy?: string
  // Short code printed under the mark so a footer can be traced back here.
  seal?: string
}

export function hasSignature(c: Contract): boolean {
  return typeof c.thumbprintUrl === "string" && c.thumbprintUrl.length > 0
}

// Short human-readable code stamped beneath the thumbprint, e.g. "BT-4F2A-91C7".
// Derived from the image URL + signing time so it is stable and reproducible.
export function sealCode(thumbprintUrl: string, signedAt: string): string {
  const h = createHash("sha256").update(`${thumbprintUrl}|${signedAt}`).digest("hex").toUpperCase()
  return `BT-${h.slice(0, 4)}-${h.slice(4, 8)}`
}

export function isPdfContract(c: Contract): boolean {
  return /\.pdf(\?|$)/i.test(c.url)
}
