import { Medicine } from '../types';
import { downloadPriceListExcel } from './priceList';

const SLOT_PAGI_MINUTES = 8 * 60;
const SLOT_MALAM_MINUTES = 21 * 60;

// Hari libur nasional Indonesia 2026 (SKB 3 Menteri). Update saat tahun berganti.
const HARI_LIBUR: string[] = [
  '2026-01-01', '2026-01-16', '2026-02-17', '2026-03-19', '2026-03-21', '2026-03-22',
  '2026-04-03', '2026-04-05', '2026-05-01', '2026-05-14', '2026-05-27', '2026-05-31',
  '2026-06-01', '2026-06-16', '2026-08-17', '2026-08-25', '2026-12-25',
];

const STORAGE_KEY = 'acs_price_list_auto';

interface AutoState {
  date: string;
  pagi: boolean;
  malam: boolean;
}

function getJakartaClock(): { date: string; minutes: number; weekday: string } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const hour = (parseInt(get('hour'), 10) || 0) % 24;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + (parseInt(get('minute'), 10) || 0),
    weekday: get('weekday'),
  };
}

function loadState(): AutoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AutoState>;
      if (parsed && typeof parsed.date === 'string') {
        return { date: parsed.date, pagi: !!parsed.pagi, malam: !!parsed.malam };
      }
    }
  } catch {
    // abaikan
  }
  return { date: '', pagi: false, malam: false };
}

function saveState(state: AutoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // abaikan
  }
}

export function runAutoPriceListExport(medicines: Medicine[]): void {
  if (!medicines.length) return;

  const { date, minutes, weekday } = getJakartaClock();
  if (weekday === 'Sun') return;
  if (HARI_LIBUR.includes(date)) return;

  let state = loadState();
  if (state.date !== date) {
    state = { date, pagi: false, malam: false };
  }

  if (minutes >= SLOT_MALAM_MINUTES) {
    if (!state.malam) downloadPriceListExcel(medicines);
    state.pagi = true;
    state.malam = true;
  } else if (minutes >= SLOT_PAGI_MINUTES) {
    if (!state.pagi) downloadPriceListExcel(medicines);
    state.pagi = true;
  }

  saveState(state);
}
