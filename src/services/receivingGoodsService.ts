import { supabase } from '../lib/supabase';
import { ReceivingGoods } from '../types';

const TABLE = 'receiving_goods';

function toRow(rg: ReceivingGoods) {
  return {
    id: rg.id,
    po_id: rg.poId,
    supplier_id: rg.supplierId,
    supplier_nama: rg.supplierNama,
    tanggal: rg.tanggal,
    items_received: rg.itemsReceived,
    total: rg.total,
    cara_bayar: rg.caraBayar,
    jatuh_tempo: rg.jatuhTempo || null,
  };
}

function toReceiving(row: Record<string, unknown>): ReceivingGoods {
  return {
    id: row.id as string,
    poId: row.po_id as string,
    supplierId: row.supplier_id as string,
    supplierNama: row.supplier_nama as string,
    tanggal: row.tanggal as string,
    itemsReceived: row.items_received as ReceivingGoods['itemsReceived'],
    total: Number(row.total),
    caraBayar: row.cara_bayar as ReceivingGoods['caraBayar'],
    jatuhTempo: row.jatuh_tempo as string | undefined,
  };
}

export const receivingGoodsService = {
  async getAll(): Promise<ReceivingGoods[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toReceiving);
  },

  async add(rg: ReceivingGoods): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(rg));
    if (error) throw error;
  },

  async upsertMany(items: ReceivingGoods[]): Promise<void> {
    const rows = items.map(toRow);
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
