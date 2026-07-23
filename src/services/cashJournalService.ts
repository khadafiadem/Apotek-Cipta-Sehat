import { supabase } from '../lib/supabase';
import { CashJournal } from '../types';

const TABLE = 'cash_journal';

function toRow(cj: CashJournal) {
  return {
    id: cj.id,
    tanggal: cj.tanggal,
    tipe: cj.tipe,
    kategori: cj.kategori,
    jumlah: cj.jumlah,
    keterangan: cj.keterangan,
  };
}

function toJournal(row: Record<string, unknown>): CashJournal {
  return {
    id: row.id as string,
    tanggal: row.tanggal as string,
    tipe: row.tipe as CashJournal['tipe'],
    kategori: row.kategori as CashJournal['kategori'],
    jumlah: Number(row.jumlah),
    keterangan: row.keterangan as string,
  };
}

export const cashJournalService = {
  async getAll(): Promise<CashJournal[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toJournal);
  },

  async add(cj: CashJournal): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(cj));
    if (error) throw error;
  },

  async upsertMany(items: CashJournal[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
