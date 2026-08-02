/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { Medicine, Supplier, PurchaseOrder, SupplierDebt } from '../types';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  Truck,
  ArrowRightLeft,
  Coins,
  ShieldX,
  PlusCircle,
  AlertCircle,
  Receipt,
  Calculator,
  ShoppingBag,
  Search
} from 'lucide-react';

interface PurchaseModuleProps {
  poItemsPrepopulate?: { obatId: string; namaObat: string; jumlah: number; hargaSatuan: number }[] | null;
  clearPOItemsPrepopulate?: () => void;
}

export default function PurchaseModule({ poItemsPrepopulate, clearPOItemsPrepopulate }: PurchaseModuleProps) {
  const {
    currentRole,
    medicines,
    suppliers,
    purchaseOrders, createPurchaseOrder, updatePOStatus, approvePurchaseOrder, rejectPurchaseOrder,
    createDirectReceiving,
    returnPurchases, returnPurchase,
    supplierDebts, payDebt
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'po' | 'terima' | 'retur' | 'hutang'>('po');

  // RBAC check
  const isAuthorized = currentRole === 'admin' || currentRole === 'apoteker' || currentRole === 'manager' || currentRole === 'superadmin';

  // Manager approval privileges
  const isManager = currentRole === 'manager' || currentRole === 'superadmin';

  // PO list status filter (radio buttons)
  const [poStatusFilter, setPoStatusFilter] = useState<string>('semua');

  // Rejection dialog state
  const [rejectTargetPO, setRejectTargetPO] = useState<PurchaseOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Resolve PO item name: prefer saved namaObat, fallback to medicines table, then raw obatId
  const getPOItemName = (item: { obatId: string; namaObat?: string }) => {
    if (item.namaObat) return item.namaObat;
    const med = medicines.find(m => m.id === item.obatId);
    return med?.nama || item.obatId;
  };

  // ----------------------------------------
  // SUBTAB: PURCHASE ORDERS (PO) CREATE STATE
  // ----------------------------------------
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ obatId: string; jumlah: number; hargaSatuan: number }[]>([]);
  const [tempObatId, setTempObatId] = useState('');
  const [tempQty, setTempQty] = useState(10);
  const [tempHarga, setTempHarga] = useState(0);
  const [obatSearch, setObatSearch] = useState('');

  // Searchable medicine list (stok kosong tampil paling atas)
  const filteredMeds = medicines
    .filter(m => m.nama.toLowerCase().includes(obatSearch.trim().toLowerCase()))
    .sort(
      (a, b) =>
        (a.stok === 0 ? -1 : 1) - (b.stok === 0 ? -1 : 1) ||
        a.nama.localeCompare(b.nama)
    );

  // Auto-fill from prepopulate
  useEffect(() => {
    if (poItemsPrepopulate && poItemsPrepopulate.length > 0) {
      // Find a supplier who has this medicine, or default to first supplier
      if (suppliers.length > 0) {
        setSelectedSupplierId(suppliers[0].id);
      }
      setPoItems(poItemsPrepopulate.map(p => ({
        obatId: p.obatId,
        jumlah: p.jumlah,
        hargaSatuan: p.hargaSatuan
      })));
      
      // Clear after applying
      if (clearPOItemsPrepopulate) clearPOItemsPrepopulate();
    }
  }, [poItemsPrepopulate]);

  // Adjust temp harga when medicine is selected in draft PO
  useEffect(() => {
    if (tempObatId) {
      const med = medicines.find(m => m.id === tempObatId);
      if (med) {
        setTempHarga(med.hargaBeli);
      }
    }
  }, [tempObatId]);

  const addPOItem = () => {
    if (!tempObatId || tempQty <= 0) return;
    
    // Check if duplicate
    const existsIndex = poItems.findIndex(i => i.obatId === tempObatId);
    if (existsIndex >= 0) {
      const updated = [...poItems];
      updated[existsIndex].jumlah += Number(tempQty);
      setPoItems(updated);
    } else {
      setPoItems(prev => [...prev, {
        obatId: tempObatId,
        jumlah: Number(tempQty),
        hargaSatuan: Number(tempHarga)
      }]);
    }
    setTempObatId('');
    setTempQty(10);
    setTempHarga(0);
  };

  const removePOItem = (index: number) => {
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Mohon pilih Supplier Ditarget terlebih dahulu.');
      return;
    }
    if (poItems.length === 0) {
      alert('Daftar item obat masih kosong. Pilih obat di atas lalu klik "Tambahkan" minimal 1 item.');
      return;
    }

    createPurchaseOrder(selectedSupplierId, poItems);
    
    // Reset state
    setPoItems([]);
    setSelectedSupplierId('');
    alert('Purchase Order (PO) berhasil dibuat dan dikirim untuk persetujuan Manager.');
  };

  // Recommend low stock items
  const loadLowStockRecommendation = () => {
    const lowStockMeds = medicines.filter(m => m.stok === 0);
    if (lowStockMeds.length === 0) {
      alert('Semua stok obat tersedia. Rekomendasi tidak diperlukan.');
      return;
    }
    
    const items = lowStockMeds.map(m => ({
      obatId: m.id,
      jumlah: Math.max(m.stokMin * 2, 10),
      hargaSatuan: m.hargaBeli
    }));
    
    setPoItems(items);
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  };

  // ----------------------------------------
  // SUBTAB: RECEIVING / PURCHASING GOODS (PEMBELIAN FAKTUR DISTRIBUTOR)
  // ----------------------------------------
  const [recvSupplierId, setRecvSupplierId] = useState('');
  const [selectedPOId, setSelectedPOId] = useState('');
  
  // Header Invoice Fields
  const [recvNoFaktur, setRecvNoFaktur] = useState('');
  const [recvTglFaktur, setRecvTglFaktur] = useState(() => new Date().toISOString().split('T')[0]);
  const [recvTglTerima, setRecvTglTerima] = useState(() => new Date().toISOString().split('T')[0]);
  const [recvHariTempo, setRecvHariTempo] = useState<number>(30); // Default 30 hari
  const [recvJatuhTempo, setRecvJatuhTempo] = useState('');
  const [recvCaraBayar, setRecvCaraBayar] = useState<'kredit' | 'tunai'>('kredit');
  const [recvDiskonFaktur, setRecvDiskonFaktur] = useState<number>(0);
  const [recvPpnPersen, setRecvPpnPersen] = useState<number>(11);

  // Auto-calculate Jatuh Tempo based on Tgl Faktur + Hari Tempo (Rumus Otomatis)
  useEffect(() => {
    if (recvTglFaktur) {
      const parts = recvTglFaktur.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const date = new Date(y, m, d);
        date.setDate(date.getDate() + (Number(recvHariTempo) || 0));
        
        const resY = date.getFullYear();
        const resM = String(date.getMonth() + 1).padStart(2, '0');
        const resD = String(date.getDate()).padStart(2, '0');
        setRecvJatuhTempo(`${resY}-${resM}-${resD}`);
      }
    }
  }, [recvTglFaktur, recvHariTempo]);

  // Line items for receiving
  const [recvItems, setRecvItems] = useState<{
    obatId: string;
    namaObat: string;
    jumlahPesan: number;
    jumlahDiterima: number;
    batch: string;
    expiredDate: string;
    hargaBeli: number;
    diskonPersen: number;
    ppnPersen: number;
  }[]>([]);

  // Load PO details into form if user selects PO
  const handleSelectPOForReceiving = (poId: string) => {
    setSelectedPOId(poId);
    if (!poId) {
      setRecvItems([]);
      setRecvSupplierId('');
      return;
    }
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setRecvSupplierId(po.supplierId);
      const items = po.items.map(item => {
        const med = medicines.find(m => m.id === item.obatId);
        return {
          obatId: item.obatId,
          namaObat: item.namaObat || med?.nama || item.obatId,
          jumlahPesan: item.jumlah,
          jumlahDiterima: item.jumlah,
          batch: med?.batch || 'B-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          expiredDate: med?.expiredDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          hargaBeli: item.hargaSatuan,
          diskonPersen: 0,
          ppnPersen: 11
        };
      });
      setRecvItems(items);
    }
  };

  const handleUpdateRecvItemField = (index: number, field: string, val: any) => {
    setRecvItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const removeRecvItem = (index: number) => {
    setRecvItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOId) {
      alert('Mohon pilih PO yang barangnya datang terlebih dahulu.');
      return;
    }
    if (!recvNoFaktur.trim()) {
      alert('Mohon isi Nomor Faktur Pembelian dari distributor.');
      return;
    }
    if (recvItems.length === 0) {
      alert('Item barang masih kosong. Pastikan PO yang dipilih memiliki item obat.');
      return;
    }

    createDirectReceiving({
      supplierId: recvSupplierId,
      noFaktur: recvNoFaktur.trim(),
      tglFaktur: recvTglFaktur,
      tglTerima: recvTglTerima,
      hariTempo: Number(recvHariTempo) || 30,
      jatuhTempo: recvCaraBayar === 'kredit' ? recvJatuhTempo : undefined,
      itemsReceived: recvItems,
      caraBayar: recvCaraBayar,
      poId: selectedPOId || undefined,
      diskonFaktur: Number(recvDiskonFaktur) || 0,
      ppnPersen: Number(recvPpnPersen) || 11
    });

    // Reset Form
    setSelectedPOId('');
    setRecvSupplierId('');
    setRecvNoFaktur('');
    setRecvItems([]);
    setRecvDiskonFaktur(0);
    alert(`Penerimaan barang Faktur No. ${recvNoFaktur} dari distributor berhasil dicatat! Stok obat bertambah secara otomatis.`);
  };

  // ----------------------------------------
  // SUBTAB: RETURN PURCHASES STATE
  // ----------------------------------------
  const [retSupplierId, setRetSupplierId] = useState('');
  const [retObatId, setRetObatId] = useState('');
  const [retQty, setRetQty] = useState(1);
  const [retAlasan, setRetAlasan] = useState('');

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retSupplierId || !retObatId || retQty <= 0 || !retAlasan) return;

    const med = medicines.find(m => m.id === retObatId);
    if (!med || med.stok < retQty) {
      alert(`Gagal retur: Stok obat ${med?.nama || ''} tidak mencukupi. Tersedia: ${med?.stok || 0}`);
      return;
    }

    returnPurchase(retSupplierId, [
      { obatId: retObatId, jumlah: Number(retQty), alasan: retAlasan }
    ]);

    // Reset
    setRetObatId('');
    setRetQty(1);
    setRetAlasan('');
    alert('Retur pembelian berhasil dicatat. Stok gudang didebit otomatis.');
  };

  // ----------------------------------------
  // SUBTAB: DEBT PAYMENTS STATE
  // ----------------------------------------
  const [showPayDebtModal, setShowPayDebtModal] = useState(false);
  const [targetDebt, setTargetDebt] = useState<SupplierDebt | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState(0);
  const [debtPayMethod, setDebtPayMethod] = useState('Tunai');

  const openPayDebt = (debt: SupplierDebt) => {
    setTargetDebt(debt);
    setDebtPayAmount(debt.sisaHutang);
    setShowPayDebtModal(true);
  };

  const handleConfirmPayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDebt || debtPayAmount <= 0) return;

    payDebt(targetDebt.id, debtPayAmount, debtPayMethod);
    setShowPayDebtModal(false);
    setTargetDebt(null);
    alert('Pembayaran hutang supplier berhasil didebet dari Kas harian.');
  };

  // Guard view with unauthorized layout
  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center space-y-4 shadow-xs" id="purchase-lock">
        <ShieldX className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Hak Akses Ditolak</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Modul Pembelian & Pengadaan obat ini adalah area terbatas. Hanya akun dengan hak akses <strong>Apoteker</strong> atau <strong>Admin</strong> yang berwenang untuk merancang PO, menerima stok fisik, meretur, dan melunasi hutang supplier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="purchase-view">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Modul Pengadaan & Pembelian
          </h1>
          <p className="text-sm text-gray-500">
            Alur harian pemesanan obat ke supplier (Purchase Order), verifikasi penerimaan barang datang (stok FIFO), retur barang rusak, dan pembayaran hutang dagang. Barang yang datang tidak perlu diinput ulang — cukup pilih PO dan cek kesesuaiannya.
          </p>
        </div>
      </div>

      {/* Procurement subtabs */}
      <div className="flex flex-wrap gap-1 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100 w-fit">
        <button
          onClick={() => setActiveSubTab('po')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'po' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Buat PO Baru</span>
        </button>
        <button
          onClick={() => setActiveSubTab('terima')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'terima' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Penerimaan Barang</span>
        </button>
        <button
          onClick={() => setActiveSubTab('retur')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'retur' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Retur Pembelian</span>
        </button>
        <button
          onClick={() => setActiveSubTab('hutang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'hutang' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Buku Hutang Supplier ({supplierDebts.filter(d => d.status === 'belum_lunas').length})</span>
        </button>
      </div>

      {/* 1. SUBTAB: CREATE PURCHASE ORDER */}
      {activeSubTab === 'po' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create form builder */}
          <form onSubmit={handleCreatePO} className="lg:col-span-7 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center justify-between">
              <span>Formulir Rencana PO</span>
              <button
                type="button"
                onClick={loadLowStockRecommendation}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded"
              >
                Isi Rekomendasi Stok Kosong
              </button>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pilih Supplier Ditarget *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>

              {/* Add item picker */}
              <div className="sm:col-span-2 border border-dashed border-gray-200 p-4 rounded-lg bg-gray-50/50 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tambahkan Item Obat</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={obatSearch}
                        onChange={e => setObatSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                        placeholder="Cari nama obat untuk dipesan… (mis. amoxicillin)"
                        autoComplete="off"
                        className="w-full border border-gray-200 bg-white rounded-lg pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 max-h-44 overflow-y-auto">
                      {filteredMeds.length === 0 ? (
                        <div className="p-3 text-xs text-gray-400 text-center">
                          Obat "{obatSearch}" tidak ditemukan.
                        </div>
                      ) : (
                        filteredMeds.map(m => {
                          const selected = tempObatId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setTempObatId(m.id)}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                                selected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-indigo-50/50'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">
                                  {m.nama}
                                  {m.stok === 0 && (
                                    <span className="ml-1.5 text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1 py-0.5 align-middle">KOSONG</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono">
                                  Stok: {m.stok} | Min: {m.stokMin} | Harga Beli: Rp {m.hargaBeli.toLocaleString('id-ID')}
                                </p>
                              </div>
                              {selected && <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Jumlah (Pcs/Botol)</label>
                    <input
                      type="number" min="1" value={tempQty} onChange={e => setTempQty(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Estimasi Harga Beli (Rp)</label>
                    <input
                      type="number" min="0" value={tempHarga} onChange={e => setTempHarga(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addPOItem}
                      disabled={!tempObatId}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white p-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambahkan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* List of items in current draft PO */}
            <div className="space-y-2 border-t border-gray-50 pt-3">
              <h4 className="text-xs font-bold text-gray-800">Daftar Rencana Item ({poItems.length})</h4>
              
              {poItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50/20 border rounded-lg border-dashed">
                  Draft item kosong. Pilih obat di atas atau muat rekomendasi stok kosong.
                </div>
              ) : (
                <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100 text-xs">
                  {poItems.map((item, idx) => {
                    const med = medicines.find(m => m.id === item.obatId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50/50 transition-colors">
                        <div>
                          <p className="font-semibold text-gray-900">{med ? med.nama : 'Unknown'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Qty: {item.jumlah} Pcs x Rp {item.hargaSatuan.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-gray-900">
                            Rp {(item.jumlah * item.hargaSatuan).toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button" onClick={() => removePOItem(idx)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Summary */}
                  <div className="p-3 bg-gray-50 flex items-center justify-between font-bold text-gray-900 font-mono">
                    <span>Estimasi Total:</span>
                    <span className="text-indigo-700 text-sm">
                      Rp {poItems.reduce((sum, item) => sum + item.jumlah * item.hargaSatuan, 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`w-full p-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs ${
                selectedSupplierId && poItems.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Simpan & Kirim Purchase Order</span>
            </button>
          </form>

          {/* Right sidebar: List of POs */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              Daftar Riwayat PO ({purchaseOrders.length})
            </h3>

            {/* Radio button status filter */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'semua', label: 'Semua' },
                { key: 'menunggu_approval', label: 'Menunggu Approval' },
                { key: 'approve', label: 'Approve' },
                { key: 'dipesan', label: 'Dipesan' },
                { key: 'diterima', label: 'Diterima' },
                { key: 'di_reject', label: 'Di Reject' }
              ].map(opt => (
                <label
                  key={opt.key}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors ${
                    poStatusFilter === opt.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="poStatusFilter"
                    value={opt.key}
                    checked={poStatusFilter === opt.key}
                    onChange={() => setPoStatusFilter(opt.key)}
                    className="w-3 h-3 accent-white"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {purchaseOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Belum ada data PO yang diterbitkan.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {purchaseOrders
                  .filter(po => poStatusFilter === 'semua' || po.status === poStatusFilter)
                  .map(po => {
                  const statusColors: Record<string, string> = {
                    draft: 'bg-gray-100 text-gray-700 border-gray-200',
                    menunggu_approval: 'bg-amber-50 text-amber-700 border-amber-200',
                    approve: 'bg-teal-50 text-teal-700 border-teal-200',
                    dipesan: 'bg-blue-50 text-blue-700 border-blue-200',
                    diterima: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    di_reject: 'bg-rose-50 text-rose-700 border-rose-200',
                    batal: 'bg-gray-100 text-gray-500 border-gray-200'
                  };
                  const statusLabels: Record<string, string> = {
                    draft: 'Draft', menunggu_approval: 'Menunggu Approval', approve: 'Approve',
                    dipesan: 'Dipesan', diterima: 'Diterima', di_reject: 'Di Reject', batal: 'Batal'
                  };

                  return (
                    <div key={po.id} className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-indigo-700">{po.id}</span>
                          <p className="text-xs font-bold text-gray-900">{po.supplierNama}</p>
                        </div>
                        <span className={`px-2 py-0.5 border rounded text-[9px] font-semibold ${statusColors[po.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {statusLabels[po.status] || po.status}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100/50 bg-white p-2 rounded border border-gray-100/50 text-[10px] text-gray-600 max-h-[100px] overflow-y-auto">
                        {po.items.map((i, idx) => (
                          <div key={idx} className="py-1 flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-gray-800">{getPOItemName(i)}</span>
                            <span className="font-mono whitespace-nowrap bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">x{i.jumlah}</span>
                            <span className="font-mono whitespace-nowrap">Rp {i.total.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[10px]">
                        <span className="text-gray-400 font-mono">{new Date(po.tanggal).toLocaleString('id-ID')}</span>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 font-mono">Rp {po.total.toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      {po.status === 'di_reject' && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[10px] space-y-0.5">
                          <p className="font-bold text-rose-700 flex items-center gap-1">
                            <ShieldX className="w-3 h-3" />
                            Ditolak oleh {po.approvedBy || 'Manager'}
                          </p>
                          {po.alasanReject && (
                            <p className="text-rose-600">Alasan: {po.alasanReject}</p>
                          )}
                        </div>
                      )}

                      {po.status === 'menunggu_approval' && (
                        isManager ? (
                          <div className="flex gap-1 border-t border-gray-100 pt-2">
                            <button
                              onClick={() => approvePurchaseOrder(po.id)}
                              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-1 rounded text-[10px] font-semibold transition-colors text-center"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectTargetPO(po); setRejectReason(''); }}
                              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 p-1 rounded text-[10px] font-semibold transition-colors text-center"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] font-semibold text-amber-800 text-center">
                            Menunggu persetujuan Manager
                          </div>
                        )
                      )}

                      {po.status === 'approve' && (
                        <div className="flex gap-1 border-t border-gray-100 pt-2">
                          <button
                            onClick={() => updatePOStatus(po.id, 'dipesan')}
                            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 p-1 rounded text-[10px] font-semibold transition-colors text-center"
                          >
                            Kirim ke Supplier
                          </button>
                          <button
                            onClick={() => updatePOStatus(po.id, 'batal')}
                            className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 p-1 rounded text-[10px] font-semibold transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      )}

                      {po.status === 'dipesan' && (
                        <div className="flex gap-1 border-t border-gray-100 pt-2">
                          <button
                            onClick={() => {
                              setActiveSubTab('terima');
                              handleSelectPOForReceiving(po.id);
                            }}
                            className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-1 rounded text-[10px] font-semibold transition-colors text-center"
                          >
                            Proses Penerimaan Barang
                          </button>
                          <button
                            onClick={() => updatePOStatus(po.id, 'batal')}
                            className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 p-1 rounded text-[10px] font-semibold transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SUBTAB: VALIDATE RECEIVING / PURCHASING GOODS FROM DISTRIBUTOR */}
      {activeSubTab === 'terima' && (
        <form onSubmit={handleSubmitReceipt} className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  <span>Formulir Penerimaan / Verifikasi Barang Datang</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Barang yang datang otomatis dimuat dari PO — tanpa mengetik ulang. Cukup cek & verifikasi kesesuaian antara item di PO dengan barang fisik yang tiba.
                </p>
              </div>
            </div>

            {/* STEP 1: PILIH PO YANG DATANG (item otomatis terisi dari PO) */}
            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <span className="bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold">1</span>
                Pilih PO yang Barangnya Datang *
              </span>

              {purchaseOrders.filter(p => p.status === 'dipesan').length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-amber-900">Belum ada PO berstatus "Dipesan".</p>
                    <p className="text-[11px] text-amber-800">
                      Buat & kirim PO terlebih dahulu di tab <strong>Buat PO Baru</strong> sebelum menerima barang.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <label className="text-xs font-bold text-indigo-900 whitespace-nowrap">
                      Pilih PO:
                    </label>
                  </div>
                  <select
                    required
                    value={selectedPOId}
                    onChange={e => handleSelectPOForReceiving(e.target.value)}
                    className="w-full sm:w-auto flex-1 border border-indigo-200 bg-white rounded p-2 text-xs font-semibold text-indigo-700"
                  >
                    <option value="">-- Pilih PO yang datang (item otomatis terisi) --</option>
                    {purchaseOrders.filter(p => p.status === 'dipesan').map(po => (
                      <option key={po.id} value={po.id}>{po.id} - {po.supplierNama} ({po.items.length} item, Rp {po.total.toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPOId && (() => {
                const po = purchaseOrders.find(p => p.id === selectedPOId);
                if (!po) return null;
                return (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-900">
                        Distributor: {po.supplierNama}
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        {po.items.length} item otomatis dimuat dari PO {po.id} — tidak perlu mengetik ulang. Cukup cek Qty Diterima, No. Batch & ED tiap baris di bawah.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* STEP 2: FAKTUR HEADER & RUMUS JATUH TEMPO */}
            <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <span className="bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold">2</span>
                Header Faktur & Rumus Jatuh Tempo
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    No. Faktur Distributor *
                  </label>
                  <input
                    type="text"
                    required
                    value={recvNoFaktur}
                    onChange={e => setRecvNoFaktur(e.target.value)}
                    placeholder="Contoh: FAK-2026/08/001"
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Tanggal Faktur *
                  </label>
                  <input
                    type="date"
                    required
                    value={recvTglFaktur}
                    onChange={e => setRecvTglFaktur(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Tanggal Terima Barang *
                  </label>
                  <input
                    type="date"
                    required
                    value={recvTglTerima}
                    onChange={e => setRecvTglTerima(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Metode Pembayaran *
                  </label>
                  <select
                    value={recvCaraBayar}
                    onChange={e => setRecvCaraBayar(e.target.value as any)}
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="kredit">Kredit (Buku Hutang Supplier)</option>
                    <option value="tunai">Tunai (Bayar dari Kasir / Laci Kas)</option>
                  </select>
                </div>
              </div>

              {/* Due Date Automatic Formula Calculation Box */}
              {recvCaraBayar === 'kredit' && (
                <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-lg text-xs space-y-2 mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Calculator className="w-4 h-4 text-amber-600" />
                      <span>Otomatisasi Rumus Jatuh Tempo Kredit:</span>
                    </div>

                    {/* Quick Preset Days */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-amber-800 font-semibold mr-1">Pilih Tempo:</span>
                      {[14, 30, 45, 60].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setRecvHariTempo(days)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            recvHariTempo === days
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {days} Hari
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-0.5">Tempo Pembayaran (Hari)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={recvHariTempo}
                        onChange={e => setRecvHariTempo(Number(e.target.value))}
                        className="w-full border border-amber-300 rounded bg-white p-1.5 text-xs font-mono font-bold text-amber-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-0.5">
                        Hasil Rumus Jatuh Tempo (Tgl Faktur + {recvHariTempo} Hari)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          required
                          value={recvJatuhTempo}
                          onChange={e => setRecvJatuhTempo(e.target.value)}
                          className="w-full border border-amber-300 rounded bg-white p-1.5 text-xs font-mono font-bold text-indigo-900 shadow-2xs"
                        />
                        <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2.5 py-1.5 rounded whitespace-nowrap">
                          💡 {recvTglFaktur ? `${recvTglFaktur.split('-').reverse().join('/')}` : ''} + {recvHariTempo} Hari = {recvJatuhTempo ? `${recvJatuhTempo.split('-').reverse().join('/')}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: VERIFIKASI BARANG DATANG (otomatis dari PO) */}
            <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <span className="bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold">3</span>
                Verifikasi Barang Datang (Item otomatis dari PO)
              </span>

              {selectedPOId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">
                      {recvItems.length} item otomatis dimuat dari PO — tanpa mengetik ulang.
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Cukup cek kesesuaian dengan barang fisik: sesuaikan Qty Diterima bila ada selisih, serta isi No. Batch dan Expired Date (ED) tiap baris.
                    </p>
                  </div>
                </div>
              )}

              {/* Added Line Items Table */}
              {recvItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400 bg-white border border-dashed rounded-xl space-y-1">
                  <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  <p className="font-semibold text-gray-600">
                    {selectedPOId ? 'Item dari PO sedang dimuat…' : 'Belum ada item barang untuk diverifikasi.'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {selectedPOId ? 'Jika item tidak muncul, pilih ulang PO di bagian atas.' : 'Pilih PO yang barangnya datang di bagian atas agar item otomatis terisi — tanpa mengetik ulang.'}
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 text-[10px] font-extrabold uppercase">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Nama Obat</th>
                          <th className="py-2.5 px-3 text-center">Qty Pesan (PO)</th>
                          <th className="py-2.5 px-3 text-center">Qty Diterima</th>
                          <th className="py-2.5 px-3 text-right">Harga Beli</th>
                          <th className="py-2.5 px-3 text-center">Diskon (%)</th>
                          <th className="py-2.5 px-3 text-center">PPN 11%</th>
                          <th className="py-2.5 px-3">Batch & ED</th>
                          <th className="py-2.5 px-3 text-right">Jumlah (Subtotal)</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recvItems.map((item, idx) => {
                          const gross = item.jumlahDiterima * item.hargaBeli;
                          const disc = (gross * (item.diskonPersen || 0)) / 100;
                          const dpp = gross - disc;
                          const ppn = (dpp * (item.ppnPersen !== undefined ? item.ppnPersen : 11)) / 100;
                          const nett = dpp + ppn;

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-gray-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-extrabold text-gray-900">
                                {item.namaObat || medicines.find(m => m.id === item.obatId)?.nama || 'Obat Tanpa Nama'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-600">
                                {item.jumlahPesan}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number" min="1" value={item.jumlahDiterima}
                                  onChange={e => handleUpdateRecvItemField(idx, 'jumlahDiterima', Number(e.target.value))}
                                  className="w-16 border border-gray-200 rounded p-1 text-xs text-center font-mono font-bold"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number" min="0" value={item.hargaBeli}
                                  onChange={e => handleUpdateRecvItemField(idx, 'hargaBeli', Number(e.target.value))}
                                  className="w-24 border border-gray-200 rounded p-1 text-xs text-right font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="number" min="0" max="100" value={item.diskonPersen}
                                  onChange={e => handleUpdateRecvItemField(idx, 'diskonPersen', Number(e.target.value))}
                                  className="w-16 border border-gray-200 rounded p-1 text-xs text-center font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-emerald-700 bg-emerald-50/30">
                                11%
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px]">
                                <div className="space-y-0.5">
                                  <input
                                    type="text" value={item.batch}
                                    onChange={e => handleUpdateRecvItemField(idx, 'batch', e.target.value)}
                                    placeholder="Batch" className="w-20 border border-gray-200 rounded p-0.5 text-[10px]"
                                  />
                                  <input
                                    type="date" value={item.expiredDate}
                                    onChange={e => handleUpdateRecvItemField(idx, 'expiredDate', e.target.value)}
                                    className="w-28 border border-gray-200 rounded p-0.5 text-[10px]"
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 text-xs">
                                Rp {Math.round(nett).toLocaleString('id-ID')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button" onClick={() => removeRecvItem(idx)}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                  title="Hapus Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations & Summary Footer Box */}
                  {(() => {
                    const grossTotal = recvItems.reduce((sum, item) => sum + item.jumlahDiterima * item.hargaBeli, 0);
                    const totalDiskon = recvItems.reduce((sum, item) => sum + (item.jumlahDiterima * item.hargaBeli * (item.diskonPersen || 0)) / 100, 0);
                    const dpp = Math.max(0, grossTotal - totalDiskon - (Number(recvDiskonFaktur) || 0));
                    const ppn11 = Math.round(dpp * 0.11);
                    const grandTotal = dpp + ppn11;

                    return (
                      <div className="p-4 bg-slate-900 text-white rounded-b-xl space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-800 pb-3">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Gross (Bruto):</span>
                            <p className="font-mono font-bold text-slate-200">Rp {grossTotal.toLocaleString('id-ID')}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Diskon Item:</span>
                            <p className="font-mono font-bold text-amber-400">- Rp {totalDiskon.toLocaleString('id-ID')}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">Diskon Faktur (Rp):</span>
                            <input
                              type="number"
                              min="0"
                              value={recvDiskonFaktur}
                              onChange={e => setRecvDiskonFaktur(Number(e.target.value))}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs text-amber-300 font-mono mt-0.5"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">PPN 11% (Otomatis):</span>
                            <p className="font-mono font-bold text-emerald-400">+ Rp {ppn11.toLocaleString('id-ID')}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">DPP (Dasar Pengenaan Pajak):</p>
                            <p className="text-sm font-mono font-bold text-slate-300">Rp {dpp.toLocaleString('id-ID')}</p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-extrabold">GRAND TOTAL FAKTUR:</span>
                            <p className="text-2xl font-mono font-black text-emerald-400">
                              Rp {grandTotal.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Dynamic Form Validation Status Banner */}
            {(!selectedPOId || !recvNoFaktur.trim() || recvItems.length === 0) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Lengkapi Syarat Berikut Agar Transaksi Dapat Diselesaikan:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className={`p-2 rounded-lg border font-semibold flex items-center gap-1.5 ${selectedPOId ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-amber-800 border-amber-200'}`}>
                    <span>{selectedPOId ? '✓' : '⚠️'}</span>
                    <span>1. PO Datang: {selectedPOId ? 'Sudah Dipilih' : 'Belum Dipilih'}</span>
                  </div>
                  <div className={`p-2 rounded-lg border font-semibold flex items-center gap-1.5 ${recvNoFaktur.trim() ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-amber-800 border-amber-200'}`}>
                    <span>{recvNoFaktur.trim() ? '✓' : '⚠️'}</span>
                    <span>2. No. Faktur: {recvNoFaktur.trim() ? 'Sudah Diisi' : 'Belum Diisi'}</span>
                  </div>
                  <div className={`p-2 rounded-lg border font-semibold flex items-center gap-1.5 ${recvItems.length > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-amber-800 border-amber-200'}`}>
                    <span>{recvItems.length > 0 ? '✓' : '⚠️'}</span>
                    <span>3. Item Barang: {recvItems.length > 0 ? `${recvItems.length} Item Dari PO` : 'Pilih PO di bagian atas'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Final Submit Button */}
            <button
              type="submit"
              className={`w-full p-3.5 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm ${
                selectedPOId && recvNoFaktur.trim() && recvItems.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ring-2 ring-emerald-500/20'
                  : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>Selesaikan & Masukkan Gudang Apotek</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. SUBTAB: RETURN PURCHASE */}
      {activeSubTab === 'retur' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Return form */}
          <form onSubmit={handleCreateReturn} className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              Formulir Retur Barang ke Supplier
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pilih Supplier Dituju *</label>
                <select
                  required value={retSupplierId} onChange={e => setRetSupplierId(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pilih Item Obat yang Diretur *</label>
                <select
                  required value={retObatId} onChange={e => setRetObatId(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
                >
                  <option value="">-- Pilih Obat --</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.nama} (Stok: {m.stok} Pcs | Exp: {m.expiredDate})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Jumlah Diretur *</label>
                  <input
                    type="number" min="1" required value={retQty} onChange={e => setRetQty(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Alasan Retur *</label>
                  <select
                    required value={retAlasan} onChange={e => setRetAlasan(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Pilih Alasan --</option>
                    <option value="Kemasan Rusak / Bocor">Kemasan Rusak / Bocor</option>
                    <option value="Mendekati ED / Kadaluwarsa">Mendekati ED / Kadaluwarsa</option>
                    <option value="Salah Kirim Barang">Salah Kirim Barang</option>
                    <option value="Cacat Produksi Pabrik">Cacat Produksi Pabrik</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Simpan Retur Pembelian</span>
            </button>
          </form>

          {/* List of returned purchases logs */}
          <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              Histori Logs Retur Pembelian ({returnPurchases.length})
            </h3>

            {returnPurchases.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Belum ada histori transaksi retur dicatat.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {returnPurchases.map(r => (
                  <div key={r.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-indigo-700">{r.id}</span>
                      <span className="text-gray-400 font-mono">{new Date(r.tanggal).toLocaleString('id-ID')}</span>
                    </div>
                    <p className="font-bold text-gray-900">{r.supplierNama}</p>
                    
                    <div className="bg-white p-2 rounded border border-gray-100 text-[10px] text-gray-600">
                      {r.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{i.namaObat} (x{i.jumlah})</span>
                          <span className="font-mono font-semibold">Rp {i.total.toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-amber-700 font-medium">Alasan: {r.alasan}</span>
                      <p className="font-bold text-emerald-700 font-mono">Refund: Rp {r.totalRefund.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SUBTAB: SUPPLIER DEBTS */}
      {activeSubTab === 'hutang' && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div className="border-b border-gray-50 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Buku Catatan Hutang Dagang (Pemasok)
            </h3>
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
              Sisa Hutang Berjalan: Rp {supplierDebts.reduce((sum, d) => sum + d.sisaHutang, 0).toLocaleString('id-ID')}
            </span>
          </div>

          {supplierDebts.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Hebat! Apotek Anda saat ini bersih dari hutang dagang supplier.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase">
                    <th className="py-3 px-3">No. Jurnal</th>
                    <th className="py-3 px-3">Nama Supplier</th>
                    <th className="py-3 px-3">Asal Faktur (Receipt)</th>
                    <th className="py-3 px-3 text-right">Nilai Total</th>
                    <th className="py-3 px-3 text-right">Sisa Hutang *</th>
                    <th className="py-3 px-3">Jatuh Tempo</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {supplierDebts.map(debt => {
                    const isOverdue = new Date(debt.jatuhTempo) < new Date() && debt.status === 'belum_lunas';
                    return (
                      <tr key={debt.id} className="hover:bg-gray-50/20">
                        <td className="py-3.5 px-3 font-mono text-[10px] text-gray-400">{debt.id}</td>
                        <td className="py-3.5 px-3 font-semibold text-gray-900">{debt.supplierNama}</td>
                        <td className="py-3.5 px-3 font-mono text-[10px] text-indigo-700">{debt.referensiId}</td>
                        <td className="py-3.5 px-3 text-right font-mono">Rp {debt.jumlahTotal.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-red-600">Rp {debt.sisaHutang.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 px-3">
                          <div className="font-mono text-[11px] font-semibold text-gray-900">{debt.jatuhTempo}</div>
                          {isOverdue && <span className="text-[9px] text-rose-600 font-bold uppercase">Jatuh Tempo!</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${debt.status === 'lunas' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                            {debt.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {debt.status === 'belum_lunas' ? (
                            <button
                              onClick={() => openPayDebt(debt)}
                              className="px-2 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                            >
                              Bayar Hutang
                            </button>
                          ) : (
                            <span className="text-gray-400 font-medium text-[10px]">Lunas</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. PAY DEBT MODAL */}
      {showPayDebtModal && targetDebt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleConfirmPayDebt} className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-sm w-full overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Pelunasan Hutang Supplier</span>
              </h3>
              <button type="button" onClick={() => setShowPayDebtModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-3 rounded border border-gray-100 text-xs space-y-1">
                <p className="text-gray-500">Supplier: <strong className="text-gray-800">{targetDebt.supplierNama}</strong></p>
                <p className="text-gray-500">Referensi Faktur: <strong className="text-gray-800 font-mono">{targetDebt.referensiId}</strong></p>
                <p className="text-gray-500">Sisa Tagihan: <strong className="text-red-600 font-mono">Rp {targetDebt.sisaHutang.toLocaleString('id-ID')}</strong></p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Jumlah Bayar Diangsur (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={targetDebt.sisaHutang}
                  value={debtPayAmount}
                  onChange={e => setDebtPayAmount(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Sumber Rekening Kas *</label>
                <select
                  value={debtPayMethod}
                  onChange={e => setDebtPayMethod(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
                >
                  <option value="Tunai">Kas Laci Utama (Cash)</option>
                  <option value="Transfer Bank BCA">Giro/Transfer BCA</option>
                  <option value="Transfer Bank Mandiri">Giro/Transfer Mandiri</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 p-4 flex items-center justify-end gap-2 border-t border-gray-100">
              <button
                type="button" onClick={() => setShowPayDebtModal(false)}
                className="px-3 py-1.5 border border-gray-200 text-xs font-semibold text-gray-600 bg-white rounded-md hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md"
              >
                Konfirmasi Pelunasan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REJECT PO REASON DIALOG */}
      {rejectTargetPO && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!rejectReason.trim()) {
                alert('Alasan penolakan wajib diisi.');
                return;
              }
              rejectPurchaseOrder(rejectTargetPO.id, rejectReason.trim());
              setRejectTargetPO(null);
              setRejectReason('');
            }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-md w-full overflow-hidden"
          >
            <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <ShieldX className="w-4 h-4 text-rose-600" />
                <span>Penolakan Purchase Order</span>
              </h3>
              <button type="button" onClick={() => setRejectTargetPO(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-[10px] space-y-0.5">
                <p className="font-mono font-bold text-indigo-700">{rejectTargetPO.id}</p>
                <p className="font-bold text-gray-900">{rejectTargetPO.supplierNama}</p>
                <p className="text-gray-500 font-mono">Total: Rp {rejectTargetPO.total.toLocaleString('id-ID')}</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Alasan Penolakan *
                </label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Harga tidak sesuai anggaran, item perlu dikurangi, supplier kurang terpercaya…"
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button" onClick={() => setRejectTargetPO(null)}
                className="px-3 py-1.5 border border-gray-200 text-xs font-semibold text-gray-600 bg-white rounded-md hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md"
              >
                Tolak & Simpan Alasan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
