import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
  };
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const userService = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('active', true)
      .order('created_at');
    if (error) throw error;
    return (data || []).map(toUser);
  },

  async isAdmin(): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    return !!data;
  },

  async create(input: CreateStaffInput): Promise<void> {
    const { error } = await supabase.rpc('create_staff', {
      p_name: input.name,
      p_email: input.email,
      p_password: input.password,
      p_role: input.role,
    });
    if (error) throw error;
  },

  async update(id: string, fields: Partial<User>): Promise<void> {
    const { error } = await supabase.rpc('update_staff', {
      p_id: id,
      p_name: fields.name,
      p_role: fields.role,
    });
    if (error) throw error;
  },

  async resetPassword(id: string, password: string): Promise<void> {
    const { error } = await supabase.rpc('reset_staff_password', {
      p_id: id,
      p_password: password,
    });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_staff', { p_id: id });
    if (error) throw error;
  },
};
