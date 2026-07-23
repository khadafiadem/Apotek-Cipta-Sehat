/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePharmacy } from '../PharmacyContext';
import { Medicine } from '../types';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
  Search,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clipboard,
  FileText,
  Sparkles
} from 'lucide-react';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BatchImportModal({ isOpen, onClose }: BatchImportModalProps) {
  const { loggedInUser, importMedicinesBatch } = usePharmacy();

  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');

  const [parsedData, setParsedData] = useState<Omit<Medicine, 'id'>[]>([]);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Pagination & Search in Preview
  const [previewSearch, setPreviewSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Import Progress State
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  if (!isOpen) return null;

  // Check if current user is Super Admin or Admin
  const userNameLower = (loggedInUser?.name || '').toLowerCase().trim();
  const isKhadafi = userNameLower.includes('khadafi') || userNameLower.includes('super admin') || userNameLower.includes('admin') || loggedInUser?.role === 'admin';

  // Helper to normalize and sanitize numbers (e.g. "Rp 15.000", "15.000,00", "15,000", "15000.00")
  const parseNum = (val: any, defaultVal = 0): number => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    let str = String(val).trim();
    if (!str) return defaultVal;

    // Remove currency symbols & non-numeric except dot and comma and minus
    str = str.replace(/[^0-9.,-]/g, '');
    if (!str) return defaultVal;

    if (str.includes('.') && str.includes(',')) {
      if (str.indexOf('.') < str.indexOf(',')) {
        // 15.000,00 -> ID style
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // 15,000.00 -> US style
        str = str.replace(/,/g, '');
      }
    } else if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length > 2) {
        str = str.replace(/\./g, '');
      } else if (parts.length === 2 && parts[1].length === 3) {
        // 15.000 -> 15000
        str = str.replace('.', '');
      }
    } else if (str.includes(',')) {
      const parts = str.split(',');
      if (parts.length > 2) {
        str = str.replace(/,/g, '');
      } else if (parts.length === 2 && parts[1].length === 3) {
        str = str.replace(',', '');
      } else {
        str = str.replace(',', '.');
      }
    }

    const num = parseFloat(str);
    return isNaN(num) ? defaultVal : num;
  };

  // Helper to normalize date strings (Excel serials, DD/MM/YYYY, YYYY-MM-DD, Date objects)
  const parseDateStr = (val: any): string => {
    if (!val) {
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        return val.toISOString().split('T')[0];
      }
    }
    // Handle Excel Serial Date Number (e.g., 45000)
    if (typeof val === 'number') {
      const parsedDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Handle DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY
    const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Handle YYYY/MM/DD
    const ymd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymd) {
      const year = ymd[1];
      const month = ymd[2].padStart(2, '0');
      const day = ymd[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  };

  // Convert raw row keys to normalized Medicine attributes
  // Smart Auto-Categorization Helper for medicines when category is missing or 'Umum'
  const predictCategory = (name: string, unit: string): string => {
    const n = name.toLowerCase();
    const u = unit.toLowerCase();

    // Alat Kesehatan (Alkes)
    if (
      n.includes('alkes') || n.includes('spuit') || n.includes('jarum') || n.includes('kasa') ||
      n.includes('perban') || n.includes('alkohol') || n.includes('alcohol') || n.includes('handschoen') ||
      n.includes('glove') || n.includes('masker') || n.includes('infus') || n.includes('underpad') ||
      n.includes('plester') || n.includes('abocath') || n.includes('catheter') || n.includes('stetoskop') ||
      n.includes('tensimeter') || n.includes('thermometer') || u.includes('pcs') && (n.includes('kasa') || n.includes('jarum') || n.includes('kapas'))
    ) {
      return 'Alat Kesehatan';
    }

    // Salep / Obat Luar
    if (
      n.includes('salep') || n.includes('krim') || n.includes('cream') || n.includes('ointment') ||
      n.includes('gel') || n.includes('hydrocortisone') || n.includes('bioplacenton') ||
      n.includes('gentamicin') || n.includes('kalcinol') || n.includes('mupirocin') ||
      n.includes('ketoconazole') || n.includes('acyclovir') || u.includes('tube') || u.includes('pot')
    ) {
      return 'Obat Luar & Salep';
    }

    // Tetes / Mata / Telinga
    if (
      n.includes('tetes') || n.includes('guttae') || n.includes('insto') || n.includes('rohto') ||
      n.includes('visine') || n.includes('otopain') || n.includes('forumen') || n.includes('tarivid')
    ) {
      return 'Obat Tetes (Mata/Telinga)';
    }

    // Sirup & Suspensi
    if (
      n.includes('sirup') || n.includes('syrup') || n.includes('suspensi') || n.includes('drop') ||
      n.includes('dry syr') || n.includes('syr') || u.includes('botol') || u.includes('fls')
    ) {
      return 'Sirup & Tetes';
    }

    // Injeksi / Ampul / Vial
    if (
      n.includes('injeksi') || n.includes('injection') || n.includes('inj') || u.includes('ampul') ||
      u.includes('vial')
    ) {
      return 'Obat Injeksi';
    }

    // Vitamin & Suplemen
    if (
      n.includes('vitamin') || n.includes('vit ') || n.includes('vit.') || n.includes('curcuma') ||
      n.includes('neurobion') || n.includes('sangobion') || n.includes('calcium') || n.includes('calcifar') ||
      n.includes('imboost') || n.includes('becom') || n.includes('caviplex') || n.includes('stimuno') ||
      n.includes('zet') || n.includes('folic') || n.includes('hemobion') || n.includes('ferrous') ||
      n.includes('multivitamin') || n.includes('suplemen')
    ) {
      return 'Vitamin & Suplemen';
    }

    // Antibiotik
    if (
      n.includes('amoxicillin') || n.includes('cefadroxil') || n.includes('ciprofloxacin') ||
      n.includes('azithromycin') || n.includes('ampicillin') || n.includes('erythromycin') ||
      n.includes('fg troches') || n.includes('cefspan') || n.includes('thiamphenicol') ||
      n.includes('cotrimoxazole') || n.includes('cefixime') || n.includes('tetracycline') ||
      n.includes('clindamycin') || n.includes('doxycycline') || n.includes('metronidazole') ||
      n.includes('chloramphenicol') || n.includes('antibiotik')
    ) {
      return 'Antibiotik';
    }

    // Analgesik & Antiinflamasi / Anti Nyeri & Demam
    if (
      n.includes('paracetamol') || n.includes('ibuprofen') || n.includes('asam mefenamat') ||
      n.includes('antalgin') || n.includes('pct') || n.includes('mefenamat') || n.includes('meloxicam') ||
      n.includes('sodium diclofenac') || n.includes('natrium diklofenak') || n.includes('cataflam') ||
      n.includes('voltaren') || n.includes('dexamethasone') || n.includes('methylprednisolone') ||
      n.includes('prednisone')
    ) {
      return 'Analgesik & Antiinflamasi';
    }

    // Batuk & Flu
    if (
      n.includes('batuk') || n.includes('flu') || n.includes('pilek') || n.includes('obh') ||
      n.includes('combi') || n.includes('siladex') || n.includes('tremenza') || n.includes('rhinos') ||
      n.includes('actifed') || n.includes('dextro') || n.includes('ambroxol') || n.includes('gg') ||
      n.includes('glyceryl') || n.includes('ctm') || n.includes('chlorpheniramine') || n.includes('cetirizine')
    ) {
      return 'Batuk & Flu';
    }

    // Pencernaan & Maag
    if (
      n.includes('promag') || n.includes('mylanta') || n.includes('ranitidine') || n.includes('omeprazole') ||
      n.includes('lansoprazole') || n.includes('antasida') || n.includes('sucralfate') || n.includes('domperidone') ||
      n.includes('ondansetron') || n.includes('diapet') || n.includes('entrostop') || n.includes('loperamide') ||
      n.includes('dulcolax') || n.includes('lacto b') || n.includes('oralit')
    ) {
      return 'Pencernaan & Maag';
    }

    // Hipertensi & Jantung
    if (
      n.includes('amlodipine') || n.includes('captopril') || n.includes('lisinopril') ||
      n.includes('valsartan') || n.includes('bisoprolol') || n.includes('furosemide') ||
      n.includes('spironolactone') || n.includes('nifedipine') || n.includes('candesartan')
    ) {
      return 'Jantung & Hipertensi';
    }

    // Diabetes & Kolesterol
    if (
      n.includes('simvastatin') || n.includes('atorvastatin') || n.includes('metformin') ||
      n.includes('glibenclamide') || n.includes('glimepiride') || n.includes('fenofibrate')
    ) {
      return 'Diabetes & Kolesterol';
    }

    return 'Obat Bebas';
  };

  const mapRowToMedicine = (row: Record<string, any>): Omit<Medicine, 'id'> | null => {
    const keys = Object.keys(row);
    if (keys.length === 0) return null;

    // Helper to identify if a key represents a Product Code / ID column
    const isCodeKey = (k: string) => {
      const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('nama') || lower.includes('name') || lower.includes('deskripsi') || lower.includes('description') || lower.includes('uraian')) return false;
      if (lower.includes('batch') || lower.includes('rak') || lower.includes('kategori') || lower.includes('satuan')) return false;
      return lower.includes('kode') || lower.includes('kd') || lower.includes('barcode') || lower.includes('sku') || lower.includes('plu') || lower.includes('art') || lower === 'id' || lower === 'code' || lower === 'no' || lower === 'no_obat' || lower === 'no_brg';
    };

    const findVal = (possibleKeys: string[], excludeCode = false) => {
      // Pass 1: Exact match
      for (const pk of possibleKeys) {
        const cleanPk = pk.replace(/[^a-z0-9]/g, '');
        if (!cleanPk) continue;
        const exactKey = keys.find(k => {
          if (excludeCode && isCodeKey(k)) return false;
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanK === cleanPk;
        });
        if (exactKey !== undefined && row[exactKey] !== undefined && String(row[exactKey]).trim() !== '') {
          return row[exactKey];
        }
      }

      // Pass 2: Inclusion / Partial match
      for (const pk of possibleKeys) {
        const cleanPk = pk.replace(/[^a-z0-9]/g, '');
        if (!cleanPk || cleanPk.length < 3) continue;
        const matchKey = keys.find(k => {
          if (excludeCode && isCodeKey(k)) return false;
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!cleanK) return false;
          return cleanK.includes(cleanPk) || cleanPk.includes(cleanK);
        });
        if (matchKey !== undefined && row[matchKey] !== undefined && String(row[matchKey]).trim() !== '') {
          return row[matchKey];
        }
      }

      return undefined;
    };

    const namaKeys = [
      'nama_obat', 'namaobat', 'nama_barang', 'namabarang', 'nama_brg', 'namabrg', 
      'nama_produk', 'namaproduk', 'nama_item', 'namaitem', 'nama', 'name', 'item_name', 'product_name',
      'deskripsi', 'description', 'uraian', 'uraian_barang', 'sediaan', 'alkes',
      'nama_medis', 'drug', 'merek', 'brand', 'persediaan', 'nm_brg', 'nm_obat', 'nama_dagang',
      'nama_generik', 'sediaan_obat', 'obat_alkes', 'produk_obat', 'item_obat', 'nama_sediaan', 'title'
    ];

    const kategoriKeys = [
      'kategori_obat', 'kategori_barang', 'kategori_produk', 'kategori_item', 'kategori',
      'category', 'golongan_obat', 'golongan', 'gol', 'jenis_obat', 'jenis_barang', 'jenis',
      'kelompok_obat', 'kelompok', 'tipe_obat', 'tipe', 'group_item', 'group', 'class',
      'sub_kategori', 'subkategori', 'sub_golongan', 'subgolongan', 'kat_obat', 'kat',
      'klasifikasi', 'dept', 'department', 'departemen', 'divisi', 'sektor'
    ];

    const satuanKeys = [
      'satuan', 'unit', 'kemasan', 'sediaan', 'uom', 'pack', 'bentuk', 'satuan_terkecil',
      'satuan_jual', 'satuan_beli', 'kemasan_stok'
    ];

    const hargaBeliKeys = [
      'harga_beli', 'hargabeli', 'harga beli', 'buy_price', 'cost', 'h_beli', 'hbeli', 
      'hpp', 'modal', 'harga_modal', 'hargamodal', 'harga_dasar', 'hargadasar', 'beli',
      'h_netto', 'harga_neto', 'hnetto', 'harga_pokok', 'h_pokok', 'harga_hpp'
    ];

    const hargaJualKeys = [
      'harga_jual', 'hargajual', 'harga jual', 'sell_price', 'price', 'h_jual', 'hjual', 
      'harga', 'het', 'hja', 'harga_neto', 'harga_het', 'jual', 'harga_umum', 'harga_resep',
      'h_umum', 'humum', 'tarif', 'harga_satuan', 'harga_pcs'
    ];

    const stokKeys = [
      'stok', 'stock', 'jumlah', 'qty', 'quantity', 'sisa', 'stok_akhir', 'stokakhir', 
      'sisa_stok', 'sisastok', 'saldo', 'stok_fisik', 'fisik', 'stok_tersedia', 'saldo_stok',
      'stok_real', 'sisa_akhir'
    ];

    const batchKeys = [
      'batch', 'no_batch', 'nobatch', 'no batch', 'nobot', 'lot', 'no_lot', 'nolot',
      'batch_no', 'no_batch_lot', 'kode_batch'
    ];

    const expiredKeys = [
      'expired_date', 'expireddate', 'expired date', 'ed', 'exp', 'kadaluarsa', 'tgl_exp', 
      'tgl_ed', 'tanggal_exp', 'tanggal_ed', 'exp_date', 'expiration', 'expired', 'tgl_kadaluarsa',
      'kadaluwarsa', 'ed_date'
    ];

    const rakKeys = [
      'lokasi_rak', 'lokasirak', 'lokasi rak', 'rak', 'location', 'posisi', 'tempat', 'lokasi',
      'kode_rak', 'rak_obat', 'penyimpanan'
    ];

    const stokMinKeys = [
      'stok_min', 'stokmin', 'stok min', 'min_stok', 'minstok', 'minimal', 'limit', 'min',
      'stok_minimal', 'min_stock'
    ];

    // Exclude product code keys when finding medicine name
    const namaRaw = findVal(namaKeys, true);
    if (!namaRaw) return null;
    const nama = String(namaRaw).trim();
    if (!nama || nama.length < 2) return null;

    const namaLower = nama.toLowerCase();
    const invalidHeaderNames = [
      'nama obat', 'nama barang', 'nama produk', 'nama item', 'nama', 'description', 
      'deskripsi', 'uraian', 'kode obat', 'nama_obat', 'nama_barang', 'nama_item',
      'no', 'kode', 'uraian barang', 'item name', 'product name'
    ];
    if (invalidHeaderNames.includes(namaLower)) return null;

    const rawKategori = findVal(kategoriKeys);
    let kategori = rawKategori ? String(rawKategori).trim() : '';
    const satuan = String(findVal(satuanKeys) || 'Tablet').trim();
    const hargaBeli = parseNum(findVal(hargaBeliKeys), 0);
    const hargaJual = parseNum(findVal(hargaJualKeys), 0);
    const stok = parseNum(findVal(stokKeys), 0);
    
    // Check if there is a code column like Kode Obat to use as batch if batch is missing
    const codeVal = keys.find(k => isCodeKey(k)) ? row[keys.find(k => isCodeKey(k))!] : undefined;
    let finalNama = nama;
    let finalBatch = String(findVal(batchKeys) || codeVal || `BATCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);

    // Double Check: If finalNama looks like a short code (e.g. ABB001, K001) without spaces,
    // and there is a longer string in row that looks like real item name (with spaces or > length), swap them!
    const isCodeLikePattern = (s: string) => /^[A-Za-z0-9\-\.]{2,10}$/.test(s.trim()) && !s.includes(' ');
    if (isCodeLikePattern(finalNama)) {
      const candidates = Object.entries(row)
        .filter(([k]) => !isCodeKey(k))
        .map(([, v]) => String(v || '').trim())
        .filter(v => v.length > finalNama.length && v.includes(' ') && !v.toLowerCase().includes('rak'));
      
      if (candidates.length > 0) {
        finalBatch = finalNama; // The short code becomes batch/code
        finalNama = candidates[0]; // The longer string becomes real item name
      }
    }

    // Smart Auto-Categorization if category is missing or generic (e.g., Umum, Lain-lain)
    const invalidCategories = ['umum', 'lain-lain', 'lainnya', '-', 'none', 'null', 'undefined', 'general', '0', ''];
    if (!kategori || invalidCategories.includes(kategori.toLowerCase())) {
      kategori = predictCategory(finalNama, satuan);
    }

    const expiredDate = parseDateStr(findVal(expiredKeys));
    const lokasiRak = String(findVal(rakKeys) || 'Rak Umum');
    const stokMin = parseNum(findVal(stokMinKeys), 10);

    return {
      nama: finalNama,
      kategori,
      satuan,
      hargaBeli,
      hargaJual: hargaJual > 0 ? hargaJual : Math.round(hargaBeli * 1.2),
      stok,
      batch: finalBatch,
      expiredDate,
      lokasiRak,
      stokMin
    };
  };

  // Fallback for rows without standard headers
  const mapRowWithoutHeader = (rowArr: any[]): Omit<Medicine, 'id'> | null => {
    if (!Array.isArray(rowArr) || rowArr.length === 0) return null;
    const stringCells = rowArr.map(c => String(c || '').trim()).filter(Boolean);
    if (stringCells.length === 0) return null;

    const ignoreWords = [
      'no', 'kode', 'nama', 'nama obat', 'nama barang', 'kategori', 'satuan', 'harga', 
      'harga beli', 'harga jual', 'stok', 'batch', 'expired', 'ed', 'rak', 'total', 
      'subtotal', 'grand total', 'halaman', 'apotek', 'laporan', 'daftar'
    ];

    const candidateNames = stringCells.filter(s => {
      const lower = s.toLowerCase();
      if (/^\d+$/.test(s)) return false;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
      if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(s)) return false;
      if (lower.startsWith('rak ')) return false;
      if (ignoreWords.includes(lower)) return false;
      if (['tablet', 'kaplet', 'sirup', 'botol', 'ampul', 'vial', 'tube', 'pcs', 'box', 'sachet'].includes(lower)) return false;
      return s.length >= 2;
    });

    if (candidateNames.length === 0) return null;

    // Pick real name vs product code (e.g. ABB001 vs AMOXICILLIN 500MG)
    let nama = candidateNames[0];
    let candidateCode = '';

    if (candidateNames.length > 1) {
      // Find candidate that contains spaces or is longer (looks like item title/description)
      const nameWithSpace = candidateNames.find(s => s.includes(' ') && s.length >= 3);
      if (nameWithSpace) {
        nama = nameWithSpace;
        candidateCode = candidateNames.find(s => s !== nameWithSpace) || '';
      } else {
        // Pick the longest string as name
        const sorted = [...candidateNames].sort((a, b) => b.length - a.length);
        nama = sorted[0];
        candidateCode = sorted[1] || '';
      }
    }

    // Find numbers in the row
    const numbers: number[] = [];
    rowArr.forEach(c => {
      if (typeof c === 'number' && !isNaN(c)) numbers.push(c);
      else if (typeof c === 'string') {
        const str = c.trim();
        if (/^[\d.,Rp\s-]+$/.test(str)) {
          const parsed = parseNum(str, -1);
          if (parsed >= 0) numbers.push(parsed);
        }
      }
    });

    let hargaBeli = 0;
    let hargaJual = 0;
    let stok = 0;

    // Filter out potential index/row number if the first number is small and appears before name
    const nameIndexInRow = rowArr.findIndex(c => String(c || '').trim() === nama);
    const validNumbers = numbers.filter((n, idx) => {
      if (idx === 0 && nameIndexInRow > 0 && n <= 1000) return false; // Row index number like No. 1, 2, 3
      return true;
    });

    const prices = validNumbers.filter(n => n > 200);
    const stocks = validNumbers.filter(n => n <= 20000);

    if (prices.length >= 2) {
      hargaBeli = Math.min(prices[0], prices[1]);
      hargaJual = Math.max(prices[0], prices[1]);
    } else if (prices.length === 1) {
      hargaBeli = prices[0];
      hargaJual = Math.round(prices[0] * 1.2);
    }

    if (stocks.length > 0) {
      stok = stocks[stocks.length - 1]; // usually stock is near the right side
    }

    // Detect unit if any
    const units = ['Tablet', 'Kaplet', 'Sirup', 'Botol', 'Ampul', 'Vial', 'Tube', 'Pcs', 'Box', 'Sachet', 'Strip', 'Kapsul', 'Kotak'];
    const detectedUnit = stringCells.find(s => units.some(u => u.toLowerCase() === s.toLowerCase())) || 'Tablet';

    return {
      nama,
      kategori: predictCategory(nama, detectedUnit),
      satuan: detectedUnit,
      hargaBeli,
      hargaJual,
      stok,
      batch: candidateCode || `BATCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      expiredDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lokasiRak: 'Rak Umum',
      stokMin: 10
    };
  };

  // Robust Sheet Parser with multi-pass strategy
  const parseSheetToMedicines = (worksheet: XLSX.WorkSheet): Omit<Medicine, 'id'>[] => {
    // Pass 1: Direct object mapping
    try {
      const rawObjects: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
      if (rawObjects && rawObjects.length > 0) {
        const parsed = rawObjects.map(mapRowToMedicine).filter(Boolean) as Omit<Medicine, 'id'>[];
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // continue to Pass 2
    }

    // Pass 2: Header Auto-Detection in 2D Matrix
    const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
    if (!matrix || matrix.length === 0) return [];

    const headerKeywords = [
      'nama', 'obat', 'barang', 'produk', 'item', 'deskripsi', 'kategori', 'golongan',
      'satuan', 'kemasan', 'harga', 'beli', 'jual', 'stok', 'qty', 'jumlah', 'batch',
      'expired', 'kadaluarsa', 'ed', 'exp', 'rak', 'lokasi', 'kode', 'uom', 'cost', 'price',
      'uraian', 'merek', 'brand', 'hpp', 'modal', 'sisa'
    ];

    let bestHeaderRowIdx = -1;
    let maxMatchScore = 0;

    const scanLimit = Math.min(30, matrix.length);
    for (let r = 0; r < scanLimit; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;

      let score = 0;
      row.forEach(cell => {
        if (!cell) return;
        const cellStr = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (headerKeywords.some(kw => cellStr.includes(kw))) {
          score++;
        }
      });

      if (score > maxMatchScore) {
        maxMatchScore = score;
        bestHeaderRowIdx = r;
      }
    }

    if (bestHeaderRowIdx >= 0 && maxMatchScore >= 1) {
      const headerRow = matrix[bestHeaderRowIdx].map(cell => String(cell || '').trim());
      const dataRows = matrix.slice(bestHeaderRowIdx + 1);

      const rawRows = dataRows.map(rowArray => {
        const rowObj: Record<string, any> = {};
        headerRow.forEach((hName, colIdx) => {
          if (hName) {
            rowObj[hName] = rowArray[colIdx] !== undefined ? rowArray[colIdx] : '';
          } else {
            rowObj[`__COL_${colIdx}`] = rowArray[colIdx] !== undefined ? rowArray[colIdx] : '';
          }
        });
        return rowObj;
      });

      const normalized = rawRows.map(mapRowToMedicine).filter(Boolean) as Omit<Medicine, 'id'>[];
      if (normalized.length > 0) return normalized;
    }

    // Pass 3: Fallback Row-by-Row Deep Scan
    const fallbackList: Omit<Medicine, 'id'>[] = [];
    matrix.forEach(rowArr => {
      if (!Array.isArray(rowArr)) return;
      const smartMed = mapRowWithoutHeader(rowArr);
      if (smartMed) {
        fallbackList.push(smartMed);
      }
    });

    return fallbackList;
  };

  // Handle File Upload Change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setIsParsing(true);
    setImportSuccess(false);

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const list = Array.isArray(json) ? json : (json.medicines || []);
          const normalized = list.map(mapRowToMedicine).filter(Boolean) as Omit<Medicine, 'id'>[];
          if (normalized.length === 0) {
            setParseError('Data JSON tidak berisi objek obat yang valid.');
          } else {
            setParsedData(normalized);
          }
        } catch (err) {
          setParseError('Gagal parse file JSON: ' + (err as Error).message);
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          
          let foundMedicines: Omit<Medicine, 'id'>[] = [];

          // Scan through all sheets until valid medicines are found
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const parsed = parseSheetToMedicines(worksheet);
            if (parsed.length > 0) {
              foundMedicines = parsed;
              break;
            }
          }

          if (foundMedicines.length === 0) {
            setParseError('Tidak ada baris data obat yang valid ditemukan di worksheet. Pastikan terdapat kolom dengan header "Nama Obat" (atau "Nama Barang" / "Obat"), atau gunakan tombol "Template .XLSX" di atas.');
          } else {
            setParsedData(foundMedicines);
          }
        } catch (err) {
          setParseError('Gagal membaca spreadsheet: ' + (err as Error).message);
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle Paste Text Parsing
  const handleParseText = () => {
    if (!pastedText.trim()) return;

    setIsParsing(true);
    setParseError('');
    setImportSuccess(false);

    try {
      const trimmed = pastedText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const json = JSON.parse(trimmed);
        const list = Array.isArray(json) ? json : (json.medicines || []);
        const normalized = list.map(mapRowToMedicine).filter(Boolean) as Omit<Medicine, 'id'>[];
        if (normalized.length === 0) setParseError('JSON tidak valid untuk data obat.');
        else setParsedData(normalized);
      } else {
        // Parse CSV / TSV text via XLSX
        const workbook = XLSX.read(pastedText, { type: 'string' });
        let foundMedicines: Omit<Medicine, 'id'>[] = [];
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const parsed = parseSheetToMedicines(worksheet);
          if (parsed.length > 0) {
            foundMedicines = parsed;
            break;
          }
        }
        if (foundMedicines.length === 0) {
          setParseError('Format teks tidak menghasilkan data obat. Pastikan baris pertama memiliki nama kolom seperti "Nama Obat".');
        } else {
          setParsedData(foundMedicines);
        }
      }
    } catch (err) {
      setParseError('Gagal memproses data teks: ' + (err as Error).message);
    } finally {
      setIsParsing(false);
    }
  };

  // Download Sample Template Excel / CSV
  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const sampleRows = [
      {
        'Nama Obat': 'Paracetamol 500mg',
        'Kategori': 'Analgesik',
        'Satuan': 'Tablet',
        'Harga Beli': 1500,
        'Harga Jual': 2500,
        'Stok': 100,
        'No Batch': 'BATCH-PCT-01',
        'Expired Date': '2027-12-31',
        'Lokasi Rak': 'Rak A-1',
        'Stok Min': 20
      },
      {
        'Nama Obat': 'Amoxicillin 500mg',
        'Kategori': 'Antibiotik',
        'Satuan': 'Kaplet',
        'Harga Beli': 4000,
        'Harga Jual': 6500,
        'Stok': 50,
        'No Batch': 'BATCH-AMX-02',
        'Expired Date': '2027-06-30',
        'Lokasi Rak': 'Rak B-2',
        'Stok Min': 15
      },
      {
        'Nama Obat': 'Vitamin C 500mg',
        'Kategori': 'Suplemen',
        'Satuan': 'Tablet',
        'Harga Beli': 1000,
        'Harga Jual': 1800,
        'Stok': 200,
        'No Batch': 'BATCH-VTC-03',
        'Expired Date': '2028-01-15',
        'Lokasi Rak': 'Rak C-1',
        'Stok Min': 30
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Obat');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'Template_Import_Obat_Apotek_Cipta_Sehat.xlsx');
    } else {
      XLSX.writeFile(workbook, 'Template_Import_Obat_Apotek_Cipta_Sehat.csv', { bookType: 'csv' });
    }
  };

  // Execute Batch Import
  const handleStartImport = async () => {
    if (!isKhadafi || parsedData.length === 0) return;

    setIsImporting(true);
    setProgress({ current: 0, total: parsedData.length });

    const res = await importMedicinesBatch(parsedData, (current, total) => {
      setProgress({ current, total });
    });

    setIsImporting(false);

    if (res.success) {
      setImportedCount(res.count);
      setImportSuccess(true);
      setParsedData([]);
      setPastedText('');
      setFileName('');
    } else {
      setParseError('Gagal mengimpor data: ' + (res.error || 'Kesalahan database.'));
    }
  };

  // Filtered Preview Items
  const filteredPreview = parsedData.filter(m =>
    m.nama.toLowerCase().includes(previewSearch.toLowerCase()) ||
    m.kategori.toLowerCase().includes(previewSearch.toLowerCase()) ||
    m.batch.toLowerCase().includes(previewSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPreview.length / pageSize) || 1;
  const paginatedPreview = filteredPreview.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary statistics
  const totalStockQty = parsedData.reduce((sum, item) => sum + item.stok, 0);
  const totalStockValue = parsedData.reduce((sum, item) => sum + item.stok * item.hargaBeli, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Import Batch Data Obat</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Akses Khusus
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fitur impor data massal ribuan obat dari file Excel, CSV, atau JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* USER SECURITY AUTHORIZATION CARD */}
          {!isKhadafi ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-rose-900">Akses Dibatasi Sistem</h3>
                <p className="text-xs text-rose-700 max-w-lg mx-auto leading-relaxed">
                  Fitur impor batch ribuan data obat dikunci hanya untuk <strong>Super Admin</strong> (Administrator Utama).
                  Anda saat ini login sebagai <strong>{loggedInUser?.name || 'User Lain'}</strong>.
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-rose-100 text-xs text-slate-600 max-w-md mx-auto">
                Silakan ganti login ke akun <strong>Super Admin</strong> di menu Akun/Logout jika Anda ingin melakukan impor data gelondongan.
              </div>
              <button
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Tutup Jendela Ini
              </button>
            </div>
          ) : (
            <>
              {/* AUTHORIZED BADGE FOR MOHAMMAD KHADAFI */}
              <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>Otentikasi Pengguna Terverifikasi</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Anda login sebagai <strong>{loggedInUser?.name || 'Super Admin'}</strong>. Wewenang impor batch data obat diizinkan.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => downloadTemplate('xlsx')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-100/50 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Template .XLSX</span>
                  </button>
                  <button
                    onClick={() => downloadTemplate('csv')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Template .CSV</span>
                  </button>
                </div>
              </div>

              {/* SUCCESS STATE DISPLAY */}
              {importSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-bold text-emerald-900">Impor Batch Berhasil Diselesaikan!</h4>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Sebanyak <strong>{importedCount.toLocaleString('id-ID')} data obat</strong> telah berhasil ditambahkan ke database apotek dan kartu stok secara otomatis.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setImportSuccess(false)}
                        className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
                      >
                        Impor Data Lainnya
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* INPUT MODE SWITCHER & FILE DROPZONE */}
              {!importSuccess && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <button
                      onClick={() => { setInputMode('file'); setParseError(''); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${inputMode === 'file' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File Excel / CSV / JSON</span>
                    </button>
                    <button
                      onClick={() => { setInputMode('text'); setParseError(''); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${inputMode === 'text' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Paste Data Teks (Copy Spreadsheet)</span>
                    </button>
                  </div>

                  {inputMode === 'file' ? (
                    <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-3xl p-8 text-center transition-all cursor-pointer relative group">
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv, .json"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="space-y-3 pointer-events-none">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {fileName ? `File Terpilih: ${fileName}` : 'Klik atau Tarik File Excel / CSV Ke Sini'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Mendukung file format .XLSX, .XLS, .CSV, dan .JSON (dapat memuat ribuan baris data)
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Paste Baris Data spreadsheet (CSV / JSON):</label>
                        <span className="text-[10px] text-slate-400">Pastikan baris pertama berisi nama kolom/header</span>
                      </div>
                      <textarea
                        rows={6}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`Nama Obat\tKategori\tSatuan\tHarga Beli\tHarga Jual\tStok\tBatch\tExpired Date\tRak\nParacetamol 500mg\tAnalgesik\tTablet\t1500\t2500\t100\tBATCH-01\t2027-12-31\tRak A-1\nAmoxicillin 500mg\tAntibiotik\tKaplet\t4000\t6500\t50\tBATCH-02\t2027-06-30\tRak B-2`}
                        className="w-full p-3 text-xs border border-slate-200 rounded-2xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
                      />
                      <button
                        onClick={handleParseText}
                        disabled={!pastedText.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Proses Parsing Data Teks</span>
                      </button>
                    </div>
                  )}

                  {isParsing && (
                    <div className="text-xs font-bold text-emerald-600 animate-pulse flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                      <Database className="w-4 h-4 animate-spin" />
                      <span>Sedang membaca dan menganalisis struktur data obat...</span>
                    </div>
                  )}

                  {parseError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{parseError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* PREVIEW DASHBOARD & TABLE */}
              {parsedData.length > 0 && !importSuccess && (
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  {/* Summary STATS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Item Obat</p>
                      <p className="text-lg font-black text-slate-900 mt-0.5">{parsedData.length.toLocaleString('id-ID')} Variant</p>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Fisik Stok</p>
                      <p className="text-lg font-black text-emerald-800 mt-0.5">{totalStockQty.toLocaleString('id-ID')} Pcs</p>
                    </div>
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Nilai Beli Stok</p>
                      <p className="text-lg font-black text-indigo-900 mt-0.5">Rp {totalStockValue.toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  {/* PREVIEW FILTER SEARCH */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Preview Data Obat yang Siap Diimpor ({filteredPreview.length} Obat)</span>
                    </h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter nama, kategori, batch..."
                        value={previewSearch}
                        onChange={(e) => { setPreviewSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  {/* PREVIEW TABLE */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                            <th className="py-2.5 px-3">No</th>
                            <th className="py-2.5 px-3">Nama Obat</th>
                            <th className="py-2.5 px-3">Kategori</th>
                            <th className="py-2.5 px-3">Satuan</th>
                            <th className="py-2.5 px-3 text-right">Harga Beli</th>
                            <th className="py-2.5 px-3 text-right">Harga Jual</th>
                            <th className="py-2.5 px-3 text-center">Stok</th>
                            <th className="py-2.5 px-3">Batch & Expired</th>
                            <th className="py-2.5 px-3">Rak</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {paginatedPreview.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 text-slate-400 font-mono">{(currentPage - 1) * pageSize + idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900">{m.nama}</td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">{m.kategori}</span>
                              </td>
                              <td className="py-2 px-3 text-slate-600">{m.satuan}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">Rp {m.hargaBeli.toLocaleString('id-ID')}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">Rp {m.hargaJual.toLocaleString('id-ID')}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{m.stok} Pcs</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                                <div>B: {m.batch}</div>
                                <div className="text-slate-800 font-medium">ED: {m.expiredDate}</div>
                              </td>
                              <td className="py-2 px-3 text-slate-600">{m.lokasiRak}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Pagination */}
                    {totalPages > 1 && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredPreview.length)} dari {filteredPreview.length} obat</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 font-medium hover:bg-slate-100"
                          >
                            Prev
                          </button>
                          <span className="px-2 font-bold text-slate-700">{currentPage} / {totalPages}</span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 font-medium hover:bg-slate-100"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        {isKhadafi && parsedData.length > 0 && !importSuccess && (
          <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              {isImporting ? (
                <div className="space-y-1.5 min-w-[240px]">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>Proses Impor Ke Database...</span>
                    <span>{progress.current} / {progress.total} ({Math.round((progress.current / progress.total) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Siap menambahkan <strong>{parsedData.length.toLocaleString('id-ID')} obat</strong> ke database Apotek Cipta Sehat.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={isImporting}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleStartImport}
                disabled={isImporting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Mulai Impor {parsedData.length.toLocaleString('id-ID')} Data Obat</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
