import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

interface LocalSession {
  user: User;
  role: UserRole;
}

function mapAuthUser(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  const meta = authUser.user_metadata || {};
  const role = (meta.role as UserRole) || 'kasir';
  const name = (meta.name as string) || authUser.email || 'User';
  return {
    id: authUser.id,
    name,
    email: authUser.email || '',
    role,
  };
}

export const sessionService = {
  async getActiveSession(): Promise<LocalSession | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const user = mapAuthUser(data.user);
    return { user, role: user.role };
  },

  async createSession(_user: User, _role: UserRole): Promise<void> {
    // Sesuai Supabase Auth, sesi dikelola otomatis oleh supabase-js.
    // Tidak ada penyimpanan tambahan yang diperlukan.
  },

  async updateSessionRole(_role: UserRole): Promise<void> {
    // Role melekat pada akun login, tidak bisa diubah bebas.
  },

  async clearSession(): Promise<void> {
    await supabase.auth.signOut();
  },
};
