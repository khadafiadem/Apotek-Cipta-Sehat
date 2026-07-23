/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PharmacyProvider, usePharmacy } from './PharmacyContext';
import Dashboard from './components/Dashboard';
import MasterData from './components/MasterData';
import PurchaseModule from './components/PurchaseModule';
import SalesModule from './components/SalesModule';
import StockInventory from './components/StockInventory';
import ReportsAnalytics from './components/ReportsAnalytics';
import SettingsBackup from './components/SettingsBackup';
import LaporanMenu from './components/LaporanMenu';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { User } from './types';
import { sessionService, userService } from './services';

import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  Truck,
  Package,
  PieChart,
  Settings,
  Shield,
  Menu,
  X,
  AlertTriangle,
  Clock,
  Briefcase,
  ClipboardList,
  Users,
  LogOut
} from 'lucide-react';

function MainAppShell() {
  const { currentRole, setRole, medicines } = usePharmacy();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Dynamic Jakarta clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatJakartaDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatJakartaTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';
  };

  // States for logged in user session
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Load session from Supabase on mount
  useEffect(() => {
    sessionService.getActiveSession()
      .then(session => {
        if (session) {
          setLoggedInUser(session.user);
        }
      })
      .catch(e => console.warn('Failed to load session:', e))
      .finally(() => setSessionLoaded(true));
  }, []);

  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Track staff lists from Supabase
  useEffect(() => {
    if (!sessionLoaded) return;

    const loadUsers = async () => {
      try {
        const users = await userService.getAll();
        if (users.length > 0) {
          setAllUsers(users);
        } else {
          const defaults = getDefaultUsers();
          for (const u of defaults) {
            try { await userService.add(u.id, u); } catch {}
          }
          setAllUsers(defaults);
        }
      } catch (e) {
        console.warn('Failed to load users from Supabase:', e);
        setAllUsers(getDefaultUsers());
      }
    };

    loadUsers();
  }, [sessionLoaded, loggedInUser, activeTab]);

  // Sync context role with active logged-in user role
  useEffect(() => {
    if (loggedInUser && loggedInUser.role !== currentRole) {
      setRole(loggedInUser.role);
    }
  }, [loggedInUser, currentRole, setRole]);

  const getDefaultUsers = (): User[] => [
    { id: 'USR-1', name: 'Ahmad Cipta', role: 'admin' as const, email: 'ahmad@ciptasehat.com', password: 'test' },
    { id: 'USR-2', name: 'Apt. Rahmawati', role: 'apoteker' as const, email: 'rahma@ciptasehat.com', password: 'test' },
    { id: 'USR-3', name: 'Siska Amelia', role: 'kasir' as const, email: 'siska@ciptasehat.com', password: 'test' },
    { id: 'USR-4', name: 'Mohammad Khadafi', role: 'admin' as const, email: 'Dafi@ciptasehat.com', password: 'test' }
  ];

  const handleLoginSuccess = (user: User) => {
    setLoggedInUser(user);
    sessionService.createSession(user, user.role).catch(e => console.error('Failed to save session:', e));
    setRole(user.role);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setLoggedInUser(null);
    sessionService.clearSession().catch(e => console.error('Failed to clear session:', e));
    setShowLogoutConfirm(false);
  };

  const getActiveUserName = () => {
    const user = allUsers.find(u => u.role === currentRole);
    return user ? user.name : (currentRole === 'admin' ? 'Super Admin' : currentRole);
  };

  // States for cross-module prepopulate suggestions
  const [poPrepopulate, setPoPrepopulate] = useState<{ obatId: string; namaObat: string; jumlah: number; hargaSatuan: number }[] | null>(null);

  // Quick counter calculations for sidebar badges
  const lowStockCount = medicines.filter(m => m.stok === 0).length;
  
  const currentDate = new Date();
  const criticalExpiryCount = medicines.filter(m => {
    const expDate = new Date(m.expiredDate);
    const diffDays = Math.ceil((expDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90; // expiring in less than 3 months
  }).length;

  // Handler for prepopulating PO items
  const handleSetPOItemsPrepopulate = (items: { obatId: string; namaObat: string; jumlah: number; hargaSatuan: number }[]) => {
    setPoPrepopulate(items);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'master', label: 'Data Master', icon: Database },
    { id: 'sales', label: 'POS Kasir', icon: ShoppingCart },
    { id: 'purchase', label: 'Pengadaan PO', icon: Truck, badge: poPrepopulate ? 'Draft' : undefined },
    { id: 'inventory', label: 'Stok & Opname', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount}!` : undefined, badgeColor: 'bg-rose-500' },
    { id: 'reports', label: 'Keuangan & Jurnal', icon: PieChart },
    { id: 'laporan', label: 'Menu Laporan', icon: ClipboardList },
    { id: 'user', label: 'User', icon: Users },
    { id: 'settings', label: 'Pengaturan & Backup', icon: Settings }
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            setActiveTab={setActiveTab}
            setPOItemsPrepopulate={handleSetPOItemsPrepopulate}
          />
        );
      case 'master':
        return <MasterData />;
      case 'sales':
        return <SalesModule />;
      case 'purchase':
        return (
          <PurchaseModule
            poItemsPrepopulate={poPrepopulate}
            clearPOItemsPrepopulate={() => setPoPrepopulate(null)}
          />
        );
      case 'inventory':
        return <StockInventory />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'laporan':
        return (
          <LaporanMenu
            setActiveTab={setActiveTab}
            setPOItemsPrepopulate={handleSetPOItemsPrepopulate}
          />
        );
      case 'user':
        return <UserManagement />;
      case 'settings':
        return <SettingsBackup />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'apoteker':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'kasir':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  if (!sessionLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 text-xs font-bold animate-pulse">Memuat sesi...</div>
      </div>
    );
  }

  if (!loggedInUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 antialiased" id="pharmacy-app-shell">
      {/* 1. SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        {/* Logo and Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Apotek Cipta Sehat</h1>
            <p className="text-[10px] text-emerald-400 font-medium">Sistem Terpadu</p>
          </div>
        </div>

        {/* User Role Profile Indicator */}
        <div className="p-5 border-b border-slate-800/60 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center border-2 border-emerald-500 text-white font-bold text-sm uppercase">
              {currentRole.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white capitalize truncate">{getActiveUserName()}</p>
              <span className={`inline-block text-[9px] px-2 py-0.5 rounded border font-bold uppercase mt-1 ${getRoleBadgeStyle(currentRole)}`}>
                {currentRole === 'admin' ? 'Superadmin' : currentRole.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500 text-white'} text-white`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Action */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/25 transition-all shadow-3xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>

        {/* Warnings alert counters */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-2 text-[10px]">
          {criticalExpiryCount > 0 && (
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{criticalExpiryCount} Obat Kritis Expired</span>
            </div>
          )}
          <div className="flex flex-col gap-1 text-slate-500 font-mono text-[10px] border-t border-slate-800/50 pt-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{formatJakartaTime(currentTime)}</span>
            </div>
            <div className="pl-5 text-slate-400">
              {formatJakartaDate(currentTime)}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE MENU HEADER */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-emerald-500" />
          <span className="font-bold text-sm tracking-wide uppercase">Apotek Cipta Sehat</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 3. MOBILE MENU SLIDEOVER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex bg-black/50 backdrop-blur-xs">
          <div className="w-64 bg-slate-900 text-slate-300 p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-xs uppercase text-slate-400">Navigasi Apotek</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-lg flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center border-2 border-emerald-500 text-white font-bold text-xs uppercase">
                  {currentRole.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-white capitalize">{getActiveUserName()}</p>
                  <span className={`inline-block text-[8px] px-2 py-0.5 rounded font-bold uppercase ${getRoleBadgeStyle(currentRole)}`}>{currentRole.toUpperCase()}</span>
                </div>
              </div>

              <nav className="space-y-1">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && <span className="bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Sistem</span>
              </button>
              <div className="border-t border-slate-800 pt-3 text-[10px] text-slate-500 font-mono space-y-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{formatJakartaTime(currentTime)}</span>
                </div>
                <div className="pl-5 text-slate-400 font-sans">
                  Sesi: {formatJakartaDate(currentTime)}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* 4. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {renderActiveComponent()}
        </div>
      </main>

      {/* 5. LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm overflow-hidden p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 animate-bounce">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Konfirmasi Keluar</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin keluar dari sistem <strong className="text-slate-800">Apotek Cipta Sehat</strong>? Anda perlu login kembali untuk mengakses modul.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all border border-slate-200/50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <PharmacyProvider>
      <MainAppShell />
    </PharmacyProvider>
  );
}
