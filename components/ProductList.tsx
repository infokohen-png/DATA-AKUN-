
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  query, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Product, Shop } from '../types';
import { 
  Plus, Package, Trash2, Edit3, X, Save, Upload,
  Image as ImageIcon, Store, Search, Loader2, Link as LinkIcon
} from 'lucide-react';

interface ProductListProps {
  activeProfileId: string;
}

const ProductList: React.FC<ProductListProps> = ({ activeProfileId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShopId, setFilterShopId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [formData, setFormData] = useState({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const qShops = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const unsubShops = onSnapshot(qShops, (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[]);
    });

    const qProds = query(
      collection(db, 'NAMA PRODUK'), 
      where('profileId', '==', activeProfileId)
    );
    const unsubProds = onSnapshot(qProds, (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      // Client-side sort by name
      const sortedProds = prodData.sort((a, b) => (a.namaProduk || '').localeCompare(b.namaProduk || ''));
      setProducts(sortedProds);
      setLoading(false);
    });

    return () => { unsubShops(); unsubProds(); };
  }, [activeProfileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const selectedShop = shops.find(s => s.id === formData.namaTokoId);
    if (!selectedShop) return;

    setIsSaving(true);
    try {
      let finalImageUrl = previewUrl;
      if (selectedFile) {
        const storageRef = ref(storage, `produk/${user.uid}/${Date.now()}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }
      
      const data = { 
        ...formData, 
        userId: user.uid,
        profileId: activeProfileId,
        namaToko: selectedShop.nama, 
        fotoProduk: finalImageUrl 
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'NAMA PRODUK', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'NAMA PRODUK'), data);
      }
      closeModal();
    } catch (err) { alert("Error saving product."); }
    finally { setIsSaving(false); }
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setEditingProduct(null); 
    setPreviewUrl(''); 
    setSelectedFile(null); 
    setFormData({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.namaProduk || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShop = !filterShopId || p.namaTokoId === filterShopId;
    return matchesSearch && matchesShop;
  });

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Katalog Produk</h2>
          <p className="text-slate-500 text-sm mt-1">Data produk diisolasi per akun.</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setFormData({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
          <Plus className="w-5 h-5" /> Tambah Produk
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari di katalog Anda..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterShopId} onChange={(e) => setFilterShopId(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer">
          <option value="">Semua Toko</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col p-4 relative">
             <div className="absolute top-2 right-2 p-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
               <button onClick={() => { setEditingProduct(product); setFormData({ namaProduk: product.namaProduk, kategori: product.kategori, namaTokoId: product.namaTokoId, linkProduk: product.linkProduk || '', hargaJual: product.hargaJual }); setPreviewUrl(product.fotoProduk || ''); setIsModalOpen(true); }} className="p-2 bg-white shadow-md border border-slate-100 rounded-lg text-indigo-600 hover:bg-indigo-50"><Edit3 className="w-4 h-4" /></button>
               <button onClick={async () => { if(window.confirm('Hapus produk ini?')) await deleteDoc(doc(db, 'NAMA PRODUK', product.id)); }} className="p-2 bg-white shadow-md border border-slate-100 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden mb-4 border border-slate-100">
              {product.fotoProduk ? <img src={product.fotoProduk} className="w-full h-full object-cover" alt={product.namaProduk} /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-8 h-8" /></div>}
            </div>
            <h3 className="font-bold text-slate-900 truncate leading-tight">{product.namaProduk}</h3>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{product.namaToko}</p>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Harga Jual</p>
                  <p className="text-sm font-black text-slate-900">Rp {product.hargaJual?.toLocaleString('id-ID')}</p>
               </div>
               {product.linkProduk && (
                 <a href={product.linkProduk} target="_blank" className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-indigo-600 hover:text-white transition-all"><LinkIcon className="w-4 h-4" /></a>
               )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Package className="w-16 h-16 text-slate-200 mx-auto" />
            <p className="text-slate-400 font-medium">Belum ada produk untuk akun ini.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
             <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h3>
                <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <form onSubmit={handleSave} className="p-8 space-y-5 overflow-y-auto">
                <div className="flex gap-6 items-start">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all overflow-hidden relative group flex-shrink-0"
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="text-white w-6 h-6" />
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">Foto</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      hidden 
                      ref={fileInputRef} 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nama Produk" value={formData.namaProduk} onChange={(e) => setFormData({...formData, namaProduk: e.target.value})} />
                    <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.namaTokoId} onChange={(e) => setFormData({...formData, namaTokoId: e.target.value})}>
                      <option value="">Pilih Toko Milik Anda...</option>
                      {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Kategori" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} />
                  <input type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Harga Jual" value={formData.hargaJual || ''} onChange={(e) => setFormData({...formData, hargaJual: Number(e.target.value)})} />
                </div>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Link Produk (Opsional)" value={formData.linkProduk} onChange={(e) => setFormData({...formData, linkProduk: e.target.value})} />
                
                <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold mt-4 shadow-lg shadow-indigo-100 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Produk'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
