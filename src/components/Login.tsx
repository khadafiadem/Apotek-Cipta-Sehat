import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { userService } from '../services';
import { Key, Lock, Eye, EyeOff, ShieldCheck, Briefcase, Users, Mail } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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

  const getDefaultUsers = (): User[] => [
    { id: 'USR-1', name: 'Ahmad Cipta', role: 'admin', email: 'ahmad@ciptasehat.com', password: 'test' },
    { id: 'USR-2', name: 'Apt. Rahmawati', role: 'apoteker', email: 'rahma@ciptasehat.com', password: 'test' },
    { id: 'USR-3', name: 'Siska Amelia', role: 'kasir', email: 'siska@ciptasehat.com', password: 'test' },
    { id: 'USR-4', name: 'Mohammad Khadafi', role: 'admin', email: 'Dafi@ciptasehat.com', password: 'test' }
  ];

  // Load registered users from Supabase
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const stored = await userService.getAll();
        const defaults = getDefaultUsers();
        if (stored.length > 0) {
          const hasKhadafi = stored.some(u => u.email?.toLowerCase() === 'dafi@ciptasehat.com');
          if (!hasKhadafi) {
            const khadafi = defaults.find(u => u.email?.toLowerCase() === 'dafi@ciptasehat.com');
            if (khadafi) {
              try { await userService.add(khadafi.id, khadafi); } catch {}
              const updated = [...stored, khadafi];
              setUsers(updated);
              setSelectedUserId(updated[0].id);
              return;
            }
          }
          setUsers(stored);
          setSelectedUserId(stored[0].id);
        } else {
          for (const u of defaults) {
            try { await userService.add(u.id, u); } catch {}
          }
          setUsers(defaults);
          setSelectedUserId(defaults[0].id);
        }
      } catch (e) {
        const defaults = getDefaultUsers();
        setUsers(defaults);
        setSelectedUserId(defaults[0].id);
      }
    };
    loadUsers();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUserId) {
      setError('Silakan pilih salah satu user terlebih dahulu.');
      return;
    }

    if (!password) {
      setError('Silakan masukkan kata sandi.');
      return;
    }

    const matchedUser = users.find(u => u.id === selectedUserId);
    if (matchedUser) {
      const userPassword = matchedUser.password || 'test';
      if (password !== userPassword) {
        setError('Password salah!');
        return;
      }
      onLoginSuccess(matchedUser);
    } else {
      setError('User tidak ditemukan.');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'apoteker':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'kasir':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
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
            <span className="font-bold text-white block mb-0.5">Sistem Keamanan Aktif (RBAC)</span>
            Pilih pengguna di bawah ini untuk memulai sesi kerja Anda.
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* User Selection List */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilih Pengguna / Staff</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {users.map(user => {
                const isSelected = selectedUserId === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 text-white shadow-xs'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : getRoleBadgeStyle(user.role)
                    }`}>
                      {user.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kata Sandi (Password)</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
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
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:text-slate-950 font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/15 cursor-pointer mt-4"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>MASUK KE SISTEM</span>
          </button>
        </form>

        <div className="border-t border-slate-800/60 pt-4 text-center">
          <p className="text-[9px] text-slate-600 font-mono">Sistem Keamanan Apotek v2.4 • {jakartaTime || 'WIB'}</p>
        </div>
      </div>
    </div>
  );
}
