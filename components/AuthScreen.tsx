
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { Store, Mail, Lock, UserPlus, LogIn, ArrowLeft, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'SIGNUP') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (mode === 'FORGOT_PASSWORD') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Tautan pemulihan telah dikirim ke email Anda.');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('Email tidak terdaftar.');
      else if (err.code === 'auth/wrong-password') setError('Kata sandi salah.');
      else if (err.code === 'auth/email-already-in-use') setError('Email sudah terdaftar.');
      else if (err.code === 'auth/weak-password') setError('Kata sandi minimal 6 karakter.');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
              <Store className="text-white w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {mode === 'LOGIN' && 'Selamat Datang'}
              {mode === 'SIGNUP' && 'Daftar Akun'}
              {mode === 'FORGOT_PASSWORD' && 'Lupa Sandi?'}
            </h2>
            <p className="text-slate-500 mt-2 text-center text-sm">
              {mode === 'LOGIN' && 'Masuk untuk mengelola bisnis Anda'}
              {mode === 'SIGNUP' && 'Mulai kelola data toko Anda hari ini'}
              {mode === 'FORGOT_PASSWORD' && 'Masukkan email untuk reset kata sandi'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="email@anda.com"
                  required
                />
              </div>
            </div>

            {mode !== 'FORGOT_PASSWORD' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Kata Sandi</label>
                  {mode === 'LOGIN' && (
                    <button 
                      type="button"
                      onClick={() => setMode('FORGOT_PASSWORD')}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Lupa Sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {mode === 'LOGIN' && <><LogIn className="w-5 h-5" /> Masuk Sekarang</>}
                  {mode === 'SIGNUP' && <><UserPlus className="w-5 h-5" /> Daftar Akun</>}
                  {mode === 'FORGOT_PASSWORD' && <><Send className="w-5 h-5" /> Kirim Instruksi</>}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            {mode === 'LOGIN' ? (
              <p className="text-sm text-slate-500">
                Belum punya akun?{' '}
                <button onClick={() => setMode('SIGNUP')} className="text-indigo-600 font-bold hover:underline">Daftar Gratis</button>
              </p>
            ) : (
              <button 
                onClick={() => setMode('LOGIN')} 
                className="text-sm text-slate-600 font-bold hover:text-indigo-600 flex items-center justify-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Masuk
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
