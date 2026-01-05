
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  serverTimestamp, query, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Shop } from '../types';
import { 
  Plus, Search, MapPin, Trash2, Edit3, X, Save, Store, 
  ExternalLink, Calendar, Loader2, Filter
} from 'lucide-react';

interface ShopListProps {
  activeProfileId: string;
}

const ShopList: React.FC<ShopListProps> = ({ activeProfileId }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nama: '', linkToko: '', asalToko: '', awalPromosi: '' });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    setLoading(true);
    // Remove orderBy to avoid Firebase index error. Sorting is handled client-side.
    const q = query(
      collection(db, 'NAMA TOKO'), 
      where('profileId', '==', activeProfileId)
    );

    return onSnapshot(q, (snapshot) => {
      const shopData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[];
      // Client-side sort: newest first based on createdAt
      const sortedShops = shopData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setShops(sortedShops);
      setLoading(false);
    });
  }, [activeProfileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    setIsSaving(true);
    try {
      if (editingShop) {
        await updateDoc(doc(db, 'NAMA TOKO', editingShop.id), { ...formData });
      } else {
        await addDoc(collection(db, 'NAMA TOKO'), { 
          ...formData, 
          userId: user.uid,
          profileId: activeProfileId,
          createdAt: serverTimestamp() 
        });
      }
      setIsModalOpen(false);
      setFormData({ nama: '', linkToko: '', asalToko: '', awalPromosi: '' });
    } catch (err) { alert('Gagal menyimpan toko'); }
    finally { setIsSaving(false); }
  };

  const filteredShops = shops.filter(shop => {
    const matchesSearch = (shop.nama || '').toLowerCase().includes(searchTerm.toLowerCase());
    const shopDate = shop.awalPromosi ? new Date(shop.awalPromosi) : null;
    const matchesStart = !filterStartDate || (shopDate && shopDate >= new Date(filterStartDate));
    const matchesEnd = !filterEndDate || (shopDate && shopDate <= new Date(filterEndDate));
    return matchesSearch && matchesStart && matchesEnd;
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
          <h2 className="text-2xl font-bold text-slate-900">Katalog Toko</h2>
          <p className="text-slate-500 text-sm mt-1">Daftar toko di akun ini bersifat pribadi.</p>
        </div>
        <button onClick={() => { setEditingShop(null); setFormData({ nama: '', linkToko: '', asalToko: '', awalPromosi: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
          <Plus className="w-5 h-5" /> Daftarkan Toko
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari di akun ini..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
           <Filter className="w-3.5 h-3.5 text-slate-400" />
           <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent outline-none" />
           <span className="text-slate-300">-</span>
           <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.length > 0 ? filteredShops.map((shop) => (
          <div key={shop.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Store className="w-6 h-6" /></div>
                <div>
                   <h3 className="text-lg font-bold text-slate-900 truncate">{shop.nama}</h3>
                   <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {shop.asalToko}</p>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => { setEditingShop(shop); setFormData({ nama: shop.nama, linkToko: shop.linkToko, asalToko: shop.asalToko, awalPromosi: shop.awalPromosi }); setIsModalOpen(true); }} className="flex-1 py-2.5 bg-slate-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all">Edit Data</button>
                <a href={shop.linkToko} target="_blank" className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"><ExternalLink className="w-4 h-4" /></a>
             </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100 italic">Belum ada toko untuk akun ini.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-8 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{editingShop ? 'Ubah Data Toko' : 'Tambah Toko Baru'}</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <form onSubmit={handleSave} className="space-y-4">
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Nama Toko" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} />
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="URL Toko" value={formData.linkToko} onChange={(e) => setFormData({...formData, linkToko: e.target.value})} />
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Kota / Asal Toko" value={formData.asalToko} onChange={(e) => setFormData({...formData, asalToko: e.target.value})} />
                <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.awalPromosi} onChange={(e) => setFormData({...formData, awalPromosi: e.target.value})} />
                <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Toko'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopList;
