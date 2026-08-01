/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { SalesTransaction, CancelledTransaction } from '../types';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Eye,
  Trash2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Receipt,
  UserCheck,
  Printer,
  Clock
} from 'lucide-react';

export default function PembatalanTransaksi() {
  const {
    currentRole,
    salesTransactions,
    cancelledTransactions,
    cancelSalesTransaction
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'aktif' | 'riwayat'>('aktif');

  // Search and Filter States for Active Transactions
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'semua' | 'hari_ini' | 'bulan_ini'>('semua');

  // Modal States
  const [selectedTx, setSelectedTx] = useState<SalesTransaction | null>(null);
  const [showVoidModal, setShowVoidModal] = useState<SalesTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Detail Modal for Cancelled History
  const [selectedCancelledTx, setSelectedCancelledTx] = useState<CancelledTransaction | null>(null);

  // Filter Active Transactions
  const filteredActiveTx = salesTransactions.filter(tx => {
    // Search matching
    const matchesSearch =
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.kasirName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.items.some(i => i.namaObat.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Date matching
    if (dateFilter === 'hari_ini') {
      const today = new Date().toISOString().split('T')[0];
      return tx.tanggal.startsWith(today);
    } else if (dateFilter === 'bulan_ini') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      return tx.tanggal.startsWith(currentMonth);
    }

    return true;
  });

  // Filter Cancelled Transactions History
  const filteredCancelledTx = cancelledTransactions.filter(c => {
    return (
      c.salesId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.kasirName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.alasan.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Access check
  if (currentRole !== 'superadmin' && currentRole !== 'admin') {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Akses Terbatas — Khusus Super Admin</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Halaman Pembatalan Transaksi merupakan otoritas tinggi yang khusus diperuntukkan bagi peran <strong>Super Admin</strong>.
        </p>
      </div>
    );
  }

  const handleExecuteVoid = async () => {
    if (!showVoidModal) return;
    if (!cancelReason.trim()) {
      alert('Mohon isi alasan pembatalan transaksi!');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await cancelSalesTransaction(showVoidModal.id, cancelReason.trim());
      if (res.success) {
        alert(`Transaksi ${showVoidModal.id} berhasil dibatalkan. Stok obat telah dikembalikan dan jurnal keuangan di-reverse.`);
        setShowVoidModal(null);
        setSelectedTx(null);
        setCancelReason('');
      } else {
        alert('Gagal membatalkan transaksi: ' + res.error);
      }
    } catch (err) {
      alert('Terjadi kesalahan: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Otoritas Super Admin</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Pembatalan Transaksi (Void)
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Modul otorisasi khusus Super Admin untuk membatalkan transaksi penjualan secara presisi per transaksi. Setiap pembatalan akan secara otomatis mengembalikan stok obat, memperbarui kartu stok, dan membalikkan jurnal kas/kredit.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center min-w-[120px]">
              <div className="text-2xl font-black text-purple-300">{salesTransactions.length}</div>
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Tx Aktif</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center min-w-[120px]">
              <div className="text-2xl font-black text-rose-300">{cancelledTransactions.length}</div>
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Tx Dibatalkan</div>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('aktif')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'aktif'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Transaksi Aktif Siap Void ({salesTransactions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Riwayat Pembatalan ({cancelledTransactions.length})</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'aktif' ? "Cari No. Faktur, Kasir, Pelanggan, Nama Obat..." : "Cari Sales ID, Kasir, Pelanggan, Alasan..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        {activeTab === 'aktif' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Tanggal:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="semua">Semua Transaksi</option>
              <option value="hari_ini">Hari Ini</option>
              <option value="bulan_ini">Bulan Ini</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: TRANSAKSI AKTIF */}
      {activeTab === 'aktif' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-800">Daftar Transaksi Penjualan Berjalan</h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Menampilkan {filteredActiveTx.length} transaksi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">No. Faktur</th>
                  <th className="py-3.5 px-4">Tanggal & Waktu</th>
                  <th className="py-3.5 px-4">Kasir & Pelanggan</th>
                  <th className="py-3.5 px-4">Tipe / Bayar</th>
                  <th className="py-3.5 px-4">Jumlah Item</th>
                  <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                  <th className="py-3.5 px-4 text-center">Opsi Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredActiveTx.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada transaksi penjualan aktif yang cocok dengan kriteria.
                    </td>
                  </tr>
                ) : (
                  filteredActiveTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {tx.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {new Date(tx.tanggal).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{tx.customerName || 'Umum'}</div>
                        <div className="text-[10px] text-slate-400">Kasir: {tx.kasirName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.isResep ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {tx.isResep ? 'Resep Dokter' : 'Bebas'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                            {tx.caraBayar}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {tx.items.reduce((acc, i) => acc + i.jumlah, 0)} item
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        Rp {tx.total.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowVoidModal(tx);
                              setCancelReason('');
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Batalkan (Void)</span>
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
      )}

      {/* TAB 2: RIWAYAT PEMBATALAN */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-800">Log & Audit Trail Transaksi Dibatalkan</h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Total {filteredCancelledTx.length} rekam pembatalan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">ID Void / Sales ID</th>
                  <th className="py-3.5 px-4">Waktu Pembatalan</th>
                  <th className="py-3.5 px-4">Kasir / Pelanggan</th>
                  <th className="py-3.5 px-4">Nilai Dibatalkan</th>
                  <th className="py-3.5 px-4">Dibatalkan Oleh</th>
                  <th className="py-3.5 px-4">Alasan Pembatalan</th>
                  <th className="py-3.5 px-4 text-center">Rincian Item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCancelledTx.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada rekam transaksi yang dibatalkan.
                    </td>
                  </tr>
                ) : (
                  filteredCancelledTx.map((c) => (
                    <tr key={c.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-rose-700">{c.id}</div>
                        <div className="text-[10px] text-slate-400">Ref: {c.salesId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {new Date(c.tanggalPembatalan).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{c.customerName || 'Umum'}</div>
                        <div className="text-[10px] text-slate-400">Kasir: {c.kasirName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        Rp {c.total.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          <UserCheck className="w-3 h-3" />
                          {c.dibatalkanOleh}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="bg-rose-50 border border-rose-200/60 rounded-lg p-2 text-rose-900 text-[11px] font-semibold leading-snug">
                          "{c.alasan}"
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedCancelledTx(c)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Item</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: PEMBATALAN (VOID) TRANSAKSI (SUPER ADMIN) */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-rose-200 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Form Pembatalan Transaksi (Void)</h3>
                <p className="text-xs text-slate-500 font-mono">No. Faktur: {showVoidModal.id}</p>
              </div>
            </div>

            {/* RINGKASAN TRANSAKSI */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Pelanggan: <strong>{showVoidModal.customerName || 'Umum'}</strong></span>
                <span>Kasir: <strong>{showVoidModal.kasirName}</strong></span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode Bayar: <strong className="uppercase">{showVoidModal.caraBayar}</strong></span>
                <span>Total: <strong className="text-slate-900 font-extrabold">Rp {showVoidModal.total.toLocaleString('id-ID')}</strong></span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Daftar Item Obat Ditransaksikan:</div>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {showVoidModal.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-700 font-medium">
                      <span>• {item.isRacikan ? item.racikanNama : item.namaObat} x{item.jumlah}</span>
                      <span>Rp {item.total.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ALASAN PEMBATALAN FIELD */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                <span>Alasan Pembatalan Transaksi <span className="text-rose-600">*</span></span>
                <span className="text-[10px] text-rose-500 font-semibold">Wajib Diisi</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tuliskan alasan pembatalan secara detail (contoh: Kesalahan input kasir, retur pelanggan total, dll)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
            </div>

            {/* CONSEQUENCES CALLOUT */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 text-[11px] text-rose-900 space-y-1.5">
              <div className="font-extrabold flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                <span>Efek Otomatis Pembatalan System:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-800 font-medium">
                <li>Stok obat dikembalikan ke database Master Obat.</li>
                <li>Pencatatan Kartu Stok (`retur_jual`) disertai alasan pembatalan.</li>
                <li>Jurnal Keuangan Kas / Piutang Pelanggan di-reverse otomatis.</li>
              </ul>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(null)}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup / Batal
              </button>
              <button
                type="button"
                disabled={isProcessing || !cancelReason.trim()}
                onClick={handleExecuteVoid}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'Memproses Void...' : 'Konfirmasi Pembatalan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL TRANSAKSI AKTIF */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Rincian Nota Transaksi</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div><span className="text-slate-400">Kasir:</span> <p className="font-bold">{selectedTx.kasirName}</p></div>
                <div><span className="text-slate-400">Pelanggan:</span> <p className="font-bold">{selectedTx.customerName || 'Umum'}</p></div>
                <div><span className="text-slate-400">Tanggal:</span> <p className="font-bold">{new Date(selectedTx.tanggal).toLocaleDateString('id-ID')}</p></div>
                <div><span className="text-slate-400">Metode Bayar:</span> <p className="font-bold uppercase text-emerald-600">{selectedTx.caraBayar}</p></div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800">Daftar Obat:</div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedTx.items.map((item, i) => (
                    <div key={i} className="p-2.5 flex justify-between items-center text-xs bg-white">
                      <div>
                        <p className="font-bold text-slate-800">{item.isRacikan ? item.racikanNama : item.namaObat}</p>
                        <p className="text-[10px] text-slate-400">{item.jumlah} x Rp {item.hargaSatuan.toLocaleString('id-ID')}</p>
                      </div>
                      <span className="font-extrabold text-slate-900">Rp {item.total.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-extrabold">
                <span>Total Bayar:</span>
                <span className="text-slate-900">Rp {selectedTx.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowVoidModal(selectedTx);
                  setSelectedTx(null);
                  setCancelReason('');
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Batalkan Transaksi Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DETAIL CANCELLED ITEM (RIWAYAT) */}
      {selectedCancelledTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-rose-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Detail Transaksi Dibatalkan</h3>
                <p className="text-xs text-rose-600 font-mono">Void ID: {selectedCancelledTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedCancelledTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-rose-50 border border-rose-200/70 p-3 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-rose-700 uppercase">Alasan Pembatalan:</span>
                <p className="font-semibold text-rose-900 text-xs">"{selectedCancelledTx.alasan}"</p>
                <div className="text-[10px] text-rose-600 pt-1 border-t border-rose-200/50 flex justify-between">
                  <span>Dibatalkan oleh: <strong>{selectedCancelledTx.dibatalkanOleh}</strong></span>
                  <span>{new Date(selectedCancelledTx.tanggalPembatalan).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800">Daftar Barang Void:</div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedCancelledTx.items.map((item, i) => (
                    <div key={i} className="p-2.5 flex justify-between items-center text-xs bg-white">
                      <div>
                        <p className="font-bold text-slate-800">{item.isRacikan ? item.racikanNama : item.namaObat}</p>
                        <p className="text-[10px] text-slate-400">{item.jumlah} x Rp {item.hargaSatuan.toLocaleString('id-ID')}</p>
                      </div>
                      <span className="font-extrabold text-slate-900">Rp {item.total.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-extrabold">
                <span>Nilai Dibatalkan:</span>
                <span className="text-rose-600">Rp {selectedCancelledTx.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCancelledTx(null)}
                className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
