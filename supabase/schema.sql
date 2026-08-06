-- ============================================================
-- Apotek Cipta Sehat - Supabase Schema
-- Jalankan ini di Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. TABEL OBAT (MEDICINES)
CREATE TABLE IF NOT EXISTS medicines (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori TEXT DEFAULT '',
  satuan TEXT DEFAULT '',
  harga_beli NUMERIC DEFAULT 0,
  harga_jual NUMERIC DEFAULT 0,
  stok INTEGER DEFAULT 0,
  batch TEXT DEFAULT '',
  expired_date TEXT DEFAULT '',
  lokasi_rak TEXT DEFAULT '',
  stok_min INTEGER DEFAULT 0
);

-- 2. TABEL SUPPLIER
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kontak TEXT DEFAULT '',
  alamat TEXT DEFAULT ''
);

-- 3. TABEL PELANGGAN (CUSTOMERS)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kontak TEXT DEFAULT '',
  alamat TEXT DEFAULT '',
  piutang NUMERIC DEFAULT 0
);

-- 4. TABEL DOKTER
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  spesialis TEXT DEFAULT '',
  kontak TEXT DEFAULT ''
);

-- 5. TABEL PURCHASE ORDER
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_nama TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC DEFAULT 0,
  approved_by TEXT DEFAULT '',
  alasan_reject TEXT DEFAULT ''
);

-- 6. TABEL PENERIMAAN BARANG
CREATE TABLE IF NOT EXISTS receiving_goods (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_nama TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  items_received JSONB DEFAULT '[]'::jsonb,
  total NUMERIC DEFAULT 0,
  cara_bayar TEXT DEFAULT 'tunai',
  jatuh_tempo TEXT
);

-- 7. TABEL RETUR PEMBELIAN
CREATE TABLE IF NOT EXISTS return_purchases (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_nama TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  total_refund NUMERIC DEFAULT 0,
  alasan TEXT DEFAULT ''
);

-- 8. TABEL HUTANG SUPPLIER
CREATE TABLE IF NOT EXISTS supplier_debts (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  supplier_nama TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  referensi_id TEXT NOT NULL,
  jumlah_total NUMERIC DEFAULT 0,
  sisa_hutang NUMERIC DEFAULT 0,
  jatuh_tempo TEXT NOT NULL,
  status TEXT DEFAULT 'belum_lunas'
);

-- 9. TABEL PEMBAYARAN HUTANG
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  jumlah_bayar NUMERIC DEFAULT 0,
  sisa_sebelumnya NUMERIC DEFAULT 0,
  metode_bayar TEXT DEFAULT ''
);

-- 10. TABEL TRANSAKSI PENJUALAN
CREATE TABLE IF NOT EXISTS sales_transactions (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  kasir_name TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  customer_id TEXT,
  dokter_id TEXT,
  dokter_nama TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  diskon NUMERIC DEFAULT 0,
  pajak NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  bayar NUMERIC DEFAULT 0,
  kembali NUMERIC DEFAULT 0,
  cara_bayar TEXT DEFAULT 'tunai',
  is_resep BOOLEAN DEFAULT FALSE,
  resep_detail TEXT
);

-- 11. TABEL RETUR PENJUALAN
CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  sales_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  total_refund NUMERIC DEFAULT 0,
  alasan TEXT DEFAULT ''
);

-- 12. TABEL PIUTANG PELANGGAN
CREATE TABLE IF NOT EXISTS customer_credits (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_nama TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  sales_id TEXT NOT NULL,
  jumlah_total NUMERIC DEFAULT 0,
  sisa_piutang NUMERIC DEFAULT 0,
  jatuh_tempo TEXT NOT NULL,
  status TEXT DEFAULT 'belum_lunas'
);

-- 13. TABEL PEMBAYARAN PIUTANG
CREATE TABLE IF NOT EXISTS credit_payments (
  id TEXT PRIMARY KEY,
  credit_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  jumlah_bayar NUMERIC DEFAULT 0,
  sisa_sebelumnya NUMERIC DEFAULT 0
);

