
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Shop } from '../types';
import { Sparkles, Loader2, RefreshCw, AlertCircle, Calendar, Filter } from 'lucide-react';

interface GeminiInsightsProps {
  activeProfileId: string;
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ activeProfileId }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [filterShopId, setFilterShopId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    if (!activeProfileId) return;
    // Simple query to avoid index errors
    const q = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    return onSnapshot(q, (snapshot) => {
      setAllShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[]);
    });
  }, [activeProfileId]);

  const generateInsights = async () => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch all required data using simple queries to prevent composite index requirement
      const tokoSnap = await getDocs(query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId)));
      const produkSnap = await getDocs(query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId)));
      // FIX: Standardized to 'PENJUALAN' collection
      const penjualanSnap = await getDocs(query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId)));
      const kontenSnap = await getDocs(query(collection(db, 'KONTEN'), where('profileId', '==', activeProfileId)));

      const selectedShop = allShops.find(s => s.id === filterShopId);

      // Perform filtering in memory to avoid complex Firestore queries
      const sales = penjualanSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(s => {
        const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
        const matchesShop = !filterShopId || s.tokoId === filterShopId;
        const matchesStart = !filterStartDate || (sDate && sDate >= new Date(filterStartDate));
        const matchesEnd = !filterEndDate || (sDate && sDate <= new Date(filterEndDate + 'T23:59:59'));
        return matchesShop && matchesStart && matchesEnd;
      });

      const contents = kontenSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(c => {
        const cDate = c.tanggal?.toDate ? c.tanggal.toDate() : null;
        const matchesShop = !filterShopId || c.tokoId === filterShopId;
        const matchesStart = !filterStartDate || (cDate && cDate >= new Date(filterStartDate));
        const matchesEnd = !filterEndDate || (cDate && cDate <= new Date(filterEndDate + 'T23:59:59'));
        return matchesShop && matchesStart && matchesEnd;
      });

      const data = {
        filterContext: selectedShop ? `Analisis khusus Toko: ${selectedShop.nama}` : 'Analisis Seluruh Bisnis',
        periode: filterStartDate && filterEndDate ? `${filterStartDate} sampai ${filterEndDate}` : 'Seluruh Waktu',
        jumlahToko: filterShopId ? 1 : tokoSnap.size,
        totalUnitTerjual: sales.reduce((acc, d) => acc + (d.jumlah || 0), 0),
        totalOmset: sales.reduce((acc, d) => acc + (d.totalOmset || 0), 0),
        jumlahPostingan: contents.length,
      };

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analisis data bisnis (${data.filterContext}) untuk periode (${data.periode}):
          - Total Unit Terjual: ${data.totalUnitTerjual} unit
          - Total Omset: Rp ${data.totalOmset.toLocaleString('id-ID')}
          - Jumlah Postingan Konten: ${data.jumlahPostingan}
          
          Berikan laporan strategis UMKM dalam Bahasa Indonesia:
          1. Evaluasi performa berdasarkan data yang tersedia.
          2. Analisis efektivitas konten terhadap peningkatan omset.
          3. Berikan 3 rekomendasi praktis untuk pertumbuhan bisnis kedepannya.`,
        config: { 
          systemInstruction: "Anda adalah analis bisnis UMKM profesional yang memberikan saran strategis berdasarkan data penjualan dan konten.",
          temperature: 0.7
        }
      });

      setInsight(response.text || "AI tidak memberikan respon. Periksa konfigurasi API.");
    } catch (err: any) {
      console.error("Gemini Error:", err);
      setError("Gagal menghasilkan insight. Pastikan API_KEY sudah disetel di environment variables Vercel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" /> AI Business Strategist
        </h2>
        <p className="text-slate-500">Gunakan kecerdasan buatan untuk menganalisis performa toko dan konten Anda.</p>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
          <Filter className="w-4 h-4" /> Filter Analisis:
        </div>
        <select 
          value={filterShopId} 
          onChange={(e) => setFilterShopId(e.target.value)} 
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
        >
          <option value="">Semua Toko</option>
          {allShops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input 
            type="date" 
            value={filterStartDate} 
            onChange={(e) => setFilterStartDate(e.target.value)} 
            className="bg-transparent outline-none" 
          />
          <span className="text-slate-400">-</span>
          <input 
            type="date" 
            value={filterEndDate} 
            onChange={(e) => setFilterEndDate(e.target.value)} 
            className="bg-transparent outline-none" 
          />
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
        {!insight && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <Sparkles className="w-12 h-12 text-indigo-200" />
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-slate-900">Siap Menganalisis</h3>
              <p className="text-slate-500 mt-2">Pilih periode atau toko di atas, kemudian klik tombol untuk mendapatkan insight strategis dari Gemini AI.</p>
            </div>
            <button 
              onClick={generateInsights} 
              className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
            >
              Generate Insight Sekarang
            </button>
          </div>
        )}
        
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">Gemini sedang membaca data Anda...</p>
          </div>
        )}
        
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-red-500 space-y-3">
            <AlertCircle className="w-12 h-12" />
            <p className="font-bold max-w-xs">{error}</p>
            <button onClick={generateInsights} className="text-sm font-semibold underline hover:text-red-700 transition-colors">Coba Lagi</button>
          </div>
        )}
        
        {insight && !loading && (
          <div className="space-y-6 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">
                STRATEGIC AI REPORT ({filterShopId ? allShops.find(s => s.id === filterShopId)?.nama : 'GENERAL'})
              </h3>
              <button 
                onClick={generateInsights} 
                className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-4 h-4" /> Perbarui
              </button>
            </div>
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
              {insight}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiInsights;
