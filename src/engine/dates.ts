/**
 * Datumslogik auf Basis lokaler Kalendertage ("YYYY-MM-DD").
 * Ohne Zeitzonenangabe gilt die Zeitzone des Geräts; Tests können eine IANA-Zeitzone übergeben.
 */

/** Kalendertag im Format YYYY-MM-DD */
export type DayKey = string;

const DAY_MS = 86_400_000;
const fmtCache = new Map<string, Intl.DateTimeFormat>();
const pad = (n: number) => String(n).padStart(2, '0');

function formatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    fmtCache.set(tz, f);
  }
  return f;
}

/** Lokaler Kalendertag eines Zeitpunkts (optional in einer bestimmten IANA-Zeitzone). */
export function dayKey(at: Date | string | number, tz?: string): DayKey {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  if (!tz) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let y = '', m = '', day = '';
  for (const p of formatter(tz).formatToParts(d)) {
    if (p.type === 'year') y = p.value;
    else if (p.type === 'month') m = p.value;
    else if (p.type === 'day') day = p.value;
  }
  return `${y}-${m}-${day}`;
}

export const todayKey = (tz?: string, now: Date = new Date()): DayKey => dayKey(now, tz);

function parseDay(key: DayKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

const utcMs = (key: DayKey) => { const [y, m, d] = parseDay(key); return Date.UTC(y, m - 1, d); };
const fromUtc = (ms: number): DayKey => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

export const addDays = (key: DayKey, n: number): DayKey => fromUtc(utcMs(key) + n * DAY_MS);

/** Anzahl Tage von a nach b (b − a). */
export const diffDays = (a: DayKey, b: DayKey): number => Math.round((utcMs(b) - utcMs(a)) / DAY_MS);

/** 0 = Montag … 6 = Sonntag */
export const weekdayIndex = (key: DayKey): number => (new Date(utcMs(key)).getUTCDay() + 6) % 7;

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const weekdayShort = (key: DayKey) => WEEKDAYS_SHORT[weekdayIndex(key)];
export const weekdayLong = (key: DayKey) => WEEKDAYS_LONG[weekdayIndex(key)];

/** ISO-Kalenderwoche als Schlüssel "YYYY-Www" (Woche beginnt Montag). */
export function weekKey(key: DayKey): string {
  const t = utcMs(key);
  const thursday = t + (3 - weekdayIndex(key)) * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4);
  const week1Monday = jan4 - weekdayIndex(fromUtc(jan4)) * DAY_MS;
  const week = Math.floor((thursday - week1Monday) / (7 * DAY_MS)) + 1;
  return `${year}-W${pad(week)}`;
}

/** Montag der Woche eines Tages. */
export const weekStart = (key: DayKey): DayKey => addDays(key, -weekdayIndex(key));

/** Die sieben Tage (Mo–So) einer ISO-Woche "YYYY-Www". */
export function daysOfWeekKey(wk: string): DayKey[] {
  const m = /^(\d{4})-W(\d{2})$/.exec(wk);
  if (!m) return [];
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = fromUtc(Date.UTC(year, 0, 4));
  const monday = addDays(weekStart(jan4), (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Die letzten n Tage bis einschließlich `today`, älteste zuerst. */
export const lastNDays = (n: number, today: DayKey): DayKey[] =>
  Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));

export const isDayKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isWeekKey = (s: string) => /^\d{4}-W\d{2}$/.test(s);

/** Lokale Mitternacht des Tages nach `now` (für Timer, die den „heute“-Wert aktualisieren). */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

/** Deutsches Kurzdatum, z. B. „21.09.“ */
export function formatDayShort(key: DayKey): string {
  const [, m, d] = parseDay(key);
  return `${pad(d)}.${pad(m)}.`;
}
