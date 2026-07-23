import React, { useState } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { Medicine, SalesTransaction, ReceivingGoods } from '../types';
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Package,
  Search,
  Calendar,
  Filter,
  Eye,
  ArrowRight,
  ClipboardList,
  ChevronRight,
  Printer,
  X,
  Plus
} from 'lucide-react';

// Jakarta Time utility functions
const getJakartaDate = (date: Date = new Date()) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
};

const getJakartaDateISO = (date: Date = new Date()) => {
  const d = getJakartaDate(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getJakartaMonthISO = (date: Date = new Date()) => {
  const d = getJakartaDate(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
};

const getJakartaMonthStartISO = (date: Date = new Date()) => {
  const d = getJakartaDate(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
};

const getJakartaDateReadable = (date: Date = new Date()) => {
  return getJakartaDate(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getJakartaMonthReadable = (date: Date = new Date()) => {
  return getJakartaDate(date).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric'
  });
};

interface LaporanMenuProps {
  setActiveTab: (tab: string) => void;
  setPOItemsPrepopulate: (items: { obatId: string; namaObat: string; jumlah: number; hargaSatuan: number }[]) => void;
}

export default function LaporanMenu({ setActiveTab, setPOItemsPrepopulate }: LaporanMenuProps) {
  const { medicines, salesTransactions, receivingGoods } = usePharmacy();
  const [activeSubMenu, setActiveSubMenu] = useState<'penjualan' | 'pembelian' | 'expired' | 'mau_habis'>('penjualan');

  // Search and Filter States for Sales (Penjualan)
  const [salesSearch, setSalesSearch] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState<'semua' | 'hari_ini' | 'bulan_ini' | 'kustom'>('semua');
  const [salesStartDate, setSalesStartDate] = useState(() => getJakartaMonthStartISO());
  const [salesEndDate, setSalesEndDate] = useState(() => getJakartaDateISO());
  const [salesCaraBayar, setSalesCaraBayar] = useState<string>('semua');

  // Search and Filter States for Purchase (Pembelian)
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [purchaseDateFilter, setPurchaseDateFilter] = useState<'semua' | 'hari_ini' | 'bulan_ini' | 'kustom'>('semua');
  const [purchaseStartDate, setPurchaseStartDate] = useState(() => getJakartaMonthStartISO());
  const [purchaseEndDate, setPurchaseEndDate] = useState(() => getJakartaDateISO());
  const [purchaseCaraBayar, setPurchaseCaraBayar] = useState<string>('semua');

  // Search and Filter States for Expired Drugs
  const [expiredSearch, setExpiredSearch] = useState('');
  const [expiredStatusFilter, setExpiredStatusFilter] = useState<'semua' | 'sudah_expired' | 'kritis' | 'aman'>('semua');
  const [expiredCategoryFilter, setExpiredCategoryFilter] = useState('semua');

  // Search and Filter States for Low Stock Drugs
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'semua' | 'kosong' | 'kritis'>('semua');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('semua');

  // Modal Detail States
  const [selectedSalesTx, setSelectedSalesTx] = useState<SalesTransaction | null>(null);
  const [selectedRecGoods, setSelectedRecGoods] = useState<ReceivingGoods | null>(null);

  // Helper date function
  const parseLocalDateStr = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const isWithinDateRange = (dateStr: string, filterType: string, start: string, end: string) => {
    const formattedDate = parseLocalDateStr(dateStr);
    if (!formattedDate) return false;

    const todayStr = getJakartaDateISO();
    const currentMonthStr = getJakartaMonthISO();

    if (filterType === 'semua') return true;
    if (filterType === 'hari_ini') return formattedDate === todayStr;
    if (filterType === 'bulan_ini') return formattedDate.startsWith(currentMonthStr);
    if (filterType === 'kustom') {
      return formattedDate >= start && formattedDate <= end;
    }
    return true;
  };

  // Unique categories for filters
  const categories = Array.from(new Set(medicines.map(m => m.kategori)));

  // ────────────────────────────────────────────────────────
  // 1. DATA FILTERING: LAPORAN PENJUALAN
  // ────────────────────────────────────────────────────────
  const filteredSales = salesTransactions.filter(tx => {
    const matchesSearch = 
      tx.id.toLowerCase().includes(salesSearch.toLowerCase()) ||
      tx.customerName.toLowerCase().includes(salesSearch.toLowerCase()) ||
      tx.kasirName.toLowerCase().includes(salesSearch.toLowerCase());
    
    const matchesDate = isWithinDateRange(tx.tanggal, salesDateFilter, salesStartDate, salesEndDate);
    const matchesCaraBayar = salesCaraBayar === 'semua' || tx.caraBayar === salesCaraBayar;

    return matchesSearch && matchesDate && matchesCaraBayar;
  });

  const totalSalesRevenue = filteredSales.reduce((sum, tx) => sum + tx.total, 0);
  const totalSalesDiscounts = filteredSales.reduce((sum, tx) => sum + tx.diskon, 0);
  const totalSalesQty = filteredSales.reduce((sum, tx) => sum + tx.items.reduce((acc, item) => acc + item.jumlah, 0), 0);

  // ────────────────────────────────────────────────────────
  // 2. DATA FILTERING: LAPORAN PEMBELIAN (Penerimaan Barang)
  // ────────────────────────────────────────────────────────
  const filteredPurchases = receivingGoods.filter(rg => {
    const matchesSearch = 
      rg.id.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
      rg.poId.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
      rg.supplierNama.toLowerCase().includes(purchaseSearch.toLowerCase());

    const matchesDate = isWithinDateRange(rg.tanggal, purchaseDateFilter, purchaseStartDate, purchaseEndDate);
    const matchesCaraBayar = purchaseCaraBayar === 'semua' || rg.caraBayar === purchaseCaraBayar;

    return matchesSearch && matchesDate && matchesCaraBayar;
  });

  const totalPurchaseSpent = filteredPurchases.reduce((sum, rg) => sum + rg.total, 0);
  const totalPurchaseQty = filteredPurchases.reduce((sum, rg) => sum + rg.itemsReceived.reduce((acc, item) => acc + item.jumlahDiterima, 0), 0);

  // ────────────────────────────────────────────────────────
  // 3. DATA FILTERING: LAPORAN OBAT EXPIRED
  // ────────────────────────────────────────────────────────
  const currentDate = new Date();
  const getDaysDiff = (targetDateStr: string) => {
    const target = new Date(targetDateStr);
    const jakartaToday = getJakartaDate(currentDate);
    const t1 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const t2 = new Date(jakartaToday.getFullYear(), jakartaToday.getMonth(), jakartaToday.getDate());
    const diffTime = t1.getTime() - t2.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredExpiredMedicines = medicines.filter(med => {
    const daysDiff = getDaysDiff(med.expiredDate);
    const matchesSearch = med.nama.toLowerCase().includes(expiredSearch.toLowerCase()) || med.batch.toLowerCase().includes(expiredSearch.toLowerCase());
    const matchesCategory = expiredCategoryFilter === 'semua' || med.kategori === expiredCategoryFilter;
    
    let matchesStatus = true;
    if (expiredStatusFilter === 'sudah_expired') {
      matchesStatus = daysDiff <= 0;
    } else if (expiredStatusFilter === 'kritis') {
      matchesStatus = daysDiff > 0 && daysDiff <= 90;
    } else if (expiredStatusFilter === 'aman') {
      matchesStatus = daysDiff > 90;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const countAlreadyExpired = medicines.filter(m => getDaysDiff(m.expiredDate) <= 0).length;
  const countCriticalExpiry = medicines.filter(m => {
    const d = getDaysDiff(m.expiredDate);
    return d > 0 && d <= 90;
  }).length;
  const potentialLoss = filteredExpiredMedicines
    .filter(m => getDaysDiff(m.expiredDate) <= 0)
    .reduce((sum, m) => sum + (m.stok * m.hargaBeli), 0);

  // ────────────────────────────────────────────────────────
  // 4. DATA FILTERING: LAPORAN OBAT MAU HABIS
  // ────────────────────────────────────────────────────────
  const filteredLowStockMedicines = medicines.filter(med => {
    const matchesSearch = med.nama.toLowerCase().includes(stockSearch.toLowerCase());
    const matchesCategory = stockCategoryFilter === 'semua' || med.kategori === stockCategoryFilter;
    
    let matchesStatus = true;
    if (stockStatusFilter === 'kosong') {
      matchesStatus = med.stok === 0;
    } else if (stockStatusFilter === 'kritis') {
      matchesStatus = med.stok > 0 && med.stok <= med.stokMin;
    } else if (stockStatusFilter === 'semua') {
      matchesStatus = med.stok === 0; // stok kosong
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const countEmptyStock = medicines.filter(m => m.stok === 0).length;
  const countLowStock = medicines.filter(m => m.stok > 0 && m.stok <= m.stokMin).length;

  // Multi-item PO Prepopulate generator
  const handleBulkReorder = () => {
    const itemsToOrder = filteredLowStockMedicines.map(m => {
      const defaultQty = Math.max(m.stokMin * 2 - m.stok, 10);
      return {
        obatId: m.id,
        namaObat: m.nama,
        jumlah: defaultQty,
        hargaSatuan: m.hargaBeli
      };
    });

    if (itemsToOrder.length === 0) return;
    setPOItemsPrepopulate(itemsToOrder);
    setActiveTab('purchase');
  };

  return (
    <div className="space-y-6" id="reports-module-root">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-500" />
            Menu Laporan Komprehensif
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Analisis data transaksional, rekap pembelian, pengawasan masa kedaluwarsa, dan kontrol ketersediaan obat.
          </p>
        </div>
        <div className="flex font-mono text-[11px] bg-slate-100 p-1.5 rounded-xl border border-slate-200/40 text-slate-500 gap-3 self-start md:self-auto">
          <span>Sesi: {getJakartaDateReadable()}</span>
          <span className="text-emerald-600 font-bold">● Live Sync</span>
        </div>
      </div>

      {/* SUB MENU NAVIGATION TABS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
        <button
          onClick={() => setActiveSubMenu('penjualan')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeSubMenu === 'penjualan'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-200/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Laporan Penjualan</span>
        </button>

        <button
          onClick={() => setActiveSubMenu('pembelian')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeSubMenu === 'pembelian'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-200/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laporan Pembelian</span>
        </button>

        <button
          onClick={() => setActiveSubMenu('expired')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeSubMenu === 'expired'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-200/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Obat Expired</span>
          {countCriticalExpiry + countAlreadyExpired > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
              {countCriticalExpiry + countAlreadyExpired}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubMenu('mau_habis')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
            activeSubMenu === 'mau_habis'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-200/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Obat Mau Habis</span>
          {countEmptyStock + countLowStock > 0 && (
            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">
              {countEmptyStock + countLowStock}
            </span>
          )}
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. VIEW CONTENT: LAPORAN PENJUALAN */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubMenu === 'penjualan' && (
        <div className="space-y-6">
          {/* SALES METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Omset Kotor</p>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Rp {totalSalesRevenue.toLocaleString('id-ID')}</h3>
                <p className="text-[9px] text-emerald-600 font-semibold mt-1">Dari hasil penjualan terfilter</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Transaksi</p>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{filteredSales.length} Transaksi</h3>
                <p className="text-[9px] text-slate-500 mt-1">Rata-rata: Rp {filteredSales.length ? Math.round(totalSalesRevenue / filteredSales.length).toLocaleString('id-ID') : 0}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Potongan (Diskon)</p>
                <h3 className="text-lg font-extrabold text-rose-600 mt-1">Rp {totalSalesDiscounts.toLocaleString('id-ID')}</h3>
                <p className="text-[9px] text-slate-500 mt-1">Kepuasan pelanggan setia</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                <X className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volume Obat Terjual</p>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{totalSalesQty} Unit</h3>
                <p className="text-[9px] text-slate-500 mt-1">Melayani kebutuhan medis</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS BAR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Pengaturan Filter Penjualan</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Transaksi</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ID, Pelanggan, Kasir..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Date Filter Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Periode Waktu</label>
                <select
                  value={salesDateFilter}
                  onChange={(e) => setSalesDateFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua Periode</option>
                  <option value="hari_ini">Hari Ini ({getJakartaDateReadable()})</option>
                  <option value="bulan_ini">Bulan Ini ({getJakartaMonthReadable()})</option>
                  <option value="kustom">Rentang Tanggal Kustom</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cara Pembayaran</label>
                <select
                  value={salesCaraBayar}
                  onChange={(e) => setSalesCaraBayar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua Pembayaran</option>
                  <option value="tunai">Tunai</option>
                  <option value="debit">Debit Card</option>
                  <option value="qris">QRIS / E-Wallet</option>
                  <option value="kredit">Kredit / Piutang</option>
                </select>
              </div>

              {/* Export simulation */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    const rows = filteredSales.map(tx => `
                      <tr>
                        <td>${tx.id}<br/><small>${new Date(tx.tanggal).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</small></td>
                        <td>${tx.customerName}</td>
                        <td>${tx.kasirName}</td>
                        <td>${tx.isResep ? 'Resep' : 'Bebas'}</td>
                        <td>${tx.caraBayar.toUpperCase()}</td>
                        <td style="text-align:right">${tx.diskon > 0 ? 'Rp ' + tx.diskon.toLocaleString('id-ID') : '-'}</td>
                        <td style="text-align:right;font-weight:bold">Rp ${tx.total.toLocaleString('id-ID')}</td>
                      </tr>`).join('');
                    const html = `<!DOCTYPE html><html><head><title>Laporan Penjualan</title><style>
                      body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
                      h1{text-align:center;margin-bottom:4px;font-size:18px}h2{text-align:center;font-size:13px;color:#666;margin-top:0}
                      table{width:100%;border-collapse:collapse;margin-top:16px}
                      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
                      th{background:#f1f5f9;font-weight:bold;text-transform:uppercase;font-size:9px;letter-spacing:0.5px}
                      .summary{display:flex;gap:24px;margin-bottom:16px;justify-content:center}
                      .summary div{text-align:center;padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px}
                      .summary .val{font-size:16px;font-weight:bold;margin-top:2px}
                      .summary .lbl{font-size:9px;text-transform:uppercase;color:#94a3b8;letter-spacing:0.5px}
                      @media print{body{padding:10px}}
                    </style></head><body>
                      <h1>LAPORAN PENJUALAN</h1>
                      <h2>Cipta Sehat Apotek — Periode: ${salesDateFilter === 'semua' ? 'Semua' : salesDateFilter === 'hari_ini' ? getJakartaDateReadable() : salesDateFilter === 'bulan_ini' ? getJakartaMonthReadable() : salesStartDate + ' s/d ' + salesEndDate}</h2>
                      <div class="summary">
                        <div><div class="lbl">Total Transaksi</div><div class="val">${filteredSales.length}</div></div>
                        <div><div class="lbl">Total Pendapatan</div><div class="val">Rp ${totalSalesRevenue.toLocaleString('id-ID')}</div></div>
                        <div><div class="lbl">Total Diskon</div><div class="val">Rp ${totalSalesDiscounts.toLocaleString('id-ID')}</div></div>
                        <div><div class="lbl">Total Qty Obat</div><div class="val">${totalSalesQty}</div></div>
                      </div>
                      <table><thead><tr><th>ID / Waktu</th><th>Pelanggan</th><th>Kasir</th><th>Tipe</th><th>Cara Bayar</th><th style="text-align:right">Diskon</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center">Tidak ada data</td></tr>'}</tbody></table>
                      <p style="text-align:center;margin-top:24px;color:#999;font-size:9px">Dicetak: ${new Date().toLocaleString('id-ID')}</p>
                    </body></html>`;
                    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Laporan</span>
                </button>
              </div>
            </div>

            {/* Custom dates picker */}
            {salesDateFilter === 'kustom' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Mulai Tanggal</label>
                  <input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SALES TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/55">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Rekapitulasi Riwayat Transaksi Penjualan</h3>
              <span className="text-[10px] font-bold text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/60">
                {filteredSales.length} Transaksi Terpilih
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/40">
                    <th className="py-3 px-6">ID / Waktu</th>
                    <th className="py-3 px-6">Pelanggan</th>
                    <th className="py-3 px-6">Kasir</th>
                    <th className="py-3 px-6 text-center">Tipe Resep</th>
                    <th className="py-3 px-6">Cara Bayar</th>
                    <th className="py-3 px-6 text-right">Potongan</th>
                    <th className="py-3 px-6 text-right">Total Akhir</th>
                    <th className="py-3 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                        Tidak ada transaksi penjualan yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-semibold">
                          <span className="text-emerald-600 block font-bold font-mono">{tx.id}</span>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{new Date(tx.tanggal).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-700 font-medium">{tx.customerName}</td>
                        <td className="py-4 px-6 text-slate-500">{tx.kasirName}</td>
                        <td className="py-4 px-6 text-center">
                          {tx.isResep ? (
                            <span className="inline-block bg-indigo-50 text-indigo-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">Dengan Resep</span>
                          ) : (
                            <span className="inline-block bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">Bebas</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-block uppercase text-[9px] font-bold font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                            {tx.caraBayar}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-rose-500 font-mono font-medium">
                          {tx.diskon > 0 ? `Rp ${tx.diskon.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-slate-900 font-mono">
                          Rp {tx.total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setSelectedSalesTx(tx)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 p-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold px-0.5">Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 2. VIEW CONTENT: LAPORAN PEMBELIAN */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubMenu === 'pembelian' && (
        <div className="space-y-6">
          {/* PURCHASE METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Nilai Pembelian</p>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">Rp {totalPurchaseSpent.toLocaleString('id-ID')}</h3>
                <p className="text-[9px] text-emerald-600 font-semibold mt-1">Sesuai filter kriteria pengadaan</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Penerimaan Tercatat</p>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{filteredPurchases.length} Faktur Masuk</h3>
                <p className="text-[9px] text-slate-500 mt-1">Verifikasi kelayakan stok terjamin</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volume Supply Diterima</p>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{totalPurchaseQty} Unit</h3>
                <p className="text-[9px] text-slate-500 mt-1">Meningkatkan amunisi inventori</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS BAR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Pengaturan Filter Pembelian</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Supply Faktur</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="No Faktur, PO, Supplier..."
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Date Filter Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Periode Waktu</label>
                <select
                  value={purchaseDateFilter}
                  onChange={(e) => setPurchaseDateFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua Periode</option>
                  <option value="hari_ini">Hari Ini ({getJakartaDateReadable()})</option>
                  <option value="bulan_ini">Bulan Ini ({getJakartaMonthReadable()})</option>
                  <option value="kustom">Rentang Tanggal Kustom</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Metode Pembayaran</label>
                <select
                  value={purchaseCaraBayar}
                  onChange={(e) => setPurchaseCaraBayar(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua Pembayaran</option>
                  <option value="tunai">Tunai</option>
                  <option value="kredit">Kredit / Tempo</option>
                </select>
              </div>

              {/* Export simulation */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    const rows = filteredPurchases.map(rg => `
                      <tr>
                        <td>${rg.id}</td>
                        <td>${rg.poId}</td>
                        <td>${rg.supplierNama}</td>
                        <td>${new Date(rg.tanggal).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td>${rg.caraBayar.toUpperCase()}</td>
                        <td style="text-align:center">${rg.itemsReceived.length} Macam</td>
                        <td style="text-align:right;font-weight:bold">Rp ${rg.total.toLocaleString('id-ID')}</td>
                      </tr>`).join('');
                    const html = `<!DOCTYPE html><html><head><title>Laporan Pembelian</title><style>
                      body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
                      h1{text-align:center;margin-bottom:4px;font-size:18px}h2{text-align:center;font-size:13px;color:#666;margin-top:0}
                      table{width:100%;border-collapse:collapse;margin-top:16px}
                      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}
                      th{background:#f1f5f9;font-weight:bold;text-transform:uppercase;font-size:9px;letter-spacing:0.5px}
                      .summary{display:flex;gap:24px;margin-bottom:16px;justify-content:center}
                      .summary div{text-align:center;padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px}
                      .summary .val{font-size:16px;font-weight:bold;margin-top:2px}
                      .summary .lbl{font-size:9px;text-transform:uppercase;color:#94a3b8;letter-spacing:0.5px}
                      @media print{body{padding:10px}}
                    </style></head><body>
                      <h1>LAPORAN PEMBELIAN</h1>
                      <h2>Cipta Sehat Apotek — Periode: ${purchaseDateFilter === 'semua' ? 'Semua' : purchaseDateFilter === 'hari_ini' ? getJakartaDateReadable() : purchaseDateFilter === 'bulan_ini' ? getJakartaMonthReadable() : purchaseStartDate + ' s/d ' + purchaseEndDate}</h2>
                      <div class="summary">
                        <div><div class="lbl">Total Faktur</div><div class="val">${filteredPurchases.length}</div></div>
                        <div><div class="lbl">Total Pengeluaran</div><div class="val">Rp ${totalPurchaseSpent.toLocaleString('id-ID')}</div></div>
                        <div><div class="lbl">Total Qty Diterima</div><div class="val">${totalPurchaseQty}</div></div>
                      </div>
                      <table><thead><tr><th>ID Penerimaan</th><th>ID PO</th><th>Supplier</th><th>Tanggal</th><th>Cara Bayar</th><th style="text-align:center">Item</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="text-align:center">Tidak ada data</td></tr>'}</tbody></table>
                      <p style="text-align:center;margin-top:24px;color:#999;font-size:9px">Dicetak: ${new Date().toLocaleString('id-ID')}</p>
                    </body></html>`;
                    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Pembelian</span>
                </button>
              </div>
            </div>

            {/* Custom dates picker */}
            {purchaseDateFilter === 'kustom' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Mulai Tanggal</label>
                  <input
                    type="date"
                    value={purchaseStartDate}
                    onChange={(e) => setPurchaseStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={purchaseEndDate}
                    onChange={(e) => setPurchaseEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* PURCHASE TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/55">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Rekapitulasi Faktur Penerimaan Pembelian</h3>
              <span className="text-[10px] font-bold text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/60">
                {filteredPurchases.length} Faktur Terpilih
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/40">
                    <th className="py-3 px-6">ID Penerimaan</th>
                    <th className="py-3 px-6">ID PO Referensi</th>
                    <th className="py-3 px-6">Supplier</th>
                    <th className="py-3 px-6">Tanggal Terima</th>
                    <th className="py-3 px-6">Cara Bayar</th>
                    <th className="py-3 px-6 text-center">Jumlah Item</th>
                    <th className="py-3 px-6 text-right">Total Tagihan</th>
                    <th className="py-3 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                        Tidak ada faktur pembelian yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map(rg => (
                      <tr key={rg.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-indigo-600 font-mono">{rg.id}</td>
                        <td className="py-4 px-6 font-semibold text-slate-500 font-mono">{rg.poId}</td>
                        <td className="py-4 px-6 text-slate-700 font-semibold">{rg.supplierNama}</td>
                        <td className="py-4 px-6 text-slate-500 font-mono">
                          {new Date(rg.tanggal).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block uppercase text-[9px] font-bold font-mono px-2 py-0.5 rounded-md border ${
                            rg.caraBayar === 'tunai'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {rg.caraBayar}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-700 font-medium font-mono">
                          {rg.itemsReceived.length} Macam
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-slate-900 font-mono">
                          Rp {rg.total.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => setSelectedRecGoods(rg)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 p-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold px-0.5">Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 3. VIEW CONTENT: LAPORAN OBAT EXPIRED */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubMenu === 'expired' && (
        <div className="space-y-6">
          {/* EXPIRED METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Masa Expired Kritis (&lt;=90 Hari)</p>
                <h3 className={`text-lg font-extrabold mt-1 ${countCriticalExpiry > 0 ? 'text-amber-500' : 'text-slate-900'}`}>{countCriticalExpiry} Produk Kritis</h3>
                <p className="text-[9px] text-slate-500 mt-1">Perlu didahulukan penjualannya</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sudah Kadaluwarsa</p>
                <h3 className={`text-lg font-extrabold mt-1 ${countAlreadyExpired > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{countAlreadyExpired} Produk Expired</h3>
                <p className="text-[9px] text-rose-500 font-bold mt-1">WAJIB DIRETUR ATAU DIBUANG!</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kerugian Nominal Expired</p>
                <h3 className="text-lg font-extrabold text-rose-600 mt-1">Rp {potentialLoss.toLocaleString('id-ID')}</h3>
                <p className="text-[9px] text-slate-500 mt-1">Kerugian nominal stok kedaluwarsa</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-100/50 flex items-center justify-center text-rose-600">
                <TrendingUp className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS BAR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Pengaturan Filter Expired</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Nama Obat / Batch</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: Paracetamol..."
                    value={expiredSearch}
                    onChange={(e) => setExpiredSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Masa Kadaluwarsa</label>
                <select
                  value={expiredStatusFilter}
                  onChange={(e) => setExpiredStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua Obat</option>
                  <option value="sudah_expired">Sudah Expired (Hari Ini / Sebelumnya)</option>
                  <option value="kritis">Kritis (Tinggal 1 - 90 Hari)</option>
                  <option value="aman">Aman (&gt; 90 Hari)</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Terdaftar</label>
                <select
                  value={expiredCategoryFilter}
                  onChange={(e) => setExpiredCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua Kategori</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Action */}
              <div className="flex items-end">
                <button
                  onClick={() => alert('Daftar obat kedaluwarsa berhasil diarsipkan untuk rencana pembuangan/retur.')}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Daftar Expired</span>
                </button>
              </div>
            </div>
          </div>

          {/* EXPIRED TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/55">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Tabel Data Pengawasan Expired Obat</h3>
              <span className="text-[10px] font-bold text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/60">
                {filteredExpiredMedicines.length} Produk Terfilter
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/40">
                    <th className="py-3 px-6">ID Obat</th>
                    <th className="py-3 px-6">Nama Obat</th>
                    <th className="py-3 px-6">No. Batch</th>
                    <th className="py-3 px-6">Tanggal Expired</th>
                    <th className="py-3 px-6 text-center">Sisa Hari</th>
                    <th className="py-3 px-6 text-center">Status Keamanan</th>
                    <th className="py-3 px-6 text-right">Stok Sisa</th>
                    <th className="py-3 px-6 text-right">Potensi Rugi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredExpiredMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                        Sempurna! Tidak ada daftar obat kedaluwarsa sesuai filter yang terdeteksi.
                      </td>
                    </tr>
                  ) : (
                    filteredExpiredMedicines.map(m => {
                      const daysDiff = getDaysDiff(m.expiredDate);
                      let badge = '';
                      let badgeClass = '';
                      
                      if (daysDiff <= 0) {
                        badge = 'EXPIRED';
                        badgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
                      } else if (daysDiff <= 90) {
                        badge = 'KRITIS';
                        badgeClass = 'bg-amber-50 text-amber-700 border-amber-100';
                      } else {
                        badge = 'AMAN';
                        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                      }

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-mono text-slate-400">{m.id}</td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-800 block">{m.nama}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{m.kategori}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-600 font-mono font-medium">{m.batch}</td>
                          <td className="py-4 px-6 text-slate-700 font-mono">
                            {new Date(m.expiredDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                          </td>
                          <td className={`py-4 px-6 text-center font-mono font-bold ${daysDiff <= 0 ? 'text-rose-600' : daysDiff <= 90 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {daysDiff <= 0 ? `Lewat ${Math.abs(daysDiff)} Hari` : `${daysDiff} Hari`}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block text-[9px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                              {badge}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-semibold text-slate-700 font-mono">{m.stok} {m.satuan}</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-900 font-mono">
                            Rp {(m.stok * m.hargaBeli).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 4. VIEW CONTENT: LAPORAN OBAT MAU HABIS */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubMenu === 'mau_habis' && (
        <div className="space-y-6">
          {/* LOW STOCK METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stok Kosong (0 Unit)</p>
                <h3 className={`text-lg font-extrabold mt-1 ${countEmptyStock > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-900'}`}>{countEmptyStock} Produk Kosong</h3>
                <p className="text-[9px] text-rose-500 font-bold mt-1">Potensi kerugian penjualan langsung!</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Di Bawah Stok Minimum</p>
                <h3 className={`text-lg font-extrabold mt-1 ${countLowStock > 0 ? 'text-amber-500 font-extrabold' : 'text-slate-900'}`}>{countLowStock} Produk Kosong</h3>
                <p className="text-[9px] text-slate-500 mt-1">Segera buat pengadaan ke supplier</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Kritis Inventori</p>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">{filteredLowStockMedicines.length} Produk Perlu PO</h3>
                <p className="text-[9px] text-slate-500 mt-1">Fokus re-order obat krusial hari ini</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS BAR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="w-4 h-4 text-emerald-500" />
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Pengaturan Filter Stok Kosong</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Nama Obat</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: Amoxicillin..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Status Kritis</label>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua yang Kosong</option>
                  <option value="kosong">Kosong Sama Sekali (Stok = 0)</option>
                  <option value="kritis">Stok &lt;= Stok Minimum</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Terdaftar</label>
                <select
                  value={stockCategoryFilter}
                  onChange={(e) => setStockCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
                >
                  <option value="semua">Semua Kategori</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* ACTION: PREPOPULATE PO IN BULK */}
              <div className="flex items-end">
                <button
                  onClick={handleBulkReorder}
                  disabled={filteredLowStockMedicines.length === 0}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-55 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Draf PO Massal ({filteredLowStockMedicines.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* LOW STOCK TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/55">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Tabel Pengawasan Stok Kritis & Kosong</h3>
              <span className="text-[10px] font-bold text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/60">
                {filteredLowStockMedicines.length} Produk Terfilter
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/40">
                    <th className="py-3 px-6">ID Obat</th>
                    <th className="py-3 px-6">Nama Obat</th>
                    <th className="py-3 px-6">Kategori</th>
                    <th className="py-3 px-6 text-center">Stok Saat Ini</th>
                    <th className="py-3 px-6 text-center">Minimal Stok</th>
                    <th className="py-3 px-6 text-center">Indikator Stok</th>
                    <th className="py-3 px-6">Lokasi Rak</th>
                    <th className="py-3 px-6 text-right">Rekomendasi Re-order</th>
                    <th className="py-3 px-6 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLowStockMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                        Luar biasa! Seluruh stok obat terpelihara di atas batas minimum keamanan.
                      </td>
                    </tr>
                  ) : (
                    filteredLowStockMedicines.map(m => {
                      const percentage = Math.min((m.stok / (m.stokMin || 1)) * 100, 100);
                      const isKosong = m.stok === 0;
                      const defaultReorder = Math.max((m.stokMin * 2) - m.stok, 10);

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-mono text-slate-400">{m.id}</td>
                          <td className="py-4 px-6 font-bold text-slate-800">{m.nama}</td>
                          <td className="py-4 px-6 text-slate-500">{m.kategori}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`font-bold font-mono text-sm ${isKosong ? 'text-rose-600' : 'text-amber-600'}`}>
                              {m.stok}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold block">{m.satuan}</span>
                          </td>
                          <td className="py-4 px-6 text-center font-mono font-semibold text-slate-600">
                            {m.stokMin} {m.satuan}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="w-24 mx-auto bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40">
                              <div
                                style={{ width: `${percentage}%` }}
                                className={`h-full rounded-full ${isKosong ? 'bg-rose-500' : 'bg-amber-400'}`}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                              {isKosong ? 'Kosong' : `${Math.round(percentage)}% dari min`}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium font-mono">{m.lokasiRak}</td>
                          <td className="py-4 px-6 text-right font-extrabold text-emerald-600 font-mono">
                            + {defaultReorder} {m.satuan}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => {
                                setPOItemsPrepopulate([{
                                  obatId: m.id,
                                  namaObat: m.nama,
                                  jumlah: defaultReorder,
                                  hargaSatuan: m.hargaBeli
                                }]);
                                setActiveTab('purchase');
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-3xs"
                            >
                              <span>Buat PO</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* MODAL WINDOWS FOR DETAILS VIEW */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 1. Modal Detail Sales Transaction */}
      {selectedSalesTx && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">Detail Transaksi Penjualan</h3>
                <p className="text-[10px] font-bold text-emerald-600 font-mono mt-1">{selectedSalesTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedSalesTx(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/40">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Waktu Transaksi</p>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">
                    {new Date(selectedSalesTx.tanggal).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Kasir Pelaksana</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedSalesTx.kasirName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Nama Pelanggan</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedSalesTx.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Metode Pembayaran</p>
                  <span className="inline-block bg-emerald-50 text-emerald-700 font-mono text-[9px] font-bold px-2 py-0.5 border border-emerald-100 rounded mt-0.5 uppercase">
                    {selectedSalesTx.caraBayar}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daftar Item Obat Terjual</h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/60 font-bold text-slate-500 text-[10px] border-b border-slate-100">
                        <th className="py-2.5 px-4">Nama Obat</th>
                        <th className="py-2.5 px-4 text-center">Jumlah</th>
                        <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSalesTx.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {item.namaObat}
                            {item.isRacikan && (
                              <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-full ml-1">Racikan</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono text-slate-600">{item.jumlah} Unit</td>
                          <td className="py-3 px-4 text-right font-mono">Rp {item.hargaSatuan.toLocaleString('id-ID')}</td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">Rp {item.total.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Breakdown cost */}
              <div className="border-t border-slate-100 pt-4 flex flex-col items-end gap-1.5 text-xs font-medium font-mono">
                <div className="flex justify-between w-64 text-slate-500">
                  <span>Subtotal:</span>
                  <span>Rp {selectedSalesTx.subtotal.toLocaleString('id-ID')}</span>
                </div>
                {selectedSalesTx.diskon > 0 && (
                  <div className="flex justify-between w-64 text-rose-500">
                    <span>Diskon Potongan:</span>
                    <span>- Rp {selectedSalesTx.diskon.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {selectedSalesTx.pajak > 0 && (
                  <div className="flex justify-between w-64 text-slate-500">
                    <span>Pajak (PPN):</span>
                    <span>Rp {selectedSalesTx.pajak.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between w-64 text-sm font-extrabold text-slate-900 border-t border-slate-100 pt-1.5">
                  <span>Total Transaksi:</span>
                  <span className="text-emerald-600">Rp {selectedSalesTx.total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => alert('Cetak struk belanja kasir disimulasikan.')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-3xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Nota</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSalesTx(null)}
                className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-3xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Detail Receiving Goods */}
      {selectedRecGoods && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">Detail Faktur Penerimaan Pembelian</h3>
                <p className="text-[10px] font-bold text-indigo-600 font-mono mt-1">{selectedRecGoods.id}</p>
              </div>
              <button
                onClick={() => setSelectedRecGoods(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/40">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">No PO Referensi</p>
                  <p className="font-bold text-indigo-600 font-mono mt-0.5">{selectedRecGoods.poId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Nama Supplier</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedRecGoods.supplierNama}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Waktu Penerimaan</p>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">
                    {new Date(selectedRecGoods.tanggal).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Cara Pembayaran</p>
                  <span className={`inline-block font-mono text-[9px] font-bold px-2 py-0.5 border rounded mt-0.5 uppercase ${
                    selectedRecGoods.caraBayar === 'tunai'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {selectedRecGoods.caraBayar}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Daftar Item Obat Diterima</h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/60 font-bold text-slate-500 text-[10px] border-b border-slate-100">
                        <th className="py-2.5 px-4">Nama Obat</th>
                        <th className="py-2.5 px-4 text-center">Batch / Expired</th>
                        <th className="py-2.5 px-4 text-center">Jumlah Diterima</th>
                        <th className="py-2.5 px-4 text-right">Harga Beli</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRecGoods.itemsReceived.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.namaObat}</td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className="text-[10px] text-slate-500 block font-bold">Batch: {item.batch || '-'}</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Exp: {item.expiredDate ? new Date(item.expiredDate).toLocaleDateString('id-ID', { dateStyle: 'short' }) : '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold font-mono text-slate-600">
                            {item.jumlahDiterima} Unit
                            <span className="text-[9px] text-slate-400 block font-normal">(Pesan: {item.jumlahPesan})</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">Rp {item.hargaBeli.toLocaleString('id-ID')}</td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                            Rp {(item.jumlahDiterima * item.hargaBeli).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="border-t border-slate-100 pt-4 flex flex-col items-end gap-1.5 text-xs font-medium font-mono">
                <div className="flex justify-between w-64 text-sm font-extrabold text-slate-900">
                  <span>Total Tagihan:</span>
                  <span className="text-indigo-600">Rp {selectedRecGoods.total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => alert('Cetak dokumen faktur penerimaan pengadaan disimulasikan.')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-3xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Faktur</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecGoods(null)}
                className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-3xs"
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
