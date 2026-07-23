import { supabase } from '../lib/supabase';
import { Medicine } from '../types';

const TABLE = 'medicines';

function toRow(m: Omit<Medicine, 'id'>) {
  return {
    nama: m.nama,
    kategori: m.kategori,
    satuan: m.satuan,
    harga_beli: m.hargaBeli,
    harga_jual: m.hargaJual,
    stok: m.stok,
    batch: m.batch,
    expired_date: m.expiredDate,
    lokasi_rak: m.lokasiRak,
    stok_min: m.stokMin,
  };
}

function toMedicine(row: Record<string, unknown>): Medicine {
  return {
    id: row.id as string,
    nama: row.nama as string,
    kategori: row.kategori as string,
    satuan: row.satuan as string,
    hargaBeli: Number(row.harga_beli),
    hargaJual: Number(row.harga_jual),
    stok: row.stok as number,
    batch: row.batch as string,
    expiredDate: row.expired_date as string,
    lokasiRak: row.lokasi_rak as string,
    stokMin: row.stok_min as number,
  };
}

export const medicineService = {
  async getAll(): Promise<Medicine[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toMedicine);
  },

  async add(id: string, med: Omit<Medicine, 'id'>): Promise<Medicine> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ id, ...toRow(med) })
      .select()
      .single();
    if (error) throw error;
    return toMedicine(data);
  },

  async update(id: string, fields: Partial<Medicine>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (fields.nama !== undefined) row.nama = fields.nama;
    if (fields.kategori !== undefined) row.kategori = fields.kategori;
    if (fields.satuan !== undefined) row.satuan = fields.satuan;
    if (fields.hargaBeli !== undefined) row.harga_beli = fields.hargaBeli;
    if (fields.hargaJual !== undefined) row.harga_jual = fields.hargaJual;
    if (fields.stok !== undefined) row.stok = fields.stok;
    if (fields.batch !== undefined) row.batch = fields.batch;
    if (fields.expiredDate !== undefined) row.expired_date = fields.expiredDate;
    if (fields.lokasiRak !== undefined) row.lokasi_rak = fields.lokasiRak;
    if (fields.stokMin !== undefined) row.stok_min = fields.stokMin;

    const { error } = await supabase.from(TABLE).update(row).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async upsertMany(medicines: (Medicine & { id: string })[]): Promise<void> {
    const rows = medicines.map(m => ({
      id: m.id,
      ...toRow(m),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
