
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  serverTimestamp, query, Timestamp, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Sale, Product, Shop } from '../types';
import { 
  Plus, Trash2, Edit3, X, Save, TrendingUp, Search, Loader2, Calendar
} from 'lucide-react';

interface SalesListProps {
  activeProfileId: string;
}

const SalesList: React.FC<SalesListProps> = ({ activeProfileId }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShopId, setFilterShopId] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    tokoId: '', produkId: '', jumlah: 1, totalOmset: 0, 
    tanggal: new Date().toISOString().split('T')[0]
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

    const qSales = query(
      collection(db, 'PENJUALAN'), 
      where('profileId', '==', activeProfileId)
    );
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      const sortedSales = salesData.sort((a, b) => {
        const timeA = a.tanggal?.toMillis ? a.tanggal.toMillis() : 0;
        const timeB = b.tanggal?.toMillis ? b.tanggal.toMillis() : 0;
        return timeB - timeA;
      });
      setSales(sortedSales);
      setLoading(false);
    });

    return () => { unsubShops(); unsubProds(); unsubSales(); };
  }, [activeProfileId]);

  const formatNumberWithDots = (val: number | string) => {
    if (!val && val !== 0) return '';
    const stringVal = val.toString().replace(/\D/g, '');
    return stringVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseDotsToNumber = (val: string) => parseInt(val.replace(/\./g, ''), 10) || 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const shop = shops.find(s => s.id === formData.tokoId);
    const product = products.find(p => p.id === formData.produkId);
    if (!shop || !product) { alert("Harap pilih toko dan produk."); return; }
    
    setIsSaving(true);
    try {
      const payload = {
        userId: user.uid,
        profileId: activeProfileId,
        tokoId: shop.id, namaToko: shop.nama, 
        produkId: product.id, namaProduk: product.namaProduk, 
        jumlah: formData.jumlah, totalOmset: formData.totalOmset, 
        tanggal: Timestamp.fromDate(new Date(formData.tanggal))
      };
      
      if (editingSale) {
        await updateDoc(doc(db, 'PENJUALAN', editingSale.id), payload);
      } else {
        await addDoc(collection(db, 'PENJUALAN'), { ...payload, createdAt: serverTimestamp() });
      }
      closeModal();
    } catch (err) { alert("Gagal menyimpan data."); }
    finally { setIsSaving(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingSale(null);
    setFormData({ tokoId: '', produkId: '', jumlah: 1, totalOmset: 0, tanggal: new Date().toISOString().split('T')[0] });
  };

  const filteredSales = sales.filter(s => {
    const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
    const matchesSearch = (s.namaProduk || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.namaToko || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShop = !filterShopId || s.tokoId === filterShopId;
    const matchesProd = !filterProductId || s.produkId === filterProductId;
    const matchesStart = !filterStartDate || (sDate && sDate >= new Date(filterStartDate));
    const matchesEnd = !filterEndDate || (sDate && sDate <= new Date(filterEndDate + 'T23:59:59'));
    return matchesSearch && matchesShop && matchesProd && matchesStart && matchesEnd;
  });

  const totalOmsetAll = filteredSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0);

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rekap Penjualan</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Histori transaksi akun Anda.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
          <Plus className="w-5 h-5" /> Input Penjualan
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari di histori Anda..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-6 rounded-3xl border border-transparent shadow-lg shadow-indigo-100 col-span-1 md:col-span-2 flex items-center gap-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md"><TrendingUp className="w-8 h-8 text-white" /></div>
          <div>
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Omset Terfilter</p>
            <p className="text-3xl font-black text-white">Rp {totalOmsetAll.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Toko</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Produk</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Omset</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.length > 0 ? filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4"><span className="font-semibold text-slate-700">{sale.namaToko}</span></td>
                <td className="px-6 py-4 font-bold text-slate-900">{sale.namaProduk}</td>
                <td className="px-6 py-4 text-center"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black">{sale.jumlah} PCS</span></td>
                <td className="px-6 py-4 text-emerald-600 font-black">Rp {sale.totalOmset?.toLocaleString('id-ID')}</td>
                <td className="px-6 py-4 text-slate-500 text-xs font-medium">{sale.tanggal?.toDate ? sale.tanggal.toDate().toLocaleDateString('id-ID') : '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingSale(sale); setFormData({ tokoId: sale.tokoId, produkId: sale.produkId, jumlah: sale.jumlah, totalOmset: sale.totalOmset, tanggal: sale.tanggal?.toDate ? sale.tanggal.toDate().toISOString().split('T')[0] : '' }); setIsModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={async () => { if (window.confirm('Hapus transaksi ini?')) await deleteDoc(doc(db, 'PENJUALAN', sale.id)); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">Tidak ada data untuk filter ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Input Penjualan</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.tokoId} onChange={(e) => setFormData({ ...formData, tokoId: e.target.value, produkId: '' })}><option value="">Pilih Toko...</option>{shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}</select>
              <select required disabled={!formData.tokoId} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none disabled:opacity-50" value={formData.produkId} onChange={(e) => setFormData({ ...formData, produkId: e.target.value })}><option value="">Pilih Produk...</option>{products.filter(p => p.namaTokoId === formData.tokoId).map(p => <option key={p.id} value={p.id}>{p.namaProduk}</option>)}</select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" min="1" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.jumlah} onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) })} placeholder="Qty" />
                <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formatNumberWithDots(formData.totalOmset)} onChange={(e) => setFormData({ ...formData, totalOmset: parseDotsToNumber(e.target.value) })} placeholder="Omset" />
              </div>
              <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} />
              <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-indigo-100">{isSaving ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Simpan Transaksi'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList;
