import { supabase } from '../lib/supabase';
import { SalesTransaction } from '../types';

const TABLE = 'sales_transactions';

function toRow(tx: SalesTransaction) {
  return {
    id: tx.id,
    tanggal: tx.tanggal,
    kasir_name: tx.kasirName,
    customer_name: tx.customerName,
    customer_id: tx.customerId || null,
    dokter_id: tx.dokterId || null,
    dokter_nama: tx.dokterNama || null,
    items: tx.items,
    subtotal: tx.subtotal,
    diskon: tx.diskon,
    pajak: tx.pajak,
    total: tx.total,
    bayar: tx.bayar,
    kembali: tx.kembali,
    cara_bayar: tx.caraBayar,
    is_resep: tx.isResep,
    resep_detail: tx.resepDetail || null,
  };
}

function toSales(row: Record<string, unknown>): SalesTransaction {
  return {
    id: row.id as string,
    tanggal: row.tanggal as string,
    kasirName: row.kasir_name as string,
    customerName: row.customer_name as string,
    customerId: row.customer_id as string | undefined,
    dokterId: row.dokter_id as string | undefined,
    dokterNama: row.dokter_nama as string | undefined,
    items: row.items as SalesTransaction['items'],
    subtotal: Number(row.subtotal),
    diskon: Number(row.diskon),
    pajak: Number(row.pajak),
    total: Number(row.total),
    bayar: Number(row.bayar),
    kembali: Number(row.kembali),
    caraBayar: row.cara_bayar as SalesTransaction['caraBayar'],
    isResep: row.is_resep as boolean,
    resepDetail: row.resep_detail as string | undefined,
  };
}

export const salesTransactionService = {
  async getAll(): Promise<SalesTransaction[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toSales);
  },

  async add(tx: SalesTransaction): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(tx));
    if (error) throw error;
  },

  async upsertMany(txs: SalesTransaction[]): Promise<void> {
    const rows = txs.map(toRow);
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  },
};
