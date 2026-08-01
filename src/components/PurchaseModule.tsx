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
  Calendar,
  Receipt,
  Building2,
  Sparkles,
  X,
  Calculator,
  Percent,
  ShoppingBag
} from 'lucide-react';

interface PurchaseModuleProps {
  poItemsPrepopulate?: { obatId: string; namaObat: string; jumlah: number; hargaSatuan: number }[] | null;
  clearPOItemsPrepopulate?: () => void;
}

export default function PurchaseModule({ poItemsPrepopulate, clearPOItemsPrepopulate }: PurchaseModuleProps) {
  const {
    currentRole,
    medicines, addMedicine,
    suppliers, addSupplier,
    purchaseOrders, createPurchaseOrder, updatePOStatus,
    receivingGoods, receivePurchaseOrder, createDirectReceiving,
    returnPurchases, returnPurchase,
    supplierDebts, payDebt,
    debtPayments
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'po' | 'terima' | 'retur' | 'hutang'>('po');

  // RBAC check
  const isAuthorized = currentRole === 'admin' || currentRole === 'apoteker';

  // ----------------------------------------
  // SUBTAB: PURCHASE ORDERS (PO) CREATE STATE
  // ----------------------------------------
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ obatId: string; jumlah: number; hargaSatuan: number }[]>([]);
  const [tempObatId, setTempObatId] = useState('');
  const [tempQty, setTempQty] = useState(10);
  const [tempHarga, setTempHarga] = useState(0);

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
    if (!selectedSupplierId || poItems.length === 0) return;

    createPurchaseOrder(selectedSupplierId, poItems);
    
    // Reset state
    setPoItems([]);
    setSelectedSupplierId('');
    alert('Purchase Order (PO) berhasil dibuat dan dipesan harian.');
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

  // Item builder fields (add item line by line)
  const [tempRecvObatId, setTempRecvObatId] = useState('');
  const [tempRecvQty, setTempRecvQty] = useState<number>(10);
  const [tempRecvHarga, setTempRecvHarga] = useState<number>(0);
  const [tempRecvDiskon, setTempRecvDiskon] = useState<number>(0);
  const [tempRecvBatch, setTempRecvBatch] = useState('');
  const [tempRecvExp, setTempRecvExp] = useState('');

  // Quick modals state
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupNama, setNewSupNama] = useState('');
  const [newSupKontak, setNewSupKontak] = useState('');
  const [newSupAlamat, setNewSupAlamat] = useState('');

  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [newMedNama, setNewMedNama] = useState('');
  const [newMedKategori, setNewMedKategori] = useState('Analgesik');
  const [newMedSatuan, setNewMedSatuan] = useState('Tablet');
  const [newMedHargaBeli, setNewMedHargaBeli] = useState(0);
  const [newMedHargaJual, setNewMedHargaJual] = useState(0);
  const [newMedStokMin, setNewMedStokMin] = useState(10);
  const [newMedLokasiRak, setNewMedLokasiRak] = useState('');

  // Fill item details when picking medicine
  useEffect(() => {
    if (tempRecvObatId) {
      const med = medicines.find(m => m.id === tempRecvObatId);
      if (med) {
        setTempRecvHarga(med.hargaBeli);
        setTempRecvBatch(med.batch || 'B-' + Math.random().toString(36).substring(2, 7).toUpperCase());
        setTempRecvExp(med.expiredDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }
    }
  }, [tempRecvObatId, medicines]);

  // Load PO details into form if user selects PO
  const handleSelectPOForReceiving = (poId: string) => {
    setSelectedPOId(poId);
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setRecvSupplierId(po.supplierId);
      const items = po.items.map(item => {
        const med = medicines.find(m => m.id === item.obatId);
        return {
          obatId: item.obatId,
          namaObat: item.namaObat,
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

  const addRecvItem = () => {
    if (!tempRecvObatId || tempRecvQty <= 0) return;
    const med = medicines.find(m => m.id === tempRecvObatId);
    if (!med) return;

    const existsIdx = recvItems.findIndex(i => i.obatId === tempRecvObatId);
    if (existsIdx >= 0) {
      const updated = [...recvItems];
      updated[existsIdx].jumlahDiterima += Number(tempRecvQty);
      if (tempRecvHarga > 0) updated[existsIdx].hargaBeli = Number(tempRecvHarga);
      if (tempRecvDiskon >= 0) updated[existsIdx].diskonPersen = Number(tempRecvDiskon);
      if (tempRecvBatch) updated[existsIdx].batch = tempRecvBatch;
      if (tempRecvExp) updated[existsIdx].expiredDate = tempRecvExp;
      setRecvItems(updated);
    } else {
      setRecvItems(prev => [...prev, {
        obatId: tempRecvObatId,
        namaObat: med.nama,
        jumlahPesan: Number(tempRecvQty),
        jumlahDiterima: Number(tempRecvQty),
        batch: tempRecvBatch || 'B-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        expiredDate: tempRecvExp || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hargaBeli: Number(tempRecvHarga) || med.hargaBeli,
        diskonPersen: Number(tempRecvDiskon) || 0,
        ppnPersen: 11
      }]);
    }

    setTempRecvObatId('');
    setTempRecvQty(10);
    setTempRecvHarga(0);
    setTempRecvDiskon(0);
    setTempRecvBatch('');
    setTempRecvExp('');
  };

  const handleUpdateRecvItemField = (index: number, field: string, val: any) => {
    setRecvItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const removeRecvItem = (index: number) => {
    setRecvItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupNama.trim()) return;
    addSupplier({
      nama: newSupNama.trim(),
      kontak: newSupKontak.trim() || '-',
      alamat: newSupAlamat.trim() || '-'
    });
    setShowAddSupplierModal(false);
    setNewSupNama(''); setNewSupKontak(''); setNewSupAlamat('');
    alert(`Distributor "${newSupNama}" berhasil ditambahkan ke Master Data!`);
  };

  const handleQuickAddMedicineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedNama.trim()) return;
    addMedicine({
      nama: newMedNama.trim(),
      kategori: newMedKategori,
      satuan: newMedSatuan,
      hargaBeli: Number(newMedHargaBeli) || 0,
      hargaJual: Number(newMedHargaJual) || Math.round((Number(newMedHargaBeli) || 0) * 1.25),
      stok: 0,
      batch: 'B-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      expiredDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lokasiRak: newMedLokasiRak || 'Gudang Utama',
      stokMin: Number(newMedStokMin) || 10
    });
    setShowAddMedicineModal(false);
    setNewMedNama(''); setNewMedHargaBeli(0); setNewMedHargaJual(0);
    alert(`Obat "${newMedNama}" berhasil ditambahkan ke Master Data!`);
  };

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recvSupplierId) {
      alert('Mohon pilih Nama Distributor (Supplier) terlebih dahulu.');
      return;
    }
    if (!recvNoFaktur.trim()) {
      alert('Mohon isi Nomor Faktur Pembelian dari distributor.');
      return;
    }
    if (recvItems.length === 0) {
      alert('Daftar item obat masih kosong. Silakan tambahkan minimal 1 item barang.');
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
            Alur harian pemesanan obat ke supplier (Purchase Order), penerimaan fisik (stok FIFO), retur barang rusak, dan pembayaran hutang dagang.
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
                  <div className="sm:col-span-3">
                    <select
                      value={tempObatId}
                      onChange={e => setTempObatId(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
                    >
                      <option value="">-- Pilih Obat --</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>{m.nama} (Stok: {m.stok} | Min: {m.stokMin})</option>
                      ))}
                    </select>
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
              disabled={!selectedSupplierId || poItems.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 text-white p-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
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
            
            {purchaseOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Belum ada data PO yang diterbitkan.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {purchaseOrders.map(po => {
                  const statusColors = {
                    draft: 'bg-gray-100 text-gray-700 border-gray-200',
                    dipesan: 'bg-blue-50 text-blue-700 border-blue-200',
                    diterima: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    batal: 'bg-rose-50 text-rose-700 border-rose-200'
                  };

                  return (
                    <div key={po.id} className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-indigo-700">{po.id}</span>
                          <p className="text-xs font-bold text-gray-900">{po.supplierNama}</p>
                        </div>
                        <span className={`px-2 py-0.5 border rounded text-[9px] font-semibold ${statusColors[po.status]}`}>
                          {po.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100/50 bg-white p-2 rounded border border-gray-100/50 text-[10px] text-gray-600 max-h-[100px] overflow-y-auto">
                        {po.items.map((i, idx) => (
                          <div key={idx} className="py-1 flex justify-between">
                            <span>{i.namaObat} x{i.jumlah}</span>
                            <span className="font-mono">Rp {i.total.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[10px]">
                        <span className="text-gray-400 font-mono">{new Date(po.tanggal).toLocaleString('id-ID')}</span>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 font-mono">Rp {po.total.toLocaleString('id-ID')}</p>
                        </div>
                      </div>

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
                  <span>Formulir Pembelian / Penerimaan Barang Distributor</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Input data faktur distributor, barang yang datang, diskon, PPN 11%, dan rumus otomatis jatuh tempo kredit.
                </p>
              </div>
              {purchaseOrders.filter(p => p.status === 'dipesan').length > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <label className="text-xs font-semibold text-indigo-900 whitespace-nowrap">Load dari PO:</label>
                  <select
                    value={selectedPOId}
                    onChange={e => handleSelectPOForReceiving(e.target.value)}
                    className="border border-indigo-200 bg-white rounded p-1 text-xs font-semibold text-indigo-700"
                  >
                    <option value="">-- Pilih PO Dipesan --</option>
                    {purchaseOrders.filter(p => p.status === 'dipesan').map(po => (
                      <option key={po.id} value={po.id}>{po.id} - {po.supplierNama} (Rp {po.total.toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* STEP 1: DISTRIBUTOR / SUPPLIER SELECTION */}
            <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <span className="bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold">1</span>
                  Pilih Nama Distributor / Supplier (Master Data)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Distributor Baru</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Distributor / Supplier *
                  </label>
                  <select
                    required
                    value={recvSupplierId}
                    onChange={e => setRecvSupplierId(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Pilih Distributor dari Master Data --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nama} {s.kontak ? `(${s.kontak})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {recvSupplierId && (
                  <div className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Distributor Terpilih:</p>
                    <p className="font-bold text-gray-900">
                      {suppliers.find(s => s.id === recvSupplierId)?.nama}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {suppliers.find(s => s.id === recvSupplierId)?.alamat || 'Alamat tidak diisi'}
                    </p>
                  </div>
                )}
              </div>
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

            {/* STEP 3: ITEM LEVEL INPUT (Nama Barang, Qty, Diskon, PPN 11%, Subtotal) */}
            <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <span className="bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold">3</span>
                  Input Item Obat (Nama Barang, Qty, Diskon, PPN 11%, Subtotal)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddMedicineModal(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Obat Baru</span>
                </button>
              </div>

              {/* Item Adder Box */}
              <div className="bg-white p-3.5 border border-gray-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Pilih Obat *</label>
                    <select
                      value={tempRecvObatId}
                      onChange={e => setTempRecvObatId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white font-semibold"
                    >
                      <option value="">-- Pilih Obat dari Master Data --</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nama} (Stok Saat Ini: {m.stok} {m.satuan})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Qty Fisik Masuk *</label>
                    <input
                      type="number" min="1" value={tempRecvQty} onChange={e => setTempRecvQty(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Harga Beli Satuan (Rp)</label>
                    <input
                      type="number" min="0" value={tempRecvHarga} onChange={e => setTempRecvHarga(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Diskon Item (%)</label>
                    <input
                      type="number" min="0" max="100" value={tempRecvDiskon} onChange={e => setTempRecvDiskon(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                      placeholder="0"
                    />
                  </div>

                  <div className="lg:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={addRecvItem}
                      disabled={!tempRecvObatId || tempRecvQty <= 0}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white p-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Item</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">No. Batch Pabrik</label>
                    <input
                      type="text"
                      value={tempRecvBatch}
                      onChange={e => setTempRecvBatch(e.target.value)}
                      placeholder="Contoh: B-89211"
                      className="w-full border border-gray-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">Expired Date (ED)</label>
                    <input
                      type="date"
                      value={tempRecvExp}
                      onChange={e => setTempRecvExp(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Added Line Items Table */}
              {recvItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400 bg-white border border-dashed rounded-xl space-y-1">
                  <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  <p className="font-semibold text-gray-600">Belum ada item obat dimasukkan ke faktur ini.</p>
                  <p className="text-[11px] text-gray-400">Pilih obat di atas lalu klik "Tambah Item" atau muat dari Purchase Order (PO).</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 text-[10px] font-extrabold uppercase">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Nama Obat</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
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
                              <td className="py-2.5 px-3 font-bold text-gray-900">{item.namaObat}</td>
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

            {/* Final Submit Button */}
            <button
              type="submit"
              disabled={!recvSupplierId || !recvNoFaktur.trim() || recvItems.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white p-3.5 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm"
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

      {/* QUICK ADD SUPPLIER MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Tambah Distributor / Supplier Baru</span>
              </h3>
              <button type="button" onClick={() => setShowAddSupplierModal(false)} className="text-indigo-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickAddSupplierSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Nama Distributor / PBF *</label>
                <input
                  type="text" required value={newSupNama} onChange={e => setNewSupNama(e.target.value)}
                  placeholder="Contoh: PT. Kalbe Farma Tbk"
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">No. Telp / Sales Kontak</label>
                <input
                  type="text" value={newSupKontak} onChange={e => setNewSupKontak(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Alamat Kantor / Depo</label>
                <textarea
                  rows={2} value={newSupAlamat} onChange={e => setNewSupAlamat(e.target.value)}
                  placeholder="Jl. Raya PBF No. 123"
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button" onClick={() => setShowAddSupplierModal(false)}
                  className="px-3 py-1.5 border border-gray-200 text-xs font-semibold text-gray-600 bg-white rounded-lg hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                >
                  Simpan Distributor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD MEDICINE MODAL */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Tambah Master Obat Baru</span>
              </h3>
              <button type="button" onClick={() => setShowAddMedicineModal(false)} className="text-indigo-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickAddMedicineSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Nama Obat *</label>
                <input
                  type="text" required value={newMedNama} onChange={e => setNewMedNama(e.target.value)}
                  placeholder="Contoh: Paracetamol 500mg"
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Kategori</label>
                  <select
                    value={newMedKategori} onChange={e => setNewMedKategori(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                  >
                    <option value="Analgesik">Analgesik</option>
                    <option value="Antibiotik">Antibiotik</option>
                    <option value="Vitamin">Vitamin</option>
                    <option value="Obat Bebas">Obat Bebas</option>
                    <option value="Obat Keras">Obat Keras</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Satuan</label>
                  <select
                    value={newMedSatuan} onChange={e => setNewMedSatuan(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Kapsul">Kapsul</option>
                    <option value="Botol">Botol</option>
                    <option value="Strip">Strip</option>
                    <option value="Box">Box</option>
                    <option value="Tube">Tube</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Harga Beli Est. (Rp)</label>
                  <input
                    type="number" min="0" value={newMedHargaBeli} onChange={e => setNewMedHargaBeli(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number" min="0" value={newMedHargaJual} onChange={e => setNewMedHargaJual(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button" onClick={() => setShowAddMedicineModal(false)}
                  className="px-3 py-1.5 border border-gray-200 text-xs font-semibold text-gray-600 bg-white rounded-lg hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                >
                  Simpan Master Obat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
