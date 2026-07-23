import { supabase } from '../lib/supabase';
import { StockCard } from '../types';

const TABLE = 'stock_cards';

function toRow(sc: StockCard) {
  return {
    id: sc.id,
    obat_id: sc.obatId,
    nama_obat: sc.namaObat,
    tanggal: sc.tanggal,
    tipe: sc.tipe,
    referensi_id: sc.referensiId,
    jumlah: sc.jumlah,
    stok_awal: sc.stokAwal,
    stok_akhir: sc.stokAkhir,
    keterangan: sc.keterangan,
  };
}

function toStockCard(row: Record<string, unknown>): StockCard {
  return {
    id: row.id as string,
    obatId: row.obat_id as string,
    namaObat: row.nama_obat as string,
    tanggal: row.tanggal as string,
    tipe: row.tipe as StockCard['tipe'],
    referensiId: row.referensi_id as string,
    jumlah: row.jumlah as number,
    stokAwal: row.stok_awal as number,
    stokAkhir: row.stok_akhir as number,
    keterangan: row.keterangan as string,
  };
}

export const stockCardService = {
  async getAll(): Promise<StockCard[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toStockCard);
  },

  async add(sc: StockCard): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(sc));
    if (error) throw error;
  },

  async addMany(cards: StockCard[]): Promise<void> {
    const rows = cards.map(toRow);
    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) throw error;
  },

  async upsertMany(cards: StockCard[]): Promise<void> {
    const rows = cards.map(toRow);
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
