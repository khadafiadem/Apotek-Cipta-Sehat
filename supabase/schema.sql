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
  total NUMERIC DEFAULT 0
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
  keterangan TEXT DEFAULT ''
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

-- 17. TABEL USERS (PENGGUNA)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'apoteker', 'kasir')),
  password TEXT DEFAULT ''
);

-- 18. TABEL USER SESSIONS (SESI AKTIF)
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT DEFAULT now()::text
);
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  tipe TEXT NOT NULL,
  kategori TEXT NOT NULL,
  jumlah NUMERIC DEFAULT 0,
  keterangan TEXT DEFAULT ''
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Disable untuk development
-- Untuk production, enable RLS dan buat policies
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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy sementara: allow all (untuk development)
-- Di production, ganti dengan policy yang lebih ketat
CREATE POLICY "Allow all for development" ON medicines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON receiving_goods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON return_purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON supplier_debts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON debt_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON sales_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON sales_returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON customer_credits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON credit_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON stock_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON stock_opnames FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON cash_journal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
