import { supabase } from '../lib/supabase';
import { Doctor } from '../types';

const TABLE = 'doctors';

function toRow(d: Omit<Doctor, 'id'>) {
  return { nama: d.nama, spesialis: d.spesialis, kontak: d.kontak };
}

function toDoctor(row: Record<string, unknown>): Doctor {
  return {
    id: row.id as string,
    nama: row.nama as string,
    spesialis: row.spesialis as string,
    kontak: row.kontak as string,
  };
}

export const doctorService = {
  async getAll(): Promise<Doctor[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toDoctor);
  },

  async add(id: string, doc: Omit<Doctor, 'id'>): Promise<Doctor> {
    const { data, error } = await supabase.from(TABLE).insert({ id, ...toRow(doc) }).select().single();
    if (error) throw error;
    return toDoctor(data);
  },

  async update(id: string, fields: Partial<Doctor>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (fields.nama !== undefined) row.nama = fields.nama;
    if (fields.spesialis !== undefined) row.spesialis = fields.spesialis;
    if (fields.kontak !== undefined) row.kontak = fields.kontak;
    const { error } = await supabase.from(TABLE).update(row).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async upsertMany(doctors: Doctor[]): Promise<void> {
    const rows = doctors.map(d => ({ id: d.id, ...toRow(d) }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
