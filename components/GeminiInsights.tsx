
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Shop } from '../types';
import { Sparkles, Loader2, RefreshCw, AlertCircle, Calendar, Store, Filter } from 'lucide-react';

// Add prop interface for activeProfileId
interface GeminiInsightsProps {
  activeProfileId: string;
}

// Update component to accept activeProfileId
const GeminiInsights: React.FC<GeminiInsightsProps> = ({ activeProfileId }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter States
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [filterShopId, setFilterShopId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    if (!activeProfileId) return;
    // Filter shops by profileId
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
      // Filter all snapshots by profileId
      const tokoSnap = await getDocs(query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId)));
      const produkSnap = await getDocs(query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId)));
      const penjualanSnap = await getDocs(query(collection(db, 'PENJUALAN PRODUK'), where('profileId', '==', activeProfileId)));
      const kontenSnap = await getDocs(query(collection(db, 'KONTEN'), where('profileId', '==', activeProfileId)));

      const selectedShop = allShops.find(s => s.id === filterShopId);

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
          
          Berikan laporan strategis UMKM:
          1. Evaluasi performa berdasarkan periode/toko yang dipilih.
          2. Analisis korelasi antara postingan dan omset di konteks ini.
          3. 3 Langkah praktis untuk optimasi.`,
        config: { systemInstruction: "Anda adalah analis bisnis UMKM profesional." }
      });

      setInsight(response.text || "Tidak ada respons dari AI.");
    } catch (err: any) {
      setError("Gagal menghasilkan insight.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-indigo-600" /> AI Strategist</h2>
        <p className="text-slate-500">Minta AI menganalisis performa berdasarkan filter Anda.</p>
      </header>

      {/* Filter Insights */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"><Filter className="w-4 h-4" /> Analisis:</div>
        <select value={filterShopId} onChange={(e) => setFilterShopId(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"><option value="">Semua Toko</option>{allShops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}</select>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent outline-none" />
          <span className="text-slate-400">-</span>
          <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent outline-none" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
        {!insight && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <Sparkles className="w-12 h-12 text-indigo-200" />
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-slate-900">Siap Menganalisis</h3>
              <p className="text-slate-500 mt-2">Pilih filter di atas jika ingin fokus pada toko/periode tertentu, lalu klik tombol di bawah.</p>
            </div>
            <button onClick={generateInsights} className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 shadow-lg active:scale-95">Mulai Analisis</button>
          </div>
        )}
        {loading && <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /><p className="text-slate-500 font-medium">Gemini sedang memproses data filter Anda...</p></div>}
        {insight && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-sm">STRATEGIC REPORT ({filterShopId ? allShops.find(s => s.id === filterShopId)?.nama : 'GENERAL'})</h3>
              <button onClick={generateInsights} className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:underline"><RefreshCw className="w-4 h-4" /> Update</button>
            </div>
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">{insight}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiInsights;