-- 14. TABEL KARTU STOK
CREATE TABLE IF NOT EXISTS stock_cards (
  id TEXT PRIMARY KEY,
  obat_id TEXT NOT NULL,
  nama_obat TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  tipe TEXT NOT NULL,
  referensi_id TEXT NOT NULL,
  jumlah INTEGER DEFAULT 0,
  stok_awal INTEGER DEFAULT 0,
  stok_akhir INTEGER DEFAULT 0,
  keterangan TEXT DEFAULT '',
  oleh TEXT DEFAULT ''
);

-- 15. TABEL STOK OPNAME
CREATE TABLE IF NOT EXISTS stock_opnames (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  oleh TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::jsonb
);

-- 16. TABEL JURNAL KAS
CREATE TABLE IF NOT EXISTS cash_journal (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  tipe TEXT NOT NULL,
  kategori TEXT NOT NULL,
  jumlah NUMERIC DEFAULT 0,
  keterangan TEXT DEFAULT ''
);

-- 17. TABEL PROFILES (PENGGUNA, terhubung ke Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'kasir' CHECK (role IN ('superadmin', 'admin', 'apoteker', 'kasir', 'manager')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES untuk performa
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stock_cards_obat ON stock_cards(obat_id);
CREATE INDEX IF NOT EXISTS idx_stock_cards_tanggal ON stock_cards(tanggal);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_tanggal ON sales_transactions(tanggal);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_customer ON sales_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_cash_journal_tanggal ON cash_journal(tanggal);
CREATE INDEX IF NOT EXISTS idx_cash_journal_tipe ON cash_journal(tipe);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier ON supplier_debts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_customer ON customer_credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_medicines_kategori ON medicines(kategori);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - AUTHENTICATED ONLY
-- Hanya user yang sudah login (Supabase Auth) yang dapat
-- membaca/menulis data. Policy ini setara dengan yang dibuat
-- migrasi: supabase/migrations/20260806_auth_rbac.sql
-- Jalankan migrasi tersebut di Supabase SQL Editor untuk
-- memindahkan user lama ke auth.users & membuat fungsi admin.
-- ============================================================
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy authenticated-only di semua tabel data
CREATE POLICY "auth_select" ON medicines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON medicines FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON medicines FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON medicines FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON suppliers FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON suppliers FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON customers FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON customers FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON doctors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON doctors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON doctors FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON doctors FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON purchase_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON purchase_orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON purchase_orders FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON purchase_orders FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON receiving_goods FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON receiving_goods FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON receiving_goods FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON receiving_goods FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON return_purchases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON return_purchases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON return_purchases FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON return_purchases FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON supplier_debts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON supplier_debts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON supplier_debts FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON supplier_debts FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON debt_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON debt_payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON debt_payments FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON debt_payments FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON sales_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON sales_transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON sales_transactions FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON sales_transactions FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON sales_returns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON sales_returns FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON sales_returns FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON sales_returns FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON customer_credits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON customer_credits FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON customer_credits FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON customer_credits FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON credit_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON credit_payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON credit_payments FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON credit_payments FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON stock_cards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON stock_cards FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON stock_cards FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON stock_cards FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON stock_opnames FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON stock_opnames FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON stock_opnames FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON stock_opnames FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select" ON cash_journal FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON cash_journal FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON cash_journal FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON cash_journal FOR DELETE USING (auth.role() = 'authenticated');

-- Policy khusus tabel profiles: semua user login boleh membaca,
-- penulisan hanya lewat fungsi admin (security definer).
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- MIGRASI PERBAIKAN (aman dijalankan berulang kali)
-- Menambahkan kolom yang hilang pada database lama agar semua
-- penyimpanan data berjalan normal. Jika kolom sudah ada,
-- perintah berikut akan diabaikan.
-- ============================================================
ALTER TABLE stock_cards ADD COLUMN IF NOT EXISTS oleh TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS alasan_reject TEXT DEFAULT '';
