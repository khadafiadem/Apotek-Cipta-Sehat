import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { User, UserRole } from '../types';
import { userService } from '../services';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Search,
  Trash2,
  Edit,
  Key,
  X,
  UserCheck,
  Lock
} from 'lucide-react';

export default function UserManagement() {
  const { currentRole } = usePharmacy();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('semua');
  const [isLoading, setIsLoading] = useState(true);

  // Form states for creating/editing user
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'kasir' as UserRole,
    password: ''
  });

  const isAdmin = currentRole === 'superadmin' || currentRole === 'admin';

  // Load staff from profiles (Supabase Auth)
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const stored = await userService.getAll();
        setUsers(stored);
      } catch (e) {
        console.error('Failed to load staff:', e);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'admin':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'apoteker':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'kasir':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'manager':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Hak akses tertinggi. Berhak melakukan pembatalan/void transaksi, hapus seluruh data obat, import batch data obat, serta seluruh fitur admin.';
      case 'admin':
        return 'Hak akses penuh ke semua modul sistem termasuk konfigurasi, database, data master, POS, PO, dan laporan keuangan.';
      case 'apoteker':
        return 'Akses operasional klinis, mengelola resep dokter, merancang purchase order (PO) pengadaan, mengaudit stok fisik, dan analisis rugi laba.';
      case 'kasir':
        return 'Hak akses terbatas khusus modul kasir transaksi penjualan (POS). Hanya dapat membaca data master obat dan tidak diizinkan masuk ke laporan keuangan.';
      case 'manager':
        return 'Hak akses persetujuan (approval) Purchase Order. Berwenang menyetujui atau menolak PO yang diajukan serta memantau alur pengadaan pembelian.';
      default:
        return '';
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus akun ${userToDelete.name}?`);
    if (confirmed) {
      try {
        await userService.delete(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        console.error('Failed to delete user:', err);
        alert(`Gagal menghapus user. ${(err as Error).message}`);
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
      password: ''
    });
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Mohon lengkapi nama dan email.');
      return;
    }

    if (editingUser) {
      // Edit mode
      try {
        await userService.update(editingUser.id, { name: formData.name, role: formData.role });
        if (formData.password.trim()) {
          await userService.resetPassword(editingUser.id, formData.password);
        }
        setUsers(users.map(u => u.id === editingUser.id
          ? { ...u, name: formData.name, role: formData.role }
          : u));
      } catch (err) {
        console.error('Failed to update user:', err);
        alert(`Gagal menyimpan perubahan. ${(err as Error).message}`);
        return;
      }
    } else {
      // Create mode
      if (!formData.password.trim()) {
        alert('Password wajib diisi untuk akun baru (minimal 8 karakter).');
        return;
      }
      try {
        await userService.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        setUsers(await userService.getAll());
      } catch (err) {
        console.error('Failed to create user:', err);
        alert(`Gagal membuat user. ${(err as Error).message}`);
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

  const shortId = (id: string) => (id.length > 8 ? `${id.slice(0, 8)}…` : id);

  if (!isAdmin) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-xs text-center space-y-3">
        <Shield className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="font-extrabold text-slate-900">Akses Ditolak</h2>
        <p className="text-xs text-slate-500">Hanya Admin atau Super Admin yang dapat mengelola pengguna.</p>
      </div>
    );
  }

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
            Kelola akun staff dan hak akses. Role melekat pada akun login (Supabase Auth) dan tidak dapat diganti bebas.
          </p>
        </div>
        <div className="flex font-mono text-[11px] bg-slate-100 p-1.5 rounded-xl border border-slate-200/40 text-slate-500 gap-3 self-start md:self-auto">
          <span>Active Role: <strong className="text-emerald-600 uppercase">{currentRole}</strong></span>
        </div>
      </div>

      {/* BANNER: ROLE TERKUNCI PER AKUN */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 mt-0.5">
          <Lock className="w-4 h-4" />
        </div>
        <div className="text-xs text-indigo-800 leading-relaxed">
          <span className="font-bold block mb-0.5">Role terkunci per akun login</span>
          Setiap staff login dengan email & kata sandi miliknya sendiri; peran (role) diambil dari akun tersebut.
          Tidak ada lagi pertukaran peran bebas seperti sebelumnya.
        </div>
      </div>

      {/* ROLE REFERENCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {['superadmin', 'admin', 'apoteker', 'kasir', 'manager'].map((role) => {
          const isActive = currentRole === role;
          return (
            <div
              key={role}
              className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isActive
                  ? role === 'superadmin' ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-500/10' : 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/10'
                  : 'bg-white text-slate-800 border-slate-100 shadow-2xs'
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
                  {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Administrator' : role === 'apoteker' ? 'Apoteker PJ' : role === 'manager' ? 'Manager' : 'Staff Kasir'}
                </h3>
                <p className={`text-[11px] mt-1 line-clamp-3 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                  {getRoleDescription(role)}
                </p>
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
              placeholder="Cari user (nama, email, ID)..."
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
              <option value="superadmin">Super Admin</option>
              <option value="admin">Administrator (Admin)</option>
              <option value="apoteker">Apoteker PJ</option>
              <option value="kasir">Staff Kasir</option>
              <option value="manager">Manager</option>
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
                <th className="py-3 px-6">ID Akun</th>
                <th className="py-3 px-6">Nama Pengguna</th>
                <th className="py-3 px-6">Email Address</th>
                <th className="py-3 px-6">Peran Akses</th>
                <th className="py-3 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                    Memuat data staff...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada staff/user yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-500" title={user.id}>{shortId(user.id)}</td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{user.name}</div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getRoleBadgeStyle(user.role)}`}>
                        {user.role}
                      </span>
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
                ))
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
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: siska@ciptasehat.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-3xs disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {editingUser && (
                  <p className="text-[9px] text-slate-400">Email tidak dapat diubah.</p>
                )}
              </div>

              {/* Kata Sandi */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {editingUser ? 'Reset Kata Sandi (opsional)' : 'Kata Sandi (Password)'}
                </label>
                <input
                  type="text"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Kosongkan jika tidak diganti' : 'Minimal 8 karakter'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-3xs"
                />
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <Key className="w-3 h-3" /> Password disimpan ter-hash di Supabase Auth.
                </p>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Peran (Role Access)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-3xs"
                >
                  <option value="superadmin">Super Admin (Pembatalan TX, Batch Import & Hapus Data)</option>
                  <option value="admin">Administrator (Full System Access)</option>
                  <option value="apoteker">Apoteker (Operational & Clinical)</option>
                  <option value="kasir">Staff Kasir (Sales POS Only)</option>
                  <option value="manager">Manager (Approval PO)</option>
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
