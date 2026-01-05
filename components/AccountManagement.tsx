
import React, { useState } from 'react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AccountProfile } from '../types';
import { 
  Users, Plus, Edit3, Trash2, Check, X, 
  Save, Loader2, Search, AlertTriangle 
} from 'lucide-react';

interface AccountManagementProps {
  profiles: AccountProfile[];
  activeProfile: AccountProfile | null;
  onSwitch: (profile: AccountProfile) => void;
}

const AccountManagement: React.FC<AccountManagementProps> = ({ profiles, activeProfile, onSwitch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccountProfile | null>(null);
  const [nama, setNama] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !auth.currentUser) return;

    setIsSaving(true);
    try {
      if (editingProfile) {
        await updateDoc(doc(db, 'AKUN', editingProfile.id), { nama: nama.trim() });
      } else {
        await addDoc(collection(db, 'AKUN'), {
          userId: auth.currentUser.uid,
          nama: nama.trim(),
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (err) {
      alert("Gagal menyimpan akun.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Peringatan: Menghapus akun ini tidak akan menghapus data toko/produk secara otomatis, namun data tersebut akan sulit diakses. Lanjutkan?")) {
      try {
        await deleteDoc(doc(db, 'AKUN', id));
      } catch (err) {
        alert("Gagal menghapus akun.");
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProfile(null);
    setNama('');
  };

  const filteredProfiles = profiles.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kelola Akun Bisnis</h2>
          <p className="text-slate-500 text-sm mt-1">Gunakan multi-akun untuk memisahkan data bisnis Anda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" /> Tambah Akun
        </button>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama akun..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-700">{profiles.length} Akun</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProfiles.length > 0 ? filteredProfiles.map((profile) => (
          <div 
            key={profile.id} 
            className={`bg-white p-6 rounded-3xl border transition-all group relative overflow-hidden ${
              activeProfile?.id === profile.id ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md' : 'border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md'
            }`}
          >
            {activeProfile?.id === profile.id && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest">
                Aktif
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                activeProfile?.id === profile.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {profile.nama[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{profile.nama}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {profile.id.slice(0,8)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onSwitch(profile)}
                disabled={activeProfile?.id === profile.id}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeProfile?.id === profile.id 
                  ? 'bg-emerald-50 text-emerald-600 cursor-default' 
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100'
                }`}
              >
                {activeProfile?.id === profile.id ? <><Check className="w-3.5 h-3.5" /> Digunakan</> : 'Pilih Akun'}
              </button>
              
              <div className="flex gap-1">
                <button 
                  onClick={() => { setEditingProfile(profile); setNama(profile.nama); setIsModalOpen(true); }}
                  className="flex-1 flex items-center justify-center py-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 border border-slate-100"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDelete(profile.id)}
                  className="flex-1 flex items-center justify-center py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white border border-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Users className="w-16 h-16 text-slate-200 mx-auto" />
            <p className="text-slate-400 font-medium">Tidak ada akun bisnis ditemukan.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{editingProfile ? 'Edit Nama Akun' : 'Tambah Akun Baru'}</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Akun Bisnis</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Misal: Toko Berkah"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              {!editingProfile && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                    Setiap akun akan memiliki database Toko, Produk, Penjualan, dan Konten yang terpisah secara total.
                  </p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Simpan Akun</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
