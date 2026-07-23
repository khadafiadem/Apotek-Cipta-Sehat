import { supabase } from '../lib/supabase';
import { DebtPayment } from '../types';

const TABLE = 'debt_payments';

function toRow(dp: DebtPayment) {
  return {
    id: dp.id,
    debt_id: dp.debtId,
    tanggal: dp.tanggal,
    jumlah_bayar: dp.jumlahBayar,
    sisa_sebelumnya: dp.sisaSebelumnya,
    metode_bayar: dp.metodeBayar,
  };
}

function toPayment(row: Record<string, unknown>): DebtPayment {
  return {
    id: row.id as string,
    debtId: row.debt_id as string,
    tanggal: row.tanggal as string,
    jumlahBayar: Number(row.jumlah_bayar),
    sisaSebelumnya: Number(row.sisa_sebelumnya),
    metodeBayar: row.metode_bayar as string,
  };
}

export const debtPaymentService = {
  async getAll(): Promise<DebtPayment[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toPayment);
  },

  async add(dp: DebtPayment): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(dp));
    if (error) throw error;
  },

  async upsertMany(items: DebtPayment[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
