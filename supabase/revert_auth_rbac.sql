-- ============================================================
-- REVERT DATABASE: kembalikan akses data "Allow all" + tabel users
-- Balikan dari "Supabase Auth + RLS authenticated-only".
--
-- CARA PAKAI: Supabase Dashboard > SQL Editor > New query >
-- tempel semua isi file ini > Run > pastikan muncul "Success".
-- ============================================================

-- 1. Hapus fungsi admin hasil migrasi (kalau ada)
DROP FUNCTION IF EXISTS public.delete_staff(uuid);
DROP FUNCTION IF EXISTS public.reset_staff_password(uuid, text);
DROP FUNCTION IF EXISTS public.update_staff(uuid, text, text);
DROP FUNCTION IF EXISTS public.create_staff(text, text, text, text);
DROP FUNCTION IF EXISTS public.is_admin();

-- 2. Buat ulang tabel users + user_sessions (struktur lama)
DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.users;

CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'apoteker', 'kasir', 'manager')),
  password TEXT DEFAULT ''
);

CREATE TABLE public.user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- 3. Salin akun dari auth.users (password semua = 'test').
INSERT INTO public.users (id, name, email, role, password)
SELECT
  u.id::text,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  CASE WHEN coalesce(u.raw_user_meta_data->>'role', 'kasir') = 'superadmin'
       THEN 'admin'
       ELSE coalesce(u.raw_user_meta_data->>'role', 'kasir')
  END,
  'test'
FROM auth.users u
ON CONFLICT (email) DO NOTHING;

-- 4. Hapus tabel profiles hasil migrasi
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 5. Kembalikan policy "Allow all for development" di semua tabel.
--    Setiap tabel diperiksa dulu (ada/tidak) agar tidak pernah error.
DO $revert$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'medicines','suppliers','customers','doctors',
    'purchase_orders','receiving_goods','return_purchases',
    'supplier_debts','debt_payments','sales_transactions',
    'sales_returns','customer_credits','credit_payments',
    'stock_cards','stock_opnames','cash_journal',
    'users','user_sessions'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "auth_select" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "auth_insert" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "auth_update" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "auth_delete" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "Allow all for development" ON public.%I', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "Allow all for development" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t
      );
    END IF;
  END LOOP;
END $revert$;

-- 6. VERIFIKASI: jumlah data (harusnya medicines bukan 0, dan users terisi)
SELECT 'medicines' AS tabel, count(*) AS jumlah FROM public.medicines
UNION ALL SELECT 'users', count(*) FROM public.users;
