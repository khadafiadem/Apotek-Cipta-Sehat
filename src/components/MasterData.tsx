/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { Medicine, Supplier, Customer, Doctor } from '../types';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  Users,
  BriefcaseMedical,
  Sparkles,
  Info,
  Layers,
  Archive,
  BookOpen,
  FileSpreadsheet
} from 'lucide-react';
import BatchImportModal from './BatchImportModal';

export default function MasterData() {
  const {
    currentRole,
    medicines, addMedicine, updateMedicine, deleteMedicine,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    customers, addCustomer, updateCustomer, deleteCustomer,
    doctors, addDoctor, updateDoctor, deleteDoctor
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'obat' | 'supplier' | 'pelanggan' | 'dokter'>('obat');
  const [searchTerm, setSearchTerm] = useState('');

  // Form Modals
  const [showModal, setShowModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields - Medicine
  const [medNama, setMedNama] = useState('');
  const [medKategori, setMedKategori] = useState('');
  const [medSatuan, setMedSatuan] = useState('Tablet');
  const [medHargaBeli, setMedHargaBeli] = useState(0);
  const [medHargaJual, setMedHargaJual] = useState(0);
  const [medStok, setMedStok] = useState(0);
  const [medBatch, setMedBatch] = useState('');
  const [medExpiredDate, setMedExpiredDate] = useState('');
  const [medLokasiRak, setMedLokasiRak] = useState('');
  const [medStokMin, setMedStokMin] = useState(10);

  // Form Fields - Supplier
  const [supNama, setSupNama] = useState('');
  const [supKontak, setSupKontak] = useState('');
  const [supAlamat, setSupAlamat] = useState('');

  // Form Fields - Customer
  const [custNama, setCustNama] = useState('');
  const [custKontak, setCustKontak] = useState('');
  const [custAlamat, setCustAlamat] = useState('');

  // Form Fields - Doctor
  const [docNama, setDocNama] = useState('');
  const [docSpesialis, setDocSpesialis] = useState('');
  const [docKontak, setDocKontak] = useState('');

  const isReadOnly = currentRole === 'kasir';

  // Open Add Modal
  const openAddModal = () => {
    if (isReadOnly) return;
    setEditId(null);
    setSearchTerm('');
    
    // Reset med fields
    setMedNama('');
    setMedKategori('Analgesik');
    setMedSatuan('Tablet');
    setMedHargaBeli(0);
    setMedHargaJual(0);
    setMedStok(0);
    setMedBatch('');
    setMedExpiredDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 1 year default
    setMedLokasiRak('');
    setMedStokMin(20);

    // Reset others
    setSupNama(''); setSupKontak(''); setSupAlamat('');
    setCustNama(''); setCustKontak(''); setCustAlamat('');
    setDocNama(''); setDocSpesialis(''); setDocKontak('');

    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (item: any) => {
    if (isReadOnly) return;
    setEditId(item.id);
    
    if (activeSubTab === 'obat') {
      const m = item as Medicine;
      setMedNama(m.nama);
      setMedKategori(m.kategori);
      setMedSatuan(m.satuan);
      setMedHargaBeli(m.hargaBeli);
      setMedHargaJual(m.hargaJual);
      setMedStok(m.stok);
      setMedBatch(m.batch);
      setMedExpiredDate(m.expiredDate);
      setMedLokasiRak(m.lokasiRak);
      setMedStokMin(m.stokMin);
    } else if (activeSubTab === 'supplier') {
      const s = item as Supplier;
      setSupNama(s.nama);
      setSupKontak(s.kontak);
      setSupAlamat(s.alamat);
    } else if (activeSubTab === 'pelanggan') {
      const c = item as Customer;
      setCustNama(c.nama);
      setCustKontak(c.kontak);
      setCustAlamat(c.alamat);
    } else if (activeSubTab === 'dokter') {
      const d = item as Doctor;
      setDocNama(d.nama);
      setDocSpesialis(d.spesialis);
      setDocKontak(d.kontak);
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (activeSubTab === 'obat') {
      const payload = {
        nama: medNama,
        kategori: medKategori,
        satuan: medSatuan,
        hargaBeli: Number(medHargaBeli),
        hargaJual: Number(medHargaJual),
        stok: Number(medStok),
        batch: medBatch || 'BATCH-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        expiredDate: medExpiredDate,
        lokasiRak: medLokasiRak || 'Rak Umum',
        stokMin: Number(medStokMin)
      };

      if (editId) {
        updateMedicine(editId, payload);
      } else {
        addMedicine(payload);
      }
    } else if (activeSubTab === 'supplier') {
      const payload = { nama: supNama, kontak: supKontak, alamat: supAlamat };
      if (editId) updateSupplier(editId, payload);
      else addSupplier(payload);
    } else if (activeSubTab === 'pelanggan') {
      const payload = { nama: custNama, kontak: custKontak, alamat: custAlamat, piutang: 0 };
      if (editId) updateCustomer(editId, payload);
      else addCustomer(payload);
    } else if (activeSubTab === 'dokter') {
      const payload = { nama: docNama, spesialis: docSpesialis, kontak: docKontak };
      if (editId) updateDoctor(editId, payload);
      else addDoctor(payload);
    }

    setShowModal(false);
  };

  // Filter lists based on search term
  const getFilteredData = () => {
    const s = searchTerm.toLowerCase();
    if (activeSubTab === 'obat') {
      return medicines.filter(m =>
        m.nama.toLowerCase().includes(s) ||
        m.kategori.toLowerCase().includes(s) ||
        m.lokasiRak.toLowerCase().includes(s) ||
        m.batch.toLowerCase().includes(s)
      );
    } else if (activeSubTab === 'supplier') {
      return suppliers.filter(sup =>
        sup.nama.toLowerCase().includes(s) ||
        sup.kontak.toLowerCase().includes(s) ||
        sup.alamat.toLowerCase().includes(s)
      );
    } else if (activeSubTab === 'pelanggan') {
      return customers.filter(c =>
        c.nama.toLowerCase().includes(s) ||
        c.kontak.toLowerCase().includes(s) ||
        c.alamat.toLowerCase().includes(s)
      );
    } else if (activeSubTab === 'dokter') {
      return doctors.filter(d =>
        d.nama.toLowerCase().includes(s) ||
        d.spesialis.toLowerCase().includes(s) ||
        d.kontak.toLowerCase().includes(s)
      );
    }
    return [];
  };

  const filteredItems = getFilteredData();

  return (
    <div className="space-y-6" id="master-data-view">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Manajemen Data Master
          </h1>
          <p className="text-sm text-slate-500">
            Kelola data inti apotek termasuk daftar obat-obatan, supplier pengadaan, pelanggan terdaftar, dan dokter rujukan.
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {activeSubTab === 'obat' && (
              <button
                onClick={() => setShowBatchModal(true)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Import Batch Data Obat</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-md font-extrabold tracking-wider uppercase border border-emerald-500/30 hidden sm:inline">
                  Khusus Mohammad Khadafi
                </span>
              </button>
            )}
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah {activeSubTab === 'obat' ? 'Obat' : activeSubTab === 'supplier' ? 'Supplier' : activeSubTab === 'pelanggan' ? 'Pelanggan' : 'Dokter'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setActiveSubTab('obat'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'obat' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100/50'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Data Obat-Obatan</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('supplier'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'supplier' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100/50'}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Supplier / Pemasok</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('pelanggan'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'pelanggan' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100/50'}`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Pelanggan / Customer</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('dokter'); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'dokter' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-slate-100/50'}`}
          >
            <BriefcaseMedical className="w-3.5 h-3.5" />
            <span>Database Dokter</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Cari ${activeSubTab === 'obat' ? 'nama, kategori, rak...' : 'nama, kontak, detail...'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* READ ONLY ROLE WARNING */}
      {isReadOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Hak Akses Terbatas (Kasir):</strong> Anda sedang login sebagai Kasir. Sesuai modul keamanan RBAC, Anda hanya diperbolehkan <strong>membaca</strong> data master obat dan pelanggan untuk kebutuhan POS. Untuk menambah, merubah, atau menghapus data master, silakan beralih ke role <strong>Admin</strong> atau <strong>Apoteker</strong> di bar navigasi atas.
          </p>
        </div>
      )}

      {/* DATA TABLES PANEL */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Tidak ditemukan data master {activeSubTab} yang cocok dengan pencarian Anda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeSubTab === 'obat' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Obat</th>
                    <th className="py-3 px-4">Kategori / Satuan</th>
                    <th className="py-3 px-4 text-right">Harga Beli</th>
                    <th className="py-3 px-4 text-right">Harga Jual</th>
                    <th className="py-3 px-4 text-center">Stok Saat Ini</th>
                    <th className="py-3 px-4">Batch / Exp Date (ED)</th>
                    <th className="py-3 px-4">Rak</th>
                    {!isReadOnly && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredItems.map((item) => {
                    const m = item as Medicine;
                    const isLowStock = m.stok <= m.stokMin;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{m.nama}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] mr-1.5">{m.kategori}</span>
                          <span className="text-gray-500">{m.satuan}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-600">Rp {m.hargaBeli.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-gray-900">Rp {m.hargaJual.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded-sm font-bold ${isLowStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
                            {m.stok} Pcs
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[10px] text-gray-500">Batch: {m.batch}</div>
                          <div className="font-mono text-[10px] font-semibold text-gray-900">ED: {m.expiredDate}</div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-medium">{m.lokasiRak}</td>
                        {!isReadOnly && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(m)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                title="Edit Obat"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteMedicine(m.id)}
                                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                title="Hapus Obat"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeSubTab === 'supplier' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">ID Supplier</th>
                    <th className="py-3 px-4">Nama Supplier / PT</th>
                    <th className="py-3 px-4">Kontak Telepon</th>
                    <th className="py-3 px-4">Alamat Kantor</th>
                    {!isReadOnly && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredItems.map((item) => {
                    const s = item as Supplier;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[10px] text-gray-400">{s.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{s.nama}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">{s.kontak}</td>
                        <td className="py-3.5 px-4 text-gray-500">{s.alamat}</td>
                        {!isReadOnly && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(s)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteSupplier(s.id)}
                                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeSubTab === 'pelanggan' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">ID Pelanggan</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Kontak Telepon</th>
                    <th className="py-3 px-4">Alamat</th>
                    <th className="py-3 px-4 text-right">Saldo Hutang/Piutang</th>
                    {!isReadOnly && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredItems.map((item) => {
                    const c = item as Customer;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[10px] text-gray-400">{c.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{c.nama}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">{c.kontak}</td>
                        <td className="py-3.5 px-4 text-gray-500">{c.alamat}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-red-600">
                          {c.piutang > 0 ? `Rp ${c.piutang.toLocaleString('id-ID')}` : '-'}
                        </td>
                        {!isReadOnly && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(c)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteCustomer(c.id)}
                                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeSubTab === 'dokter' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[10px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Nama Dokter</th>
                    <th className="py-3 px-4">Spesialisasi</th>
                    <th className="py-3 px-4">Kontak HP / Telepon</th>
                    {!isReadOnly && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredItems.map((item) => {
                    const d = item as Doctor;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{d.nama}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-medium">
                            {d.spesialis}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">{d.kontak}</td>
                        {!isReadOnly && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(d)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteDoctor(d.id)}
                                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* DYNAMIC FORM MODAL */}
      {showModal && !isReadOnly && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                {editId ? 'Ubah Data' : 'Tambah Data'} - {activeSubTab === 'obat' ? 'Daftar Obat' : activeSubTab === 'supplier' ? 'Supplier Baru' : activeSubTab === 'pelanggan' ? 'Pelanggan Baru' : 'Dokter Terdaftar'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
            </div>

            {/* Modal Scroll Body */}
            <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-4">
              {activeSubTab === 'obat' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nama Obat *</label>
                    <input
                      type="text" required value={medNama} onChange={e => setMedNama(e.target.value)}
                      placeholder="Contoh: Paracetamol 500mg"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Kategori *</label>
                    <select
                      value={medKategori} onChange={e => setMedKategori(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    >
                      <option value="Analgesik">Analgesik</option>
                      <option value="Antibiotik">Antibiotik</option>
                      <option value="Antihistamin">Antihistamin</option>
                      <option value="Obat Batuk">Obat Batuk</option>
                      <option value="Antidiabetes">Antidiabetes</option>
                      <option value="Kolesterol">Kolesterol</option>
                      <option value="Suplemen">Suplemen</option>
                      <option value="Kortikosteroid">Kortikosteroid</option>
                      <option value="Obat Luar">Obat Luar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Satuan Kemasan *</label>
                    <select
                      value={medSatuan} onChange={e => setMedSatuan(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Kaplet">Kaplet</option>
                      <option value="Botol">Botol</option>
                      <option value="Tube">Tube</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Sachet">Sachet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Harga Beli Kemasan (Rp) *</label>
                    <input
                      type="number" required min="0" value={medHargaBeli} onChange={e => setMedHargaBeli(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Harga Jual Kemasan (Rp) *</label>
                    <input
                      type="number" required min="0" value={medHargaJual} onChange={e => setMedHargaJual(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Stok Registrasi Awal *</label>
                    <input
                      type="number" required min="0" value={medStok} onChange={e => setMedStok(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Stok Batas Minimum Alert *</label>
                    <input
                      type="number" required min="1" value={medStokMin} onChange={e => setMedStokMin(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nomor Batch Prod</label>
                    <input
                      type="text" value={medBatch} onChange={e => setMedBatch(e.target.value)} placeholder="Contoh: B2026-X1"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Lokasi Rak Penyimpanan</label>
                    <input
                      type="text" value={medLokasiRak} onChange={e => setMedLokasiRak(e.target.value)} placeholder="Contoh: Rak A-3"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Tanggal Kedaluwarsa (ED) *</label>
                    <input
                      type="date" required value={medExpiredDate} onChange={e => setMedExpiredDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {activeSubTab === 'supplier' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nama Pemasok / Perusahaan *</label>
                    <input
                      type="text" required value={supNama} onChange={e => setSupNama(e.target.value)} placeholder="Contoh: PT. Indofarma Trading"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Kontak Telepon / HP *</label>
                    <input
                      type="text" required value={supKontak} onChange={e => setSupKontak(e.target.value)} placeholder="Contoh: 0812-9999-8888"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Alamat Kantor Pemasok</label>
                    <textarea
                      value={supAlamat} onChange={e => setSupAlamat(e.target.value)} rows={3} placeholder="Alamat lengkap..."
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeSubTab === 'pelanggan' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nama Lengkap Pelanggan *</label>
                    <input
                      type="text" required value={custNama} onChange={e => setCustNama(e.target.value)} placeholder="Contoh: Pak Slamet"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nomor Kontak WhatsApp / HP *</label>
                    <input
                      type="text" required value={custKontak} onChange={e => setCustKontak(e.target.value)} placeholder="Contoh: 0856-xxxx-xxxx"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Alamat Rumah</label>
                    <textarea
                      value={custAlamat} onChange={e => setCustAlamat(e.target.value)} rows={3} placeholder="Alamat lengkap..."
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeSubTab === 'dokter' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nama Lengkap Dokter (dengan Gelar) *</label>
                    <input
                      type="text" required value={docNama} onChange={e => setDocNama(e.target.value)} placeholder="Contoh: Dr. Herman, Sp.GK"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Keahlian / Spesialisasi *</label>
                    <input
                      type="text" required value={docSpesialis} onChange={e => setDocSpesialis(e.target.value)} placeholder="Contoh: Spesialis Jantung"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Kontak Telefon Praktik</label>
                    <input
                      type="text" value={docKontak} onChange={e => setDocKontak(e.target.value)} placeholder="Contoh: 0811-3333-2222"
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2 bg-slate-50 -mx-5 -mb-5 p-5">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 bg-white transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Batch Import Modal for Mohammad Khadafi */}
      <BatchImportModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
      />
    </div>
  );
}
