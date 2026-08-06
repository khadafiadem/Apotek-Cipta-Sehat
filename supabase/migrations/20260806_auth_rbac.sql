-- ============================================================
-- Apotek Cipta Sehat - Migrasi Keamanan: Supabase Auth + RLS (v2)
-- Tanggal: 2026-08-06
--
-- PENTING: Jalankan file ini di Supabase Dashboard > SQL Editor.
--
-- SEBELUM menjalankan, aktifkan Email provider:
--   Authentication > Providers > Email  =>  Enabled ON
--   (matikan "Confirm email" agar akun lama langsung bisa login;
--    atau biarkan menyala karena semua akun sudah email_confirmed_at)
--
-- Yang dilakukan oleh migrasi ini:
--   1. Membuat tabel public.profiles (id, name, email, role, active)
--      yang terhubung ke auth.users.
--   2. Memindahkan user lama dari public.users ke auth.users
--      (password di-hash bcrypt; semua akun lama diset = 'test'
--      sesuai data lama, ID akun baru berupa UUID).
--      Jika email SUDAH ada di auth.users (mis. sisa migrasi lama),
--      password & metadata-nya diperbaiki agar login selalu berhasil.
--   3. Memastikan Dafi@ciptasehat.com menjadi superadmin.
--   4. Menghapus tabel lama public.users & public.user_sessions.
--   5. Mengganti policy "Allow all for development" dengan policy
--      authenticated-only di semua tabel data.
--   6. Membuat fungsi admin (is_admin, create_staff, update_staff,
--      reset_staff_password, delete_staff) agar manajemen akun tetap
--      bisa dilakukan dari aplikasi tanpa mengekspos service_role key.
--
-- Aman dijalankan berulang kali (idempotent).
-- ============================================================

-- Ekstensi yang dibutuhkan untuk hashing password (bcrypt) & UUID.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Supabase menginstal pgcrypto di schema `extensions`; pastikan resolusi
-- crypt()/gen_salt() berhasil apa pun lokasinya (public atau extensions).
SET search_path = public, extensions, extensions;

-- ------------------------------------------------------------
-- 1. TABEL PROFILES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'kasir' CHECK (role IN ('superadmin','admin','apoteker','kasir','manager')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. PINDAHKAN USER LAMA KE auth.users
--    (hanya email yang belum ada di auth.users)
-- ------------------------------------------------------------
WITH seeded AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    lower(trim(u.email)),
    crypt(coalesce(nullif(u.password, ''), 'test'), gen_salt('bf')),
    now(),
    '', '', '', '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', u.name, 'role', u.role),
    now(),
    now()
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE lower(au.email) = lower(trim(u.email))
  )
  RETURNING id, email
)
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  s.id::text,
  s.id,
  jsonb_build_object('sub', s.id::text, 'email', s.email),
  'email',
  now(), now(), now()
FROM seeded s
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3. PERBAIKI SEMUA AKUN MIGRASI (termasuk yang sudah ada di
--    auth.users dari migrasi lama): password = 'test', metadata
--    sinkron dengan public.users agar login & role akurat.
-- ------------------------------------------------------------
UPDATE auth.users au
SET encrypted_password = crypt(
      coalesce(
        NULLIF((SELECT u.password FROM public.users u
                WHERE lower(u.email) = lower(au.email)), ''),
        'test'
      ),
      gen_salt('bf')
    ),
    email_confirmed_at = coalesce(au.email_confirmed_at, now()),
    confirmation_token = coalesce(au.confirmation_token, ''),
    recovery_token = coalesce(au.recovery_token, ''),
    email_change = coalesce(au.email_change, ''),
    email_change_token_new = coalesce(au.email_change_token_new, ''),
    email_change_token_current = coalesce(au.email_change_token_current, ''),
    raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    raw_user_meta_data = jsonb_build_object(
      'name', coalesce((SELECT u.name FROM public.users u
                        WHERE lower(u.email) = lower(au.email)),
                       au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
      'role', coalesce((SELECT u.role FROM public.users u
                        WHERE lower(u.email) = lower(au.email)),
                       au.raw_user_meta_data->>'role', 'kasir')
    ),
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.users u WHERE lower(u.email) = lower(au.email)
);

-- Identitas 'email' untuk akun yang sudah ada tapi belum punya identitas.
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  au.id::text,
  au.id,
  jsonb_build_object('sub', au.id::text, 'email', au.email),
  'email',
  now(), now(), now()
