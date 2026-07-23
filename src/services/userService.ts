import { supabase } from '../lib/supabase';
import { User } from '../types';

const TABLE = 'users';

function toRow(u: Omit<User, 'id'>) {
  return {
    name: u.name,
    email: u.email,
    role: u.role,
    password: u.password || '',
  };
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as User['role'],
    password: row.password as string,
  };
}

export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toUser);
  },

  async add(id: string, user: Omit<User, 'id'>): Promise<User> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ id, ...toRow(user) })
      .select()
      .single();
    if (error) throw error;
    return toUser(data);
  },

  async update(id: string, fields: Partial<User>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (fields.name !== undefined) row.name = fields.name;
    if (fields.email !== undefined) row.email = fields.email;
    if (fields.role !== undefined) row.role = fields.role;
    if (fields.password !== undefined) row.password = fields.password;

    const { error } = await supabase.from(TABLE).update(row).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async upsertMany(users: (User & { id: string })[]): Promise<void> {
    const rows = users.map(u => ({
      id: u.id,
      ...toRow(u),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
