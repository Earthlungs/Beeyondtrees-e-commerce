"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit, X, Upload, AlertTriangle, Package, Image } from "lucide-react"
import { useProductStore, Product } from "@/store/product-store"
import { uploadToCloudinary, cloudinaryConfigured } from "@/lib/cloudinary"

export default function AdminProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, loadProducts } = useProductStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-dismiss the custom toast after a few seconds.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(t)
  }, [notice])

  const [form, setForm] = useState({
    name: "", description: "", category: "Furniture",
    retailPrice: "", wholesalePrice: "", distributorPrice: "",
    stock: "", isOnOffer: false, offerPrice: "",
  })

  useEffect(() => { loadProducts() }, [])

  const resetForm = () => {
    setForm({ name: "", description: "", category: "Furniture", retailPrice: "", wholesalePrice: "", distributorPrice: "", stock: "", isOnOffer: false, offerPrice: "" })
    setImageUrls([]); setNewImageUrl(""); setEditingId(null); setShowForm(false)
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
        setNotice(err instanceof Error ? err.message : "Image upload failed")
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

  const handleSave = () => {
    const productData: Product = {
      id: editingId || Date.now().toString(),
      name: form.name, description: form.description, category: form.category,
      retailPrice: Number(form.retailPrice), wholesalePrice: Number(form.wholesalePrice),
      distributorPrice: Number(form.distributorPrice), stock: Number(form.stock),
      images: imageUrls, isOnOffer: form.isOnOffer,
      offerPrice: form.isOnOffer ? Number(form.offerPrice) : null,
    }
    if (editingId) { updateProduct(productData) } else { addProduct(productData) }
    resetForm()
  }

  const handleEdit = async (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name, description: product.description, category: product.category,
      retailPrice: product.retailPrice.toString(), wholesalePrice: product.wholesalePrice.toString(),
      distributorPrice: product.distributorPrice.toString(), stock: product.stock.toString(),
      isOnOffer: product.isOnOffer, offerPrice: product.offerPrice?.toString() || "",
    })
    setImageUrls(product.images ?? [])
    setShowForm(true)
    // The catalog list omits images; fetch the full record so saving an edit
    // doesn't wipe existing images.
    try {
      const res = await fetch(`/api/products/${product.id}`)
      const full = await res.json()
      if (Array.isArray(full.images)) setImageUrls(full.images)
    } catch {
      /* keep whatever we have */
    }
  }

  const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0)
  const outOfStock = products.filter(p => p.stock === 0)
  const totalStockValue = products.reduce((s, p) => s + p.retailPrice * p.stock, 0)

  return (
    <div>
      {/* Custom toast (replaces browser alert) */}
      {notice && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, maxWidth: '360px', display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', backgroundColor: '#FFF5F5', border: '1px solid #8C6A4A', borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
          <AlertTriangle size={18} style={{ color: '#8C6A4A', flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '13px', color: '#4A3F2F', lineHeight: 1.4 }}>{notice}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C6A4A', flexShrink: 0, padding: 0, lineHeight: 0 }}><X size={14} /></button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#4A3F2F' }}>Products</h1>
          <p style={{ color: '#A89F91', fontSize: '13px' }}>Manage your product inventory</p>
        </div>
        <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }} onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Product
        </Button>
      </div>

      {/* Alerts */}
      {outOfStock.length > 0 && (
        <Card style={{ borderColor: '#8C6A4A', backgroundColor: '#FFF5F5', marginBottom: '12px' }}>
          <CardContent style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle style={{ color: '#8C6A4A', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#4A3F2F' }}><strong>Out of Stock:</strong> {outOfStock.map(p => p.name).join(', ')}</span>
          </CardContent>
        </Card>
      )}
      {lowStockProducts.length > 0 && (
        <Card style={{ borderColor: '#E6D3A3', backgroundColor: '#FFFBF0', marginBottom: '12px' }}>
          <CardContent style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle style={{ color: '#E6A817', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#4A3F2F' }}><strong>Low Stock:</strong> {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}</span>
          </CardContent>
        </Card>
      )}

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: '#A89F91' }}>Total</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4A3F2F' }}>{products.length}</div></CardContent></Card>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: '#A89F91' }}>Stock Value</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4A3F2F' }}>KSh {totalStockValue.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: '#A89F91' }}>Low Stock</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: lowStockProducts.length > 0 ? '#8C6A4A' : '#6B7D5C' }}>{lowStockProducts.length}</div></CardContent></Card>
        <Card><CardContent style={{ padding: '14px' }}><div style={{ fontSize: '11px', color: '#A89F91' }}>Out of Stock</div><div style={{ fontSize: '22px', fontWeight: 'bold', color: outOfStock.length > 0 ? '#8C6A4A' : '#6B7D5C' }}>{outOfStock.length}</div></CardContent></Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card style={{ marginBottom: '20px', borderColor: '#6B7D5C', borderWidth: '2px' }}>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle style={{ fontSize: '16px', color: '#4A3F2F' }}>{editingId ? 'Edit Product' : 'Add New Product'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}><X size={16} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '4px', display: 'block' }}>Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '4px', display: 'block' }}>Category *</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #A89F91', padding: '0 12px', fontSize: '14px', backgroundColor: 'white' }}>
                  <option value="Furniture">Furniture</option>
                  <option value="Home & Living">Home & Living</option>
                  <option value="Pottery">Pottery</option>
                  <option value="Ornamental & Curios">Ornamental & Curios</option>
                </select>
              </div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '4px', display: 'block' }}>Retail Price (KSh) *</label><Input type="number" value={form.retailPrice} onChange={e => setForm({...form, retailPrice: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '4px', display: 'block' }}>Wholesale Price (KSh) *</label><Input type="number" value={form.wholesalePrice} onChange={e => setForm({...form, wholesalePrice: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '4px', display: 'block' }}>Distributor Price (KSh) *</label><Input type="number" value={form.distributorPrice} onChange={e => setForm({...form, distributorPrice: e.target.value})} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '4px', display: 'block' }}>Stock *</label><Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}><input type="checkbox" checked={form.isOnOffer} onChange={e => setForm({...form, isOnOffer: e.target.checked})} /> On Offer</label>
                {form.isOnOffer && <Input type="number" value={form.offerPrice} onChange={e => setForm({...form, offerPrice: e.target.value})} placeholder="Offer price" style={{ width: '160px' }} />}
              </div>
              <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '4px', display: 'block' }}>Description *</label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#4A3F2F', marginBottom: '6px', display: 'block' }}>Images</label>
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
              <Button onClick={handleSave} style={{ backgroundColor: '#6B7D5C', color: 'white' }} disabled={!form.name || !form.retailPrice || !form.stock || uploading}>{editingId ? 'Update' : 'Save'}</Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      {products.length > 0 ? (
        <Card><CardContent style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #A89F91', backgroundColor: '#F5F1E8' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#4A3F2F' }}>Product</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Retail</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Wholesale</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Dist.</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Stock</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Images</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Actions</th>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #A89F91' }}>
                  <td style={{ padding: '10px 14px' }}><div style={{ fontWeight: '500', color: '#4A3F2F', fontSize: '13px' }}>{p.name}</div></td>
                  <td style={{ padding: '10px 14px' }}><Badge style={{ backgroundColor: '#E6D3A3', color: '#4A3F2F', border: 'none', fontSize: '11px' }}>{p.category}</Badge></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '500', color: '#4A3F2F', fontSize: '13px' }}>KSh {p.retailPrice}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#A89F91', fontSize: '12px' }}>KSh {p.wholesalePrice}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#A89F91', fontSize: '12px' }}>KSh {p.distributorPrice}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 'bold', color: p.stock === 0 ? '#8C6A4A' : p.stock <= 5 ? '#E6A817' : '#6B7D5C' }}>{p.stock}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#A89F91', fontSize: '12px' }}>{p.images?.length || 0}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(p)} style={{ borderColor: '#6B7D5C', color: '#6B7D5C', marginRight: '4px' }}><Edit size={13} /></Button>
                    <Button size="sm" variant="outline" onClick={() => deleteProduct(p.id)} style={{ borderColor: '#8C6A4A', color: '#8C6A4A' }}><Trash2 size={13} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      ) : (
        <Card><CardContent style={{ padding: '48px', textAlign: 'center' }}>
          <Package size={48} style={{ color: '#A89F91', marginBottom: '12px' }} />
          <h3 style={{ color: '#4A3F2F', marginBottom: '6px' }}>No Products</h3>
          <p style={{ color: '#A89F91', marginBottom: '16px', fontSize: '14px' }}>Add your first product to get started.</p>
          <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }} onClick={() => setShowForm(true)}><Plus size={16} style={{ marginRight: '6px' }} /> Add Product</Button>
        </CardContent></Card>
      )}
    </div>
  )
}
