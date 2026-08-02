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
    approved_by: po.approvedBy || '',
    alasan_reject: po.alasanReject || '',
  };
}

const NORMALIZED_STATUS: Record<string, PurchaseOrder['status']> = {
  menunggu_approval: 'draft',
  approve: 'dipesan',
  di_reject: 'batal',
};

function normalizeStatus(status: string): PurchaseOrder['status'] {
  return NORMALIZED_STATUS[status] || (status as PurchaseOrder['status']);
}

function toPO(row: Record<string, unknown>): PurchaseOrder {
  return {
    id: row.id as string,
    supplierId: row.supplier_id as string,
    supplierNama: row.supplier_nama as string,
    tanggal: row.tanggal as string,
    status: normalizeStatus(row.status as string),
    items: row.items as PurchaseOrder['items'],
    total: Number(row.total),
    approvedBy: (row.approved_by as string) || undefined,
    alasanReject: (row.alasan_reject as string) || undefined,
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

  async updateApproval(id: string, status: PurchaseOrder['status'], approvedBy?: string, alasanReject?: string): Promise<void> {
    const { error } = await supabase.from(TABLE)
      .update({ status, approved_by: approvedBy || '', alasan_reject: alasanReject || '' })
      .eq('id', id);
    if (error) throw error;
  },

  async upsertMany(pos: PurchaseOrder[]): Promise<void> {
    const rows = pos.map(toRow);
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
