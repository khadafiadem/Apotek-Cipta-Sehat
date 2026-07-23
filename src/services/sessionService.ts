import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

const TABLE = 'user_sessions';
const LS_KEY = 'aptek_session';

interface UserSession {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  role: string;
  created_at: string;
}

function toSession(row: Record<string, unknown>): UserSession {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    user_name: row.user_name as string,
    user_email: row.user_email as string,
    user_role: row.user_role as string,
    role: row.role as string,
    created_at: row.created_at as string,
  };
}

interface LocalSession {
  user: User;
  role: UserRole;
}

function saveToLocal(session: LocalSession): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(session));
  } catch {}
}

function loadFromLocal(): LocalSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

function clearLocal(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

function mapSession(data: Record<string, unknown>): LocalSession {
  const session = toSession(data);
  return {
    user: {
      id: session.user_id,
      name: session.user_name,
      email: session.user_email,
      role: session.user_role as UserRole,
    },
    role: session.role as UserRole,
  };
}

export const sessionService = {
  async getActiveSession(): Promise<LocalSession | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const session = mapSession(data);
        saveToLocal(session);
        return session;
      }
    } catch {
      // Supabase failed, fall back to localStorage
    }
    return loadFromLocal();
  },

  async createSession(user: User, role: UserRole): Promise<void> {
    const session: LocalSession = { user, role };
    saveToLocal(session);
    try {
      await supabase.from(TABLE).delete().neq('id', '___clear_all___');
      const { error } = await supabase
        .from(TABLE)
        .insert({
          id: `SES-${Date.now()}`,
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          user_role: user.role,
          role,
          created_at: new Date().toISOString(),
        });
      if (error) throw error;
    } catch {
      // Supabase failed, localStorage already saved
    }
  },

  async updateSessionRole(role: UserRole): Promise<void> {
    const local = loadFromLocal();
    if (local) {
      local.role = role;
      saveToLocal(local);
    }
    try {
      const { data: latest, error: fetchError } = await supabase
        .from(TABLE)
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchError || !latest) return;
      const { error } = await supabase
        .from(TABLE)
        .update({ role })
        .eq('id', latest.id);
      if (error) throw error;
    } catch {}
  },

  async clearSession(): Promise<void> {
    clearLocal();
    try {
      const { error } = await supabase.from(TABLE).delete().neq('id', '___clear_all___');
      if (error) throw error;
    } catch {}
  },
};
