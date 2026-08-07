import * as XLSX from 'xlsx';
import { Medicine } from '../types';

function getJakartaParts(date: Date): { iso: string; label: string } {
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const hour = (parseInt(get('hour'), 10) || 0) % 24;
  const iso = `${get('year')}-${get('month')}-${get('day')}`;
  const label = `${get('day')}-${get('month')}-${get('year')} ${String(hour).padStart(2, '0')}:${get('minute')} WIB`;
  return { iso, label };
}

export function downloadPriceListExcel(medicines: Medicine[]): void {
  if (!medicines.length) return;

  const { iso, label } = getJakartaParts(new Date());
  const sorted = medicines
    .slice()
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  const headers = ['Nama Obat', 'Kategori', 'Satuan', 'Harga Beli', 'Harga Jual', 'Stok', 'Batch', 'Expired', 'Lokasi Rak', 'Stok Minimum'];

  const dataRows: (string | number)[][] = sorted.map(m => [
    m.nama,
    m.kategori,
    m.satuan,
    m.hargaBeli,
    m.hargaJual,
    m.stok,
    m.batch,
    m.expiredDate,
    m.lokasiRak,
    m.stokMin,
  ]);

  const aoa: (string | number)[][] = [
    ['DAFTAR HARGA OBAT - APOTEK CIPTA SEHAT'],
    [`Terakhir diperbarui: ${label} | Total ${medicines.length} obat`],
    [],
    headers,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];
  ws['!cols'] = [
    { wch: 42 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = 4; r <= range.e.r; r++) {
    const hargaBeli = ws[XLSX.utils.encode_cell({ r, c: 3 })];
    const hargaJual = ws[XLSX.utils.encode_cell({ r, c: 4 })];
    if (hargaBeli) hargaBeli.z = '#,##0';
    if (hargaJual) hargaJual.z = '#,##0';
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Harga');
  XLSX.writeFile(wb, `Daftar_Harga_Obat_Apotek_Cipta_Sehat_${iso}.xlsx`);
}
