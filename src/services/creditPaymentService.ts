import { supabase } from '../lib/supabase';
import { CreditPayment } from '../types';

const TABLE = 'credit_payments';

function toRow(cp: CreditPayment) {
  return {
    id: cp.id,
    credit_id: cp.creditId,
    tanggal: cp.tanggal,
    jumlah_bayar: cp.jumlahBayar,
    sisa_sebelumnya: cp.sisaSebelumnya,
  };
}

function toPayment(row: Record<string, unknown>): CreditPayment {
  return {
    id: row.id as string,
    creditId: row.credit_id as string,
    tanggal: row.tanggal as string,
    jumlahBayar: Number(row.jumlah_bayar),
    sisaSebelumnya: Number(row.sisa_sebelumnya),
  };
}

export const creditPaymentService = {
  async getAll(): Promise<CreditPayment[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toPayment);
  },

  async add(cp: CreditPayment): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(cp));
    if (error) throw error;
  },

  async upsertMany(items: CreditPayment[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
