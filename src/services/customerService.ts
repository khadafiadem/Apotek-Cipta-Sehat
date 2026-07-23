import { supabase } from '../lib/supabase';
import { Customer } from '../types';

const TABLE = 'customers';

function toRow(c: Omit<Customer, 'id'>) {
  return { nama: c.nama, kontak: c.kontak, alamat: c.alamat, piutang: c.piutang };
}

function toCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    nama: row.nama as string,
    kontak: row.kontak as string,
    alamat: row.alamat as string,
    piutang: Number(row.piutang),
  };
}

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toCustomer);
  },

  async add(id: string, cust: Omit<Customer, 'id'>): Promise<Customer> {
    const { data, error } = await supabase.from(TABLE).insert({ id, ...toRow(cust) }).select().single();
    if (error) throw error;
    return toCustomer(data);
  },

  async update(id: string, fields: Partial<Customer>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (fields.nama !== undefined) row.nama = fields.nama;
    if (fields.kontak !== undefined) row.kontak = fields.kontak;
    if (fields.alamat !== undefined) row.alamat = fields.alamat;
    if (fields.piutang !== undefined) row.piutang = fields.piutang;
    const { error } = await supabase.from(TABLE).update(row).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async upsertMany(customers: Customer[]): Promise<void> {
    const rows = customers.map(c => ({ id: c.id, ...toRow(c) }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
