
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Sale, ContentRecord, Shop } from '../types';
import { 
  Store, Package, ShoppingCart, Video, TrendingUp, Coins, 
  ChevronDown, ChevronUp, Image as ImageIcon, 
  Filter, X 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

interface DashboardProps {
  activeProfileId: string;
}

interface ProductDetail {
  id: string;
  nama: string;
  foto: string;
  terjual: number;
  omset: number;
  kontenCount: number;
}

interface ShopAnalysis {
  id: string;
  nama: string;
  produkCount: number;
  kontenCount: number;
  salesCount: number;
  totalOmset: number;
  details: ProductDetail[];
}

const Dashboard: React.FC<DashboardProps> = ({ activeProfileId }) => {
  const [globalStats, setGlobalStats] = useState({
    totalToko: 0, totalProduk: 0, totalUnitTerjual: 0, totalOmset: 0, totalKonten: 0
  });
  
  const [shopStats, setShopStats] = useState<ShopAnalysis[]>([]);
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShopId, setExpandedShopId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    setLoading(true);

    // Hapus orderBy dari semua query untuk menghindari index error di Vercel
    const qToko = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const qProduk = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
    const qKonten = query(collection(db, 'KONTEN'), where('profileId', '==', activeProfileId));
    const qSales = query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId));

    const unsubToko = onSnapshot(qToko, (tokoSnap) => {
      const shops = tokoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[];
      setAllShops(shops);
      
      const unsubProduk = onSnapshot(qProduk, (produkSnap) => {
        const products = produkSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        
        const unsubKonten = onSnapshot(qKonten, (kontenSnap) => {
          const contents = kontenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContentRecord[];
          
          const unsubSales = onSnapshot(qSales, (salesSnap) => {
            const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];

            const filteredSales = sales.filter(s => {
              const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
              const matchesShop = !selectedShopId || s.tokoId === selectedShopId;
              const matchesStart = !startDate || (sDate && sDate >= new Date(startDate));
              const matchesEnd = !endDate || (sDate && sDate <= new Date(endDate + 'T23:59:59'));
              return matchesShop && matchesStart && matchesEnd;
            });

            const filteredContents = contents.filter(c => {
              const cDate = c.tanggal?.toDate ? c.tanggal.toDate() : null;
              const matchesShop = !selectedShopId || c.tokoId === selectedShopId;
              const matchesStart = !startDate || (cDate && cDate >= new Date(startDate));
              const matchesEnd = !endDate || (cDate && cDate <= new Date(endDate + 'T23:59:59'));
              return matchesShop && matchesStart && matchesEnd;
            });

            const targetShops = selectedShopId ? shops.filter(s => s.id === selectedShopId) : shops;

            const analysis: ShopAnalysis[] = targetShops.map(shop => {
              const shopProducts = products.filter(p => p.namaTokoId === shop.id);
              const shopContents = filteredContents.filter(c => c.tokoId === shop.id);
              const shopSales = filteredSales.filter(s => s.tokoId === shop.id);

              const productDetails: ProductDetail[] = shopProducts.map(p => {
                const pSales = shopSales.filter(s => s.produkId === p.id);
                const pContents = shopContents.filter(c => c.produkId === p.id);
                return {
                  id: p.id,
                  nama: p.namaProduk,
                  foto: p.fotoProduk || '',
                  terjual: pSales.reduce((acc, curr) => acc + (curr.jumlah || 0), 0),
                  omset: pSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0),
                  kontenCount: pContents.length
                };
              });

              return {
                id: shop.id,
                nama: shop.nama,
                produkCount: shopProducts.length,
                kontenCount: shopContents.length,
                salesCount: shopSales.reduce((acc, curr) => acc + (curr.jumlah || 0), 0),
                totalOmset: shopSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0),
                details: productDetails.sort((a, b) => b.omset - a.omset)
              };
            });

            setGlobalStats({
              totalToko: targetShops.length,
              totalProduk: products.filter(p => !selectedShopId || p.namaTokoId === selectedShopId).length,
              totalUnitTerjual: filteredSales.reduce((acc, curr) => acc + (curr.jumlah || 0), 0),
              totalOmset: filteredSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0),
              totalKonten: filteredContents.length
            });

            setShopStats(analysis.sort((a, b) => b.totalOmset - a.totalOmset));
            setLoading(false);
          });
        });
      });
    });

    return () => {};
  }, [startDate, endDate, selectedShopId, activeProfileId]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedShopId('');
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500 font-medium tracking-tight">Menyiapkan Dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Business Intel</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Data untuk profil yang sedang aktif.</p>
        </div>
        <div className="flex items-center gap-2">
           {(startDate || endDate || selectedShopId) && (
             <button onClick={resetFilters} className="text-xs font-bold text-red-500 flex items-center gap-1 hover:underline mr-2">
               <X className="w-3 h-3" /> Reset Filter
             </button>
           )}
           <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Live Connection</span>
          </div>
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase">Filters:</span>
        </div>
        <div className="flex flex-wrap gap-3 flex-1">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)} className="flex-1 min-w-[150px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Semua Toko</option>
            {allShops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Omset', value: globalStats.totalOmset, icon: Coins, color: 'text-emerald-600', bg: 'bg-emerald-50', prefix: 'Rp ' },
          { label: 'Produk Aktif', value: globalStats.totalProduk, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Konten Akun', value: globalStats.totalKonten, icon: Video, color: 'text-pink-600', bg: 'bg-pink-50' },
          { label: 'Unit Terjual', value: globalStats.totalUnitTerjual, icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-4`}>
              <item.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{item.prefix || ''}{item.value.toLocaleString('id-ID')}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-6 h-6 text-indigo-600" /> Toko di Akun Aktif
            </h3>
          </div>

          <div className="space-y-4">
            {shopStats.map((shop, idx) => {
              const isExpanded = expandedShopId === shop.id;
              return (
                <div key={shop.id} className={`bg-white rounded-3xl border ${isExpanded ? 'border-indigo-200 shadow-lg' : 'border-slate-100 shadow-sm'} overflow-hidden transition-all duration-300`}>
                  <div className="p-6 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-4" onClick={() => setExpandedShopId(isExpanded ? null : shop.id)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{shop.nama}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">{shop.produkCount} Produk • {shop.kontenCount} Konten</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-lg font-black text-emerald-600">Rp {shop.totalOmset.toLocaleString('id-ID')}</p>
                      </div>
                      <div className={`p-2 rounded-full ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-4 sm:p-6 space-y-3 animate-in slide-in-from-top-2">
                      {shop.details.map((product) => (
                        <div key={product.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                            {product.foto ? <img src={product.foto} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-3 text-slate-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-slate-900 truncate">{product.nama}</h5>
                            <p className="text-xs text-slate-500">{product.terjual} terjual • {product.kontenCount} konten</p>
                          </div>
                          <p className="text-sm font-black text-emerald-600">Rp {product.omset.toLocaleString('id-ID')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Distribusi Omset</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shopStats.slice(0, 5)}>
                <XAxis dataKey="nama" hide />
                <Tooltip />
                <Bar dataKey="totalOmset" radius={[8, 8, 8, 8]} barSize={35}>
                  {shopStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