FROM auth.users au
WHERE lower(au.email) IN (SELECT lower(email) FROM public.users)
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities ai
    WHERE ai.user_id = au.id AND ai.provider = 'email'
  )
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 4. BACKFILL PROFILES dari semua user yang dimigrasi
-- ------------------------------------------------------------
INSERT INTO public.profiles (id, name, email, role)
SELECT
  au.id,
  coalesce(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  coalesce(au.raw_user_meta_data->>'role', 'kasir')
FROM auth.users au
WHERE lower(au.email) IN (SELECT lower(email) FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Sinkronkan profile dengan metadata terbaru.
UPDATE public.profiles p
SET name = coalesce((SELECT au.raw_user_meta_data->>'name' FROM auth.users au WHERE au.id = p.id), p.name),
    email = coalesce((SELECT au.email FROM auth.users au WHERE au.id = p.id), p.email),
    role = coalesce((SELECT au.raw_user_meta_data->>'role' FROM auth.users au WHERE au.id = p.id), p.role),
    active = TRUE
WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id);

-- ------------------------------------------------------------
-- 5. PASTIKAN DAFI MENJADI SUPERADMIN
-- ------------------------------------------------------------
UPDATE public.profiles p
SET role = 'superadmin',
    active = TRUE
WHERE lower(p.email) = 'dafi@ciptasehat.com';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role":"superadmin"}'
WHERE lower(email) = 'dafi@ciptasehat.com';

-- ------------------------------------------------------------
-- 6. HAPUS TABEL LAMA (users & user_sessions)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.users;

-- ------------------------------------------------------------
-- 7. RLS: GANTI "Allow all for development" -> AUTHENTICATED ONLY
-- ------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'medicines','suppliers','customers','doctors',
    'purchase_orders','receiving_goods','return_purchases',
    'supplier_debts','debt_payments','sales_transactions',
    'sales_returns','customer_credits','credit_payments',
    'stock_cards','stock_opnames','cash_journal'
  ]
  LOOP
    -- hapus policy lama (nama berbeda sesuai riwayat migrasi)
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for development" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete" ON public.%I', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- user yang sudah login boleh baca & tulis
    EXECUTE format(
      'CREATE POLICY "auth_select" ON public.%I FOR SELECT USING (auth.role() = ''authenticated'')', t
    );
    EXECUTE format(
      'CREATE POLICY "auth_insert" ON public.%I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', t
    );
    EXECUTE format(
      'CREATE POLICY "auth_update" ON public.%I FOR UPDATE USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')', t
    );
    EXECUTE format(
      'CREATE POLICY "auth_delete" ON public.%I FOR DELETE USING (auth.role() = ''authenticated'')', t
    );
  END LOOP;
END $$;

-- Policy khusus tabel profiles: bisa dibaca semua user login,
-- penulisan hanya lewat fungsi security definer di bawah.
DROP POLICY IF EXISTS "Allow all for development" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 8. FUNGSI ADMIN (SECURITY DEFINER) UNTUK MANAJEMEN AKUN
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT coalesce((
    SELECT p.role IN ('superadmin','admin')
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.active
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Buat staff baru (admin saja)
CREATE OR REPLACE FUNCTION public.create_staff(
  p_name text, p_email text, p_password text, p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang dapat menambah staff.';
  END IF;
  IF p_role NOT IN ('superadmin','admin','apoteker','kasir','manager') THEN
    RAISE EXCEPTION 'Role tidak valid.';
  END IF;
  IF char_length(coalesce(p_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter.';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Email sudah terdaftar.';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid,
    'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '', '', '', '', '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', p_name, 'role', p_role),
    now(), now()
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email),
    'email', now(), now(), now()
  );

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (v_uid, p_name, v_email, p_role);

  RETURN jsonb_build_object('id', v_uid, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff(text, text, text, text) TO authenticated;

-- Ubah nama & role staff (admin saja)
CREATE OR REPLACE FUNCTION public.update_staff(
  p_id uuid, p_name text, p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang dapat mengubah staff.';
  END IF;
  IF p_role NOT IN ('superadmin','admin','apoteker','kasir','manager') THEN
    RAISE EXCEPTION 'Role tidak valid.';
  END IF;

  UPDATE public.profiles
  SET name = p_name, role = p_role
  WHERE id = p_id;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data ||
    jsonb_build_object('name', p_name, 'role', p_role)
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff(uuid, text, text) TO authenticated;

-- Reset password staff (admin saja)
CREATE OR REPLACE FUNCTION public.reset_staff_password(
  p_id uuid, p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang dapat mereset password.';
  END IF;
  IF char_length(coalesce(p_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_staff_password(uuid, text) TO authenticated;

-- Hapus staff (admin saja, tidak bisa hapus akun sendiri)
CREATE OR REPLACE FUNCTION public.delete_staff(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin yang dapat menghapus staff.';
  END IF;
  IF p_id = auth.uid() THEN
    RAISE EXCEPTION 'Tidak dapat menghapus akun sendiri.';
  END IF;

  DELETE FROM auth.users WHERE id = p_id; -- cascade ke profiles & identities
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_staff(uuid) TO authenticated;

-- ============================================================
-- VERIFIKASI: jumlah data & akun yang dimigrasi
-- ============================================================
SELECT 'medicines' AS tabel, count(*)::text AS jumlah FROM public.medicines
UNION ALL
SELECT 'profiles', count(*)::text FROM public.profiles
UNION ALL
SELECT 'auth.users', count(*)::text FROM auth.users;
