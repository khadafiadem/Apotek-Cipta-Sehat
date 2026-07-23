import { supabase } from '../lib/supabase';
import { ReturnSales } from '../types';

const TABLE = 'sales_returns';

function toRow(rs: ReturnSales) {
  return {
    id: rs.id,
    sales_id: rs.salesId,
    tanggal: rs.tanggal,
    items: rs.items,
    total_refund: rs.totalRefund,
    alasan: rs.alasan,
  };
}

function toReturn(row: Record<string, unknown>): ReturnSales {
  return {
    id: row.id as string,
    salesId: row.sales_id as string,
    tanggal: row.tanggal as string,
    items: row.items as ReturnSales['items'],
    totalRefund: Number(row.total_refund),
    alasan: row.alasan as string,
  };
}

export const salesReturnService = {
  async getAll(): Promise<ReturnSales[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toReturn);
  },

  async add(rs: ReturnSales): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(rs));
    if (error) throw error;
  },

  async upsertMany(items: ReturnSales[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
