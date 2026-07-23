/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { usePharmacy } from '../PharmacyContext';
import { Medicine } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ShoppingCart,
  Calendar,
  Layers,
  ChevronRight,
  Pill,
  Database
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setSelectedSupplierIdForPO?: (id: string | null) => void;
  setPOItemsPrepopulate?: (items: { obatId: string; namaObat: string; jumlah: number; hargaSatuan: number }[]) => void;
}

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

const getJakartaDateReadable = (date: Date = new Date()) => {
  return getJakartaDate(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export default function Dashboard({ setActiveTab, setSelectedSupplierIdForPO, setPOItemsPrepopulate }: DashboardProps) {
  const {
    medicines,
    salesTransactions,
    receivingGoods,
    cashJournal,
    currentRole,
    createPurchaseOrder
  } = usePharmacy();

  const [jakartaTime, setJakartaTime] = React.useState('');

  React.useEffect(() => {
    const updateTime = () => {
      const formatted = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setJakartaTime(formatted + ' WIB');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. CALCULATE CORE STATS
  const totalSales = salesTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalPurchases = receivingGoods.reduce((sum, rcv) => sum + rcv.total, 0);

  // Calculate today's sales (Jakarta Time)
  const todayStr = getJakartaDateISO();
  const todaySalesTransactions = salesTransactions.filter(tx => {
    return getJakartaDateISO(new Date(tx.tanggal)) === todayStr;
  });
  const totalTodaySales = todaySalesTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const countTodaySales = todaySalesTransactions.length;
  const totalTodayItems = todaySalesTransactions.reduce((sum, tx) => {
    return sum + tx.items.reduce((itemSum, item) => itemSum + item.jumlah, 0);
  }, 0);
  
  // Calculate cash flow
  const cashIn = cashJournal.filter(c => c.tipe === 'masuk').reduce((sum, c) => sum + c.jumlah, 0);
  const cashOut = cashJournal.filter(c => c.tipe === 'keluar').reduce((sum, c) => sum + c.jumlah, 0);
  const netCash = cashIn - cashOut;

  // Active inventory valuation
  const totalStockValue = medicines.reduce((sum, m) => sum + m.stok * m.hargaBeli, 0);
  const potentialRevenue = medicines.reduce((sum, m) => sum + m.stok * m.hargaJual, 0);
  const potentialProfit = potentialRevenue - totalStockValue;

  // 2. ALERTS FOR LOW STOCK & EXPIRED
  const lowStockMeds = medicines.filter(m => m.stok === 0);
  
  const currentDate = new Date();
  const getExpiryStatus = (expStr: string) => {
    const expDate = new Date(expStr);
    const diffTime = expDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = diffDays / 30.5;

    if (diffDays <= 0) return { label: 'Kedaluwarsa!', color: 'bg-red-500 text-white', level: 0 };
    if (diffMonths <= 3) return { label: `< 3 Bulan (ED: ${expStr})`, color: 'bg-red-100 text-red-800 border-red-200', level: 1 };
    if (diffMonths <= 6) return { label: `< 6 Bulan (ED: ${expStr})`, color: 'bg-amber-100 text-amber-800 border-amber-200', level: 2 };
    return null;
  };

  const expiringMeds = medicines
    .map(m => ({ med: m, status: getExpiryStatus(m.expiredDate) }))
    .filter(item => item.status !== null)
    .sort((a, b) => (a.status?.level || 0) - (b.status?.level || 0)) as { med: Medicine; status: { label: string; color: string; level: number } }[];

  // Handler for quick procurement reorder
  const handleQuickReorder = (med: Medicine) => {
    if (setPOItemsPrepopulate) {
      setPOItemsPrepopulate([
        {
          obatId: med.id,
          namaObat: med.nama,
          jumlah: med.stokMin * 2,
          hargaSatuan: med.hargaBeli
        }
      ]);
    }
    setActiveTab('purchase');
  };

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
            Dashboard Apotek
          </h1>
          <p className="text-sm text-slate-500">
            Ringkasan harian performa penjualan, pengadaan stok, dan keuangan apotek.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-xs w-fit self-start md:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Sesi: {currentRole.toUpperCase()} | {jakartaTime || 'Memuat...'}</span>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Penjualan Hari Ini */}
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/20 p-5 rounded-3xl border border-emerald-100/80 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Penjualan Hari Ini</span>
            </div>
            <h3 className="text-xl font-black font-mono text-slate-950">
              Rp {totalTodaySales.toLocaleString('id-ID')}
            </h3>
            <div className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg font-bold">
              <ArrowUpRight className="w-3 h-3" />
              <span>+{countTodaySales} Tx ({totalTodayItems} item)</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-600 rounded-2xl shadow-xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 p-5 rounded-3xl border border-blue-100/80 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Total Penjualan</span>
            <h3 className="text-xl font-black font-mono text-slate-950">
              Rp {totalSales.toLocaleString('id-ID')}
            </h3>
            <div className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>+{salesTransactions.length} Transaksi</span>
            </div>
          </div>
          <div className="p-3.5 bg-blue-500/10 text-blue-600 rounded-2xl shadow-xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 p-5 rounded-3xl border border-amber-100/80 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Total Belanja Obat</span>
            <h3 className="text-xl font-black font-mono text-slate-950">
              Rp {totalPurchases.toLocaleString('id-ID')}
            </h3>
            <div className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg font-bold">
              <Layers className="w-3 h-3" />
              <span>Stok Bertambah</span>
            </div>
          </div>
          <div className="p-3.5 bg-amber-500/10 text-amber-700 rounded-2xl shadow-xs">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Inventory value */}
        <div className="bg-gradient-to-br from-purple-50/60 via-white to-purple-50/20 p-5 rounded-3xl border border-purple-100/80 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Aset Modal Stok</span>
            <h3 className="text-xl font-black font-mono text-slate-950">
              Rp {totalStockValue.toLocaleString('id-ID')}
            </h3>
            <div className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded-lg font-bold">
              <span>Omset: Rp {potentialRevenue.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <div className="p-3.5 bg-purple-500/10 text-purple-600 rounded-2xl shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CORE ALERTS BOARD */}
      <div className="space-y-6">
        {/* Left column: Low Stock & Expiry */}
        <div className="space-y-6">
          {/* Low Stock Panel */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Stok Kosong ({lowStockMeds.length})
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center"
              >
                Lihat Semua <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            {lowStockMeds.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Semua stok aman di atas batas minimum.
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {lowStockMeds.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3.5 bg-rose-50/50 hover:bg-rose-50 rounded-2xl border border-rose-100/50 transition-colors">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{m.nama}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Rak: {m.lokasiRak} | Satuan: {m.satuan}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-xs font-bold text-rose-600 font-mono">{m.stok} Pcs</p>
                        <p className="text-[10px] text-slate-400 font-mono">Min: {m.stokMin}</p>
                      </div>
                      {currentRole !== 'kasir' && (
                        <button
                          onClick={() => handleQuickReorder(m)}
                          className="px-3 py-1.5 text-[10px] font-bold bg-white border border-rose-200 text-rose-700 rounded-xl hover:bg-rose-50 transition-colors"
                        >
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiry Alert Panel */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Pengingat Kedaluwarsa ({expiringMeds.length})
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center"
              >
                Analisis ED <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            {expiringMeds.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada obat yang mendekati kadaluwarsa dalam 6 bulan.
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {expiringMeds.map(({ med, status }) => (
                  <div key={med.id} className="flex items-center justify-between p-3.5 bg-amber-50/30 hover:bg-amber-50/80 rounded-2xl border border-amber-100/50 transition-colors">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{med.nama}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Batch: {med.batch} | Lokasi: {med.lokasiRak}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-xl text-[9px] font-bold ${status.color}`}>
                        {status.label}
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Stok: {med.stok} Pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
