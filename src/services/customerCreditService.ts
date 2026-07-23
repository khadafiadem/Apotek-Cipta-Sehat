import { supabase } from '../lib/supabase';
import { CustomerCredit } from '../types';

const TABLE = 'customer_credits';

function toRow(cc: CustomerCredit) {
  return {
    id: cc.id,
    customer_id: cc.customerId,
    customer_nama: cc.customerNama,
    tanggal: cc.tanggal,
    sales_id: cc.salesId,
    jumlah_total: cc.jumlahTotal,
    sisa_piutang: cc.sisaPiutang,
    jatuh_tempo: cc.jatuhTempo,
    status: cc.status,
  };
}

function toCredit(row: Record<string, unknown>): CustomerCredit {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    customerNama: row.customer_nama as string,
    tanggal: row.tanggal as string,
    salesId: row.sales_id as string,
    jumlahTotal: Number(row.jumlah_total),
    sisaPiutang: Number(row.sisa_piutang),
    jatuhTempo: row.jatuh_tempo as string,
    status: row.status as CustomerCredit['status'],
  };
}

export const customerCreditService = {
  async getAll(): Promise<CustomerCredit[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toCredit);
  },

  async add(cc: CustomerCredit): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(cc));
    if (error) throw error;
  },

  async update(id: string, fields: Partial<CustomerCredit>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (fields.sisaPiutang !== undefined) row.sisa_piutang = fields.sisaPiutang;
    if (fields.status !== undefined) row.status = fields.status;
    const { error } = await supabase.from(TABLE).update(row).eq('id', id);
    if (error) throw error;
  },

  async upsertMany(items: CustomerCredit[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
