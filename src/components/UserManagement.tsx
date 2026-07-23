import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { User, UserRole } from '../types';
import { userService } from '../services';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  Lock,
  Key,
  X,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';

export default function UserManagement() {
  const { currentRole, setRole } = usePharmacy();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('semua');
  const [visiblePasswords, setVisiblePasswords] = useState<{[key: string]: boolean}>({});

  // Form states for creating/editing user
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'kasir' as UserRole,
    password: ''
  });

  // Load users from Supabase
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
              setUsers([...stored, khadafi]);
              return;
            }
          }
          setUsers(stored);
        } else {
          for (const u of defaults) {
            try { await userService.add(u.id, u); } catch {}
          }
          setUsers(defaults);
        }
      } catch (e) {
        setUsers(getDefaultUsers());
      }
    };
    loadUsers();
  }, []);

  const getDefaultUsers = (): User[] => [
    { id: 'USR-1', name: 'Ahmad Cipta', role: 'admin', email: 'ahmad@ciptasehat.com', password: 'test' },
    { id: 'USR-2', name: 'Apt. Rahmawati', role: 'apoteker', email: 'rahma@ciptasehat.com', password: 'test' },
    { id: 'USR-3', name: 'Siska Amelia', role: 'kasir', email: 'siska@ciptasehat.com', password: 'test' },
    { id: 'USR-4', name: 'Mohammad Khadafi', role: 'admin', email: 'Dafi@ciptasehat.com', password: 'test' }
  ];

  const saveUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    userService.upsertMany(updatedUsers).catch(e => console.error('Failed to save users:', e));
  };

  // Switch role and notify
  const handleSwitchSession = (role: UserRole) => {
    setRole(role);
  };

  // Delete user
  const handleDeleteUser = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.role === currentRole) {
      alert('Anda tidak dapat menghapus pengguna yang sedang aktif digunakan dalam sesi ini.');
      return;
    }
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus user ini?`);
    if (confirmed) {
      try {
        await userService.delete(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert('Gagal menghapus user dari server.');
      }
    }
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'kasir',
      password: ''
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: user.password || 'test'
    });
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      alert('Mohon lengkapi semua field input.');
      return;
    }

    if (editingUser) {
      // Edit mode
      try {
        await userService.update(editingUser.id, { name: formData.name, email: formData.email, role: formData.role, password: formData.password });
        const updated = users.map(u => {
          if (u.id === editingUser.id) {
            if (u.role === currentRole && u.role !== formData.role) {
              setRole(formData.role);
            }
            return { ...u, name: formData.name, email: formData.email, role: formData.role, password: formData.password };
          }
          return u;
        });
        setUsers(updated);
      } catch (err) {
        console.error('Failed to update user:', err);
        alert('Gagal menyimpan perubahan ke server. Pastikan tabel "users" sudah dibuat di Supabase.');
        return;
      }
    } else {
      // Create mode
      const newId = `USR-${Math.floor(Math.random() * 9000) + 1000}`;
      const newUser: User = {
        id: newId,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password
      };
      try {
        await userService.add(newId, newUser);
        setUsers([...users, newUser]);
      } catch (err) {
        console.error('Failed to create user:', err);
        alert('Gagal menyimpan user baru ke server. Pastikan tabel "users" sudah dibuat di Supabase.');
        return;
      }
    }

    setIsModalOpen(false);
  };

  // Filtering users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'semua' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Hak akses penuh ke semua modul sistem termasuk konfigurasi, database, data master, POS, PO, dan penyesuaian hak akses.';
      case 'apoteker':
        return 'Akses operasional klinis, mengelola resep dokter, merancang purchase order (PO) pengadaan, mengaudit stok fisik, dan analisis rugi laba.';
      case 'kasir':
        return 'Hak akses terbatas khusus modul kasir transaksi penjualan (POS). Hanya dapat membaca data master obat dan tidak diizinkan masuk ke laporan keuangan.';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6" id="user-management-module">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            Manajemen Pengguna (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi pengguna sistem, kelola hak akses berbasis peran (Role-Based Access Control), dan simulasi pertukaran pengguna.
          </p>
        </div>
        <div className="flex font-mono text-[11px] bg-slate-100 p-1.5 rounded-xl border border-slate-200/40 text-slate-500 gap-3 self-start md:self-auto">
          <span>Active Role: <strong className="text-emerald-600 uppercase">{currentRole}</strong></span>
        </div>
      </div>

      {/* ACTIVE ROLE EXPLANATION / BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['admin', 'apoteker', 'kasir'].map((role) => {
          const isActive = currentRole === role;
          return (
            <div
              key={role}
              onClick={() => handleSwitchSession(role as UserRole)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isActive
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/10'
                  : 'bg-white text-slate-800 border-slate-100 hover:border-slate-200 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Peran: {role}
                  </span>
                  {isActive && <UserCheck className="w-4 h-4 text-white" />}
                </div>
                <h3 className="text-sm font-bold mt-3 capitalize">
                  {role === 'admin' ? 'Super Admin' : role === 'apoteker' ? 'Apoteker Penanggung Jawab' : 'Staff Kasir'}
                </h3>
                <p className={`text-[11px] mt-1 line-clamp-3 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                  {getRoleDescription(role)}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-dashed border-current/25 flex items-center justify-between">
                <span className="text-[10px] font-bold">
                  {isActive ? '✓ Sesi Aktif Terpilih' : 'Klik untuk Beralih Peran'}
                </span>
                <Shield className="w-3.5 h-3.5 opacity-60" />
              </div>
            </div>
          );
        })}
      </div>

      {/* CONTROLS & FILTER */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari user (ID, nama, email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
            >
              <option value="semua">Semua Peran</option>
              <option value="admin">Administrator (Admin)</option>
              <option value="apoteker">Apoteker</option>
              <option value="kasir">Staff Kasir</option>
            </select>
          </div>

          {/* Create Button */}
          <div className="sm:text-right">
            <button
              onClick={handleOpenCreate}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl inline-flex items-center gap-2 transition-all shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah User Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* USERS LIST TABLE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/55">
          <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Daftar Akun & Staff Apotek</h3>
          <span className="text-[10px] font-bold text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/60">
            {filteredUsers.length} Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/40">
                <th className="py-3 px-6">ID User</th>
                <th className="py-3 px-6">Nama Pengguna</th>
                <th className="py-3 px-6">Email Address</th>
                <th className="py-3 px-6">Kata Sandi</th>
                <th className="py-3 px-6">Peran Akses</th>
                <th className="py-3 px-6">Sesi Saat Ini</th>
                <th className="py-3 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada staff/user yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isActiveUser = currentRole === user.role;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-500">{user.id}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{user.name}</div>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setVisiblePasswords(prev => ({
                                ...prev,
                                [user.id]: !prev[user.id]
                              }));
                            }}
                            className="text-slate-400 hover:text-emerald-500 transition-colors focus:outline-none"
                            title={visiblePasswords[user.id] ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                          >
                            {visiblePasswords[user.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="font-semibold">{visiblePasswords[user.id] ? (user.password || 'test') : '••••••••'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getRoleBadgeStyle(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {isActiveUser ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Sesi Aktif
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchSession(user.role)}
                            className="text-slate-400 hover:text-emerald-600 text-[10px] font-bold hover:underline"
                          >
                            Beralih ke Sesi Ini
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 p-1.5 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 p-1.5 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL FOR CREATE/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                {editingUser ? 'Edit Informasi Staff' : 'Registrasi Staff Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nama */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Siska Amelia"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-3xs"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: siska@ciptasehat.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-3xs"
                />
              </div>

              {/* Kata Sandi */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kata Sandi (Password)</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-3xs"
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Peran (Role Access)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-3xs"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="apoteker">Apoteker (Operational & Clinical)</option>
                  <option value="kasir">Staff Kasir (Sales POS Only)</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-3xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-3xs"
                >
                  Simpan Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
