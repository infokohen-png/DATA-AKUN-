
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  query, Timestamp, where 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ContentRecord, Shop, Product } from '../types';
import { 
  Plus, Video, Trash2, Edit3, X, Save, 
  Calendar, Store, Package, ExternalLink, Search, Loader2
} from 'lucide-react';

interface ContentListProps {
  activeProfileId: string;
}

const ContentList: React.FC<ContentListProps> = ({ activeProfileId }) => {
  const [contents, setContents] = useState<ContentRecord[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShopId, setFilterShopId] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    tokoId: '', produkId: '', linkKonten: '', tanggal: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const qShops = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const unsubShops = onSnapshot(qShops, (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[]);
    });

    const qProds = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
    const unsubProds = onSnapshot(qProds, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    });

    const qContents = query(
      collection(db, 'KONTEN'), 
      where('profileId', '==', activeProfileId)
    );
    const unsubContents = onSnapshot(qContents, (snapshot) => {
      const contentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContentRecord[];
      // Client-side sort by date descending
      const sortedContents = contentData.sort((a, b) => {
        const timeA = a.tanggal?.toMillis ? a.tanggal.toMillis() : 0;
        const timeB = b.tanggal?.toMillis ? b.tanggal.toMillis() : 0;
        return timeB - timeA;
      });
      setContents(sortedContents);
      setLoading(false);
    });

    return () => { unsubShops(); unsubProds(); unsubContents(); };
  }, [activeProfileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const shop = shops.find(s => s.id === formData.tokoId);
    const product = products.find(p => p.id === formData.produkId);
    if (!shop || !product) { alert("Pilih toko & produk."); return; }

    setIsSaving(true);
    try {
      const payload = { 
        userId: user.uid,
        profileId: activeProfileId,
        tokoId: shop.id, namaToko: shop.nama, 
        produkId: product.id, namaProduk: product.namaProduk, 
        linkKonten: formData.linkKonten.trim(), 
        tanggal: Timestamp.fromDate(new Date(formData.tanggal)) 
      };
      
      if (editingContent) {
        await updateDoc(doc(db, 'KONTEN', editingContent.id), payload);
      } else {
        await addDoc(collection(db, 'KONTEN'), payload);
      }
      closeModal();
    } catch (err) { alert("Gagal menyimpan."); }
    finally { setIsSaving(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingContent(null);
    setFormData({ tokoId: '', produkId: '', linkKonten: '', tanggal: new Date().toISOString().split('T')[0] });
  };

  const filteredContents = contents.filter(c => {
    const cDate = c.tanggal?.toDate ? c.tanggal.toDate() : null;
    const matchesSearch = (c.namaToko || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.namaProduk || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShop = !filterShopId || c.tokoId === filterShopId;
    const matchesProd = !filterProductId || c.produkId === filterProductId;
    const matchesStart = !filterStartDate || (cDate && cDate >= new Date(filterStartDate));
    const matchesEnd = !filterEndDate || (cDate && cDate <= new Date(filterEndDate + 'T23:59:59'));
    return matchesSearch && matchesShop && matchesProd && matchesStart && matchesEnd;
  });

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manajemen Postingan</h2>
          <p className="text-slate-500 text-sm mt-1">Lacak promosi konten khusus akun Anda.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95 transition-all">
          <Plus className="w-5 h-5" /> Buat Postingan Baru
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari konten di akun Anda..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent text-xs outline-none" />
            <span className="text-slate-400">-</span>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent text-xs outline-none" />
          </div>
          <select value={filterShopId} onChange={(e) => {setFilterShopId(e.target.value); setFilterProductId('');}} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer">
            <option value="">Semua Toko</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <select value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)} disabled={!filterShopId} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer disabled:opacity-50">
            <option value="">Semua Produk</option>
            {products.filter(p => p.namaTokoId === filterShopId).map(p => <option key={p.id} value={p.id}>{p.namaProduk}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContents.length > 0 ? filteredContents.map((record) => (
          <div key={record.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden p-6 space-y-4 relative">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingContent(record); setFormData({ tokoId: record.tokoId, produkId: record.produkId, linkKonten: record.linkKonten, tanggal: record.tanggal?.toDate ? record.tanggal.toDate().toISOString().split('T')[0] : '' }); setIsModalOpen(true); }} className="p-2 bg-white shadow-sm border border-slate-100 rounded-lg text-indigo-600"><Edit3 className="w-4 h-4" /></button>
              <button onClick={async () => { if(window.confirm('Hapus konten ini?')) await deleteDoc(doc(db, 'KONTEN', record.id)); }} className="p-2 bg-white shadow-sm border border-slate-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-xl inline-flex w-fit">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{record.tanggal?.toDate ? record.tanggal.toDate().toLocaleDateString('id-ID') : '-'}</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0">
                {products.find(p => p.id === record.produkId)?.fotoProduk ? <img src={products.find(p => p.id === record.produkId)?.fotoProduk} className="w-full h-full object-cover" /> : <Package className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 truncate leading-tight">{record.namaProduk}</h4>
                <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1 uppercase tracking-tighter"><Store className="w-3 h-3 text-indigo-400" />{record.namaToko}</p>
              </div>
            </div>
            <a href={record.linkKonten} target="_blank" className="flex items-center justify-center gap-2 w-full py-3 bg-slate-50 text-indigo-600 text-xs font-black rounded-xl hover:bg-indigo-600 hover:text-white border border-indigo-100 transition-all">
              <ExternalLink className="w-4 h-4" /> Buka Konten Promosi
            </a>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <Video className="w-16 h-16 text-slate-200 mx-auto" />
             <p className="text-slate-400 font-medium mt-2">Belum ada konten promosi di akun ini.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Catat Konten Baru</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.tokoId} onChange={(e) => setFormData({ ...formData, tokoId: e.target.value, produkId: '' })}><option value="">Pilih Toko Milik Anda...</option>{shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}</select>
              <select required disabled={!formData.tokoId} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none disabled:opacity-50" value={formData.produkId} onChange={(e) => setFormData({ ...formData, produkId: e.target.value })}><option value="">Pilih Produk...</option>{products.filter(p => p.namaTokoId === formData.tokoId).map(p => <option key={p.id} value={p.id}>{p.namaProduk}</option>)}</select>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Link Konten (Tiktok/IG/Lainnya)" value={formData.linkKonten} onChange={(e) => setFormData({ ...formData, linkKonten: e.target.value })} />
              <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} />
              <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-indigo-100">{isSaving ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Simpan Data Konten'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentList;
