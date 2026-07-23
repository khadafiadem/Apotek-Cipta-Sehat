import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

const TABLE = 'suppliers';

function toRow(s: Omit<Supplier, 'id'>) {
  return { nama: s.nama, kontak: s.kontak, alamat: s.alamat };
}

function toSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    nama: row.nama as string,
    kontak: row.kontak as string,
    alamat: row.alamat as string,
  };
}

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toSupplier);
  },

  async add(id: string, sup: Omit<Supplier, 'id'>): Promise<Supplier> {
    const { data, error } = await supabase.from(TABLE).insert({ id, ...toRow(sup) }).select().single();
    if (error) throw error;
    return toSupplier(data);
  },

  async update(id: string, fields: Partial<Supplier>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (fields.nama !== undefined) row.nama = fields.nama;
    if (fields.kontak !== undefined) row.kontak = fields.kontak;
    if (fields.alamat !== undefined) row.alamat = fields.alamat;
    const { error } = await supabase.from(TABLE).update(row).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async upsertMany(suppliers: Supplier[]): Promise<void> {
    const rows = suppliers.map(s => ({ id: s.id, ...toRow(s) }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
