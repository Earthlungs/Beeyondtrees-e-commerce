"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit, Leaf, X, Upload, AlertTriangle, Package } from "lucide-react"
import Link from "next/link"
import { useProductStore, Product } from "@/store/product-store"

export default function AdminDashboard() {
  const { products, addProduct, updateProduct, deleteProduct, loadProducts } = useProductStore()

  useEffect(() => {
    loadProducts()
  }, [])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: "", description: "", category: "Furniture",
    retailPrice: "", wholesalePrice: "", distributorPrice: "",
    stock: "", isOnOffer: false, offerPrice: "",
  })

  useEffect(() => { loadProducts() }, [])

  const resetForm = () => {
    setForm({ name: "", description: "", category: "Furniture", retailPrice: "", wholesalePrice: "", distributorPrice: "", stock: "", isOnOffer: false, offerPrice: "" })
    setImageUrls([])
    setNewImageUrl("")
    setEditingId(null)
    setShowForm(false)
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const base64 = await convertToBase64(files[i])
        setImageUrls(prev => [...prev, base64])
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setImageUrls([...imageUrls, newImageUrl.trim()])
      setNewImageUrl("")
    }
  }

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    const productData: Product = {
      id: editingId || Date.now().toString(),
      name: form.name, description: form.description, category: form.category,
      retailPrice: Number(form.retailPrice), wholesalePrice: Number(form.wholesalePrice),
      distributorPrice: Number(form.distributorPrice), stock: Number(form.stock),
      images: imageUrls, isOnOffer: form.isOnOffer,
      offerPrice: form.isOnOffer ? Number(form.offerPrice) : null,
    }
    if (editingId) { updateProduct(productData) }
    else { addProduct(productData) }
    resetForm()
  }

  const handleEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name, description: product.description, category: product.category,
      retailPrice: product.retailPrice.toString(), wholesalePrice: product.wholesalePrice.toString(),
      distributorPrice: product.distributorPrice.toString(), stock: product.stock.toString(),
      isOnOffer: product.isOnOffer, offerPrice: product.offerPrice?.toString() || "",
    })
    setImageUrls(product.images)
    setShowForm(true)
  }

  const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0)
  const outOfStock = products.filter(p => p.stock === 0)
  const totalStockValue = products.reduce((s, p) => s + p.retailPrice * p.stock, 0)

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100vh' }}>
      <header style={{ backgroundColor: '#6B7D5C', color: 'white', padding: '12px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Leaf style={{ width: '24px', height: '24px' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Beeyond Trees Admin</h1>
          </div>
          <Link href="/products" style={{ color: '#E6D3A3', textDecoration: 'none', fontSize: '14px' }}>View Store</Link>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Alerts */}
        {outOfStock.length > 0 && (
          <Card style={{ borderColor: '#8C6A4A', backgroundColor: '#FFF5F5', marginBottom: '12px' }}>
            <CardContent style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle style={{ color: '#8C6A4A', width: '20px', height: '20px' }} />
              <div><strong style={{ color: '#8C6A4A' }}>Out of Stock:</strong> <span>{outOfStock.map(p => p.name).join(', ')}</span></div>
            </CardContent>
          </Card>
        )}
        {lowStockProducts.length > 0 && (
          <Card style={{ borderColor: '#E6D3A3', backgroundColor: '#FFFBF0', marginBottom: '12px' }}>
            <CardContent style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle style={{ color: '#E6A817', width: '20px', height: '20px' }} />
              <div><strong style={{ color: '#8C6A4A' }}>Low Stock:</strong> <span>{lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}</span></div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <Card><CardHeader style={{ paddingBottom: '4px' }}><CardTitle style={{ fontSize: '13px', color: '#A89F91' }}>Products</CardTitle></CardHeader><CardContent><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4A3F2F' }}>{products.length}</div></CardContent></Card>
          <Card><CardHeader style={{ paddingBottom: '4px' }}><CardTitle style={{ fontSize: '13px', color: '#A89F91' }}>Stock Value</CardTitle></CardHeader><CardContent><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4A3F2F' }}>KSh {totalStockValue.toLocaleString()}</div></CardContent></Card>
          <Card><CardHeader style={{ paddingBottom: '4px' }}><CardTitle style={{ fontSize: '13px', color: '#A89F91' }}>Low Stock</CardTitle></CardHeader><CardContent><div style={{ fontSize: '28px', fontWeight: 'bold', color: lowStockProducts.length > 0 ? '#8C6A4A' : '#6B7D5C' }}>{lowStockProducts.length}</div></CardContent></Card>
          <Card><CardHeader style={{ paddingBottom: '4px' }}><CardTitle style={{ fontSize: '13px', color: '#A89F91' }}>Out of Stock</CardTitle></CardHeader><CardContent><div style={{ fontSize: '28px', fontWeight: 'bold', color: outOfStock.length > 0 ? '#8C6A4A' : '#6B7D5C' }}>{outOfStock.length}</div></CardContent></Card>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#4A3F2F', margin: 0 }}>Products</h2>
          <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} style={{ marginRight: '8px' }} /> Add Product
          </Button>
        </div>

        {showForm && (
          <Card style={{ marginBottom: '24px', borderColor: '#6B7D5C', borderWidth: '2px' }}>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <CardTitle style={{ color: '#4A3F2F' }}>{editingId ? 'Edit Product' : 'Add New Product'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetForm}><X size={16} /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><label style={{ display: 'block', marginBottom: '4px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Product Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Category *</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #A89F91', padding: '0 12px', fontSize: '14px', backgroundColor: 'white' }}>
                    <option value="Furniture">Furniture</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Pottery">Pottery</option>
                    <option value="Ornamental & Curios">Ornamental & Curios</option>
                  </select>
                </div>
                <div><label style={{ display: 'block', marginBottom: '4px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Retail Price (KSh) *</label><Input type="number" value={form.retailPrice} onChange={e => setForm({...form, retailPrice: e.target.value})} /></div>
                <div><label style={{ display: 'block', marginBottom: '4px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Wholesale Price (KSh) *</label><Input type="number" value={form.wholesalePrice} onChange={e => setForm({...form, wholesalePrice: e.target.value})} /></div>
                <div><label style={{ display: 'block', marginBottom: '4px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Distributor Price (KSh) *</label><Input type="number" value={form.distributorPrice} onChange={e => setForm({...form, distributorPrice: e.target.value})} /></div>
                <div><label style={{ display: 'block', marginBottom: '4px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Stock *</label><Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={form.isOnOffer} onChange={e => setForm({...form, isOnOffer: e.target.checked})} /> On Offer</label>
                  {form.isOnOffer && <Input type="number" value={form.offerPrice} onChange={e => setForm({...form, offerPrice: e.target.value})} placeholder="Offer price" style={{ width: '200px' }} />}
                </div>
                <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', marginBottom: '4px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Description *</label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#4A3F2F', fontWeight: '500', fontSize: '14px' }}>Images</label>
                  <div style={{ marginBottom: '12px' }}>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="image-upload" />
                    <label htmlFor="image-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#E6D3A3', color: '#4A3F2F', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}><Upload size={16} /> Upload Images</label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <Input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Or paste image URL" style={{ flex: 1 }} />
                    <Button variant="outline" onClick={addImageUrl} style={{ borderColor: '#6B7D5C', color: '#6B7D5C' }}>Add URL</Button>
                  </div>
                  {imageUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {imageUrls.map((url, index) => (
                        <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #A89F91' }}>
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <button onClick={() => removeImageUrl(index)} style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: '#8C6A4A', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '10px' }}><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button onClick={handleSave} style={{ backgroundColor: '#6B7D5C', color: 'white' }} disabled={!form.name || !form.retailPrice || !form.stock}>{editingId ? 'Update' : 'Save'}</Button>
                <Button variant="outline" onClick={resetForm} style={{ borderColor: '#A89F91', color: '#A89F91' }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {products.length > 0 ? (
          <Card><CardContent style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '2px solid #A89F91', backgroundColor: '#F5F1E8' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Product</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Category</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Retail</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Wholesale</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Dist.</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Stock</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Offer</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>Actions</th>
              </tr></thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #A89F91' }}>
                    <td style={{ padding: '10px 14px' }}><div style={{ fontWeight: '500', color: '#4A3F2F' }}>{product.name}</div></td>
                    <td style={{ padding: '10px 14px' }}><Badge style={{ backgroundColor: '#E6D3A3', color: '#4A3F2F', border: 'none', fontSize: '11px' }}>{product.category}</Badge></td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '500', color: '#4A3F2F' }}>KSh {product.retailPrice}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#A89F91' }}>KSh {product.wholesalePrice}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#A89F91' }}>KSh {product.distributorPrice}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 'bold', color: product.stock === 0 ? '#8C6A4A' : product.stock <= 5 ? '#E6A817' : '#6B7D5C' }}>{product.stock}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{product.isOnOffer ? <Badge style={{ backgroundColor: '#8C6A4A', color: 'white', border: 'none' }}>KSh {product.offerPrice}</Badge> : <span style={{ color: '#A89F91' }}>-</span>}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(product)} style={{ borderColor: '#6B7D5C', color: '#6B7D5C', marginRight: '6px' }}><Edit size={13} /></Button>
                      <Button size="sm" variant="outline" onClick={() => deleteProduct(product.id)} style={{ borderColor: '#8C6A4A', color: '#8C6A4A' }}><Trash2 size={13} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        ) : (
          <Card><CardContent style={{ padding: '48px', textAlign: 'center' }}>
            <Package size={48} style={{ color: '#A89F91', marginBottom: '16px' }} />
            <h3 style={{ color: '#4A3F2F', marginBottom: '8px' }}>No Products Yet</h3>
            <p style={{ color: '#A89F91', marginBottom: '16px' }}>Click Add Product to create your first listing.</p>
            <Button style={{ backgroundColor: '#6B7D5C', color: 'white' }} onClick={() => setShowForm(true)}><Plus size={16} style={{ marginRight: '8px' }} /> Add Product</Button>
          </CardContent></Card>
        )}
      </div>
    </div>
  )
}
