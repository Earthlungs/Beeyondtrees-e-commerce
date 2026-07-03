"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Camera, Loader2, Trash2, FileText } from "lucide-react"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { isPdfUrl } from "@/lib/attachments"

const TEXT = "var(--admin-text)"
const RED = "#C0392B"
const field: React.CSSProperties = { width: "100%", height: 40, borderRadius: 8, border: "1px solid var(--admin-border)", padding: "0 10px", color: TEXT }
const isHttp = (s: unknown) => typeof s === "string" && /^https?:\/\//.test(s)

// Upload a PDF to our own store (Cloudinary blocks PDF delivery on this plan).
// Returns the /api/attachments/<id>.pdf URL to keep alongside image URLs.
async function uploadPdf(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/attachments", { method: "POST", body: formData })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || "PDF upload failed")
  return data.url as string
}

// Cloudinary image uploader with an Upload button (gallery, multi) AND a Take
// Photo button (opens the rear camera on phones via capture="environment").
// `single` mode keeps just one image (profile pictures). Stores secure URLs.
// `allowPdf` also accepts PDF files (stored via /api/attachments, shown as a
// document tile instead of a thumbnail).
export default function ImageUploader({
  value, onChange, single = false, allowPdf = false,
}: {
  value: string[]
  onChange: (v: string[]) => void
  single?: boolean
  allowPdf?: boolean
}) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState("")
  const [urlText, setUrlText] = useState("")

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true); setErr("")
    try {
      const urls = single ? [] : [...value]
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name)
        urls.push(isPdf ? await uploadPdf(f) : await uploadToCloudinary(f))
      }
      onChange(single ? urls.slice(-1) : urls)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Upload failed")
    } finally {
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ""
      if (cameraRef.current) cameraRef.current.value = ""
    }
  }

  const addUrl = () => {
    if (!isHttp(urlText)) return
    onChange(single ? [urlText.trim()] : [...value, urlText.trim()])
    setUrlText("")
  }

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {value.map((u, i) => (
            <div key={i} style={{ position: "relative" }}>
              {isPdfUrl(u) ? (
                <a href={u} target="_blank" rel="noopener noreferrer"
                  style={{ width: single ? 88 : 64, height: single ? 88 : 64, borderRadius: 8, border: "1px solid var(--admin-border)", background: "#FEF2F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textDecoration: "none" }}>
                  <FileText size={22} color={RED} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: RED }}>PDF</span>
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u} alt="" style={{ width: single ? 88 : 64, height: single ? 88 : 64, objectFit: "cover", borderRadius: single ? "50%" : 8, border: "1px solid var(--admin-border)" }} />
              )}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: -6, right: -6, background: RED, color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={uploadRef} type="file" accept={allowPdf ? "image/*,application/pdf" : "image/*"} multiple={!single} onChange={onPick} style={{ display: "none" }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Button type="button" onClick={() => uploadRef.current?.click()} disabled={uploading}
          style={{ background: "#E6D3A3", color: "#4A3F2F", height: 40, gap: 8, padding: "0 18px", width: "auto", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Upload
        </Button>
        <Button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}
          style={{ background: "#6B7D5C", color: "white", height: 40, gap: 8, padding: "0 18px", width: "auto", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}>
          <Camera size={15} /> Take Photo
        </Button>
        <Input style={{ ...field, flex: 1, minWidth: 150 }} placeholder="or paste image URL + Enter" value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl() } }} />
      </div>
      {err && <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>{err}</div>}
    </div>
  )
}
