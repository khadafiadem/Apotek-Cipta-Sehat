/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePharmacy } from '../PharmacyContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  BookOpen,
  PieChartIcon,
  ShieldX,
  FileText,
  PlusCircle,
  Briefcase,
  Layers
} from 'lucide-react';

export default function ReportsAnalytics() {
  const {
    currentRole,
    medicines,
    salesTransactions,
    purchaseOrders,
    cashJournal,
    addCashJournalEntry
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'statement' | 'charts' | 'ledger'>('statement');

  // RBAC checks
  const isAuthorized = currentRole === 'admin' || currentRole === 'apoteker';

  // ----------------------------------------
  // REPORT FILTER STATE & HELPERS
  // ----------------------------------------
  const [filterType, setFilterType] = useState<'semua' | 'harian' | 'bulanan'>('semua');
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-10'); // defaults to current local date
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');  // defaults to current local month

  // Helper to extract local date string format "YYYY-MM-DD" from any ISO date
  const getLocalDateString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // Filter datasets based on filter criteria
  const filteredSalesTransactions = salesTransactions.filter(tx => {
    if (filterType === 'semua') return true;
    const txDateStr = getLocalDateString(tx.tanggal);
    if (filterType === 'harian') {
      return txDateStr === selectedDate;
    } else if (filterType === 'bulanan') {
      return txDateStr.startsWith(selectedMonth); // matches YYYY-MM
    }
    return true;
  });

  const filteredCashJournal = (cashJournal || []).filter(entry => {
    if (filterType === 'semua') return true;
    const entryDateStr = getLocalDateString(entry.tanggal);
    if (filterType === 'harian') {
      return entryDateStr === selectedDate;
    } else if (filterType === 'bulanan') {
      return entryDateStr.startsWith(selectedMonth); // matches YYYY-MM
    }
    return true;
  });

  // ----------------------------------------
  // MANUAL JOURNAL ENTRY STATE
  // ----------------------------------------
  const [journalKet, setJournalKet] = useState('');
  const [journalTipe, setJournalTipe] = useState<'masuk' | 'keluar'>('keluar');
  const [journalAkun, setJournalAkun] = useState('Beban Operasional (Listrik & Air)');
  const [journalAmount, setJournalAmount] = useState(100000);

  // Transform cashJournal to dynamic double-entry financialJournal
  interface LedgerEntry {
    id: string;
    tanggal: string;
    akun: string;
    referensiId: string;
    debit: number;
    kredit: number;
    keterangan: string;
  }

  const financialJournal: LedgerEntry[] = [];
  
  (filteredCashJournal || []).forEach(entry => {
    // Determine opposing account name based on category
    let opposingAccount = 'Beban Lain-lain / Umum';
    switch (entry.kategori) {
      case 'Penjualan':
        opposingAccount = 'Pendapatan Penjualan';
        break;
      case 'Pembelian':
        opposingAccount = 'HPP / Pembelian Obat';
        break;
      case 'Pelunasan Hutang':
        opposingAccount = 'Hutang Usaha (Supplier)';
        break;
      case 'Pelunasan Piutang':
        opposingAccount = 'Piutang Dagang (Pelanggan)';
        break;
      case 'Listrik':
        opposingAccount = 'Beban Listrik, Air & Wi-Fi';
        break;
      case 'Gaji':
        opposingAccount = 'Beban Gaji & Payroll Karyawan';
        break;
      case 'ATK':
        opposingAccount = 'Beban Perlengkapan & ATK';
        break;
      case 'Sewa':
        opposingAccount = 'Beban Sewa Gedung & Sarana';
        break;
      case 'Retur':
        opposingAccount = 'Retur Penjualan / Pembelian';
        break;
      case 'Lain-lain':
      default:
        opposingAccount = 'Beban Lain-lain / Umum';
        break;
    }

    if (entry.tipe === 'masuk') {
      // Debit: Kas Keuangan, Credit: Opposing account (e.g. Pendapatan Penjualan)
      financialJournal.push({
        id: `${entry.id}-DR`,
        tanggal: entry.tanggal,
        akun: 'Kas Keuangan',
        referensiId: entry.id,
        debit: entry.jumlah,
        kredit: 0,
        keterangan: entry.keterangan
      });
      financialJournal.push({
        id: `${entry.id}-CR`,
        tanggal: entry.tanggal,
        akun: opposingAccount,
        referensiId: entry.id,
        debit: 0,
        kredit: entry.jumlah,
        keterangan: entry.keterangan
      });
    } else {
      // Debit: Opposing account (e.g. Beban), Credit: Kas Keuangan
      financialJournal.push({
        id: `${entry.id}-DR`,
        tanggal: entry.tanggal,
        akun: opposingAccount,
        referensiId: entry.id,
        debit: entry.jumlah,
        kredit: 0,
        keterangan: entry.keterangan
      });
      financialJournal.push({
        id: `${entry.id}-CR`,
        tanggal: entry.tanggal,
        akun: 'Kas Keuangan',
        referensiId: entry.id,
        debit: 0,
        kredit: entry.jumlah,
        keterangan: entry.keterangan
      });
    }
  });

  const handleCreateManualJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalKet || journalAmount <= 0) return;

    // Map selected journalAkun string to a valid cash journal category
    const mapAkunToKategori = (akun: string): 'Listrik' | 'Gaji' | 'Sewa' | 'ATK' | 'Lain-lain' => {
      if (akun.includes('Listrik') || akun.includes('Air')) return 'Listrik';
      if (akun.includes('Gaji') || akun.includes('Payroll')) return 'Gaji';
      if (akun.includes('Sewa')) return 'Sewa';
      if (akun.includes('Perlengkapan') || akun.includes('ATK') || akun.includes('Kresek')) return 'ATK';
      return 'Lain-lain';
    };

    const kategori = mapAkunToKategori(journalAkun);

    addCashJournalEntry(
      journalTipe,
      kategori,
      Number(journalAmount),
      journalKet
    );

    setJournalKet('');
    setJournalAmount(100000);
    alert('Penyesuaian biaya berhasil dibukukan ke dalam Jurnal Umum.');
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center space-y-4 shadow-xs" id="reports-lock">
        <ShieldX className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Hak Akses Laporan Terkunci</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Arsip Laba Rugi, Ledger Akuntansi, dan Jurnal Umum berisi data komersial sensitif. Sesuai regulasi RBAC apotek, layar ini hanya dapat dibuka oleh **Apoteker** atau **Admin/Owner**.
        </p>
      </div>
    );
  }

  // ----------------------------------------
  // FINANCIAL CALCULATIONS (LABA RUGI)
  // ----------------------------------------
  // Total Pendapatan Penjualan Kotor
  const grossSales = filteredSalesTransactions.reduce((sum, tx) => sum + tx.subtotal, 0);
  const totalDiscounts = filteredSalesTransactions.reduce((sum, tx) => sum + tx.diskon, 0);
  const totalTaxCollected = filteredSalesTransactions.reduce((sum, tx) => sum + tx.pajak, 0);
  
  // HPP (COGS) calculated from completed sales FIFO
  const totalHPP = filteredSalesTransactions.reduce((sum, tx) => {
    return sum + tx.items.reduce((itemSum, item) => {
      // Find corresponding medicine buy cost to represent COGS
      const med = medicines.find(m => m.id === item.obatId);
      const buyPrice = med ? med.hargaBeli : item.hargaSatuan * 0.6; // fallback estimate
      return itemSum + (item.jumlah * buyPrice);
    }, 0);
  }, 0);

  const netSalesRevenue = grossSales - totalDiscounts;
  const grossProfit = netSalesRevenue - totalHPP;

  // Operating Expenses = Manual journals of type 'keluar' (excluding inventory purchases which belong to asset swap / cogs)
  const operatingExpenses = (filteredCashJournal || [])
    .filter(j => j.tipe === 'keluar' && j.kategori !== 'Pembelian' && j.kategori !== 'Pelunasan Hutang')
    .reduce((sum, j) => sum + j.jumlah, 0);

  const netProfit = grossProfit - operatingExpenses;

  // ----------------------------------------
  // RECHARTS DATA PROCESSORS
  // ----------------------------------------
  // 1. Daily Sales Line Chart
  const salesByDate: { [date: string]: { tanggal: string; Pendapatan: number; Transaksi: number } } = {};
  filteredSalesTransactions.forEach(tx => {
    const dStr = new Date(tx.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    if (!salesByDate[dStr]) {
      salesByDate[dStr] = { tanggal: dStr, Pendapatan: 0, Transaksi: 0 };
    }
    salesByDate[dStr].Pendapatan += tx.total;
    salesByDate[dStr].Transaksi += 1;
  });
  const chartSalesData = Object.values(salesByDate).slice(-7); // last 7 days

  // 2. Sales by Category Pie Chart
  const categorySales: { [cat: string]: number } = {};
  filteredSalesTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const med = medicines.find(m => m.id === item.obatId);
      const cat = med ? med.kategori : 'Racikan / Umum';
      categorySales[cat] = (categorySales[cat] || 0) + item.total;
    });
  });
  const chartCategoryData = Object.entries(categorySales).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6" id="reports-analytics-view">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Laporan Keuangan & Analitik Operasional
          </h1>
          <p className="text-sm text-gray-500">
            Penyusunan Laba Rugi apotek otomatis, Buku Jurnal Umum Akuntansi, dan infografis grafis tren omset harian.
          </p>
        </div>
      </div>

      {/* Sub tabs & Filter Container */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200/60 w-fit">
          <button
            onClick={() => setActiveTab('statement')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'statement' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Laporan Laba Rugi (P&L)</span>
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'charts' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Grafik & Analisis Tren</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'ledger' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Buku Jurnal Umum Keuangan</span>
          </button>
        </div>

        {/* ─── FILTERS: HARIAN & BULANAN ─── */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase px-2">Filter Laporan:</span>
          
          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/55">
            <button
              onClick={() => setFilterType('semua')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterType === 'semua' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType('harian')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterType === 'harian' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setFilterType('bulanan')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterType === 'bulanan' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bulanan
            </button>
          </div>

          {filterType === 'harian' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 px-3 py-1 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs font-bold text-slate-700 font-mono shadow-3xs"
            />
          )}

          {filterType === 'bulanan' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 px-3 py-1 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs font-bold text-slate-700 font-mono shadow-3xs"
            />
          )}
        </div>
      </div>

      {/* 1. SUBTAB: LABA RUGI STATEMENT */}
      {activeTab === 'statement' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Income Statement worksheet */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Laporan Laba Rugi Komprehensif</h3>
              <p className="text-[10px] text-emerald-600 font-medium">
                {filterType === 'semua' && 'Periode Berjalan: Menampilkan semua akumulasi pencatatan keuangan'}
                {filterType === 'harian' && `Periode Laporan Harian: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                {filterType === 'bulanan' && `Periode Laporan Bulanan: ${new Date(selectedMonth + '-02T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {/* Gross Revenue section */}
              <div className="space-y-2">
                <p className="font-bold text-gray-800 text-[11px] border-b border-gray-100 pb-1 uppercase">1. PENDAPATAN USAHA (REVENUE)</p>
                <div className="flex justify-between pl-4 text-gray-600">
                  <span>Pendapatan Penjualan Kotor (Kasir POS)</span>
                  <span>Rp {grossSales.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between pl-4 text-rose-600">
                  <span>Diedit: Potongan Diskon Penjualan langsung</span>
                  <span>- Rp {totalDiscounts.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100/50 pt-1">
                  <span>PENDAPATAN USAHA BERSIH (NET REVENUE)</span>
                  <span>Rp {netSalesRevenue.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* COGS (HPP) Section */}
              <div className="space-y-2 pt-2">
                <p className="font-bold text-gray-800 text-[11px] border-b border-gray-100 pb-1 uppercase">2. HARGA POKOK PENJUALAN (HPP / COGS)</p>
                <div className="flex justify-between pl-4 text-gray-600">
                  <span>Beban Pokok Persediaan Obat FIFO Terjual</span>
                  <span>Rp {totalHPP.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100/50 pt-1">
                  <span>TOTAL BEBAN HPP</span>
                  <span>Rp {totalHPP.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Gross Profit Divider */}
              <div className="p-3 bg-gray-50/80 rounded-lg flex justify-between font-bold text-gray-900 text-[13px] border border-gray-100">
                <span>LABA KOTOR BERJALAN (GROSS PROFIT)</span>
                <span className="text-indigo-700">Rp {grossProfit.toLocaleString('id-ID')}</span>
              </div>

              {/* Expenses Section */}
              <div className="space-y-2 pt-2">
                <p className="font-bold text-gray-800 text-[11px] border-b border-gray-100 pb-1 uppercase">3. BEBAN OPERASIONAL (EXPENSES)</p>
                <div className="flex justify-between pl-4 text-gray-600">
                  <span>Beban Operasional Manual (Gaji, Listrik, Air, Sewa)</span>
                  <span>Rp {operatingExpenses.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100/50 pt-1">
                  <span>TOTAL BEBAN OPERASIONAL</span>
                  <span>Rp {operatingExpenses.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Net Profit Divider */}
              <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-lg flex justify-between font-bold text-sm border border-emerald-100">
                <span>LABA BERSIH BERJALAN (NET PROFIT)</span>
                <span className="font-mono text-base text-emerald-700">Rp {netProfit.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Expense log form */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick mini-cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-center space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Margin Kotor</p>
                <p className="text-base font-bold font-mono text-indigo-700">
                  {netSalesRevenue > 0 ? `${Math.round((grossProfit / netSalesRevenue) * 100)}%` : '0%'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-center space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Margin Bersih</p>
                <p className="text-base font-bold font-mono text-emerald-700">
                  {netSalesRevenue > 0 ? `${Math.round((netProfit / netSalesRevenue) * 100)}%` : '0%'}
                </p>
              </div>
            </div>

            {/* Manual Journal Outflow */}
            <form onSubmit={handleCreateManualJournal} className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-1.5 flex items-center gap-1">
                <PlusCircle className="w-4 h-4 text-rose-500" />
                <span>Pencatatan Beban Biaya Operasional</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Pilih Akun Kas Keuangan</label>
                  <select
                    value={journalAkun}
                    onChange={e => setJournalAkun(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded p-1.5 text-xs"
                  >
                    <option value="Beban Operasional (Listrik & Air)">Beban Listrik, Air & Wi-Fi</option>
                    <option value="Beban Gaji (Payroll Karyawan)">Gaji Staff & Kurir</option>
                    <option value="Beban Sewa Gedung & Sarana">Sewa Ruko & Kebersihan</option>
                    <option value="Beban Perlengkapan (Kresek & Atk)">Kresek Kemasan & ATK</option>
                    <option value="Pendapatan Parkir / Non-Obat">Lain-lain: Pendapatan Non-Operasional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Tipe Jurnal</label>
                  <select
                    value={journalTipe}
                    onChange={e => setJournalTipe(e.target.value as any)}
                    className="w-full border border-gray-200 bg-white rounded p-1.5 text-xs"
                  >
                    <option value="keluar">Keluar (Debit Beban / Kredit Kas)</option>
                    <option value="masuk">Masuk (Debit Kas / Kredit Pendapatan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Jumlah Biaya Dianggarkan (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={journalAmount}
                    onChange={e => setJournalAmount(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded p-1.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Keterangan Penjelasan *</label>
                  <input
                    type="text"
                    required
                    value={journalKet}
                    onChange={e => setJournalKet(e.target.value)}
                    placeholder="Contoh: Pembayaran listrik token bulan Juli"
                    className="w-full border border-gray-200 rounded p-1.5 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded text-xs font-semibold flex items-center justify-center gap-1"
              >
                <span>Selesaikan & Debit Jurnal</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. SUBTAB: CHARTS & TREND ANALYSIS */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales trend line */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Tren Pendapatan Penjualan Harian</span>
            </h3>

            {chartSalesData.length === 0 ? (
              <div className="py-24 text-center text-xs text-gray-400">
                Belum ada data transaksi kasir hari ini untuk memplot grafik tren.
              </div>
            ) : (
              <div className="h-72 text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSalesData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="tanggal" tick={{ fill: '#9ca3af' }} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af' }} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Pendapatan"
                      name="Total Revenue (Rp)"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category distribution pie */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Proporsi Kontribusi Kategori Obat</span>
            </h3>

            {chartCategoryData.length === 0 ? (
              <div className="py-24 text-center text-xs text-gray-400">
                Belum ada sebaran transaksi berdasarkan kategori obat terdaftar.
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartCategoryData}
                      cx="50%"
                      cy="50%"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUBTAB: ACCOUNTING GENERAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
          <div className="border-b border-gray-50 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Buku Jurnal Umum (Double-Entry Bookkeeping Ledger)
              </h3>
              <p className="text-[10px] text-gray-400">Pencatatan Debit & Kredit otomatis secara seimbang untuk setiap mutasi finansial.</p>
            </div>
            
            <div className="flex gap-4 font-mono text-xs">
              <span className="text-gray-500">Debet: <strong className="text-emerald-700">Rp {financialJournal.reduce((sum, j) => sum + j.debit, 0).toLocaleString('id-ID')}</strong></span>
              <span className="text-gray-500">Kredit: <strong className="text-rose-700">Rp {financialJournal.reduce((sum, j) => sum + j.kredit, 0).toLocaleString('id-ID')}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] font-sans">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[9px] font-bold uppercase">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">ID Jurnal</th>
                  <th className="py-2.5 px-3">Nama Akun Akuntansi</th>
                  <th className="py-2.5 px-3">Referensi Dokumen</th>
                  <th className="py-2.5 px-3 text-right">Debet (+)</th>
                  <th className="py-2.5 px-3 text-right">Kredit (-)</th>
                  <th className="py-2.5 px-3">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {financialJournal.map(journal => (
                  <tr key={journal.id} className="hover:bg-gray-50/20">
                    <td className="py-2.5 px-3 font-mono text-gray-400 text-[10px]">
                      {new Date(journal.tanggal).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-400 text-[10px]">{journal.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{journal.akun}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 text-[10px]">{journal.referensiId}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                      {journal.debit > 0 ? `Rp ${journal.debit.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                      {journal.kredit > 0 ? `Rp ${journal.kredit.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{journal.keterangan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
