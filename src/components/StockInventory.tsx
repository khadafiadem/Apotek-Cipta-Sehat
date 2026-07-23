/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { Medicine, StockCard, StockOpname } from '../types';
import {
  ClipboardList,
  AlertTriangle,
  History,
  TrendingDown,
  Calendar,
  CheckCircle,
  PlusCircle,
  Clock,
  Archive,
  Info
} from 'lucide-react';

export default function StockInventory() {
  const {
    currentRole,
    medicines,
    stockCards,
    stockOpnames, addStockOpname
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'card' | 'alerts' | 'opname'>('card');
  const [selectedMedFilter, setSelectedMedFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Stock opname builder state
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [opnameOleh, setOpnameOleh] = useState('Apoteker Utama');
  const [opnameItems, setOpnameItems] = useState<{ obatId: string; stokFisik: number; keterangan: string }[]>([]);
  
  const [tempObatId, setTempObatId] = useState('');
  const [tempStokFisik, setTempStokFisik] = useState(0);
  const [tempKet, setTempKet] = useState('');

  const isReadOnly = currentRole === 'kasir';

  // Filters for stock cards
  const filteredCards = stockCards.filter(card => {
    const matchMed = selectedMedFilter === '' || card.obatId === selectedMedFilter;
    const matchType = selectedTypeFilter === '' || card.tipe === selectedTypeFilter;
    return matchMed && matchType;
  }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Opname functions
  const addOpnameItem = () => {
    if (!tempObatId) return;
    const med = medicines.find(m => m.id === tempObatId);
    if (!med) return;

    if (opnameItems.some(i => i.obatId === tempObatId)) {
      alert('Obat ini sudah dimasukkan ke daftar opname saat ini.');
      return;
    }

    setOpnameItems(prev => [...prev, {
      obatId: tempObatId,
      stokFisik: Number(tempStokFisik),
      keterangan: tempKet || 'Penyesuaian Fisik'
    }]);

    setTempObatId('');
    setTempStokFisik(0);
    setTempKet('');
  };

  const removeOpnameItem = (idx: number) => {
    setOpnameItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmOpname = (e: React.FormEvent) => {
    e.preventDefault();
    if (opnameItems.length === 0 || !opnameOleh) return;

    addStockOpname(opnameOleh, opnameItems);
    setOpnameItems([]);
    setOpnameOleh('Apoteker Utama');
    setShowOpnameModal(false);
    alert('Stock opname berhasil diselesaikan. Selisih stok dicatat dan kartu stok disinkronisasi harian.');
  };

  // Expiry date calculation
  const currentDate = new Date();
  const getExpiryStatus = (expStr: string) => {
    const expDate = new Date(expStr);
    const diffTime = expDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = diffDays / 30.5;

    if (diffDays <= 0) return { label: 'Expired!', color: 'text-red-700 bg-red-100 border-red-200' };
    if (diffMonths <= 3) return { label: `Sangat Kritis (<3 B): ${expStr}`, color: 'text-red-600 bg-red-50 border-red-100' };
    if (diffMonths <= 6) return { label: `Peringatan (<6 B): ${expStr}`, color: 'text-amber-600 bg-amber-50 border-amber-100' };
    if (diffMonths <= 12) return { label: `Monitor (<12 B): ${expStr}`, color: 'text-blue-600 bg-blue-50 border-blue-100' };
    return null;
  };

  const expiringMeds = medicines
    .map(m => ({ med: m, status: getExpiryStatus(m.expiredDate) }))
    .filter(item => item.status !== null) as { med: Medicine; status: { label: string; color: string } }[];

  const lowStockMeds = medicines.filter(m => m.stok === 0);

  return (
    <div className="space-y-6" id="stock-inventory-view">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Manajemen Stok & Inventaris
          </h1>
          <p className="text-sm text-gray-500">
            Audit mutasi stok real-time, monitoring obat kadaluwarsa/kosong harian, dan pencatatan stock opname fisik apotek.
          </p>
        </div>
        {!isReadOnly && activeSubTab === 'opname' && (
          <button
            onClick={() => {
              setOpnameItems([]);
              setShowOpnameModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-xs"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Mulai Opname Fisik Baru</span>
          </button>
        )}
      </div>

      {/* Subtab selection */}
      <div className="flex flex-wrap gap-1 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100 w-fit">
        <button
          onClick={() => setActiveSubTab('card')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'card' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Kartu Riwayat Stok</span>
        </button>
        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'alerts' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Analisis ED & Low Stock</span>
        </button>
        <button
          onClick={() => setActiveSubTab('opname')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'opname' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Stock Opname Fisik ({stockOpnames.length})</span>
        </button>
      </div>

      {/* READ ONLY ROLE WARNING */}
      {isReadOnly && activeSubTab === 'opname' && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3.5 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Hak Akses Terbatas (Kasir):</strong> Sesuai modul keamanan RBAC apotek, Anda diizinkan untuk melihat laporan stock opname, namun tidak berwenang untuk merancang audit fisik baru. Hubungi Apoteker atau Admin jika ada perbedaan fisik barang.
          </p>
        </div>
      )}

      {/* 1. SUBTAB: KARTU STOK LOGS */}
      {activeSubTab === 'card' && (
        <div className="space-y-4">
          {/* Filters section */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Filter Berdasarkan Nama Obat</label>
              <select
                value={selectedMedFilter}
                onChange={e => setSelectedMedFilter(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
              >
                <option value="">-- Tampilkan Semua Obat --</option>
                {medicines.map(m => (
                  <option key={m.id} value={m.id}>{m.nama} (ID: {m.id})</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-64">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Filter Berdasarkan Tipe Mutasi</label>
              <select
                value={selectedTypeFilter}
                onChange={e => setSelectedTypeFilter(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
              >
                <option value="">-- Tampilkan Semua Tipe --</option>
                <option value="masuk">Masuk (Receipt / Pembelian)</option>
                <option value="keluar">Keluar (Sales / POS)</option>
                <option value="retur_beli">Retur Pembelian (Supplier)</option>
                <option value="retur_jual">Retur Penjualan (Customer)</option>
                <option value="penyesuaian">Penyesuaian (Stock Opname / Edit)</option>
              </select>
            </div>
          </div>

          {/* Card Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
            {filteredCards.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                Belum ada mutasi stok tercatat untuk filter yang Anda terapkan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase">
                      <th className="py-3 px-3">Tanggal Jurnal</th>
                      <th className="py-3 px-3">ID Jurnal</th>
                      <th className="py-3 px-3">Nama Obat</th>
                      <th className="py-3 px-3 text-center">Tipe Mutasi</th>
                      <th className="py-3 px-3 text-center">Stok Awal</th>
                      <th className="py-3 px-3 text-center">Qty Mutasi</th>
                      <th className="py-3 px-3 text-center">Stok Akhir</th>
                      <th className="py-3 px-3">Referensi ID / Faktur</th>
                      <th className="py-3 px-3">Keterangan / Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {filteredCards.map(card => {
                      const badgeColors = {
                        masuk: 'bg-emerald-50 text-emerald-800 border-emerald-100',
                        keluar: 'bg-blue-50 text-blue-800 border-blue-100',
                        retur_beli: 'bg-amber-50 text-amber-800 border-amber-100',
                        retur_jual: 'bg-purple-50 text-purple-800 border-purple-100',
                        penyesuaian: 'bg-rose-50 text-rose-800 border-rose-100'
                      };

                      return (
                        <tr key={card.id} className="hover:bg-gray-50/20">
                          <td className="py-3 px-3 text-gray-400 font-mono text-[10px]">
                            {new Date(card.tanggal).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-gray-400">{card.id}</td>
                          <td className="py-3 px-3 font-semibold text-gray-900">{card.namaObat}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 border rounded text-[9px] font-semibold ${badgeColors[card.tipe]}`}>
                              {card.tipe.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-gray-500">{card.stokAwal} Pcs</td>
                          <td className={`py-3 px-3 text-center font-bold font-mono ${card.tipe === 'masuk' || card.tipe === 'retur_jual' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {card.tipe === 'masuk' || card.tipe === 'retur_jual' ? '+' : '-'}{card.jumlah} Pcs
                          </td>
                          <td className="py-3 px-3 text-center font-bold font-mono text-gray-900">{card.stokAkhir} Pcs</td>
                          <td className="py-3 px-3 font-mono font-semibold text-indigo-700 text-[10px]">{card.referensiId}</td>
                          <td className="py-3 px-3 text-gray-500">{card.keterangan}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SUBTAB: EXPIRY & LOW STOCK ALERTS */}
      {activeSubTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiry alerts frame */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Analisis Rentang Expiry Date (ED)</span>
            </h3>

            {expiringMeds.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Bersih! Tidak ada obat terdaftar dengan waktu kedaluwarsa kurang dari 12 bulan.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {expiringMeds.map(({ med, status }) => (
                  <div key={med.id} className="p-3.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-semibold text-gray-900">{med.nama}</h4>
                      <p className="text-[10px] text-gray-400">Kategori: {med.kategori} | Rak: {med.lokasiRak}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-bold font-mono ${status.color}`}>
                        {status.label}
                      </span>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">Stok Tersedia: {med.stok} Pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock alerts frame */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Analisis Kritis Stok Kosong</span>
            </h3>

            {lowStockMeds.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Luar biasa! Seluruh stok obat terdaftar saat ini berada dalam level aman.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {lowStockMeds.map(m => (
                  <div key={m.id} className="p-3.5 bg-rose-50/30 hover:bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-semibold text-gray-900">{m.nama}</h4>
                      <p className="text-[10px] text-gray-400">Satuan: {m.satuan} | Rak Penyimpanan: {m.lokasiRak}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-bold text-rose-600 font-mono text-xs">{m.stok} Pcs</p>
                        <p className="text-[9px] text-gray-400 font-mono">Batas Min: {m.stokMin}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUBTAB: STOCK TAKING OPNAME */}
      {activeSubTab === 'opname' && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center justify-between">
            <span>Riwayat Stock Opname Fisik</span>
          </h3>

          {stockOpnames.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Belum ada pencatatan Stock Opname fisik yang disimpan harian.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {stockOpnames.map(op => (
                <div key={op.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-indigo-700">{op.id}</span>
                      <p className="text-[10px] text-gray-400 font-mono">Tanggal: {new Date(op.tanggal).toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 font-mono bg-white border border-gray-200 px-3 py-1 rounded">
                      Auditor: {op.oleh}
                    </span>
                  </div>

                  <div className="border border-gray-100 rounded bg-white overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[9px]">
                          <th className="py-2 px-3">Nama Obat</th>
                          <th className="py-2 px-3 text-center">Stok Sistem</th>
                          <th className="py-2 px-3 text-center">Stok Fisik Diukur</th>
                          <th className="py-2 px-3 text-center">Selisih</th>
                          <th className="py-2 px-3">Keterangan Penyesuaian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {op.items.map((i, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/20">
                            <td className="py-2 px-3 font-semibold text-gray-800">{i.namaObat}</td>
                            <td className="py-2 px-3 text-center font-mono text-gray-500">{i.stokSistem} Pcs</td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-gray-900">{i.stokFisik} Pcs</td>
                            <td className={`py-2 px-3 text-center font-bold font-mono ${i.selisih === 0 ? 'text-gray-500' : i.selisih > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {i.selisih === 0 ? '-' : i.selisih > 0 ? `+${i.selisih}` : i.selisih}
                            </td>
                            <td className="py-2 px-3 text-gray-500">{i.keterangan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STOCK OPNAME FORM BUILDER DIALOG */}
      {showOpnameModal && !isReadOnly && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleConfirmOpname} className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <span>Rancangan Lembar Stock Opname Fisik</span>
              </h3>
              <button type="button" onClick={() => setShowOpnameModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">✕</button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nama Petugas Auditor *</label>
                <input
                  type="text" required value={opnameOleh} onChange={e => setOpnameOleh(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs"
                  placeholder="Contoh: Apoteker Rahmawati"
                />
              </div>

              {/* Add item to opname worksheet */}
              <div className="border border-dashed border-gray-200 p-3 bg-gray-50 rounded-lg space-y-2">
                <h4 className="font-bold text-gray-700 flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tambahkan Item yang Diukur</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <select
                      value={tempObatId} onChange={e => setTempObatId(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded p-1.5 text-xs"
                    >
                      <option value="">-- Pilih Obat --</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>{m.nama} (Stok Sistem: {m.stok} Pcs)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400">Stok Fisik Diukur</label>
                    <input
                      type="number" min="0" value={tempStokFisik} onChange={e => setTempStokFisik(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded p-1 text-xs text-center font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] text-gray-400">Sebab Selisih / Keterangan</label>
                    <input
                      type="text" value={tempKet} onChange={e => setTempKet(e.target.value)}
                      placeholder="Contoh: Obat pecah di rak"
                      className="w-full border border-gray-200 rounded p-1 text-xs"
                    />
                  </div>
                </div>
                
                <button
                  type="button" onClick={addOpnameItem}
                  disabled={!tempObatId}
                  className="w-full bg-indigo-600 disabled:bg-gray-200 hover:bg-indigo-700 text-white p-1 rounded font-semibold text-xs"
                >
                  + Masukkan Lembar Kerja
                </button>
              </div>

              {/* Opname item rosters */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-800">Lembar Kerja Terpilih ({opnameItems.length})</h4>
                {opnameItems.length === 0 ? (
                  <p className="text-gray-400 text-center py-6 bg-gray-50/50 rounded border border-dashed">Belum ada item ditambahkan ke lembar kerja.</p>
                ) : (
                  <div className="border border-gray-100 rounded overflow-hidden divide-y divide-gray-100">
                    {opnameItems.map((item, idx) => {
                      const med = medicines.find(m => m.id === item.obatId);
                      const selisih = item.stokFisik - (med?.stok || 0);
                      return (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-white text-xs">
                          <div>
                            <p className="font-semibold text-gray-800">{med ? med.nama : item.obatId}</p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              Sistem: {med?.stok} | Fisik: {item.stokFisik} | Selisih: <span className={selisih === 0 ? 'text-gray-500' : selisih > 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{selisih > 0 ? `+${selisih}` : selisih}</span>
                            </p>
                          </div>
                          <button
                            type="button" onClick={() => removeOpnameItem(idx)}
                            className="text-gray-400 hover:text-red-500 font-semibold"
                          >
                            Hapus
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button" onClick={() => setShowOpnameModal(false)}
                className="px-3 py-1.5 border border-gray-200 text-xs font-semibold text-gray-600 bg-white rounded-md hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={opnameItems.length === 0}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white text-xs font-semibold rounded-md"
              >
                Simpan & Rekonsiliasi Stok
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
