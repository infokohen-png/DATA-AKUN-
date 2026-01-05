
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ShopList from './components/ShopList';
import ProductList from './components/ProductList';
import SalesList from './components/SalesList';
import ContentList from './components/ContentList';
import GeminiInsights from './components/GeminiInsights';
import AccountManagement from './components/AccountManagement';
import { ViewState, AccountProfile } from './types';
import { LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setProfiles([]);
        setActiveProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'AKUN'), where('userId', '==', user.uid));
    const unsubProfiles = onSnapshot(q, (snapshot) => {
      const profileList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccountProfile[];
      setProfiles(profileList);

      const savedId = localStorage.getItem(`activeProfile_${user.uid}`);
      const found = profileList.find(p => p.id === savedId);
      
      if (found) {
        setActiveProfile(found);
      } else if (profileList.length > 0) {
        setActiveProfile(profileList[0]);
        localStorage.setItem(`activeProfile_${user.uid}`, profileList[0].id);
      } else {
        setActiveProfile(null);
      }
      setLoading(false);
    });

    return () => unsubProfiles();
  }, [user]);

  const handleProfileSwitch = (profile: AccountProfile) => {
    setActiveProfile(profile);
    localStorage.setItem(`activeProfile_${user?.uid}`, profile.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium animate-pulse">Menyiapkan Ruang Kerja...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderView = () => {
    if (currentView === 'AKUN') {
      return (
        <AccountManagement 
          profiles={profiles} 
          activeProfile={activeProfile} 
          onSwitch={handleProfileSwitch} 
        />
      );
    }

    if (!activeProfile) {
      return (
        <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600">
            <LayoutDashboard className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Belum Ada Akun Terdaftar</h2>
          <p className="text-slate-500 max-w-sm">Silakan buat akun bisnis pertama Anda di menu "Kelola Akun" untuk mulai mendata.</p>
          <button 
            onClick={() => setCurrentView('AKUN')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg"
          >
            Kelola Akun
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'DASHBOARD': return <Dashboard activeProfileId={activeProfile.id} />;
      case 'TOKO': return <ShopList activeProfileId={activeProfile.id} />;
      case 'PRODUK': return <ProductList activeProfileId={activeProfile.id} />;
      case 'PENJUALAN': return <SalesList activeProfileId={activeProfile.id} />;
      case 'KONTEN': return <ContentList activeProfileId={activeProfile.id} />;
      case 'INSIGHTS': return <GeminiInsights activeProfileId={activeProfile.id} />;
      default: return <Dashboard activeProfileId={activeProfile.id} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        userEmail={user.email || ''}
        profiles={profiles}
        activeProfile={activeProfile}
        onProfileSwitch={handleProfileSwitch}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
