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
    currentRole,
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
          Lihat hak akses RBAC akun Anda, lakukan pencadangan data komprehensif, atau pulihkan database offline.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Account & Access */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Akun &amp; Hak Akses (RBAC)</span>
          </h3>

          <div className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Hak akses sistem kini melekat pada akun login masing-masing staff dan dikelola via Supabase Auth.
              Role tidak dapat diganti bebas dari halaman ini.
            </p>

            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-gray-900">Role Aktif Anda</p>
                <p className="text-gray-500 mt-0.5 uppercase font-mono text-[11px]">
                  {currentRole}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/50 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${currentRole === 'superadmin' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Super Admin</p>
                  <p className="text-gray-500 mt-0.5">Hak akses tertinggi: pembatalan transaksi, import batch &amp; hapus seluruh data obat.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/50 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${currentRole === 'apoteker' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Apoteker Penanggung Jawab</p>
                  <p className="text-gray-500 mt-0.5">Akses medis: merancang PO, audit ED, stock opname fisik, dan meracik resep obat.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/50 flex items-start gap-3">
                <div className={`p-2 rounded-lg ${currentRole === 'kasir' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Kasir Toko (Front Desk)</p>
                  <p className="text-gray-500 mt-0.5">Dibatasi pada layar POS kasir dan kartu stok obat. Kelola di menu Manajemen Pengguna.</p>
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
