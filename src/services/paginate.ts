import { supabase } from '../lib/supabase';

const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  table: string,
  map: (row: Record<string, unknown>) => T
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data.map(map));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
