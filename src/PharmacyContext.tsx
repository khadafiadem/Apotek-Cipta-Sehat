/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  User,
  Medicine,
  Supplier,
  Customer,
  Doctor,
  PurchaseOrder,
  ReceivingGoods,
  ReturnPurchase,
  SupplierDebt,
  DebtPayment,
  SalesTransaction,
  CancelledTransaction,
  ReturnSales,
  CustomerCredit,
  CreditPayment,
  StockCard,
  StockOpname,
  CashJournal,
  POItem,
  ReceivedItem,
  SalesItem,
  OpnameItem
} from './types';
import {
  medicineService,
  supplierService,
  customerService,
  doctorService,
  purchaseOrderService,
  receivingGoodsService,
  returnPurchaseService,
  supplierDebtService,
  debtPaymentService,
  salesTransactionService,
  salesReturnService,
  customerCreditService,
  creditPaymentService,
  stockCardService,
  stockOpnameService,
  cashJournalService,
  sessionService,
} from './services';

interface PharmacyContextType {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  loggedInUser: User | null;
  setLoggedInUser: (user: User | null) => void;
  loading: boolean;
  medicines: Medicine[];
  suppliers: Supplier[];
  customers: Customer[];
  doctors: Doctor[];
  purchaseOrders: PurchaseOrder[];
  receivingGoods: ReceivingGoods[];
  returnPurchases: ReturnPurchase[];
  supplierDebts: SupplierDebt[];
  debtPayments: DebtPayment[];
  salesTransactions: SalesTransaction[];
  cancelledTransactions: CancelledTransaction[];
  salesReturns: ReturnSales[];
  customerCredits: CustomerCredit[];
  creditPayments: CreditPayment[];
  stockCards: StockCard[];
  stockOpnames: StockOpname[];
  cashJournal: CashJournal[];

