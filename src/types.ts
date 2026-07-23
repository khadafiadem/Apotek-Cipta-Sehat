/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'apoteker' | 'kasir';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
}

export interface Medicine {
  id: string;
  nama: string;
  kategori: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  batch: string;
  expiredDate: string; // Format: YYYY-MM-DD
  lokasiRak: string;
  stokMin: number;
}

export interface Supplier {
  id: string;
  nama: string;
  kontak: string;
  alamat: string;
}

export interface Customer {
  id: string;
  nama: string;
  kontak: string;
  alamat: string;
  piutang: number; // Sisa piutang pelanggan
}

export interface Doctor {
  id: string;
  nama: string;
  spesialis: string;
  kontak: string;
}

export interface POItem {
  obatId: string;
  namaObat: string;
  jumlah: number;
  hargaSatuan: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierNama: string;
  tanggal: string;
  status: 'draft' | 'dipesan' | 'diterima' | 'batal';
  items: POItem[];
  total: number;
}

export interface ReceivedItem {
  obatId: string;
  namaObat: string;
  jumlahPesan: number;
  jumlahDiterima: number;
  batch: string;
  expiredDate: string;
  hargaBeli: number;
}

export interface ReceivingGoods {
  id: string;
  poId: string;
  supplierId: string;
  supplierNama: string;
  tanggal: string;
  itemsReceived: ReceivedItem[];
  total: number;
  caraBayar: 'tunai' | 'kredit';
  jatuhTempo?: string; // Jika kredit
}

export interface ReturnPurchaseItem {
  obatId: string;
  namaObat: string;
  jumlah: number;
  hargaBeli: number;
  total: number;
}

export interface ReturnPurchase {
  id: string;
  supplierId: string;
  supplierNama: string;
  tanggal: string;
  items: ReturnPurchaseItem[];
  totalRefund: number;
  alasan: string;
}

export interface SupplierDebt {
  id: string;
  supplierId: string;
  supplierNama: string;
  tanggal: string;
  referensiId: string; // PO atau Penerimaan Barang ID
  jumlahTotal: number;
  sisaHutang: number;
  jatuhTempo: string;
  status: 'belum_lunas' | 'lunas';
}

export interface DebtPayment {
  id: string;
  debtId: string;
  tanggal: string;
  jumlahBayar: number;
  sisaSebelumnya: number;
  metodeBayar: string;
}

export interface SalesItem {
  obatId: string;
  namaObat: string;
  jumlah: number;
  hargaSatuan: number;
  isRacikan: boolean;
  racikanNama?: string;
  racikanIngredients?: { obatId: string; namaObat: string; jumlah: number }[];
  total: number;
}

export interface SalesTransaction {
  id: string;
  tanggal: string;
  kasirName: string;
  customerName: string;
  customerId?: string;
  dokterId?: string;
  dokterNama?: string;
  items: SalesItem[];
  subtotal: number;
  diskon: number;
  pajak: number;
  total: number;
  bayar: number;
  kembali: number;
  caraBayar: 'tunai' | 'kredit' | 'debit' | 'qris';
  isResep: boolean;
  resepDetail?: string;
}

export interface ReturnSalesItem {
  obatId: string;
  namaObat: string;
  jumlah: number;
  hargaSatuan: number;
  total: number;
}

export interface ReturnSales {
  id: string;
  salesId: string;
  tanggal: string;
  items: ReturnSalesItem[];
  totalRefund: number;
  alasan: string;
}

export interface CustomerCredit {
  id: string;
  customerId: string;
  customerNama: string;
  tanggal: string;
  salesId: string;
  jumlahTotal: number;
  sisaPiutang: number;
  jatuhTempo: string;
  status: 'belum_lunas' | 'lunas';
}

export interface CreditPayment {
  id: string;
  creditId: string;
  tanggal: string;
  jumlahBayar: number;
  sisaSebelumnya: number;
}

export interface StockCard {
  id: string;
  obatId: string;
  namaObat: string;
  tanggal: string;
  tipe: 'masuk' | 'keluar' | 'retur_beli' | 'retur_jual' | 'penyesuaian';
  referensiId: string; // ID transaksi/PO/retur/opname
  jumlah: number;
  stokAwal: number;
  stokAkhir: number;
  keterangan: string;
}

export interface OpnameItem {
  obatId: string;
  namaObat: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  keterangan: string;
}

export interface StockOpname {
  id: string;
  tanggal: string;
  oleh: string;
  items: OpnameItem[];
}

export interface CashJournal {
  id: string;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  kategori: 'Penjualan' | 'Pembelian' | 'Pelunasan Hutang' | 'Pelunasan Piutang' | 'Listrik' | 'Gaji' | 'ATK' | 'Sewa' | 'Retur' | 'Lain-lain';
  jumlah: number;
  keterangan: string;
}
