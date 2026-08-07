import React from 'react';
import { Download } from 'lucide-react';
import { usePharmacy } from '../PharmacyContext';
import { downloadPriceListExcel } from '../lib/priceList';

export default function DownloadPriceListButton() {
  const { medicines } = usePharmacy();

  return (
    <button
      type="button"
      onClick={() => {
        if (!medicines.length) {
          alert('Belum ada data obat untuk diexport.');
          return;
        }
        downloadPriceListExcel(medicines);
      }}
      title="Unduh daftar harga terbaru untuk cadangan kasir saat internet mati"
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
    >
      <Download className="w-4 h-4 text-emerald-600" />
      <span>Daftar Harga Excel</span>
    </button>
  );
}
