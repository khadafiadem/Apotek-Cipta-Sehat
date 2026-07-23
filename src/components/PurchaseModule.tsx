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
  Receipt
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
    purchaseOrders, createPurchaseOrder, updatePOStatus,
    receivingGoods, receivePurchaseOrder,
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
  // SUBTAB: RECEIVING GOODS (PENERIMAAN BARANG)
  // ----------------------------------------
  const [selectedPOId, setSelectedPOId] = useState('');
  const [recvItems, setRecvItems] = useState<{
    obatId: string;
    namaObat: string;
    jumlahPesan: number;
    jumlahDiterima: number;
    batch: string;
    expiredDate: string;
    hargaBeli: number;
  }[]>([]);
  const [recvCaraBayar, setRecvCaraBayar] = useState<'tunai' | 'kredit'>('tunai');
  const [recvJatuhTempo, setRecvJatuhTempo] = useState('');

  // Load PO details for receiving
  const handleSelectPOForReceiving = (poId: string) => {
    setSelectedPOId(poId);
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      const items = po.items.map(item => {
        const med = medicines.find(m => m.id === item.obatId);
        return {
          obatId: item.obatId,
          namaObat: item.namaObat,
          jumlahPesan: item.jumlah,
          jumlahDiterima: item.jumlah, // default full received
          batch: med?.batch || 'B-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
          expiredDate: med?.expiredDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          hargaBeli: item.hargaSatuan
        };
      });
      setRecvItems(items);
      // default 30 days due date for credit
      setRecvJatuhTempo(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    } else {
      setRecvItems([]);
    }
  };

  const handleUpdateRecvItemField = (index: number, field: string, val: any) => {
    setRecvItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOId || recvItems.length === 0) return;

    receivePurchaseOrder(
      selectedPOId,
      recvItems,
      recvCaraBayar,
      recvCaraBayar === 'kredit' ? recvJatuhTempo : undefined
    );

    // Reset
    setSelectedPOId('');
    setRecvItems([]);
    alert('Penerimaan barang sukses divalidasi. Stok bertambah secara otomatis (Metode FIFO).');
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

      {/* 2. SUBTAB: VALIDATE RECEIVING GOODS */}
      {activeSubTab === 'terima' && (
        <form onSubmit={handleSubmitReceipt} className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
            Formulir Penerimaan Barang (Verifikasi Faktur)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pilih PO yang Masuk *</label>
              <select
                value={selectedPOId}
                onChange={e => handleSelectPOForReceiving(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
              >
                <option value="">-- Pilih PO Dipesan --</option>
                {purchaseOrders.filter(p => p.status === 'dipesan').map(po => (
                  <option key={po.id} value={po.id}>{po.id} - {po.supplierNama} (Rp {po.total.toLocaleString('id-ID')})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Metode Bayar Faktur *</label>
              <select
                value={recvCaraBayar}
                onChange={e => setRecvCaraBayar(e.target.value as any)}
                className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="tunai">Tunai (Bayar Langsung dari Kasir)</option>
                <option value="kredit">Kredit (Buku Hutang Supplier)</option>
              </select>
            </div>

            {recvCaraBayar === 'kredit' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Tanggal Jatuh Tempo Hutang *</label>
                <input
                  type="date"
                  required
                  value={recvJatuhTempo}
                  onChange={e => setRecvJatuhTempo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            )}
          </div>

          {selectedPOId && recvItems.length > 0 ? (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-500" />
                <span>Verifikasi Roster Item Obat (Sesuaikan jika ada selisih pecah/pecahan)</span>
              </h4>

              <div className="border border-gray-100 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase">
                      <th className="py-3 px-3">Nama Obat</th>
                      <th className="py-3 px-3 text-center">Pesan (PO)</th>
                      <th className="py-3 px-3 text-center">Jumlah Datang *</th>
                      <th className="py-3 px-3">No. Batch Prod *</th>
                      <th className="py-3 px-3">Expired Date (ED) *</th>
                      <th className="py-3 px-3 text-right">Harga Beli Baru *</th>
                      <th className="py-3 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recvItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/20">
                        <td className="py-3 px-3 font-semibold text-gray-800">{item.namaObat}</td>
                        <td className="py-3 px-3 text-center font-mono text-gray-500">{item.jumlahPesan} Pcs</td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number" min="0" required value={item.jumlahDiterima}
                            onChange={e => handleUpdateRecvItemField(idx, 'jumlahDiterima', Number(e.target.value))}
                            className="w-16 border border-gray-200 rounded p-1 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text" required value={item.batch}
                            onChange={e => handleUpdateRecvItemField(idx, 'batch', e.target.value)}
                            placeholder="Batch"
                            className="w-24 border border-gray-200 rounded p-1 text-xs font-mono"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="date" required value={item.expiredDate}
                            onChange={e => handleUpdateRecvItemField(idx, 'expiredDate', e.target.value)}
                            className="w-32 border border-gray-200 rounded p-1 text-xs font-mono"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number" min="0" required value={item.hargaBeli}
                            onChange={e => handleUpdateRecvItemField(idx, 'hargaBeli', Number(e.target.value))}
                            className="w-24 border border-gray-200 rounded p-1 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                          Rp {(item.jumlahDiterima * item.hargaBeli).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Foot row */}
                    <tr className="bg-gray-50 font-bold text-gray-900 font-mono">
                      <td colSpan={6} className="py-3 px-3 text-right">Faktur Total Penerimaan:</td>
                      <td className="py-3 px-3 text-right text-indigo-700">
                        Rp {recvItems.reduce((sum, item) => sum + item.jumlahDiterima * item.hargaBeli, 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Selesaikan & Masukkan Gudang Apotek</span>
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400 bg-gray-50/30 border border-dashed rounded-xl">
              Silakan pilih Purchase Order (PO) aktif yang akan diterima fisiknya di atas.
            </div>
          )}
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
    </div>
  );
}
