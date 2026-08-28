// Reliable Hijri conversion (tabular / Kuwaiti algorithm). We do NOT rely on
// Intl's islamic calendar because React Native's Hermes engine doesn't support
// it and silently falls back to Gregorian (which made the date appear twice).
const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Awwal',
  'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal',
  "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];
const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى',
  'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال',
  'ذو القعدة', 'ذو الحجة',
];
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicDigits = (n: number) => String(n).replace(/[0-9]/g, d => AR_DIGITS[+d]);

function gregorianToHijri(date: Date): { day: number; month: number; year: number } {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  // Gregorian → Julian Day Number
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  const jdn =
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Julian Day → Islamic (tabular civil) date
  const l0 = jdn - 1948440 + 10632;
  const n = Math.floor((l0 - 1) / 10631);
  let l = l0 - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year };
}

export function formatHijriDate(date: Date = new Date(), locale: string = 'en'): string {
  try {
    const { day, month, year } = gregorianToHijri(date);
    if (locale === 'ar') {
      return `${toArabicDigits(day)} ${HIJRI_MONTHS_AR[month - 1]} ${toArabicDigits(year)} هـ`;
    }
    return `${day} ${HIJRI_MONTHS_EN[month - 1]} ${year} AH`;
  } catch {
    return '';
  }
}

export function formatGregorianDate(date: Date = new Date(), locale: string = 'en'): string {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return '';
  }
}

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDaysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function isBeforeDeadline(deadlineHour: number = 11, deadlineMinute: number = 30): boolean {
  const now = new Date();
  return now.getHours() < deadlineHour || (now.getHours() === deadlineHour && now.getMinutes() <= deadlineMinute);
}

export function getMinutesUntilDeadline(deadlineHour: number = 11, deadlineMinute: number = 30): number {
  const now = new Date();
  const deadline = new Date();
  deadline.setHours(deadlineHour, deadlineMinute, 0, 0);
  
  if (deadline < now) return 0;
  
  return Math.ceil((deadline.getTime() - now.getTime()) / 60000);
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function parseISODate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

export function formatDateForDisplay(date: Date, locale: string = 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function getMonthStartEnd(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

export function getWeekStartEnd(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay()); // Sunday
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}