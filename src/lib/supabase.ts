import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseKey || 'dummy',
  {
    auth: {
      // Sesi TIDAK dipulihkan otomatis: setiap buka halaman/link wajib login.
      // Token tetap di-refresh selama halaman masih terbuka (autoRefresh default ON).
      persistSession: false,
    },
  }
);
