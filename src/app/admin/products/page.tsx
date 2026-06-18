"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Edit, X, Upload, AlertTriangle, CheckCircle2, Package, Image, Search } from "lucide-react"
import { useProductStore, Product, fuzzyMatch } from "@/store/product-store"
import { uploadToCloudinary, cloudinaryConfigured } from "@/lib/cloudinary"

export default function AdminProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, loadProducts } = useProductStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [stockBase, setStockBase] = useState<number | null>(null) // current stock when editing (add-only)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const handleSearch = (v: string) => { setProductSearch(v); setPage(1) }
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-dismiss the custom toast after a few seconds.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(t)
  }, [notice])

  const [form, setForm] = useState({
    name: "", description: "", category: "Furniture",
    retailPrice: "", wholesalePrice: "", distributorPrice: "", costPrice: "",
    stock: "", isOnOffer: false, offerPrice: "", offerWholesalePrice: "", offerDistributorPrice: "",
  })

  useEffect(() => { loadProducts() }, [])

  const resetForm = () => {
    setForm({ name: "", description: "", category: "Furniture", retailPrice: "", wholesalePrice: "", distributorPrice: "", costPrice: "", stock: "", isOnOffer: false, offerPrice: "", offerWholesalePrice: "", offerDistributorPrice: "" })
    setImageUrls([]); setNewImageUrl(""); setEditingId(null); setStockBase(null); setShowForm(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length) {
      setUploading(true)
      try {
        for (let i = 0; i < files.length; i++) {
          const url = await uploadToCloudinary(files[i])
          setImageUrls(prev => [...prev, url])
        }
      } catch (err) {
        setNotice({ text: err instanceof Error ? err.message : "Image upload failed", tone: "error" })
      } finally {
        setUploading(false)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const addImageUrl = () => {
    if (newImageUrl.trim()) { setImageUrls([...imageUrls, newImageUrl.trim()]); setNewImageUrl("") }
  }

  const removeImageUrl = (index: number) => { setImageUrls(imageUrls.filter((_, i) => i !== index)) }

  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const handleSave = async () => {
    const productData: Product = {
      id: editingId || Date.now().toString(),
      name: form.name, description: form.description, category: form.category,
      retailPrice: Number(form.retailPrice), wholesalePrice: Number(form.wholesalePrice),
      distributorPrice: Number(form.distributorPrice), costPrice: Number(form.costPrice) || 0,
      // Edit adds to current stock; create sets the initial stock.
      stock: stockBase != null ? stockBase + (Number(form.stock) || 0) : Number(form.stock),
      images: imageUrls, isOnOffer: form.isOnOffer,
      offerPrice: form.isOnOffer ? (Number(form.offerPrice) || null) : null,
      offerWholesalePrice: form.isOnOffer ? (Number(form.offerWholesalePrice) || null) : null,
      offerDistributorPrice: form.isOnOffer ? (Number(form.offerDistributorPrice) || null) : null,
    }
    const wasEditing = Boolean(editingId)
    setSaving(true)
    try {
      if (wasEditing) { await updateProduct(productData) } else { await addProduct(productData) }
      resetForm()
      setNotice({ text: wasEditing ? "Product updated" : "Product added", tone: "success" })
    } catch {
      setNotice({ text: "Couldn't save the product. Please try again.", tone: "error" })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (product: Product) => {
    setEditingId(product.id)
    setStockBase(product.stock) // edit = add to current stock, never reduce
    setForm({
      name: product.name, description: product.description, category: product.category,
      retailPrice: product.retailPrice.toString(), wholesalePrice: product.wholesalePrice.toString(),
      distributorPrice: product.distributorPrice.toString(), costPrice: (product.costPrice ?? 0).toString(),
      stock: "", // "add stock" amount, blank = add nothing
      isOnOffer: product.isOnOffer, offerPrice: product.offerPrice?.toString() || "",
      offerWholesalePrice: product.offerWholesalePrice?.toString() || "", offerDistributorPrice: product.offerDistributorPrice?.toString() || "",
    })
    setImageUrls(product.images ?? [])
    setShowForm(true)
    // The catalog list omits images + costPrice; fetch the full record so saving
    // an edit doesn't wipe images and the cost price shows for editing.
    try {
      const res = await fetch(`/api/products/${product.id}`)
      const full = await res.json()
      if (Array.isArray(full.images)) setImageUrls(full.images)
      if (full.costPrice != null) setForm((prev) => ({ ...prev, costPrice: String(full.costPrice) }))
    } catch {
      /* keep whatever we have */
    }
  }

  const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0)
  const outOfStock = products.filter(p => p.stock === 0)
  const totalStockValue = products.reduce((s, p) => s + (Number(p.retailPrice) || 0) * (Number(p.stock) || 0), 0)
  // De-dupe by id (guards the React key warning from any stray duplicate/blank
  // id) and apply the admin product search.
  const filteredProducts = Array.from(new Map(products.filter(p => p.id).map(p => [p.id, p])).values())
    .filter(p => fuzzyMatch(productSearch, `${p.name} ${p.category}`))
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div>
      {/* Custom toast (replaces browser alert) */}
      {notice && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, maxWidth: '360px', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', backgroundColor: notice.tone === 'success' ? 'var(--admin-success-bg)' : 'var(--admin-error-bg)', border: `1px solid ${notice.tone === 'success' ? '#6B7D5C' : 'var(--admin-error-fg)'}`, borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
          {notice.tone === 'success'
            ? <CheckCircle2 size={18} style={{ color: '#6B7D5C', flexShrink: 0, marginTop: '1px' }} />
            : <AlertTriangle size={18} style={{ color: 'var(--admin-error-fg)', flexShrink: 0, marginTop: '1px' }} />}
          <span style={{ fontSize: '13px', color: "var(--admin-text)", lineHeight: 1.4 }}>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: notice.tone === 'success' ? '#6B7D5C' : 'var(--admin-error-fg)', flexShrink: 0, padding: 0, lineHeight: 0 }}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: "var(--admin-text)" }}>Products</h1>
          <p style={{ color: "var(--admin-muted)", fontSize: '13px' }}>Manage your product inventory</p>
        </div>
        <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }} onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Product
        </Button>
      </div>

      {/* Alerts */}
      {outOfStock.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', marginBottom: '12px', borderRadius: '10px', background: 'var(--admin-error-bg)', border: '1px solid var(--admin-error-border)', borderLeft: '4px solid var(--admin-error-fg)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--admin-error-fg)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--admin-text)' }}><strong>Out of Stock:</strong> {outOfStock.map(p => p.name).join(', ')}</span>
        </div>
      )}
      {lowStockProducts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', marginBottom: '12px', borderRadius: '10px', background: 'var(--admin-warn-bg)', border: '1px solid var(--admin-warn-border)', borderLeft: '4px solid var(--admin-warn-fg)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--admin-warn-fg)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--admin-text)' }}><strong>Low Stock:</strong> {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}</span>
        </div>
      )}

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: "var(--admin-muted)" }}>Total</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: "var(--admin-text)" }}>{products.length}</div></CardContent></Card>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: "var(--admin-muted)" }}>Stock Value</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: "var(--admin-text)" }}>KSh {totalStockValue.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: "var(--admin-muted)" }}>Low Stock</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: lowStockProducts.length > 0 ? '#8C6A4A' : '#6B7D5C' }}>{lowStockProducts.length}</div></CardContent></Card>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: "var(--admin-muted)" }}>Out of Stock</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: outOfStock.length > 0 ? '#8C6A4A' : '#6B7D5C' }}>{outOfStock.length}</div></CardContent></Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card style={{ marginBottom: '20px', borderColor: '#6B7D5C', borderWidth: '2px' }}>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: '16px', color: "var(--admin-text)" }}>{editingId ? 'Edit Product' : 'Add New Product'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}><X size={16} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>Category *</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #A89F91', padding: '0 12px', fontSize: '14px', backgroundColor: "var(--admin-card)" }}>
                  <option value="Furniture">Furniture</option>
                  <option value="Home & Living">Home & Living</option>
                  <option value="Pottery">Pottery</option>
                  <option value="Ornamental & Curios">Ornamental & Curios</option>
                </select>
              </div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>Retail Price (KSh) *</label><Input type="number" value={form.retailPrice} onChange={e => setForm({...form, retailPrice: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>Wholesale Price (KSh) *</label><Input type="number" value={form.wholesalePrice} onChange={e => setForm({...form, wholesalePrice: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>Distributor Price (KSh) *</label><Input type="number" value={form.distributorPrice} onChange={e => setForm({...form, distributorPrice: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>Cost Price (KSh) <span style={{ color: "var(--admin-muted)", fontWeight: 400 }}>— for profit</span></label><Input type="number" value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})} placeholder="What it costs you" /></div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>
                  {editingId ? `Add Stock (current: ${stockBase ?? 0})` : 'Stock *'}
                </label>
                <Input type="number" min={0} value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder={editingId ? 'Qty to add' : ''} />
                {editingId && <p style={{ fontSize: '11px', color: "var(--admin-muted)", marginTop: '4px' }}>Stock can only be added. It goes down only through sales.</p>}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: "var(--admin-text)" }}>
                  <input type="checkbox" checked={form.isOnOffer}
                    onChange={e => setForm({ ...form, isOnOffer: e.target.checked, ...(e.target.checked ? {} : { offerPrice: "", offerWholesalePrice: "", offerDistributorPrice: "" }) })} />
                  On Offer
                </label>
                {form.isOnOffer && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '8px' }}>
                    <div><label style={{ fontSize: '11px', color: "var(--admin-muted)", display: 'block', marginBottom: '4px' }}>Offer Retail (was {form.retailPrice || '—'})</label><Input type="number" min={0} value={form.offerPrice} onChange={e => setForm({ ...form, offerPrice: e.target.value })} placeholder="Retail offer" /></div>
                    <div><label style={{ fontSize: '11px', color: "var(--admin-muted)", display: 'block', marginBottom: '4px' }}>Offer Wholesale (was {form.wholesalePrice || '—'})</label><Input type="number" min={0} value={form.offerWholesalePrice} onChange={e => setForm({ ...form, offerWholesalePrice: e.target.value })} placeholder="Wholesale offer" /></div>
                    <div><label style={{ fontSize: '11px', color: "var(--admin-muted)", display: 'block', marginBottom: '4px' }}>Offer Distributor (was {form.distributorPrice || '—'})</label><Input type="number" min={0} value={form.offerDistributorPrice} onChange={e => setForm({ ...form, offerDistributorPrice: e.target.value })} placeholder="Distributor offer" /></div>
                  </div>
                )}
              </div>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '4px', display: 'block' }}>Description *</label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: "var(--admin-text)", marginBottom: '6px', display: 'block' }}>Images</label>
                <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="product-images" />
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <label htmlFor="product-images" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: uploading ? '#C9BE9A' : '#E6D3A3', color: '#4A3F2F', borderRadius: '6px', cursor: uploading ? 'wait' : 'pointer', fontSize: '13px', fontWeight: '500', pointerEvents: uploading ? 'none' : 'auto' }}><Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}</label>
                  <Input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Image URL" style={{ flex: 1 }} />
                  <Button variant="outline" onClick={addImageUrl} style={{ borderColor: '#6B7D5C', color: '#6B7D5C', fontSize: '13px' }}>Add URL</Button>
                </div>
                {!cloudinaryConfigured && (
                  <p style={{ fontSize: '12px', color: '#8C6A4A', marginBottom: '8px' }}>Image uploads need Cloudinary configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / _UPLOAD_PRESET). You can still paste an image URL.</p>
                )}
                {imageUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {imageUrls.map((url, i) => (
                      <div key={i} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #A89F91' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <button onClick={() => removeImageUrl(i)} style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: '#8C6A4A', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '10px' }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <Button onClick={handleSave} style={{ backgroundColor: '#6B7D5C', color: 'white' }} disabled={!form.name || !form.retailPrice || (!editingId && !form.stock) || uploading || saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Save'}</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {products.length > 0 && (
        <div style={{ position: 'relative', marginBottom: '14px', maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: "var(--admin-muted)" }} />
          <input value={productSearch} onChange={e => handleSearch(e.target.value)} placeholder="Search products by name or category…"
            style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card)', padding: '0 36px', fontSize: '14px', color: "var(--admin-text)", outline: 'none' }} />
          {productSearch && (
            <button onClick={() => handleSearch("")} aria-label="Clear" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: "var(--admin-muted)", display: 'flex' }}><X size={15} /></button>
          )}
        </div>
      )}

      {/* Products Table */}
      {products.length > 0 ? (
        <Card><CardContent style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #A89F91', backgroundColor: 'var(--admin-bg)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: "var(--admin-text)" }}>Product</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Retail</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Wholesale</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Dist.</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Stock</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Images</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Actions</th>
            </tr></thead>
            <tbody>
              {visibleProducts.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: "var(--admin-muted)", fontSize: '14px' }}>No products match “{productSearch}”.</td></tr>
              )}
              {visibleProducts.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #A89F91' }}>
                  <td style={{ padding: '10px 14px' }}><div style={{ fontWeight: '500', color: "var(--admin-text)", fontSize: '13px' }}>{p.name}</div></td>
                  <td style={{ padding: '10px 14px' }}><span style={{ display: 'inline-block', backgroundColor: '#E6D3A3', color: '#4A3F2F', fontSize: '11px', fontWeight: 600, lineHeight: 1.6, padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{p.category}</span></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '500', color: "var(--admin-text)", fontSize: '13px' }}>KSh {p.retailPrice}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: "var(--admin-muted)", fontSize: '12px' }}>KSh {p.wholesalePrice}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: "var(--admin-muted)", fontSize: '12px' }}>KSh {p.distributorPrice}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 'bold', color: p.stock === 0 ? '#8C6A4A' : p.stock <= 5 ? '#E6A817' : '#6B7D5C' }}>{p.stock}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: "var(--admin-muted)", fontSize: '12px' }}>{p.images?.length || 0}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(p)} style={{ borderColor: '#6B7D5C', color: '#6B7D5C', marginRight: '4px' }}><Edit size={13} /></Button>
                    <Button size="sm" variant="outline" onClick={() => deleteProduct(p.id)} style={{ borderColor: '#8C6A4A', color: '#8C6A4A' }}><Trash2 size={13} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      ) : null}

      {/* Pagination */}
      {filteredProducts.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: safePage === 1 ? 'var(--admin-muted)' : 'var(--admin-text)', cursor: safePage === 1 ? 'default' : 'pointer', fontSize: 13 }}>
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPage(n)}
              style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--admin-border)', background: n === safePage ? '#6B7D5C' : 'var(--admin-card)', color: n === safePage ? 'white' : 'var(--admin-text)', cursor: 'pointer', fontSize: 13, fontWeight: n === safePage ? 700 : 400 }}>
              {n}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: safePage === totalPages ? 'var(--admin-muted)' : 'var(--admin-text)', cursor: safePage === totalPages ? 'default' : 'pointer', fontSize: 13 }}>
            Next →
          </button>
          <span style={{ fontSize: 12, color: 'var(--admin-muted)', marginLeft: 4 }}>{filteredProducts.length} products</span>
        </div>
      )}

      {products.length === 0 && (
        <Card><CardContent style={{ padding: '48px', textAlign: 'center' }}>
          <Package size={48} style={{ color: "var(--admin-muted)", marginBottom: '12px' }} />
          <h3 style={{ color: "var(--admin-text)", marginBottom: '6px' }}>No Products</h3>
          <p style={{ color: "var(--admin-muted)", marginBottom: '16px', fontSize: '14px' }}>Add your first product to get started.</p>
          <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }} onClick={() => setShowForm(true)}><Plus size={16} style={{ marginRight: '6px' }} /> Add Product</Button>
        </CardContent></Card>
      )}
    </div>
  )
}