  // Operations
  addMedicine: (med: Omit<Medicine, 'id'>) => void;
  importMedicinesBatch: (
    newMedsList: Omit<Medicine, 'id'>[],
    onProgress?: (current: number, total: number) => void
  ) => Promise<{ success: boolean; count: number; error?: string }>;
  updateMedicine: (id: string, med: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  clearAllMedicines: () => Promise<{ success: boolean; error?: string }>;

  addSupplier: (sup: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, sup: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addCustomer: (cust: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, cust: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addDoctor: (doc: Omit<Doctor, 'id'>) => void;
  updateDoctor: (id: string, doc: Partial<Doctor>) => void;
  deleteDoctor: (id: string) => void;

  createPurchaseOrder: (supplierId: string, items: Omit<POItem, 'total'>[]) => void;
  updatePOStatus: (id: string, status: PurchaseOrder['status']) => void;
  approvePurchaseOrder: (id: string) => void;
  rejectPurchaseOrder: (id: string, alasan: string) => void;
  receivePurchaseOrder: (
    poId: string,
    receivedItems: ReceivedItem[],
    caraBayar: 'tunai' | 'kredit',
    jatuhTempo?: string
  ) => void;
  createDirectReceiving: (params: {
    supplierId: string;
    noFaktur?: string;
    tglFaktur?: string;
    tglTerima?: string;
    hariTempo?: number;
    jatuhTempo?: string;
    itemsReceived: ReceivedItem[];
    caraBayar: 'tunai' | 'kredit';
    poId?: string;
    diskonFaktur?: number;
    ppnPersen?: number;
    totalCustomNetto?: number;
  }) => void;
  returnPurchase: (supplierId: string, items: { obatId: string; jumlah: number; alasan: string }[]) => void;
  payDebt: (debtId: string, jumlahBayar: number, metodeBayar: string) => void;

  checkoutSales: (params: {
    customerName: string;
    customerId?: string;
    dokterId?: string;
    items: Omit<SalesItem, 'total'>[];
    caraBayar: 'tunai' | 'kredit' | 'debit' | 'qris';
    diskon: number;
    pajak: number;
    bayar: number;
    isResep: boolean;
    resepDetail?: string;
  }) => { success: boolean; error?: string; txId?: string };
  returnSales: (salesId: string, items: { obatId: string; jumlah: number }[], alasan: string) => void;
  cancelSalesTransaction: (salesId: string, alasan: string) => Promise<{ success: boolean; error?: string }>;
  payCredit: (creditId: string, jumlahBayar: number) => void;

  addStockOpname: (oleh: string, items: { obatId: string; stokFisik: number; keterangan: string }[]) => void;
  addCashJournalEntry: (tipe: 'masuk' | 'keluar', kategori: CashJournal['kategori'], jumlah: number, keterangan: string) => void;

  // Data actions
  exportDatabase: () => void;
  importDatabase: (jsonString: string) => { success: boolean; error?: string };
  resetDatabase: () => void;
  syncToSupabase: () => Promise<void>;
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// PRE-SEEDED DEMO DATA
const INITIAL_MEDICINES: Medicine[] = [
  { id: 'MED-1', nama: 'Paracetamol 500mg', kategori: 'Analgesik', satuan: 'Tablet', hargaBeli: 1500, hargaJual: 2500, stok: 120, batch: 'B2026-X1', expiredDate: '2027-04-12', lokasiRak: 'Rak A-1', stokMin: 20 },
  { id: 'MED-2', nama: 'Amoxicillin 500mg', kategori: 'Antibiotik', satuan: 'Kaplet', hargaBeli: 4000, hargaJual: 6500, stok: 15, batch: 'B2026-A3', expiredDate: '2026-09-15', lokasiRak: 'Rak B-3', stokMin: 30 },
  { id: 'MED-3', nama: 'Cetirizine 10mg', kategori: 'Antihistamin', satuan: 'Tablet', hargaBeli: 1800, hargaJual: 3000, stok: 80, batch: 'B2026-C2', expiredDate: '2026-08-20', lokasiRak: 'Rak A-2', stokMin: 15 },
  { id: 'MED-4', nama: 'OBH Cough Syrup 100ml', kategori: 'Obat Batuk', satuan: 'Botol', hargaBeli: 12000, hargaJual: 18000, stok: 45, batch: 'B2026-O8', expiredDate: '2027-11-01', lokasiRak: 'Rak C-1', stokMin: 10 },
  { id: 'MED-5', nama: 'Metformin 500mg', kategori: 'Antidiabetes', satuan: 'Tablet', hargaBeli: 2000, hargaJual: 3500, stok: 150, batch: 'B2026-M4', expiredDate: '2028-01-30', lokasiRak: 'Rak D-2', stokMin: 25 },
  { id: 'MED-6', nama: 'Atorvastatin 20mg', kategori: 'Kolesterol', satuan: 'Tablet', hargaBeli: 8000, hargaJual: 12000, stok: 8, batch: 'B2026-AT2', expiredDate: '2027-05-18', lokasiRak: 'Rak E-1', stokMin: 20 },
  { id: 'MED-7', nama: 'Vitamin C 500mg', kategori: 'Suplemen', satuan: 'Tablet', hargaBeli: 1000, hargaJual: 1800, stok: 300, batch: 'B2026-V9', expiredDate: '2027-12-25', lokasiRak: 'Rak A-4', stokMin: 50 },
  { id: 'MED-8', nama: 'Dexamethasone 0.5mg', kategori: 'Kortikosteroid', satuan: 'Tablet', hargaBeli: 800, hargaJual: 1500, stok: 250, batch: 'B2026-D1', expiredDate: '2026-12-10', lokasiRak: 'Rak B-1', stokMin: 30 }
];

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'SUP-1', nama: 'PT. Kimia Farma Trading', kontak: '0812-3456-7890', alamat: 'Jl. Industri No. 4, Jakarta' },
  { id: 'SUP-2', nama: 'PT. Bina San Prima', kontak: '0811-9876-5432', alamat: 'Jl. Gatot Subroto No. 45, Bandung' },
  { id: 'SUP-3', nama: 'PT. Enseval Putera Megatrading', kontak: '021-8901234', alamat: 'Kawasan Industri Pulogadung, Jakarta' }
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'CUST-1', nama: 'Budi Santoso', kontak: '0856-1111-2222', alamat: 'Jl. Merdeka No. 12, Kota', piutang: 0 },
  { id: 'CUST-2', nama: 'Siti Rahma', kontak: '0813-2222-3333', alamat: 'Perum Harapan Indah Blok C-5, Kota', piutang: 45000 },
  { id: 'CUST-3', nama: 'Umum (Walk-in)', kontak: '-', alamat: '-', piutang: 0 }
];

const INITIAL_DOCTORS: Doctor[] = [
  { id: 'DOC-1', nama: 'Dr. Andi Wijaya, Sp.PD', spesialis: 'Spesialis Penyakit Dalam', kontak: '0812-8888-9999' },
  { id: 'DOC-2', nama: 'Dr. Sarah Siregar, Sp.A', spesialis: 'Spesialis Anak', kontak: '0811-7777-6666' }
];

const INITIAL_SALES: SalesTransaction[] = [
  {
    id: 'TX-1001', tanggal: '2026-07-05T10:30:00Z', kasirName: 'Ahmad Kasir', customerName: 'Budi Santoso', customerId: 'CUST-1',
    items: [
      { obatId: 'MED-1', namaObat: 'Paracetamol 500mg', jumlah: 4, hargaSatuan: 2500, isRacikan: false, total: 10000 },
      { obatId: 'MED-4', namaObat: 'OBH Cough Syrup 100ml', jumlah: 1, hargaSatuan: 18000, isRacikan: false, total: 18000 }
    ],
    subtotal: 28000, diskon: 2000, pajak: 2600, total: 28600, bayar: 30000, kembali: 1400, caraBayar: 'tunai', isResep: false
  },
  {
    id: 'TX-1002', tanggal: '2026-07-06T14:15:00Z', kasirName: 'Ahmad Kasir', customerName: 'Siti Rahma', customerId: 'CUST-2', dokterId: 'DOC-1', dokterNama: 'Dr. Andi Wijaya, Sp.PD',
    items: [
      { obatId: 'MED-2', namaObat: 'Amoxicillin 500mg', jumlah: 10, hargaSatuan: 6500, isRacikan: false, total: 65000 },
      { obatId: 'MED-7', namaObat: 'Vitamin C 500mg', jumlah: 20, hargaSatuan: 1800, isRacikan: false, total: 36000 }
    ],
    subtotal: 101000, diskon: 5000, pajak: 9600, total: 105600, bayar: 110000, kembali: 4400, caraBayar: 'tunai', isResep: true, resepDetail: 'Amoxicillin 3x1 d.d. dtd'
  },
  {
    id: 'TX-1003', tanggal: '2026-07-07T11:00:00Z', kasirName: 'Ahmad Kasir', customerName: 'Umum (Walk-in)',
    items: [
      { obatId: 'MED-1', namaObat: 'Paracetamol 500mg', jumlah: 10, hargaSatuan: 2500, isRacikan: false, total: 25000 },
      { obatId: 'MED-5', namaObat: 'Metformin 500mg', jumlah: 30, hargaSatuan: 3500, isRacikan: false, total: 105000 }
    ],
    subtotal: 130000, diskon: 0, pajak: 13000, total: 143000, bayar: 143000, kembali: 0, caraBayar: 'qris', isResep: false
  },
  {
    id: 'TX-1004', tanggal: '2026-07-08T16:45:00Z', kasirName: 'Ahmad Kasir', customerName: 'Siti Rahma', customerId: 'CUST-2',
    items: [
      { obatId: 'MED-6', namaObat: 'Atorvastatin 20mg', jumlah: 5, hargaSatuan: 12000, isRacikan: false, total: 60000 }
    ],
    subtotal: 60000, diskon: 5000, pajak: 5500, total: 60500, bayar: 0, kembali: 0, caraBayar: 'kredit', isResep: false
  },
  {
    id: 'TX-1005', tanggal: '2026-07-09T09:20:00Z', kasirName: 'Ahmad Kasir', customerName: 'Umum (Walk-in)',
    items: [
      {
        obatId: 'RACIK-1', namaObat: 'Kapsul Racik Batuk & Alergi', jumlah: 10, hargaSatuan: 3500, isRacikan: true,
        racikanNama: 'Racikan Cough & Allergy',
        racikanIngredients: [
          { obatId: 'MED-1', namaObat: 'Paracetamol 500mg', jumlah: 5 },
          { obatId: 'MED-3', namaObat: 'Cetirizine 10mg', jumlah: 5 }
        ],
        total: 35000
      }
    ],
    subtotal: 35000, diskon: 0, pajak: 3500, total: 38500, bayar: 50000, kembali: 11500, caraBayar: 'tunai', isResep: false
  }
];

const INITIAL_PO: PurchaseOrder[] = [
  {
    id: 'PO-2001', supplierId: 'SUP-1', supplierNama: 'PT. Kimia Farma Trading', tanggal: '2026-07-01T08:00:00Z', status: 'diterima',
    items: [
      { obatId: 'MED-1', namaObat: 'Paracetamol 500mg', jumlah: 100, hargaSatuan: 1500, total: 150000 },
      { obatId: 'MED-5', namaObat: 'Metformin 500mg', jumlah: 150, hargaSatuan: 2000, total: 300000 }
    ],
    total: 450000
  },
  {
    id: 'PO-2002', supplierId: 'SUP-2', supplierNama: 'PT. Bina San Prima', tanggal: '2026-07-08T10:00:00Z', status: 'dipesan',
    items: [
      { obatId: 'MED-2', namaObat: 'Amoxicillin 500mg', jumlah: 50, hargaSatuan: 4000, total: 200000 },
      { obatId: 'MED-6', namaObat: 'Atorvastatin 20mg', jumlah: 30, hargaSatuan: 8000, total: 240000 }
    ],
    total: 440000
  }
];

const INITIAL_RECEIVED: ReceivingGoods[] = [
  {
    id: 'RCV-2001', poId: 'PO-2001', supplierId: 'SUP-1', supplierNama: 'PT. Kimia Farma Trading', tanggal: '2026-07-02T11:00:00Z',
    itemsReceived: [
      { obatId: 'MED-1', namaObat: 'Paracetamol 500mg', jumlahPesan: 100, jumlahDiterima: 100, batch: 'B2026-X1', expiredDate: '2027-04-12', hargaBeli: 1500 },
      { obatId: 'MED-5', namaObat: 'Metformin 500mg', jumlahPesan: 150, jumlahDiterima: 150, batch: 'B2026-M4', expiredDate: '2028-01-30', hargaBeli: 2000 }
    ],
    total: 450000, caraBayar: 'tunai'
  }
];

const INITIAL_CREDITS: CustomerCredit[] = [
  {
    id: 'CRD-1001', customerId: 'CUST-2', customerNama: 'Siti Rahma', tanggal: '2026-07-08T16:45:00Z', salesId: 'TX-1004',
    jumlahTotal: 60500, sisaPiutang: 45000, jatuhTempo: '2026-08-08', status: 'belum_lunas'
  }
];

const INITIAL_CASH: CashJournal[] = [
  { id: 'CASH-1', tanggal: '2026-07-01T17:00:00Z', tipe: 'keluar', kategori: 'Sewa', jumlah: 1500000, keterangan: 'Sewa ruko bulanan' },
  { id: 'CASH-2', tanggal: '2026-07-02T12:00:00Z', tipe: 'keluar', kategori: 'Pembelian', jumlah: 450000, keterangan: 'Penerimaan barang PO-2001 PT. Kimia Farma' },
  { id: 'CASH-3', tanggal: '2026-07-03T18:00:00Z', tipe: 'keluar', kategori: 'Listrik', jumlah: 350000, keterangan: 'Bayar listrik token Juli' },
  { id: 'CASH-4', tanggal: '2026-07-05T10:30:00Z', tipe: 'masuk', kategori: 'Penjualan', jumlah: 28600, keterangan: 'Penjualan TX-1001' },
  { id: 'CASH-5', tanggal: '2026-07-06T14:15:00Z', tipe: 'masuk', kategori: 'Penjualan', jumlah: 105600, keterangan: 'Penjualan TX-1002' },
  { id: 'CASH-6', tanggal: '2026-07-07T11:00:00Z', tipe: 'masuk', kategori: 'Penjualan', jumlah: 143000, keterangan: 'Penjualan TX-1003' },
  { id: 'CASH-7', tanggal: '2026-07-08T18:00:00Z', tipe: 'keluar', kategori: 'ATK', jumlah: 75000, keterangan: 'Beli kertas struk kasir' },
  { id: 'CASH-8', tanggal: '2026-07-09T09:20:00Z', tipe: 'masuk', kategori: 'Penjualan', jumlah: 38500, keterangan: 'Penjualan TX-1005' },
  { id: 'CASH-9', tanggal: '2026-07-10T00:01:00Z', tipe: 'keluar', kategori: 'Gaji', jumlah: 2500000, keterangan: 'Gaji asisten apoteker' }
];

const INITIAL_STOCK_CARDS: StockCard[] = [
  { id: 'SC-1', obatId: 'MED-1', namaObat: 'Paracetamol 500mg', tanggal: '2026-07-01T00:00:00Z', tipe: 'masuk', referensiId: 'SYSTEM', jumlah: 24, stokAwal: 0, stokAkhir: 24, keterangan: 'Stok awal sistem', oleh: 'Super Admin' },
  { id: 'SC-2', obatId: 'MED-1', namaObat: 'Paracetamol 500mg', tanggal: '2026-07-02T11:00:00Z', tipe: 'masuk', referensiId: 'RCV-2001', jumlah: 100, stokAwal: 24, stokAkhir: 124, keterangan: 'Penerimaan barang PO-2001', oleh: 'Super Admin' },
  { id: 'SC-3', obatId: 'MED-1', namaObat: 'Paracetamol 500mg', tanggal: '2026-07-05T10:30:00Z', tipe: 'keluar', referensiId: 'TX-1001', jumlah: 4, stokAwal: 124, stokAkhir: 120, keterangan: 'Penjualan kasir TX-1001', oleh: 'Kasir Utama' },
  { id: 'SC-4', obatId: 'MED-5', namaObat: 'Metformin 500mg', tanggal: '2026-07-02T11:00:00Z', tipe: 'masuk', referensiId: 'RCV-2001', jumlah: 150, stokAwal: 0, stokAkhir: 150, keterangan: 'Penerimaan barang PO-2001', oleh: 'Super Admin' },
  { id: 'SC-5', obatId: 'MED-5', namaObat: 'Metformin 500mg', tanggal: '2026-07-07T11:00:00Z', tipe: 'keluar', referensiId: 'TX-1003', jumlah: 30, stokAwal: 150, stokAkhir: 120, keterangan: 'Penjualan kasir TX-1003', oleh: 'Kasir Utama' }
];

export const PharmacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setRoleState] = useState<UserRole>('superadmin');
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receivingGoods, setReceivingGoods] = useState<ReceivingGoods[]>([]);
  const [returnPurchases, setReturnPurchases] = useState<ReturnPurchase[]>([]);
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);

  const [salesTransactions, setSalesTransactions] = useState<SalesTransaction[]>([]);
  const [cancelledTransactions, setCancelledTransactions] = useState<CancelledTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('acs_cancelled_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('acs_cancelled_transactions', JSON.stringify(cancelledTransactions));
    } catch (e) {
      console.error('Failed to save cancelled transactions:', e);
    }
  }, [cancelledTransactions]);

  const [salesReturns, setSalesReturns] = useState<ReturnSales[]>([]);
  const [customerCredits, setCustomerCredits] = useState<CustomerCredit[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);

  const [stockCards, setStockCards] = useState<StockCard[]>([]);
  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>([]);
  const [cashJournal, setCashJournal] = useState<CashJournal[]>([]);

  const currentUserName = loggedInUser?.name || (currentRole === 'kasir' ? 'Kasir Utama' : 'Super Admin');

  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load session role from Supabase
        try {
          const session = await sessionService.getActiveSession();
          if (session) {
            setRoleState(session.role);
          }
        } catch (e) {
          console.warn('Failed to load session from Supabase:', e);
        }

        const results = await Promise.allSettled([
          medicineService.getAll(),
          supplierService.getAll(),
          customerService.getAll(),
          doctorService.getAll(),
          purchaseOrderService.getAll(),
          receivingGoodsService.getAll(),
          returnPurchaseService.getAll(),
          supplierDebtService.getAll(),
          debtPaymentService.getAll(),
          salesTransactionService.getAll(),
          salesReturnService.getAll(),
          customerCreditService.getAll(),
          creditPaymentService.getAll(),
          stockCardService.getAll(),
          stockOpnameService.getAll(),
          cashJournalService.getAll(),
        ]);

        const get = (r: PromiseSettledResult<unknown[]>) =>
          r.status === 'fulfilled' ? r.value : [];

        setMedicines(get(results[0]) as Medicine[]);
        setSuppliers(get(results[1]) as Supplier[]);
        setCustomers(get(results[2]) as Customer[]);
        setDoctors(get(results[3]) as Doctor[]);
        setPurchaseOrders(get(results[4]) as PurchaseOrder[]);
        setReceivingGoods(get(results[5]) as ReceivingGoods[]);
        setReturnPurchases(get(results[6]) as ReturnPurchase[]);
        setSupplierDebts(get(results[7]) as SupplierDebt[]);
        setDebtPayments(get(results[8]) as DebtPayment[]);
        setSalesTransactions(get(results[9]) as SalesTransaction[]);
        setSalesReturns(get(results[10]) as ReturnSales[]);
        setCustomerCredits(get(results[11]) as CustomerCredit[]);
        setCreditPayments(get(results[12]) as CreditPayment[]);
        setStockCards(get(results[13]) as StockCard[]);
        setStockOpnames(get(results[14]) as StockOpname[]);
        setCashJournal(get(results[15]) as CashJournal[]);
      } catch (e) {
        console.error('Failed to load data from Supabase, loading seed data', e);
        setMedicines(INITIAL_MEDICINES);
        setSuppliers(INITIAL_SUPPLIERS);
        setCustomers(INITIAL_CUSTOMERS);
        setDoctors(INITIAL_DOCTORS);
        setSalesTransactions(INITIAL_SALES);
        setPurchaseOrders(INITIAL_PO);
        setReceivingGoods(INITIAL_RECEIVED);
        setCustomerCredits(INITIAL_CREDITS);
        setCashJournal(INITIAL_CASH);
        setStockCards(INITIAL_STOCK_CARDS);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const setRole = (role: UserRole) => {
    setRoleState(role);
    sessionService.updateSessionRole(role).catch(e => console.error('Failed to update session role:', e));
  };

  // MEDICINES CRUD
  const addMedicine = (med: Omit<Medicine, 'id'>) => {
    const id = genId('MED');
    const newMed: Medicine = { ...med, id };

    // Optimistic update
    setMedicines(prev => [...prev, newMed]);
    const newCard: StockCard = {
      id: genId('SC'), obatId: id, namaObat: newMed.nama, tanggal: new Date().toISOString(),
      tipe: 'masuk', referensiId: 'MANUAL', jumlah: newMed.stok, stokAwal: 0, stokAkhir: newMed.stok, keterangan: 'Registrasi obat baru', oleh: currentUserName
    };
    setStockCards(prev => [...prev, newCard]);

    // Persist to Supabase
    medicineService.add(id, med).catch(e => console.error('Failed to save medicine:', e));
    stockCardService.add(newCard).catch(e => console.error('Failed to save stock card:', e));
  };

  const importMedicinesBatch = async (
    newMedsList: Omit<Medicine, 'id'>[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (currentRole !== 'superadmin') {
      return { success: false, count: 0, error: 'Akses Ditolak: Hanya Super Admin yang diizinkan mengimport batch data obat.' };
    }
    try {
      const generatedMeds: Medicine[] = [];
      const generatedCards: StockCard[] = [];
      const timestamp = new Date().toISOString();

      newMedsList.forEach((med, idx) => {
        const id = `MED-B${Date.now().toString(36).toUpperCase()}-${idx}`;
        const newMed: Medicine = {
          ...med,
          id,
          batch: med.batch || `BATCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          lokasiRak: med.lokasiRak || 'Rak Umum',
          expiredDate: med.expiredDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          stokMin: med.stokMin || 10
        };
        generatedMeds.push(newMed);

        if (newMed.stok > 0) {
          generatedCards.push({
            id: `SC-B${Date.now().toString(36).toUpperCase()}-${idx}`,
            obatId: id,
            namaObat: newMed.nama,
            tanggal: timestamp,
            tipe: 'masuk',
            referensiId: 'BATCH_IMPORT',
            jumlah: newMed.stok,
            stokAwal: 0,
            stokAkhir: newMed.stok,
            keterangan: 'Import batch obat (Mohammad Khadafi)',
            oleh: currentUserName
          });
        }
      });

      // Update state locally
      setMedicines(prev => [...prev, ...generatedMeds]);
      if (generatedCards.length > 0) {
        setStockCards(prev => [...prev, ...generatedCards]);
      }

      // Persist to Supabase in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < generatedMeds.length; i += chunkSize) {
        const chunkMeds = generatedMeds.slice(i, i + chunkSize);
        await medicineService.upsertMany(chunkMeds);
        if (onProgress) {
          onProgress(Math.min(i + chunkSize, generatedMeds.length), generatedMeds.length);
        }
      }

      if (generatedCards.length > 0) {
        for (let i = 0; i < generatedCards.length; i += chunkSize) {
          const chunkCards = generatedCards.slice(i, i + chunkSize);
          await stockCardService.addMany(chunkCards);
        }
      }

      return { success: true, count: generatedMeds.length };
    } catch (e) {
      console.error('Batch import failed:', e);
      return { success: false, count: 0, error: (e as Error).message };
    }
  };

  const updateMedicine = (id: string, updatedFields: Partial<Medicine>) => {
    setMedicines(prev => prev.map(m => {
      if (m.id === id) {
        const result = { ...m, ...updatedFields };
        if (updatedFields.stok !== undefined && updatedFields.stok !== m.stok) {
          const diff = updatedFields.stok - m.stok;
          const newCard: StockCard = {
            id: genId('SC'), obatId: m.id, namaObat: m.nama, tanggal: new Date().toISOString(),
            tipe: 'penyesuaian', referensiId: 'MANUAL_EDIT', jumlah: Math.abs(diff),
            stokAwal: m.stok, stokAkhir: updatedFields.stok,
            keterangan: `Penyesuaian manual (${diff > 0 ? '+' : ''}${diff})`,
            oleh: currentUserName
          };
          setStockCards(prevCards => [...prevCards, newCard]);
          stockCardService.add(newCard).catch(e => console.error('Failed to save stock card:', e));
        }
        medicineService.update(id, updatedFields).catch(e => console.error('Failed to update medicine:', e));
        return result;
      }
      return m;
    }));
  };

  const deleteMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
    medicineService.delete(id).catch(e => console.error('Failed to delete medicine:', e));
  };

  const clearAllMedicines = async (): Promise<{ success: boolean; error?: string }> => {
    if (currentRole !== 'superadmin') {
      return { success: false, error: 'Akses Ditolak: Hanya Super Admin yang diizinkan menghapus seluruh data obat.' };
    }
    setMedicines([]);
    try {
      await medicineService.deleteAll();
      return { success: true };
    } catch (e) {
      console.error('Failed to clear medicines:', e);
      return { success: false, error: (e as Error).message };
    }
  };

  // SUPPLIERS CRUD
  const addSupplier = (sup: Omit<Supplier, 'id'>) => {
    const id = genId('SUP');
    setSuppliers(prev => [...prev, { ...sup, id }]);
    supplierService.add(id, sup).catch(e => console.error('Failed to save supplier:', e));
  };

  const updateSupplier = (id: string, sup: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...sup } : s));
    supplierService.update(id, sup).catch(e => console.error('Failed to update supplier:', e));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    supplierService.delete(id).catch(e => console.error('Failed to delete supplier:', e));
  };

  // CUSTOMERS CRUD
  const addCustomer = (cust: Omit<Customer, 'id'>) => {
    const id = genId('CUST');
    setCustomers(prev => [...prev, { ...cust, id }]);
    customerService.add(id, cust).catch(e => console.error('Failed to save customer:', e));
  };

  const updateCustomer = (id: string, cust: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...cust } : c));
    customerService.update(id, cust).catch(e => console.error('Failed to update customer:', e));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    customerService.delete(id).catch(e => console.error('Failed to delete customer:', e));
  };

  // DOCTORS CRUD
  const addDoctor = (doc: Omit<Doctor, 'id'>) => {
    const id = genId('DOC');
    setDoctors(prev => [...prev, { ...doc, id }]);
    doctorService.add(id, doc).catch(e => console.error('Failed to save doctor:', e));
  };

  const updateDoctor = (id: string, doc: Partial<Doctor>) => {
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, ...doc } : d));
    doctorService.update(id, doc).catch(e => console.error('Failed to update doctor:', e));
  };

  const deleteDoctor = (id: string) => {
    setDoctors(prev => prev.filter(d => d.id !== id));
    doctorService.delete(id).catch(e => console.error('Failed to delete doctor:', e));
  };

  // PURCHASE ORDERS
  const createPurchaseOrder = (supplierId: string, items: Omit<POItem, 'total'>[]) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const subtotal = items.reduce((sum, item) => sum + item.jumlah * item.hargaSatuan, 0);
    const newPO: PurchaseOrder = {
      id: genId('PO'), supplierId, supplierNama: supplier ? supplier.nama : 'Unknown',
      tanggal: new Date().toISOString(), status: 'menunggu_approval',
      items: items.map(item => ({ ...item, total: item.jumlah * item.hargaSatuan })), total: subtotal
    };
    setPurchaseOrders(prev => [...prev, newPO]);
    purchaseOrderService.add(newPO).catch(e => console.error('Failed to save PO:', e));
  };

  const updatePOStatus = (id: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, status } : po));
    purchaseOrderService.updateStatus(id, status).catch(e => console.error('Failed to update PO status:', e));
  };

  // MANAGER APPROVAL FLOW
  const approvePurchaseOrder = (id: string) => {
    const by = loggedInUser?.name || currentUserName;
    setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, status: 'approve', approvedBy: by, alasanReject: undefined } : po));
    purchaseOrderService.updateApproval(id, 'approve', by).catch(e => console.error('Failed to approve PO:', e));
  };

  const rejectPurchaseOrder = (id: string, alasan: string) => {
    const by = loggedInUser?.name || currentUserName;
    setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, status: 'di_reject', approvedBy: by, alasanReject: alasan } : po));
    purchaseOrderService.updateApproval(id, 'di_reject', by, alasan).catch(e => console.error('Failed to reject PO:', e));
  };

  // RECEIVE GOODS DIRECT OR FROM PO
  const createDirectReceiving = (params: {
    supplierId: string;
    noFaktur?: string;
    tglFaktur?: string;
    tglTerima?: string;
    hariTempo?: number;
    jatuhTempo?: string;
    itemsReceived: ReceivedItem[];
    caraBayar: 'tunai' | 'kredit';
    poId?: string;
    diskonFaktur?: number;
    ppnPersen?: number;
    totalCustomNetto?: number;
  }) => {
    const supplier = suppliers.find(s => s.id === params.supplierId);
    const supplierNama = supplier ? supplier.nama : 'Distributor';
    const timestamp = new Date().toISOString();
    const rcvId = genId('RCV');

    const grossTotal = params.itemsReceived.reduce((sum, item) => {
      const disc = item.diskonPersen ? (item.hargaBeli * item.diskonPersen) / 100 : (item.diskonRp || 0);
      return sum + (item.hargaBeli - disc) * item.jumlahDiterima;
    }, 0);

    const afterFakturDisc = Math.max(0, grossTotal - (params.diskonFaktur || 0));
    const ppnRate = params.ppnPersen !== undefined ? params.ppnPersen : 11;
    const ppnAmount = Math.round(afterFakturDisc * (ppnRate / 100));
    const calculatedTotal = afterFakturDisc + ppnAmount;
    const finalTotal = params.totalCustomNetto !== undefined ? params.totalCustomNetto : calculatedTotal;

    const newReceipt: ReceivingGoods = {
      id: rcvId,
      poId: params.poId || '',
      supplierId: params.supplierId,
      supplierNama,
      noFaktur: params.noFaktur,
      tglFaktur: params.tglFaktur,
      tglTerima: params.tglTerima,
      hariTempo: params.hariTempo,
      tanggal: params.tglTerima ? new Date(params.tglTerima).toISOString() : timestamp,
      itemsReceived: params.itemsReceived,
      total: finalTotal,
      diskonFaktur: params.diskonFaktur || 0,
      ppnPersen: ppnRate,
      dpp: afterFakturDisc,
      totalPPN: ppnAmount,
      totalGross: grossTotal,
      caraBayar: params.caraBayar,
      jatuhTempo: params.jatuhTempo
    };

    setReceivingGoods(prev => [...prev, newReceipt]);

    if (params.poId) {
      setPurchaseOrders(prev => prev.map(p => p.id === params.poId ? { ...p, status: 'diterima' } : p));
      purchaseOrderService.updateStatus(params.poId, 'diterima').catch(e => console.error('Failed to update PO:', e));
    }

    const newCards: StockCard[] = [];
    const updatedMeds = medicines.map(med => {
      const received = params.itemsReceived.find(r => r.obatId === med.id);
      if (received && received.jumlahDiterima > 0) {
        const oldStok = med.stok;
        const newStok = oldStok + received.jumlahDiterima;
        newCards.push({
          id: genId('SC'),
          obatId: med.id,
          namaObat: med.nama,
          tanggal: timestamp,
          tipe: 'masuk',
          referensiId: rcvId,
          jumlah: received.jumlahDiterima,
          stokAwal: oldStok,
          stokAkhir: newStok,
          keterangan: `Pembelian Faktur ${params.noFaktur || rcvId} (${supplierNama})`,
          oleh: currentUserName
        });
        return {
          ...med,
          stok: newStok,
          batch: received.batch || med.batch,
          expiredDate: received.expiredDate || med.expiredDate,
          hargaBeli: received.hargaBeli || med.hargaBeli
        };
      }
      return med;
    });
    setMedicines(updatedMeds);
    if (newCards.length > 0) {
      setStockCards(prev => [...prev, ...newCards]);
    }

    // Persist
    receivingGoodsService.add(newReceipt).catch(e => console.error('Failed to save receiving:', e));
    if (newCards.length > 0) stockCardService.addMany(newCards).catch(e => console.error('Failed to save stock cards:', e));

    if (params.caraBayar === 'tunai') {
      addCashJournalEntry('keluar', 'Pembelian', finalTotal, `Pembelian Faktur ${params.noFaktur || rcvId} (${supplierNama}) - Tunai`);
    } else {
      const debtId = genId('DBT');
      const newDebt: SupplierDebt = {
        id: debtId,
        supplierId: params.supplierId,
        supplierNama,
        tanggal: timestamp,
        referensiId: rcvId,
        jumlahTotal: finalTotal,
        sisaHutang: finalTotal,
        jatuhTempo: params.jatuhTempo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'belum_lunas'
      };
      setSupplierDebts(prev => [...prev, newDebt]);
      supplierDebtService.add(newDebt).catch(e => console.error('Failed to save debt:', e));
    }
  };

  const receivePurchaseOrder = (
    poId: string, receivedItems: ReceivedItem[], caraBayar: 'tunai' | 'kredit', jatuhTempo?: string
  ) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    createDirectReceiving({
      supplierId: po.supplierId,
      poId,
      itemsReceived: receivedItems,
      caraBayar,
      jatuhTempo,
      ppnPersen: 11
    });
  };

  // RETURN PURCHASE
  const returnPurchase = (supplierId: string, items: { obatId: string; jumlah: number; alasan: string }[]) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const timestamp = new Date().toISOString();
    const returnId = genId('RETB');
    let totalRefund = 0;

    const returnItems = items.map(item => {
      const med = medicines.find(m => m.id === item.obatId);
      const buyPrice = med ? med.hargaBeli : 0;
      const subtotal = item.jumlah * buyPrice;
      totalRefund += subtotal;

      const newCards: StockCard[] = [];
      setMedicines(prevMeds => prevMeds.map(m => {
        if (m.id === item.obatId) {
          const oldStok = m.stok;
          const newStok = Math.max(0, m.stok - item.jumlah);
          newCards.push({
            id: genId('SC'), obatId: m.id, namaObat: m.nama, tanggal: timestamp,
            tipe: 'retur_beli', referensiId: returnId, jumlah: item.jumlah,
            stokAwal: oldStok, stokAkhir: newStok, keterangan: `Retur Pembelian Supplier - ${item.alasan}`,
            oleh: currentUserName
          });
          return { ...m, stok: newStok };
        }
        return m;
      }));
      if (newCards.length > 0) {
        setStockCards(prev => [...prev, ...newCards]);
        stockCardService.addMany(newCards).catch(e => console.error('Failed to save stock cards:', e));
      }

      return { obatId: item.obatId, namaObat: med ? med.nama : 'Unknown', jumlah: item.jumlah, hargaBeli: buyPrice, total: subtotal };
    });

    const newReturn: ReturnPurchase = {
      id: returnId, supplierId, supplierNama: supplier ? supplier.nama : 'Unknown',
      tanggal: timestamp, items: returnItems, totalRefund, alasan: items[0]?.alasan || 'Retur Barang'
    };
    setReturnPurchases(prev => [...prev, newReturn]);
    returnPurchaseService.add(newReturn).catch(e => console.error('Failed to save return:', e));
    addCashJournalEntry('masuk', 'Retur', totalRefund, `Retur Pembelian ${returnId} to ${newReturn.supplierNama}`);
  };

  // PAY DEBT
  const payDebt = (debtId: string, jumlahBayar: number, metodeBayar: string) => {
    const timestamp = new Date().toISOString();
    const paymentId = genId('PAY');

    setSupplierDebts(prev => prev.map(debt => {
      if (debt.id === debtId) {
        const sisaSebelumnya = debt.sisaHutang;
        const newSisa = Math.max(0, sisaSebelumnya - jumlahBayar);
        const status = newSisa === 0 ? 'lunas' : 'belum_lunas';

        const payment: DebtPayment = { id: paymentId, debtId, tanggal: timestamp, jumlahBayar, sisaSebelumnya, metodeBayar };
        setDebtPayments(prevPayments => [...prevPayments, payment]);
        debtPaymentService.add(payment).catch(e => console.error('Failed to save payment:', e));
        addCashJournalEntry('keluar', 'Pelunasan Hutang', jumlahBayar, `Pembayaran hutang ke ${debt.supplierNama} (${debt.referensiId})`);
        supplierDebtService.update(debtId, { sisaHutang: newSisa, status: status as SupplierDebt['status'] }).catch(e => console.error('Failed to update debt:', e));

        return { ...debt, sisaHutang: newSisa, status: status as SupplierDebt['status'] };
      }
      return debt;
    }));
  };

  // CHECKOUT SALES
  const checkoutSales = (params: {
    customerName: string; customerId?: string; dokterId?: string;
    items: Omit<SalesItem, 'total'>[]; caraBayar: 'tunai' | 'kredit' | 'debit' | 'qris';
    diskon: number; pajak: number; bayar: number; isResep: boolean; resepDetail?: string;
  }) => {
    const timestamp = new Date().toISOString();
    const txId = genId('TX');

    // Validate stock
    for (const item of params.items) {
      if (item.isRacikan) {
        if (item.racikanIngredients) {
          for (const ing of item.racikanIngredients) {
            const med = medicines.find(m => m.id === ing.obatId);
            const neededTotal = ing.jumlah * item.jumlah;
            if (!med || med.stok < neededTotal) {
              return { success: false, error: `Stok tidak cukup untuk racikan ingredient: ${med ? med.nama : ing.obatId}. Tersedia: ${med?.stok || 0}, Butuh: ${neededTotal}` };
            }
          }
        }
      } else {
        const med = medicines.find(m => m.id === item.obatId);
        if (!med || med.stok < item.jumlah) {
          return { success: false, error: `Stok tidak cukup untuk obat: ${med ? med.nama : item.obatId}. Tersedia: ${med?.stok || 0}, Butuh: ${item.jumlah}` };
        }
      }
    }

    // Deduct stock
    const newCards: StockCard[] = [];
    setMedicines(prevMeds => prevMeds.map(med => {
      let soldQty = 0;
      const singleItem = params.items.find(i => !i.isRacikan && i.obatId === med.id);
      if (singleItem) soldQty += singleItem.jumlah;

      params.items.forEach(item => {
        if (item.isRacikan && item.racikanIngredients) {
          const ing = item.racikanIngredients.find(g => g.obatId === med.id);
          if (ing) soldQty += ing.jumlah * item.jumlah;
        }
      });

      if (soldQty > 0) {
        const oldStok = med.stok;
        const newStok = Math.max(0, oldStok - soldQty);
        newCards.push({
          id: genId('SC'), obatId: med.id, namaObat: med.nama, tanggal: timestamp,
          tipe: 'keluar', referensiId: txId, jumlah: soldQty,
          stokAwal: oldStok, stokAkhir: newStok, keterangan: `Penjualan Kasir ${txId}`,
          oleh: currentUserName
        });
        medicineService.update(med.id, { stok: newStok }).catch(e => console.error('Failed to update stock:', e));
        return { ...med, stok: newStok };
      }
      return med;
    }));

    if (newCards.length > 0) {
      setStockCards(prev => [...prev, ...newCards]);
      stockCardService.addMany(newCards).catch(e => console.error('Failed to save stock cards:', e));
    }

    const processedItems: SalesItem[] = params.items.map(item => ({ ...item, total: item.jumlah * item.hargaSatuan }));
    const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);
    const totalTx = Math.max(0, subtotal - params.diskon + params.pajak);
    const kembali = params.caraBayar === 'kredit' ? 0 : Math.max(0, params.bayar - totalTx);
    const doctor = params.dokterId ? doctors.find(d => d.id === params.dokterId) : undefined;

    const newTx: SalesTransaction = {
      id: txId, tanggal: timestamp, kasirName: 'Kasir Utama',
      customerName: params.customerName || 'Umum (Walk-in)', customerId: params.customerId,
      dokterId: params.dokterId, dokterNama: doctor?.nama, items: processedItems,
      subtotal, diskon: params.diskon, pajak: params.pajak, total: totalTx,
      bayar: params.caraBayar === 'kredit' ? 0 : params.bayar, kembali,
      caraBayar: params.caraBayar, isResep: params.isResep, resepDetail: params.resepDetail
    };

    setSalesTransactions(prev => [newTx, ...prev]);
    salesTransactionService.add(newTx).catch(e => console.error('Failed to save transaction:', e));

    if (params.caraBayar !== 'kredit') {
      addCashJournalEntry('masuk', 'Penjualan', totalTx, `Penjualan Kasir ${txId} - ${params.caraBayar.toUpperCase()}`);
    } else if (params.customerId) {
      const creditId = genId('CRD');
      const newCredit: CustomerCredit = {
        id: creditId, customerId: params.customerId, customerNama: params.customerName,
        tanggal: timestamp, salesId: txId, jumlahTotal: totalTx, sisaPiutang: totalTx,
        jatuhTempo: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'belum_lunas'
      };
      setCustomerCredits(prev => [...prev, newCredit]);
      setCustomers(prevCust => prevCust.map(c => c.id === params.customerId ? { ...c, piutang: c.piutang + totalTx } : c));
      customerCreditService.add(newCredit).catch(e => console.error('Failed to save credit:', e));
      customerService.update(params.customerId, { piutang: totalTx }).catch(e => console.error('Failed to update customer:', e));
    }

    return { success: true, txId };
  };

  // RETURN SALES
  const returnSales = (salesId: string, items: { obatId: string; jumlah: number }[], alasan: string) => {
    const tx = salesTransactions.find(t => t.id === salesId);
    if (!tx) return;

    const timestamp = new Date().toISOString();
    const retId = genId('RETS');
    let totalRefund = 0;

    const newCards: StockCard[] = [];
    const returnItems = items.map(item => {
      const med = medicines.find(m => m.id === item.obatId);
      const sellPrice = med ? med.hargaJual : 0;
      const subtotal = item.jumlah * sellPrice;
      totalRefund += subtotal;

      setMedicines(prevMeds => prevMeds.map(m => {
        if (m.id === item.obatId) {
          const oldStok = m.stok;
          const newStok = oldStok + item.jumlah;
          newCards.push({
            id: genId('SC'), obatId: m.id, namaObat: m.nama, tanggal: timestamp,
            tipe: 'retur_jual', referensiId: retId, jumlah: item.jumlah,
            stokAwal: oldStok, stokAkhir: newStok, keterangan: `Retur Penjualan Kasir - ${alasan}`,
            oleh: currentUserName
          });
          medicineService.update(m.id, { stok: newStok }).catch(e => console.error('Failed to update stock:', e));
          return { ...m, stok: newStok };
        }
        return m;
      }));

      return { obatId: item.obatId, namaObat: med ? med.nama : 'Unknown', jumlah: item.jumlah, hargaSatuan: sellPrice, total: subtotal };
    });

    if (newCards.length > 0) {
      setStockCards(prev => [...prev, ...newCards]);
      stockCardService.addMany(newCards).catch(e => console.error('Failed to save stock cards:', e));
    }

    const newReturn: ReturnSales = { id: retId, salesId, tanggal: timestamp, items: returnItems, totalRefund, alasan };
    setSalesReturns(prev => [...prev, newReturn]);
    salesReturnService.add(newReturn).catch(e => console.error('Failed to save return:', e));
    addCashJournalEntry('keluar', 'Retur', totalRefund, `Retur Penjualan Kasir ${retId} - Refund`);
  };

  // CANCEL SALES TRANSACTION (Admin & Super Admin privilege)
  const cancelSalesTransaction = async (
    salesId: string,
    alasan: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isAuthorized =
      currentRole === 'superadmin' ||
      currentRole === 'admin' ||
      loggedInUser?.role === 'superadmin' ||
      loggedInUser?.role === 'admin' ||
      loggedInUser?.email?.toLowerCase().includes('dafi');

    if (!isAuthorized) {
      return { success: false, error: 'Akses Ditolak: Pembatalan transaksi hanya diizinkan untuk Admin atau Super Admin.' };
    }

    const tx = salesTransactions.find(t => t.id === salesId);
    if (!tx) {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }

    const timestamp = new Date().toISOString();
    const newCards: StockCard[] = [];

    // Restoring stock for all sold medicines / compound ingredients
    setMedicines(prevMeds => prevMeds.map(med => {
      let returnQty = 0;
      const singleItem = tx.items.find(i => !i.isRacikan && i.obatId === med.id);
      if (singleItem) returnQty += singleItem.jumlah;

      tx.items.forEach(item => {
        if (item.isRacikan && item.racikanIngredients) {
          const ing = item.racikanIngredients.find(g => g.obatId === med.id);
          if (ing) returnQty += ing.jumlah * item.jumlah;
        }
      });

      if (returnQty > 0) {
        const oldStok = med.stok;
        const newStok = oldStok + returnQty;
        newCards.push({
          id: genId('SC'),
          obatId: med.id,
          namaObat: med.nama,
          tanggal: timestamp,
          tipe: 'retur_jual',
          referensiId: salesId,
          jumlah: returnQty,
          stokAwal: oldStok,
          stokAkhir: newStok,
          keterangan: `Pembatalan Transaksi ${salesId} (Super Admin) - ${alasan}`,
          oleh: currentUserName
        });
        medicineService.update(med.id, { stok: newStok }).catch(e => console.error('Failed to update stock:', e));
        return { ...med, stok: newStok };
      }
      return med;
    }));

    if (newCards.length > 0) {
      setStockCards(prev => [...prev, ...newCards]);
      stockCardService.addMany(newCards).catch(e => console.error('Failed to save stock cards:', e));
    }

    // Reverse Financial Journal / Credit
    if (tx.caraBayar !== 'kredit') {
      addCashJournalEntry('keluar', 'Retur', tx.total, `Pembatalan Transaksi ${salesId} - ${alasan}`);
    } else if (tx.customerId) {
      setCustomers(prevCust => prevCust.map(c => c.id === tx.customerId ? { ...c, piutang: Math.max(0, c.piutang - tx.total) } : c));
      customerService.update(tx.customerId, {}).catch(e => console.error('Failed to update customer:', e));

      setCustomerCredits(prevCredits => prevCredits.map(cred => {
        if (cred.salesId === salesId) {
          return { ...cred, sisaPiutang: 0, status: 'lunas' };
        }
        return cred;
      }));
    }

    // Save to Cancelled Transactions Log
    const cancelledLog: CancelledTransaction = {
      id: genId('VOID'),
      salesId: tx.id,
      tanggalTransaksi: tx.tanggal,
      tanggalPembatalan: timestamp,
      kasirName: tx.kasirName,
      customerName: tx.customerName,
      total: tx.total,
      caraBayar: tx.caraBayar,
      dibatalkanOleh: loggedInUser?.name || 'Super Admin',
      alasan: alasan,
      items: tx.items
    };
    setCancelledTransactions(prev => [cancelledLog, ...prev]);

    // Delete transaction from state & Supabase
    setSalesTransactions(prev => prev.filter(t => t.id !== salesId));
    salesTransactionService.delete(salesId).catch(e => console.error('Failed to delete transaction:', e));

    return { success: true };
  };

  // PAY CREDIT
  const payCredit = (creditId: string, jumlahBayar: number) => {
    const timestamp = new Date().toISOString();
    const paymentId = genId('PAYCR');

    setCustomerCredits(prevCredits => prevCredits.map(credit => {
      if (credit.id === creditId) {
        const sisaSebelumnya = credit.sisaPiutang;
        const newSisa = Math.max(0, sisaSebelumnya - jumlahBayar);
        const status = newSisa === 0 ? 'lunas' : 'belum_lunas';

        const payment: CreditPayment = { id: paymentId, creditId, tanggal: timestamp, jumlahBayar, sisaSebelumnya };
        setCreditPayments(prevPayments => [...prevPayments, payment]);
        setCustomers(prevCust => prevCust.map(c => c.id === credit.customerId ? { ...c, piutang: Math.max(0, c.piutang - jumlahBayar) } : c));
        addCashJournalEntry('masuk', 'Pelunasan Piutang', jumlahBayar, `Pelunasan piutang pelanggan ${credit.customerNama} (${credit.salesId})`);

        creditPaymentService.add(payment).catch(e => console.error('Failed to save payment:', e));
        customerCreditService.update(creditId, { sisaPiutang: newSisa, status: status as CustomerCredit['status'] }).catch(e => console.error('Failed to update credit:', e));
        customerService.update(credit.customerId, {}).catch(e => console.error('Failed to update customer:', e));

        return { ...credit, sisaPiutang: newSisa, status: status as CustomerCredit['status'] };
      }
      return credit;
    }));
  };

  // STOCK OPNAME
  const addStockOpname = (oleh: string, items: { obatId: string; stokFisik: number; keterangan: string }[]) => {
    const timestamp = new Date().toISOString();
    const opnameId = genId('OPN');

    const newCards: StockCard[] = [];
    const opnameItems: OpnameItem[] = items.map(item => {
      const med = medicines.find(m => m.id === item.obatId);
      const stokSistem = med ? med.stok : 0;
      const selisih = item.stokFisik - stokSistem;

      if (selisih !== 0) {
        setMedicines(prevMeds => prevMeds.map(m => {
          if (m.id === item.obatId) {
            newCards.push({
              id: genId('SC'), obatId: m.id, namaObat: m.nama, tanggal: timestamp,
              tipe: 'penyesuaian', referensiId: opnameId, jumlah: Math.abs(selisih),
              stokAwal: stokSistem, stokAkhir: item.stokFisik,
              keterangan: `Stok Opname: ${item.keterangan || 'Selisih penyesuaian'}`,
              oleh
            });
            medicineService.update(m.id, { stok: item.stokFisik }).catch(e => console.error('Failed to update stock:', e));
            return { ...m, stok: item.stokFisik };
          }
          return m;
        }));
      }

      return { obatId: item.obatId, namaObat: med ? med.nama : 'Unknown', stokSistem, stokFisik: item.stokFisik, selisih, keterangan: item.keterangan };
    });

    if (newCards.length > 0) {
      setStockCards(prev => [...prev, ...newCards]);
      stockCardService.addMany(newCards).catch(e => console.error('Failed to save stock cards:', e));
    }

    const newOpname: StockOpname = { id: opnameId, tanggal: timestamp, oleh, items: opnameItems };
    setStockOpnames(prev => [newOpname, ...prev]);
    stockOpnameService.add(newOpname).catch(e => console.error('Failed to save opname:', e));
  };

  // CASH JOURNAL
  const addCashJournalEntry = (tipe: 'masuk' | 'keluar', kategori: CashJournal['kategori'], jumlah: number, keterangan: string) => {
    const newEntry: CashJournal = { id: genId('CASH'), tanggal: new Date().toISOString(), tipe, kategori, jumlah, keterangan };
    setCashJournal(prev => [newEntry, ...prev]);
    cashJournalService.add(newEntry).catch(e => console.error('Failed to save cash journal:', e));
  };

  // DATABASE ACTIONS
  const exportDatabase = () => {
    const dataToExport = {
      medicines, suppliers, customers, doctors, purchaseOrders, receivingGoods,
      returnPurchases, supplierDebts, debtPayments, salesTransactions,
      returnSales: salesReturns, customerCredits, creditPayments,
      stockCards, stockOpnames, cashJournal
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Apotek_DB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importDatabase = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.medicines || !parsed.suppliers) {
        return { success: false, error: 'Format backup database tidak valid.' };
      }
      setMedicines(parsed.medicines);
      setSuppliers(parsed.suppliers);
      setCustomers(parsed.customers || []);
      setDoctors(parsed.doctors || []);
      setPurchaseOrders(parsed.purchaseOrders || []);
      setReceivingGoods(parsed.receivingGoods || []);
      setReturnPurchases(parsed.returnPurchases || []);
      setSupplierDebts(parsed.supplierDebts || []);
      setDebtPayments(parsed.debtPayments || []);
      setSalesTransactions(parsed.salesTransactions || []);
      setSalesReturns(parsed.salesReturns || parsed.returnSales || []);
      setCustomerCredits(parsed.customerCredits || []);
      setCreditPayments(parsed.creditPayments || []);
      setStockCards(parsed.stockCards || []);
      setStockOpnames(parsed.stockOpnames || []);
      setCashJournal(parsed.cashJournal || []);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Gagal parse JSON backup: ' + (e as Error).message };
    }
  };

  const resetDatabase = () => {
    setMedicines(INITIAL_MEDICINES);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomers(INITIAL_CUSTOMERS);
    setDoctors(INITIAL_DOCTORS);
    setPurchaseOrders([]);
    setReceivingGoods([]);
    setReturnPurchases([]);
    setSupplierDebts([]);
    setDebtPayments([]);
    setSalesTransactions([]);
    setSalesReturns([]);
    setCustomerCredits([]);
    setCreditPayments([]);
    setStockCards([]);
    setStockOpnames([]);
    setCashJournal([]);
    window.location.reload();
  };

  // Sync all current data to Supabase
  const syncToSupabase = async () => {
    try {
      await Promise.all([
        medicineService.upsertMany(medicines),
        supplierService.upsertMany(suppliers),
        customerService.upsertMany(customers),
        doctorService.upsertMany(doctors),
        purchaseOrderService.upsertMany(purchaseOrders),
        receivingGoodsService.upsertMany(receivingGoods),
        returnPurchaseService.upsertMany(returnPurchases),
        supplierDebtService.upsertMany(supplierDebts),
        debtPaymentService.upsertMany(debtPayments),
        salesTransactionService.upsertMany(salesTransactions),
        salesReturnService.upsertMany(salesReturns),
        customerCreditService.upsertMany(customerCredits),
        creditPaymentService.upsertMany(creditPayments),
        stockCardService.upsertMany(stockCards),
        stockOpnameService.upsertMany(stockOpnames),
        cashJournalService.upsertMany(cashJournal),
      ]);
      console.log('All data synced to Supabase successfully');
    } catch (e) {
      console.error('Failed to sync to Supabase:', e);
    }
  };

  return (
    <PharmacyContext.Provider value={{
      currentRole, setRole, loggedInUser, setLoggedInUser, loading,
      medicines, suppliers, customers, doctors,
      purchaseOrders, receivingGoods, returnPurchases, supplierDebts, debtPayments,
      salesTransactions, cancelledTransactions, salesReturns, customerCredits, creditPayments,
      stockCards, stockOpnames, cashJournal,

      addMedicine, importMedicinesBatch, updateMedicine, deleteMedicine, clearAllMedicines,
      addSupplier, updateSupplier, deleteSupplier,
      addCustomer, updateCustomer, deleteCustomer,
      addDoctor, updateDoctor, deleteDoctor,
      createPurchaseOrder, updatePOStatus, approvePurchaseOrder, rejectPurchaseOrder, receivePurchaseOrder, createDirectReceiving,
      returnPurchase, payDebt,
      checkoutSales, returnSales, cancelSalesTransaction, payCredit,
      addStockOpname, addCashJournalEntry,
      exportDatabase, importDatabase, resetDatabase, syncToSupabase
    }}>
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (context === undefined) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};
