/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { Medicine, Customer, Doctor, SalesItem, CustomerCredit } from '../types';
import {
  ShoppingCart,
  Plus,
  Trash2,
  User,
  Activity,
  Award,
  CreditCard,
  Printer,
  ChevronRight,
  ArrowRightLeft,
  BookOpen,
  DollarSign,
  HeartPulse,
  Coins
} from 'lucide-react';

export default function SalesModule() {
  const {
    medicines,
    customers, addCustomer,
    doctors,
    salesTransactions, checkoutSales,
    returnSales,
    customerCredits, payCredit,
    creditPayments
  } = usePharmacy();

  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'retur' | 'piutang'>('pos');

  // ----------------------------------------
  // POS BASICS
  // ----------------------------------------
  const [cart, setCart] = useState<Omit<SalesItem, 'total'>[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isResep, setIsResep] = useState(false);
  const [resepDetail, setResepDetail] = useState('');
  
  const [discount, setDiscount] = useState(0);
  const [taxRate] = useState(10); // default 10% PPN
  const [caraBayar, setCaraBayar] = useState<'tunai' | 'kredit' | 'debit' | 'qris'>('tunai');
  const [bayarAmount, setBayarAmount] = useState(0);

  // Search Medicines
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [filteredMeds, setFilteredMeds] = useState<Medicine[]>([]);

  // Receipt modal or print preview
  const [lastReceiptTxId, setLastReceiptTxId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Update searchable medicine list
  useEffect(() => {
    if (posSearchTerm.trim() === '') {
      setFilteredMeds([]);
    } else {
      const term = posSearchTerm.toLowerCase();
      setFilteredMeds(medicines.filter(m =>
        m.nama.toLowerCase().includes(term) ||
        m.kategori.toLowerCase().includes(term)
      ).slice(0, 5));
    }
  }, [posSearchTerm, medicines]);

  const handleAddToCart = (med: Medicine) => {
    // Check if stock is available
    if (med.stok <= 0) {
      alert(`Stok ${med.nama} kosong.`);
      return;
    }

    const existsIndex = cart.findIndex(c => !c.isRacikan && c.obatId === med.id);
    if (existsIndex >= 0) {
      const updated = [...cart];
      if (updated[existsIndex].jumlah + 1 > med.stok) {
        alert(`Stok terbatas. Hanya tersedia ${med.stok} pcs.`);
        return;
      }
      updated[existsIndex].jumlah += 1;
      setCart(updated);
    } else {
      setCart(prev => [...prev, {
        obatId: med.id,
        namaObat: med.nama,
        jumlah: 1,
        hargaSatuan: med.hargaJual,
        isRacikan: false
      }]);
    }
    setPosSearchTerm('');
  };

  const updateCartQty = (idx: number, qty: number) => {
    const item = cart[idx];
    if (qty <= 0) {
      setCart(prev => prev.filter((_, i) => i !== idx));
      return;
    }

    if (!item.isRacikan) {
      const med = medicines.find(m => m.id === item.obatId);
      if (med && qty > med.stok) {
        alert(`Batas stok obat terlampaui. Maks: ${med.stok} Pcs`);
        return;
      }
    }
    
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, jumlah: qty } : item));
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  // ----------------------------------------
  // DYNAMIC COMPOUND MEDICINE BUILDER STATE
  // ----------------------------------------
  const [showRacikModal, setShowRacikModal] = useState(false);
  const [racikNama, setRacikNama] = useState('Racikan Kapsul Flu & Batuk');
  const [racikQty, setRacikQty] = useState(10); // total capsules
  const [racikIngredients, setRacikIngredients] = useState<{ obatId: string; namaObat: string; jumlah: number }[]>([]);
  const [racikBiayaService, setRacikBiayaService] = useState(5000); // compounding labor fee

  const [ingObatId, setIngObatId] = useState('');
  const [ingDosePerItem, setIngDosePerItem] = useState(0.5); // 0.5 tablet per capsule

  const addIngredientToRecipe = () => {
    if (!ingObatId || ingDosePerItem <= 0) return;
    const med = medicines.find(m => m.id === ingObatId);
    if (!med) return;

    if (racikIngredients.some(i => i.obatId === ingObatId)) {
      alert('Ingredient ini sudah ada di dalam resep racikan.');
      return;
    }

    setRacikIngredients(prev => [...prev, {
      obatId: ingObatId,
      namaObat: med.nama,
      jumlah: Number(ingDosePerItem)
    }]);

    setIngObatId('');
    setIngDosePerItem(0.5);
  };

  const removeIngredientFromRecipe = (idx: number) => {
    setRacikIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveCompoundToCart = () => {
    if (racikIngredients.length === 0 || !racikNama) {
      alert('Tolong masukkan minimal 1 bahan aktif obat racikan.');
      return;
    }

    // Calculate unified price of compound medicine
    // Unified Price = Sum (ingredient_quantity_per_capsule * medicine_selling_price) + (service_fee / total_capsules)
    let ingredientCostsPerCapsule = 0;
    racikIngredients.forEach(ing => {
      const med = medicines.find(m => m.id === ing.obatId);
      const sellPrice = med ? med.hargaJual : 0;
      ingredientCostsPerCapsule += ing.jumlah * sellPrice;
    });

    const unifiedPricePerCapsule = Math.round(ingredientCostsPerCapsule + (racikBiayaService / racikQty));

    setCart(prev => [...prev, {
      obatId: 'RACIK-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      namaObat: `[Racik] ${racikNama}`,
      jumlah: Number(racikQty),
      hargaSatuan: unifiedPricePerCapsule,
      isRacikan: true,
      racikanNama: racikNama,
      racikanIngredients: racikIngredients
    }]);

    // Reset racik builder state
    setRacikIngredients([]);
    setRacikNama('Racikan Kapsul Batuk & Alergi');
    setRacikQty(10);
    setShowRacikModal(false);
  };

  // ----------------------------------------
  // SUMMARIES
  // ----------------------------------------
  const subtotal = cart.reduce((sum, item) => sum + item.jumlah * item.hargaSatuan, 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  const grandTotal = Math.max(0, subtotal - discount + tax);
  const kembaliAmount = caraBayar === 'kredit' ? 0 : Math.max(0, bayarAmount - grandTotal);

  // Sync cash bayar when total changes
  useEffect(() => {
    if (caraBayar === 'tunai' && bayarAmount < grandTotal) {
      setBayarAmount(grandTotal);
    }
  }, [grandTotal, caraBayar]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (caraBayar === 'kredit' && !selectedCustomerId) {
      alert('Kesalahan Checkout: Pembelian metode Kredit wajib memilih pelanggan yang terdaftar (untuk pembukuan Piutang).');
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomerId);
    
    const res = checkoutSales({
      customerName: customer ? customer.nama : 'Umum (Walk-in)',
      customerId: selectedCustomerId || undefined,
      dokterId: selectedDoctorId || undefined,
      items: cart,
      caraBayar,
      diskon: discount,
      pajak: tax,
      bayar: caraBayar === 'kredit' ? 0 : Number(bayarAmount),
      isResep,
      resepDetail: isResep ? resepDetail : undefined
    });

    if (res.success && res.txId) {
      setLastReceiptTxId(res.txId);
      setShowReceipt(true);
      // clear cart
      setCart([]);
      setSelectedCustomerId('');
      setSelectedDoctorId('');
      setIsResep(false);
      setResepDetail('');
      setDiscount(0);
      setBayarAmount(0);
    } else {
      alert(`Checkout gagal: ${res.error}`);
    }
  };

  // ----------------------------------------
  // SUBTAB: RETURN SALES
  // ----------------------------------------
  const [retSalesId, setRetSalesId] = useState('');
  const [retItems, setRetItems] = useState<{ obatId: string; jumlah: number }[]>([]);
  const [retAlasan, setRetAlasan] = useState('');

  const loadSalesDetailsForReturn = (txId: string) => {
    setRetSalesId(txId);
    const tx = salesTransactions.find(t => t.id === txId);
    if (tx) {
      // populate with items
      setRetItems(tx.items.map(i => ({ obatId: i.obatId, jumlah: i.jumlah })));
    } else {
      setRetItems([]);
    }
  };

  const handleConfirmSalesReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retSalesId || retItems.length === 0 || !retAlasan) return;

    returnSales(retSalesId, retItems, retAlasan);
    setRetSalesId('');
    setRetItems([]);
    setRetAlasan('');
    alert('Retur penjualan dicatat harian. Stok apotek bertambah.');
  };

  // ----------------------------------------
  // SUBTAB: CUSTOMER CREDIT (PIUTANG) STATE
  // ----------------------------------------
  const [showPayCreditModal, setShowPayCreditModal] = useState(false);
  const [targetCredit, setTargetCredit] = useState<CustomerCredit | null>(null);
  const [creditPayAmount, setCreditPayAmount] = useState(0);

  const openPayCredit = (credit: CustomerCredit) => {
    setTargetCredit(credit);
    setCreditPayAmount(credit.sisaPiutang);
    setShowPayCreditModal(true);
  };

  const handleConfirmPayCredit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCredit || creditPayAmount <= 0) return;

    payCredit(targetCredit.id, creditPayAmount);
    setShowPayCreditModal(false);
    setTargetCredit(null);
    alert('Pembayaran kredit pelanggan masuk buku kas kasir.');
  };

  // ----------------------------------------
  // RECEIPT RENDER DETAILS
  // ----------------------------------------
  const lastTx = salesTransactions.find(t => t.id === lastReceiptTxId);

  return (
    <div className="space-y-6" id="sales-view">
      {/* Module Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Transaksi Penjualan (Kasir POS)
          </h1>
          <p className="text-sm text-gray-500">
            Kasir Point of Sale terpadu untuk penjualan obat bebas harian maupun obat resep dokter dan racikan (compounding).
          </p>
        </div>
      </div>

      {/* POS tab selectors */}
      <div className="flex flex-wrap gap-1 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100 w-fit">
        <button
          onClick={() => setActiveSubTab('pos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'pos' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Layar Kasir POS</span>
        </button>
        <button
          onClick={() => setActiveSubTab('retur')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'retur' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Retur Penjualan</span>
        </button>
        <button
          onClick={() => setActiveSubTab('piutang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'piutang' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Buku Piutang Pelanggan ({customerCredits.filter(c => c.status === 'belum_lunas').length})</span>
        </button>
      </div>

      {/* 1. SUBTAB: SCREEN KASIR POS */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: Product Search & Cart */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Cari Obat Cepat</span>
                <button
                  onClick={() => setShowRacikModal(true)}
                  className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Racik Obat Baru</span>
                </button>
              </div>
              <input
                type="text"
                value={posSearchTerm}
                onChange={e => setPosSearchTerm(e.target.value)}
                placeholder="Ketik nama obat atau kategori obat harian..."
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/20"
              />

              {/* Search Dropdown overlay */}
              {filteredMeds.length > 0 && (
                <div className="absolute left-4 right-4 bg-white border border-gray-100 rounded-lg shadow-lg divide-y divide-gray-50 z-10 max-h-56 overflow-y-auto">
                  {filteredMeds.map(med => (
                    <div
                      key={med.id}
                      onClick={() => handleAddToCart(med)}
                      className="p-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{med.nama}</p>
                        <p className="text-[10px] text-gray-400">Rak: {med.lokasiRak} | Kategori: {med.kategori} | Satuan: {med.satuan}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 font-mono">Rp {med.hargaJual.toLocaleString('id-ID')}</p>
                        <p className={`text-[9px] font-semibold ${med.stok <= med.stokMin ? 'text-red-500' : 'text-emerald-600'}`}>Stok: {med.stok} Pcs</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart list panel */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center justify-between">
                <span>Keranjang Transaksi</span>
                <span className="text-xs text-gray-400 font-mono font-medium">({cart.length} Baris Item)</span>
              </h3>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center justify-center space-y-2">
                  <ShoppingCart className="w-8 h-8 text-gray-300" />
                  <span>Keranjang belanja masih kosong harian.</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 overflow-y-auto max-h-[380px] pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{item.namaObat}</h4>
                        {item.isRacikan && item.racikanIngredients && (
                          <p className="text-[9px] text-gray-500">
                            Komposisi: {item.racikanIngredients.map(g => `${g.namaObat} (${g.jumlah} tablet)`).join(', ')}
                          </p>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono">@ Rp {item.hargaSatuan.toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Quantity adjust */}
                        <div className="flex items-center border border-gray-200 rounded">
                          <button
                            type="button" onClick={() => updateCartQty(idx, item.jumlah - 1)}
                            className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono font-bold text-gray-800">{item.jumlah}</span>
                          <button
                            type="button" onClick={() => updateCartQty(idx, item.jumlah + 1)}
                            className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono font-bold text-gray-900 min-w-20 text-right">
                          Rp {(item.jumlah * item.hargaSatuan).toLocaleString('id-ID')}
                        </span>

                        <button
                          type="button" onClick={() => removeFromCart(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Invoice Summary & Checkout Form */}
          <form onSubmit={handleCheckout} className="lg:col-span-5 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              Kalkulasi Pembayaran POS
            </h3>

            {/* Doctor & Patient Selector */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pelanggan (Customer)</label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
                  >
                    <option value="">Umum (Walk-in)</option>
                    {customers.filter(c => c.id !== 'CUST-3').map(c => (
                      <option key={c.id} value={c.id}>{c.nama} {c.piutang > 0 ? `(Piutang: Rp ${c.piutang.toLocaleString('id-ID')})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Rujukan Dokter</label>
                  <select
                    value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
                  >
                    <option value="">Non-Resep Dokter</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggle Prescription details */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="resep-checkbox"
                  checked={isResep}
                  onChange={e => setIsResep(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <label htmlFor="resep-checkbox" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Transaksi dengan Resep Obat Dokter
                </label>
              </div>

              {isResep && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Keterangan / Aturan Pakai Resep *</label>
                  <textarea
                    required
                    value={resepDetail}
                    onChange={e => setResepDetail(e.target.value)}
                    placeholder="Contoh: Amoxicillin 500mg 3 x sehari (Habiskan), Cetirizine 1 x sehari (bila perlu)..."
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Financial Calculations list */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs space-y-2.5 font-mono">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal Roster:</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex justify-between items-center text-gray-500">
                <span>Potongan Diskon (Rp):</span>
                <input
                  type="number" min="0" max={subtotal} value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="w-24 text-right border border-gray-200 rounded bg-white p-0.5 text-xs font-mono"
                />
              </div>

              <div className="flex justify-between text-gray-500">
                <span>PPN Pajak ({taxRate}%):</span>
                <span>Rp {tax.toLocaleString('id-ID')}</span>
              </div>

              <div className="border-t border-gray-200 my-1"></div>

              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Grand Total:</span>
                <span className="text-indigo-700 text-base">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pilih Cara Pembayaran *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['tunai', 'debit', 'qris', 'kredit'] as const).map((method) => (
                    <button
                      type="button" key={method}
                      onClick={() => setCaraBayar(method)}
                      className={`p-2 border rounded-lg text-center text-xs font-bold capitalize transition-all ${caraBayar === method ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {caraBayar !== 'kredit' ? (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Jumlah Uang Diterima (Rp) *</label>
                  <input
                    type="number"
                    min={grandTotal}
                    required
                    value={bayarAmount}
                    onChange={e => setBayarAmount(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-base font-bold font-mono text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  
                  {bayarAmount > 0 && (
                    <div className="flex justify-between items-center text-xs font-mono font-bold mt-1.5 p-2 bg-emerald-50 text-emerald-800 rounded">
                      <span>Uang Kembalian:</span>
                      <span>Rp {kembaliAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-[11px] text-rose-800 leading-relaxed">
                  <strong>Pembayaran Kredit Terpilih:</strong> Penjualan kredit akan secara otomatis dibukukan ke Piutang Pelanggan dengan jatuh tempo default 14 hari. Silakan pastikan Anda telah memilih nama pelanggan terdaftar di formulir atas.
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <button
              type="submit"
              disabled={cart.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 text-white p-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Selesaikan & Cetak Faktur POS</span>
            </button>
          </form>
        </div>
      )}

      {/* 2. SUBTAB: SALES RETURN */}
      {activeSubTab === 'retur' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Sales Return form */}
          <form onSubmit={handleConfirmSalesReturn} className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              Formulir Retur Penjualan Pelanggan
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Masukkan ID Transaksi Penjualan *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={retSalesId}
                    onChange={e => setRetSalesId(e.target.value)}
                    placeholder="Contoh: TX-XXXXXXX"
                    className="flex-1 border border-gray-200 rounded-lg p-2 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => loadSalesDetailsForReturn(retSalesId)}
                    className="px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold"
                  >
                    Load Item
                  </button>
                </div>
              </div>

              {retItems.length > 0 && (
                <div className="space-y-3 border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  <h4 className="text-xs font-bold text-gray-700">Verifikasi Item yang Dikembalikan</h4>
                  <div className="space-y-2">
                    {retItems.map((item, idx) => {
                      const med = medicines.find(m => m.id === item.obatId);
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-800">{med ? med.nama : item.obatId}</span>
                          <div className="flex items-center gap-2">
                            <span>Qty:</span>
                            <input
                              type="number" min="1" required value={item.jumlah}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setRetItems(prev => prev.map((it, i) => i === idx ? { ...it, jumlah: val } : it));
                              }}
                              className="w-16 border rounded p-1 text-center font-mono"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Alasan Pengembalian (Retur) *</label>
                    <select
                      required value={retAlasan} onChange={e => setRetAlasan(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2 text-xs"
                    >
                      <option value="">-- Pilih Alasan --</option>
                      <option value="Salah Beli Obat / Keberatan">Salah Beli Obat / Keberatan</option>
                      <option value="Reaksi Alergi Tidak Cocok">Reaksi Alergi Tidak Cocok</option>
                      <option value="Kondisi Fisik Obat Cacat">Kondisi Fisik Obat Cacat</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={retItems.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 text-white p-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Selesaikan & Pengembalian Uang (Refund)</span>
            </button>
          </form>

          {/* List of sold history to easily copy TX ID */}
          <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
              Histori Faktur Kasir Terakhir
            </h3>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 text-xs">
              {salesTransactions.slice(0, 10).map(tx => (
                <div key={tx.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between hover:bg-gray-50/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-indigo-700">{tx.id}</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[8px] font-mono capitalize">{tx.caraBayar}</span>
                    </div>
                    <p className="font-semibold text-gray-900">{tx.customerName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{new Date(tx.tanggal).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="font-bold text-gray-900 font-mono">Rp {tx.total.toLocaleString('id-ID')}</p>
                      <p className="text-[9px] text-gray-500 font-medium">{tx.items.length} Macam Obat</p>
                    </div>
                    <button
                      onClick={() => loadSalesDetailsForReturn(tx.id)}
                      className="px-2 py-1 text-[10px] font-bold border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded bg-white"
                    >
                      Pilih
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBTAB: CUSTOMER CREDITS */}
      {activeSubTab === 'piutang' && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div className="border-b border-gray-50 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Buku Catatan Kredit / Piutang Pelanggan
            </h3>
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1 rounded-full font-mono">
              Sisa Piutang Berjalan: Rp {customerCredits.reduce((sum, c) => sum + c.sisaPiutang, 0).toLocaleString('id-ID')}
            </span>
          </div>

          {customerCredits.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Bersih! Tidak ada tunggakan kredit / piutang pelanggan saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] font-bold uppercase">
                    <th className="py-3 px-3">No. Jurnal</th>
                    <th className="py-3 px-3">Nama Pelanggan</th>
                    <th className="py-3 px-3">No. Faktur Kasir (Sales)</th>
                    <th className="py-3 px-3 text-right">Nilai Total</th>
                    <th className="py-3 px-3 text-right">Sisa Piutang *</th>
                    <th className="py-3 px-3">Tanggal Jatuh Tempo</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerCredits.map(credit => {
                    const isOverdue = new Date(credit.jatuhTempo) < new Date() && credit.status === 'belum_lunas';
                    return (
                      <tr key={credit.id} className="hover:bg-gray-50/20">
                        <td className="py-3.5 px-3 font-mono text-[10px] text-gray-400">{credit.id}</td>
                        <td className="py-3.5 px-3 font-semibold text-gray-900">{credit.customerNama}</td>
                        <td className="py-3.5 px-3 font-mono text-[10px] text-indigo-700">{credit.salesId}</td>
                        <td className="py-3.5 px-3 text-right font-mono">Rp {credit.jumlahTotal.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-red-600">Rp {credit.sisaPiutang.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 px-3 font-mono">
                          <div className="font-semibold text-gray-900">{credit.jatuhTempo}</div>
                          {isOverdue && <span className="text-[9px] text-rose-600 font-bold uppercase">Overdue!</span>}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${credit.status === 'lunas' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                            {credit.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {credit.status === 'belum_lunas' ? (
                            <button
                              onClick={() => openPayCredit(credit)}
                              className="px-2 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                            >
                              Bayar Piutang
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

      {/* 4. RACIKAN BUILDER MODAL */}
      {showRacikModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4" />
                <span>Pembuatan Obat Racikan Baru</span>
              </h3>
              <button type="button" onClick={() => setShowRacikModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">✕</button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Nama Obat Racikan *</label>
                  <input
                    type="text" required value={racikNama} onChange={e => setRacikNama(e.target.value)}
                    placeholder="Contoh: Kapsul Batuk & Alergi Anak"
                    className="w-full border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Porsi / Kapsul *</label>
                    <input
                      type="number" min="1" required value={racikQty} onChange={e => setRacikQty(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Biaya Racik / Jasa (Rp) *</label>
                    <input
                      type="number" min="0" required value={racikBiayaService} onChange={e => setRacikBiayaService(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Add ingredients frame */}
              <div className="border border-dashed border-gray-200 p-3 bg-gray-50 rounded-lg space-y-2">
                <h4 className="font-bold text-gray-700 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tambahkan Bahan Aktif</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <select
                      value={ingObatId} onChange={e => setIngObatId(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded p-1.5 text-xs"
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>{m.nama} (Stok: {m.stok} Pcs)</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] text-gray-400">Dosis per Kapsul (Pecahan tablet)</label>
                    <input
                      type="number" step="0.1" min="0.1" value={ingDosePerItem} onChange={e => setIngDosePerItem(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded p-1 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button" onClick={addIngredientToRecipe}
                      className="w-full bg-indigo-600 text-white font-semibold rounded text-xs p-1 hover:bg-indigo-700"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Roster list */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-800">Bahan Rujukan Terdaftar ({racikIngredients.length})</h4>
                {racikIngredients.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 bg-gray-50/50 rounded border border-dashed">Belum ada bahan aktif ditambahkan.</p>
                ) : (
                  <div className="border border-gray-100 rounded overflow-hidden divide-y divide-gray-100">
                    {racikIngredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-white">
                        <div>
                          <p className="font-semibold text-gray-800">{ing.namaObat}</p>
                          <p className="text-[10px] text-gray-400">
                            Takaran: {ing.jumlah} tablet per porsi. Butuh: {ing.jumlah * racikQty} tablet total.
                          </p>
                        </div>
                        <button
                          type="button" onClick={() => removeIngredientFromRecipe(idx)}
                          className="text-gray-400 hover:text-red-500 font-semibold"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button" onClick={() => setShowRacikModal(false)}
                className="px-3 py-1.5 border border-gray-200 text-xs font-semibold text-gray-600 bg-white rounded-md"
              >
                Batal
              </button>
              <button
                type="button" onClick={handleSaveCompoundToCart}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md"
              >
                Masukkan Keranjang POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PAY CREDIT MODAL */}
      {showPayCreditModal && targetCredit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleConfirmPayCredit} className="bg-white rounded-xl shadow-lg border border-gray-100 max-w-sm w-full overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-500" />
                <span>Pelunasan Piutang Pelanggan</span>
              </h3>
              <button type="button" onClick={() => setShowPayCreditModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-3 rounded border border-gray-100 text-xs space-y-1">
                <p className="text-gray-500">Pelanggan: <strong className="text-gray-800">{targetCredit.customerNama}</strong></p>
                <p className="text-gray-500">Referensi Faktur Kasir: <strong className="text-gray-800 font-mono">{targetCredit.salesId}</strong></p>
                <p className="text-gray-500">Sisa Piutang: <strong className="text-red-600 font-mono">Rp {targetCredit.sisaPiutang.toLocaleString('id-ID')}</strong></p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Jumlah Bayar Pelunasan (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={targetCredit.sisaPiutang}
                  value={creditPayAmount}
                  onChange={e => setCreditPayAmount(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 flex items-center justify-end gap-2 border-t border-gray-100">
              <button
                type="button" onClick={() => setShowPayCreditModal(false)}
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

      {/* 6. THERMAL STRUK RECEIPT POPUP DIALOG */}
      {showReceipt && lastTx && (
        <div id="receipt-print-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-600">Simulasi Struk Printer Kasir</span>
              <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {/* Retro Thermal paper */}
            <div className="overflow-y-auto p-6 bg-amber-50/10 font-mono text-gray-800 text-[11px] leading-relaxed flex-1 select-none border-b border-gray-100">
              <div className="border border-dashed border-gray-300 p-4 bg-white shadow-xs max-w-xs mx-auto space-y-3">
                
                {/* Pharmacy header */}
                <div className="text-center">
                  <h3 className="font-bold text-sm uppercase tracking-wider">APOTEK CIPTA SEHAT</h3>
                  <p className="text-[9px] text-gray-500">JL. Maja No. 53 Lagoa Koja</p>
                  <p className="text-[9px] text-gray-500">Tlp: 0821-1827-6011</p>
                  <div className="border-b border-dashed border-gray-300 my-2"></div>
                </div>

                {/* Meta details */}
                <div className="space-y-0.5 text-[10px] text-gray-600">
                  <div className="flex justify-between">
                    <span>No. Transaksi:</span>
                    <span className="font-bold text-gray-900">{lastTx.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{new Date(lastTx.tanggal).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{lastTx.kasirName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span>{lastTx.customerName}</span>
                  </div>
                  {lastTx.dokterNama && (
                    <div className="flex justify-between">
                      <span>Dokter Resep:</span>
                      <span>{lastTx.dokterNama}</span>
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-gray-300 my-2"></div>

                {/* Roster of items */}
                <div className="space-y-2">
                  {lastTx.items.map((i, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-semibold text-gray-900">
                        <span>{i.namaObat}</span>
                        <span>Rp {i.total.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-500 pl-2">
                        <span> Takaran: @ Rp {i.hargaSatuan.toLocaleString('id-ID')} x {i.jumlah} Pcs</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-b border-dashed border-gray-300 my-2"></div>

                {/* Totals */}
                <div className="space-y-1 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rp {lastTx.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  {lastTx.diskon > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Potongan Diskon:</span>
                      <span>- Rp {lastTx.diskon.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>PPN Pajak (10%):</span>
                    <span>Rp {lastTx.pajak.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-b border-gray-200 my-1"></div>
                  <div className="flex justify-between text-xs font-bold text-gray-900">
                    <span>TOTAL AKHIR:</span>
                    <span className="text-sm">Rp {lastTx.total.toLocaleString('id-ID')}</span>
                  </div>
                  
                  {lastTx.caraBayar !== 'kredit' ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span>Cara Bayar ({lastTx.caraBayar.toUpperCase()}):</span>
                        <span>Rp {lastTx.bayar.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-emerald-700">
                        <span>Kembali:</span>
                        <span>Rp {lastTx.kembali.toLocaleString('id-ID')}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-red-600 font-semibold text-left">
                      * Pembayaran Tempo Kredit (Dibukukan ke Piutang)
                    </div>
                  )}
                </div>

                <div className="border-b border-dashed border-gray-300 my-2"></div>

                {/* Resep detail */}
                {lastTx.isResep && lastTx.resepDetail && (
                  <div className="p-2 bg-gray-50 border border-gray-100 rounded text-[9px] text-gray-600">
                    <p className="font-bold text-gray-800">ATURAN RESEP:</p>
                    <p className="italic leading-normal">{lastTx.resepDetail}</p>
                    <div className="border-b border-dashed border-gray-300 my-2"></div>
                  </div>
                )}

                {/* Footer notes */}
                <div className="text-center text-[9px] text-gray-400 space-y-1">
                  <p>Obat yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali membawa struk asli.</p>
                  <p className="font-semibold text-gray-600 mt-2">*** TERIMA KASIH ***</p>
                  <p>Semoga Lekas Sembuh</p>
                </div>

              </div>
            </div>

            {/* Print action buttons */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center gap-2">
              <button
                onClick={() => {
                  if (!lastTx) return;
                  const itemsHtml = lastTx.items.map(i => `
                    <div style="margin-bottom:6px;">
                      <div style="display:flex;justify-between;font-weight:600;">
                        <span>${i.namaObat}</span>
                        <span>Rp ${i.total.toLocaleString('id-ID')}</span>
                      </div>
                      <div style="display:flex;justify-between;font-size:9px;color:#888;padding-left:8px;">
                        <span>@ Rp ${i.hargaSatuan.toLocaleString('id-ID')} x ${i.jumlah} Pcs</span>
                      </div>
                    </div>
                  `).join('');

                  const resepHtml = lastTx.isResep && lastTx.resepDetail ? `
                    <div style="padding:6px;background:#f9f9f9;border:1px solid #eee;border-radius:4px;font-size:9px;color:#666;margin-bottom:8px;">
                      <p style="font-weight:700;color:#333;">ATURAN RESEP:</p>
                      <p style="font-style:italic;">${lastTx.resepDetail}</p>
                    </div>
                  ` : '';

                  const diskonHtml = lastTx.diskon > 0 ? `
                    <div style="display:flex;justify-between;color:#dc2626;">
                      <span>Potongan Diskon:</span><span>- Rp ${lastTx.diskon.toLocaleString('id-ID')}</span>
                    </div>
                  ` : '';

                  const bayarHtml = lastTx.caraBayar !== 'kredit' ? `
                    <div style="display:flex;justify-between;font-size:10px;">
                      <span>Cara Bayar (${lastTx.caraBayar.toUpperCase()}):</span><span>Rp ${lastTx.bayar.toLocaleString('id-ID')}</span>
                    </div>
                    <div style="display:flex;justify-between;font-size:10px;font-weight:700;color:#16a34a;">
                      <span>Kembali:</span><span>Rp ${lastTx.kembali.toLocaleString('id-ID')}</span>
                    </div>
                  ` : `<div style="font-size:10px;color:#dc2626;font-weight:600;">* Pembayaran Tempo Kredit (Dibukukan ke Piutang)</div>`;

                  const receiptHtml = `<!DOCTYPE html><html><head><title>Struk</title><style>@page{margin:5mm;size:auto;}body{margin:0;padding:0;font-family:'Courier New',monospace;font-size:11px;color:#333;display:flex;justify-content:center;}*{box-sizing:border-box;}</style></head><body>
                    <div style="width:280px;border:1px dashed #ccc;padding:16px;background:#fff;">
                      <div style="text-align:center;margin-bottom:8px;">
                        <h3 style="font-size:14px;font-weight:700;text-transform:uppercase;margin:0;">APOTEK CIPTA SEHAT</h3>
                        <p style="font-size:9px;color:#888;margin:2px 0;">JL. Maja No. 53 Lagoa Koja</p>
                        <p style="font-size:9px;color:#888;margin:2px 0;">Tlp: 0821-1827-6011</p>
                      </div>
                      <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">
                      <div style="font-size:10px;color:#666;">
                        <div style="display:flex;justify-between;"><span>No. Transaksi:</span><span style="font-weight:700;color:#111;">${lastTx.id}</span></div>
                        <div style="display:flex;justify-between;"><span>Tanggal:</span><span>${new Date(lastTx.tanggal).toLocaleString('id-ID')}</span></div>
                        <div style="display:flex;justify-between;"><span>Kasir:</span><span>${lastTx.kasirName}</span></div>
                        <div style="display:flex;justify-between;"><span>Pelanggan:</span><span>${lastTx.customerName}</span></div>
                        ${lastTx.dokterNama ? `<div style="display:flex;justify-between;"><span>Dokter Resep:</span><span>${lastTx.dokterNama}</span></div>` : ''}
                      </div>
                      <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">
                      <div>${itemsHtml}</div>
                      <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">
                      <div style="text-align:right;">
                        <div style="display:flex;justify-between;"><span>Subtotal:</span><span>Rp ${lastTx.subtotal.toLocaleString('id-ID')}</span></div>
                        ${diskonHtml}
                        <div style="display:flex;justify-between;color:#888;"><span>PPN Pajak (10%):</span><span>Rp ${lastTx.pajak.toLocaleString('id-ID')}</span></div>
                        <hr style="border:none;border-top:1px solid #ddd;margin:4px 0;">
                        <div style="display:flex;justify-between;font-weight:700;font-size:13px;"><span>TOTAL AKHIR:</span><span>Rp ${lastTx.total.toLocaleString('id-ID')}</span></div>
                        ${bayarHtml}
                      </div>
                      <hr style="border:none;border-top:1px dashed #ccc;margin:8px 0;">
                      ${resepHtml}
                      <div style="text-align:center;font-size:9px;color:#aaa;">
                        <p>Obat yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali membawa struk asli.</p>
                        <p style="font-weight:700;color:#666;margin-top:8px;">*** TERIMA KASIH ***</p>
                        <p>Semoga Lekas Sembuh</p>
                      </div>
                    </div>
                  </body></html>`;

                  const printFrame = document.createElement('iframe');
                  printFrame.style.position = 'fixed';
                  printFrame.style.right = '0';
                  printFrame.style.bottom = '0';
                  printFrame.style.width = '0';
                  printFrame.style.height = '0';
                  printFrame.style.border = 'none';
                  document.body.appendChild(printFrame);
                  const frameDoc = printFrame.contentWindow;
                  if (frameDoc) {
                    frameDoc.document.write(receiptHtml);
                    frameDoc.document.close();
                    frameDoc.focus();
                    setTimeout(() => {
                      frameDoc.print();
                      setTimeout(() => document.body.removeChild(printFrame), 1000);
                    }, 300);
                  }
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Fisik</span>
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold py-2 px-4 rounded-lg text-xs"
              >
                Tutup Sesi POS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
