import { supabase } from '../lib/supabase';
import { StockOpname } from '../types';

const TABLE = 'stock_opnames';

function toRow(so: StockOpname) {
  return {
    id: so.id,
    tanggal: so.tanggal,
    oleh: so.oleh,
    items: so.items,
  };
}

function toOpname(row: Record<string, unknown>): StockOpname {
  return {
    id: row.id as string,
    tanggal: row.tanggal as string,
    oleh: row.oleh as string,
    items: row.items as StockOpname['items'],
  };
}

export const stockOpnameService = {
  async getAll(): Promise<StockOpname[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toOpname);
  },

  async add(so: StockOpname): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(so));
    if (error) throw error;
  },

  async upsertMany(items: StockOpname[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
