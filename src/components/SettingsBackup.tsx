/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { usePharmacy } from '../PharmacyContext';
import {
  Settings,
  Shield,
  Download,
  Upload,
  RefreshCw,
  FileCode,
  Users,
  CheckCircle,
  Database
} from 'lucide-react';

export default function SettingsBackup() {
  const {
    currentRole, setRole,
    exportDatabase, importDatabase, resetDatabase, syncToSupabase
  } = usePharmacy();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSyncToSupabase = async () => {
    setSyncing(true);
    try {
      await syncToSupabase();
      alert('Semua data berhasil disinkronkan ke Supabase!');
    } catch {
      alert('Gagal menyinkronkan ke Supabase. Periksa koneksi dan konfigurasi Anda.');
    } finally {
      setSyncing(false);
    }
  };

  // Trigger JSON file download
  const handleExport = () => {
    try {
      exportDatabase();
    } catch (err) {
      alert('Gagal mengekspor database backup.');
    }
  };

  // Import JSON handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Basic check if JSON is valid
        JSON.parse(text); 
        
        const success = importDatabase(text);
        if (success) {
          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 3000);
          alert('Database berhasil dipulihkan dari berkas backup. Halaman direfresh otomatis.');
        } else {
          alert('Format data backup tidak sesuai dengan skema apotek.');
        }
      } catch (err) {
        alert('File JSON tidak valid atau korup.');
      }
    };
    reader.readAsText(file);
  };

  // Factory reset
  const handleFactoryReset = () => {
    const confirm1 = window.confirm('Peringatan Kritis! Anda akan mereset total seluruh database apotek kembali ke setelan awal pabrik. Semua transaksi penjualan dan stok masuk saat ini akan dihapus permanen. Lanjutkan?');
    if (confirm1) {
      const confirm2 = window.confirm('Apakah Anda benar-benar yakin? Tindakan reset ini tidak dapat dibatalkan.');
      if (confirm2) {
        resetDatabase();
        alert('Database dibersihkan. Aplikasi dimuat ulang harian.');
      }
    }
  };

  return (
    <div className="space-y-6" id="settings-backup-view">
      {/* Title Header */}
      <div className="border-b border-gray-100 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Pengaturan Sistem & Ekspor Backup
        </h1>
        <p className="text-sm text-gray-500">
          Ubah hak akses simulasi RBAC pengguna, lakukan pencadangan data komprehensif, atau pulihkan database offline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: RBAC Role selection */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Simulasi Hak Akses Pengguna (RBAC)</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Pilih profil pengguna di bawah untuk melihat bagaimana simulasi keamanan membatasi hak akses operasional (hanya kasir vs tim klinis apoteker/admin):
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {/* ADMIN */}
              <div
                onClick={() => setRole('admin')}
                className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-3 ${currentRole === 'admin' ? 'border-indigo-600 bg-indigo-50/20' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className={`p-2 rounded-lg ${currentRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Administrator Utama (Superuser)</p>
                  <p className="text-gray-500 mt-0.5">Akses penuh mencakup modifikasi data master, pembuatan PO obat, stock opname fisik, pelaporan jurnal keuangan, dan ekspor-impor database.</p>
                </div>
              </div>

              {/* APOTEKER */}
              <div
                onClick={() => setRole('apoteker')}
                className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-3 ${currentRole === 'apoteker' ? 'border-indigo-600 bg-indigo-50/20' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className={`p-2 rounded-lg ${currentRole === 'apoteker' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Apoteker Penanggung Jawab</p>
                  <p className="text-gray-500 mt-0.5">Akses medis penuh untuk merancang rencana pembelian (PO), mengaudit ED (kadaluwarsa), menginput stock opname fisik, dan meracik resep obat.</p>
                </div>
              </div>

              {/* KASIR */}
              <div
                onClick={() => setRole('kasir')}
                className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-3 ${currentRole === 'kasir' ? 'border-indigo-600 bg-indigo-50/20' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className={`p-2 rounded-lg ${currentRole === 'kasir' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Kasir Toko (Front Desk)</p>
                  <p className="text-gray-500 mt-0.5">Dibatasi hanya untuk mengakses layar penjualan POS kasir dan melihat kartu stok obat. Dilarang mengubah data master harga atau mengakses laporan laba rugi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Backup and Restore */}
        <div className="lg:col-span-6 space-y-6">
          {/* Backup Database */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Manajemen Pencadangan Data (Backup Offline)</span>
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed">
              Amankan seluruh catatan medis obat, rincian purchase order, dan log keuangan harian Anda ke dalam berkas JSON offline. Berkas ini dapat dipulihkan kapan pun untuk mengembalikan status apotek Anda.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Backup Database (.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg font-medium text-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-gray-500" />
                <span>Pulihkan Database (Import)</span>
              </button>

              <button
                onClick={handleSyncToSupabase}
                disabled={syncing}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors shadow-xs"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan ke Supabase'}</span>
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
            </div>

            {importSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Database dipulihkan dengan sukses!</span>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-50/30 p-5 rounded-xl border border-rose-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider border-b border-rose-100/50 pb-2 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-rose-600 animate-spin-slow" />
              <span>Zona Berbahaya (Danger Zone)</span>
            </h3>

            <p className="text-xs text-rose-700 leading-relaxed">
              Ingin membersihkan semua data harian untuk presentasi ulang? Setel ulang pabrik (Factory Reset) akan menghapus semua logs local storage dan memuat data draf obat bawaan semula.
            </p>

            <button
              onClick={handleFactoryReset}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-xs"
            >
              Lakukan Factory Reset Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
