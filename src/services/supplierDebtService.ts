import { supabase } from '../lib/supabase';
import { SupplierDebt } from '../types';

const TABLE = 'supplier_debts';

function toRow(sd: SupplierDebt) {
  return {
    id: sd.id,
    supplier_id: sd.supplierId,
    supplier_nama: sd.supplierNama,
    tanggal: sd.tanggal,
    referensi_id: sd.referensiId,
    jumlah_total: sd.jumlahTotal,
    sisa_hutang: sd.sisaHutang,
    jatuh_tempo: sd.jatuhTempo,
    status: sd.status,
  };
}

function toDebt(row: Record<string, unknown>): SupplierDebt {
  return {
    id: row.id as string,
    supplierId: row.supplier_id as string,
    supplierNama: row.supplier_nama as string,
    tanggal: row.tanggal as string,
    referensiId: row.referensi_id as string,
    jumlahTotal: Number(row.jumlah_total),
    sisaHutang: Number(row.sisa_hutang),
    jatuhTempo: row.jatuh_tempo as string,
    status: row.status as SupplierDebt['status'],
  };
}

export const supplierDebtService = {
  async getAll(): Promise<SupplierDebt[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    return (data || []).map(toDebt);
  },

  async add(sd: SupplierDebt): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(toRow(sd));
    if (error) throw error;
  },

  async update(id: string, fields: Partial<SupplierDebt>): Promise<void> {
    const row: Record<string, unknown> = {};
    if (fields.sisaHutang !== undefined) row.sisa_hutang = fields.sisaHutang;
    if (fields.status !== undefined) row.status = fields.status;
    const { error } = await supabase.from(TABLE).update(row).eq('id', id);
    if (error) throw error;
  },

  async upsertMany(items: SupplierDebt[]): Promise<void> {
    const { error } = await supabase.from(TABLE).upsert(items.map(toRow), { onConflict: 'id' });
    if (error) throw error;
  },
};
