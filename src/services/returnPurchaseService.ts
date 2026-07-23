import { supabase } from '../lib/supabase';
import { ReturnPurchase } from '../types';

const TABLE = 'return_purchases';

function toRow(rp: ReturnPurchase) {
  return {
    id: rp.id,
    supplier_id: rp.supplierId,
    supplier_nama: rp.supplierNama,
    tanggal: rp.tanggal,
    items: rp.items,
    total_refund: rp.totalRefund,
    alasan: rp.alasan,
  };
}

function toReturnPurchase(row: Record<string, unknown>): ReturnPurchase {
  return {
    id: row.id as string,
    supplierId: row.supplier_id as string,
    supplierNama: row.supplier_nama as string,
    tanggal: row.tanggal as string,
    items: row.items as ReturnPurchase['items'],
    totalRefund: Number(row.total_refund),
    alasan: row.alasan as string,
  };
}

export const returnPurchaseService = {
  async getAll(): Promise<ReturnPurchase[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toReturnPurchase);
  },

  async add(rp: ReturnPurchase): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(rp));
    if (error) throw error;
  },

  async upsertMany(items: ReturnPurchase[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
