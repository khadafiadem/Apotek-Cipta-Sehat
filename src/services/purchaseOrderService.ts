import { supabase } from '../lib/supabase';
import { PurchaseOrder } from '../types';

const TABLE = 'purchase_orders';

function toRow(po: PurchaseOrder) {
  return {
    id: po.id,
    supplier_id: po.supplierId,
    supplier_nama: po.supplierNama,
    tanggal: po.tanggal,
    status: po.status,
    items: po.items,
    total: po.total,
  };
}

function toPO(row: Record<string, unknown>): PurchaseOrder {
  return {
    id: row.id as string,
    supplierId: row.supplier_id as string,
    supplierNama: row.supplier_nama as string,
    tanggal: row.tanggal as string,
    status: row.status as PurchaseOrder['status'],
    items: row.items as PurchaseOrder['items'],
    total: Number(row.total),
  };
}

export const purchaseOrderService = {
  async getAll(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toPO);
  },

  async add(po: PurchaseOrder): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(po));
    if (error) throw error;
  },

  async updateStatus(id: string, status: PurchaseOrder['status']): Promise<void> {
    const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
    if (error) throw error;
  },

  async upsertMany(pos: PurchaseOrder[]): Promise<void> {
    const rows = pos.map(toRow);
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
