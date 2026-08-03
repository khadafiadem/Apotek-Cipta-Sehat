import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { Lock, Eye, EyeOff, ShieldCheck, Briefcase, Mail } from 'lucide-react';

interface LoginProps {
  onLoginSuccess?: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [jakartaTime, setJakartaTime] = useState('');

  useEffect(() => {
    const formatted = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    setJakartaTime(formatted + ' WIB');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Email atau kata sandi salah.'
          : authError.message);
        return;
      }

      const user = data?.user;
      if (!user) {
        setError('Login gagal. Silakan coba lagi.');
        return;
      }

      const meta = user.user_metadata || {};
      const role = (meta.role as User['role']) || 'kasir';
      const name = (meta.name as string) || user.email || 'User';
      onLoginSuccess?.({ id: user.id, name, email: user.email || '', role });
    } catch {
      setError('Terjadi kesalahan. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 antialiased font-sans" id="login-container">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Apotek Cipta Sehat</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Sistem Informasi Manajemen Terpadu</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Sistem Keamanan Aktif (Supabase Auth)</span>
            Masukkan email dan kata sandi akun staff Anda untuk masuk.
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@ciptasehat.com"
                autoComplete="email"
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-600 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-inner transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kata Sandi (Password)</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white placeholder-slate-600 rounded-xl py-2.5 pl-3 pr-10 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-inner transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-2.5 px-3 rounded-xl font-semibold flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/15 cursor-pointer mt-4"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'MENGINSPEKSI KREDENSIAL...' : 'MASUK KE SISTEM'}</span>
          </button>
        </form>

        <div className="border-t border-slate-800/60 pt-4 text-center">
          <p className="text-[9px] text-slate-600 font-mono">Sistem Keamanan Apotek v3.0 • {jakartaTime || 'WIB'}</p>
        </div>
      </div>
    </div>
  );
}
