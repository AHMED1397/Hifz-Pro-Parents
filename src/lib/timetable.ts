// ─────────────────────────────────────────────────────────────
// Madrasa timetable engine + live period resolver.
//
// WHY THIS FILE EXISTS: PARENT_APP_SPEC.md §7 lists `src/lib/timetable.ts` as
// "100% reusable directly from AHMED1397/Hfz-Pro". It is NOT present in the
// Teacher App (verified by find/grep across the extracted source) — see
// docs/PARENT_APP_PLAN.md gap G1. This is the from-scratch implementation.
//
// DATA SOURCE: docs/HAQQANIYYAH_HIFZ_STRUCTURE_FULL.md §3.4 "Daily Timetable
// (Full Day)" + the Weekly Schedule table. Times are copied, not invented.
//
// Weekly pattern (JS Date.getDay(): 0 = Sunday … 6 = Saturday):
//   Sun–Thu  → full day
//   Friday   → off. After Subah: Surah Al-Kahf + Jumu'ah recitation.
//   Saturday → half day: lessons from 11:30 and after Zuhr, no school section.
//
// NOTE ON PRAYER TIMES: Maghrib/Isha shift through the year. The engine uses a
// nominal Maghrib (18:30) so the widget is deterministic; swap `MAGHRIB_NOMINAL`
// for a prayer-times feed later without touching any caller.
// ─────────────────────────────────────────────────────────────

export type PeriodKind =
  | 'wake'
  | 'break'
  | 'prayer'
  | 'class'
  | 'nazira'
  | 'school'
  | 'rest'
  | 'sleep'
  | 'holiday';

export interface Period {
  id: string;
  /** Local clock start, minutes since midnight. */
  startMin: number;
  endMin: number;
  title: string;
  titleAr: string;
  titleTa: string;
  kind: PeriodKind;
  icon: string;
  /** True when a lesson is actually being heard (Sabaq/Sabq/Manzil). */
  isLesson: boolean;
  /** Which of the three daily lessons is heard in this slot, if any. */
  lessonType?: 'sabaq' | 'sabqi' | 'manzil';
  note?: string;
}

export type DayType = 'full' | 'friday' | 'saturday';

const h = (hh: number, mm = 0) => hh * 60 + mm;

/** Nominal Maghrib azan — see the prayer-times note above. */
export const MAGHRIB_NOMINAL = h(18, 30);

// ── Period builders ─────────────────────────────────────────
const p = (
  id: string,
  startMin: number,
  endMin: number,
  title: string,
  titleAr: string,
  titleTa: string,
  kind: PeriodKind,
  icon: string,
  extra: Partial<Period> = {}
): Period => ({ id, startMin, endMin, title, titleAr, titleTa, kind, icon, isLesson: false, ...extra });

/** The evening block is identical on all three day types. */
function eveningPeriods(): Period[] {
  return [
    p('dinner', h(19, 45), h(20, 0), 'Dinner', 'العشاء', 'இரவு உணவு', 'break', 'restaurant-outline'),
    p('isha', h(20, 0), h(20, 30), 'Isha + Taleem', 'العشاء + التعليم', 'இஷா + தஃலீம்', 'prayer', 'moon-outline'),
    p('after_isha', h(20, 30), h(21, 30), "After-Isha Lesson", 'درس بعد العشاء', 'இஷாவுக்குப் பின் பாடம்', 'class', 'moon-outline', {
      isLesson: true,
      note: "Final repetition of next day's Sabaq and Manzil",
    }),
    p('sleep', h(21, 30), h(24, 0), 'Lights Out', 'النوم', 'தூக்கம்', 'sleep', 'bed-outline'),
  ];
}

const FULL_DAY: Period[] = [
  p('wake', h(3, 45), h(4, 50), 'Wake Up', 'الاستيقاظ', 'விழிப்பு', 'wake', 'moon-outline', {
    note: 'The hifz day begins',
  }),
  p('tea1', h(4, 50), h(5, 5), 'Tea Break', 'استراحة الشاي', 'தேநீர் இடைவேளை', 'break', 'cafe-outline'),
  p('fajr', h(5, 5), h(5, 30), 'Fajr Prayer', 'صلاة الفجر', 'ஃபஜ்ர் தொழுகை', 'prayer', 'moon-outline'),
  p('morning_class', h(5, 30), h(7, 30), 'Morning Sabaq Class', 'درس السبق الصباحي', 'காலை சபக் வகுப்பு', 'class', 'sunny-outline', {
    isLesson: true,
    lessonType: 'sabaq',
    note: 'Hazrat hears the new lesson — some ustadhs hear it at ~9:00 AM instead',
  }),
  p('breakfast', h(7, 30), h(8, 30), 'Breakfast Break', 'الإفطار', 'காலை உணவு', 'break', 'restaurant-outline'),
  p('class_am', h(8, 30), h(10, 30), 'Class — Sabq then Manzil', 'الدرس: السبقي ثم المنزل', 'வகுப்பு — சப்கீ, பின் மன்ழில்', 'class', 'sunny-outline', {
    isLesson: true,
    lessonType: 'sabqi',
    note: 'Hazrat hears Sabq, then Manzil',
  }),
  p('tea2', h(10, 30), h(10, 45), 'Tea Break', 'استراحة الشاي', 'தேநீர் இடைவேளை', 'break', 'cafe-outline'),
  p('class_late_am', h(10, 45), h(11, 30), 'Class Time', 'وقت الدرس', 'வகுப்பு நேரம்', 'class', 'sunny-outline', { isLesson: true }),
  p('qailulah', h(11, 30), h(12, 30), 'Qailulah (Midday Rest)', 'القيلولة', 'கைலூலா (மதிய ஓய்வு)', 'rest', 'bed-outline'),
  p('lunch_zuhr', h(12, 30), h(13, 25), 'Lunch + Zuhr', 'الغداء + الظهر', 'மதிய உணவு + லுஹர்', 'prayer', 'restaurant-outline'),
  p('school', h(13, 25), h(16, 45), 'School Section', 'القسم المدرسي', 'பள்ளிப் பிரிவு', 'school', 'school-outline', {
    note: 'Sri Lanka local syllabus — Usman (RA) Building',
  }),
  p('asar', h(16, 45), h(17, 45), 'Asar + Evening Break', 'العصر + الاستراحة', 'அஸர் + மாலை இடைவேளை', 'prayer', 'moon-outline'),
  p('nazira', h(17, 45), MAGHRIB_NOMINAL, 'An-Nazira / Mashk', 'الناظرة / المشق', 'நழிரா / மஷ்க்', 'nazira', 'book-outline', {
    note: "Hifz: read tomorrow's new lesson to a senior (~5 min). Girdan: mashk (20+ min). No nazira → tomorrow's Sabaq is cut.",
  }),
  p('maghrib_lesson', MAGHRIB_NOMINAL, h(19, 45), 'Maghrib + Lesson', 'المغرب + الدرس', 'மக்ரிப் + பாடம்', 'class', 'moon-outline', {
    isLesson: true,
    note: 'Students sit alone in the masjid memorizing tomorrow\'s Sabaq, or their Sabq / Manzil',
  }),
  ...eveningPeriods(),
];

const FRIDAY: Period[] = [
  p('wake', h(3, 45), h(4, 50), 'Wake Up', 'الاستيقاظ', 'விழிப்பு', 'wake', 'moon-outline'),
  p('tea1', h(4, 50), h(5, 5), 'Tea Break', 'استراحة الشاي', 'தேநீர் இடைவேளை', 'break', 'cafe-outline'),
  p('fajr', h(5, 5), h(5, 30), 'Fajr Prayer', 'صلاة الفجر', 'ஃபஜ்ர் தொழுகை', 'prayer', 'moon-outline'),
  p('kahf', h(5, 30), h(7, 30), "Surah Al-Kahf + Jumu'ah Recitation", 'سورة الكهف + قراءة الجمعة', 'ஸூரத்துல் கஹ்ஃப் + ஜும்ஆ ஓதல்', 'holiday', 'moon-outline', {
    note: 'Full day off — no lessons',
  }),
  p('friday_off_am', h(7, 30), h(12, 30), 'Jumu\'ah Holiday — No Lessons', 'عطلة الجمعة — لا دروس', 'ஜும்ஆ விடுமுறை — பாடம் இல்லை', 'holiday', 'moon-outline'),
  p('lunch_jumuah', h(12, 30), h(14, 0), 'Lunch + Jumu\'ah Prayer', 'الغداء + صلاة الجمعة', 'மதிய உணவு + ஜும்ஆ தொழுகை', 'prayer', 'moon-outline'),
  p('friday_off_pm', h(14, 0), h(17, 45), 'Holiday — Free Time', 'عطلة — وقت حر', 'விடுமுறை — ஓய்வு நேரம்', 'holiday', 'moon-outline'),
  p('asar', h(17, 45), MAGHRIB_NOMINAL, 'Asar + Evening Break', 'العصر + الاستراحة', 'அஸர் + மாலை இடைவேளை', 'prayer', 'moon-outline'),
  p('maghrib_lesson', MAGHRIB_NOMINAL, h(19, 45), 'Maghrib + Lesson', 'المغرب + الدرس', 'மக்ரிப் + பாடம்', 'class', 'moon-outline', { isLesson: true }),
  ...eveningPeriods(),
];

const SATURDAY: Period[] = [
  p('wake', h(3, 45), h(4, 50), 'Wake Up', 'الاستيقاظ', 'விழிப்பு', 'wake', 'moon-outline'),
  p('tea1', h(4, 50), h(5, 5), 'Tea Break', 'استراحة الشاي', 'தேநீர் இடைவேளை', 'break', 'cafe-outline'),
  p('fajr', h(5, 5), h(5, 30), 'Fajr Prayer', 'صلاة الفجر', 'ஃபஜ்ர் தொழுகை', 'prayer', 'moon-outline'),
  p('sat_morning_off', h(5, 30), h(11, 30), 'Half Day — Morning Off', 'نصف يوم — الصباح عطلة', 'அரை நாள் — காலை விடுமுறை', 'holiday', 'hourglass-outline', {
    note: 'Lessons start at 11:30 AM',
  }),
  p('sat_class_am', h(11, 30), h(12, 30), 'Class Time', 'وقت الدرس', 'வகுப்பு நேரம்', 'class', 'sunny-outline', { isLesson: true }),
  p('lunch_zuhr', h(12, 30), h(13, 25), 'Lunch + Zuhr', 'الغداء + الظهر', 'மதிய உணவு + லுஹர்', 'prayer', 'restaurant-outline'),
  p('sat_class_pm', h(13, 25), h(15, 45), 'Class Time', 'وقت الدرس', 'வகுப்பு நேரம்', 'class', 'sunny-outline', {
    isLesson: true,
    note: 'No school section on Saturday',
  }),
  p('asar', h(15, 45), h(16, 45), 'Asar + Evening Break', 'العصر + الاستراحة', 'அஸர் + மாலை இடைவேளை', 'prayer', 'moon-outline'),
  p('nazira', h(16, 45), MAGHRIB_NOMINAL, 'An-Nazira / Mashk', 'الناظرة / المشق', 'நழிரா / மஷ்க்', 'nazira', 'book-outline'),
  p('maghrib_lesson', MAGHRIB_NOMINAL, h(19, 45), 'Maghrib + Lesson', 'المغرب + الدرس', 'மக்ரிப் + பாடம்', 'class', 'moon-outline', { isLesson: true }),
  ...eveningPeriods(),
];

// ── Public API ──────────────────────────────────────────────

export function getDayType(date: Date = new Date()): DayType {
  const d = date.getDay();
  if (d === 5) return 'friday';
  if (d === 6) return 'saturday';
  return 'full';
}

export function isFriday(date: Date = new Date()): boolean {
  return getDayType(date) === 'friday';
}

/** Lessons are heard Sun–Thu and (partly) Saturday. Never on Friday. */
export function hasLessonsToday(date: Date = new Date()): boolean {
  return getDayType(date) !== 'friday';
}

export function getPeriods(date: Date = new Date()): Period[] {
  switch (getDayType(date)) {
    case 'friday':
      return FRIDAY;
    case 'saturday':
      return SATURDAY;
    default:
      return FULL_DAY;
  }
}

export function minutesSinceMidnight(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export interface LivePeriod {
  period: Period;
  index: number;
  /** 0..1 through the current period. */
  progress: number;
  minutesRemaining: number;
  next: Period | null;
  minutesUntilNext: number;
  /** True when the current slot is a lesson being heard by the ustadh. */
  isLessonTime: boolean;
}

/** Resolve what is happening right now (or at `date`). Never returns null. */
export function getLivePeriod(date: Date = new Date()): LivePeriod {
  const periods = getPeriods(date);
  const now = minutesSinceMidnight(date);
  let index = periods.findIndex(x => now >= x.startMin && now < x.endMin);
  if (index === -1) {
    // Before the first period (00:00–03:45) → still asleep; after 24:00 can't happen.
    index = now < periods[0].startMin ? 0 : periods.length - 1;
  }
  const period = periods[index];
  const span = Math.max(1, period.endMin - period.startMin);
  const elapsed = Math.min(span, Math.max(0, now - period.startMin));
  const next = periods[index + 1] ?? null;
  return {
    period,
    index,
    progress: elapsed / span,
    minutesRemaining: Math.max(0, Math.round(period.endMin - now)),
    next,
    minutesUntilNext: next ? Math.max(0, Math.round(next.startMin - now)) : 0,
    isLessonTime: period.isLesson,
  };
}

// ── Formatting ──────────────────────────────────────────────

/** 155 → "2:35 AM" */
export function formatClock(mins: number, use24h = false): string {
  const total = ((mins % 1440) + 1440) % 1440;
  const hh24 = Math.floor(total / 60);
  const mm = Math.round(total % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (use24h) return `${pad(hh24)}:${pad(mm)}`;
  const suffix = hh24 < 12 ? 'AM' : 'PM';
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  return `${hh12}:${pad(mm)} ${suffix}`;
}

export function formatRange(period: Period, use24h = false): string {
  return `${formatClock(period.startMin, use24h)} – ${formatClock(period.endMin, use24h)}`;
}

export function formatDuration(mins: number): string {
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min`;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return mm === 0 ? `${hh} hr` : `${hh} hr ${mm} min`;
}

/** Period title in the requested language. */
export function periodTitle(period: Period, lang: 'en' | 'ar' | 'ta' = 'en'): string {
  if (lang === 'ar') return period.titleAr;
  if (lang === 'ta') return period.titleTa;
  return period.title;
}

export function dayTypeBanner(date: Date = new Date()): { icon: string; en: string; ar: string; ta: string } | null {
  const t = getDayType(date);
  if (t === 'friday') {
    return {
      icon: 'moon-outline',
      en: "Jumu'ah — Surah Al-Kahf recitation day. No lessons today.",
      ar: 'الجمعة — يوم قراءة سورة الكهف. لا دروس اليوم.',
      ta: "ஜும்ஆ — ஸூரத்துல் கஹ்ஃப் ஓதும் நாள். இன்று பாடம் இல்லை.",
    };
  }
  if (t === 'saturday') {
    return {
      icon: 'hourglass-outline',
      en: 'Saturday half day — lessons from 11:30 AM, no school section.',
      ar: 'السبت نصف يوم — الدروس من ١١:٣٠ صباحاً، لا قسم مدرسي.',
      ta: 'சனிக்கிழமை அரை நாள் — 11:30 முதல் பாடங்கள், பள்ளிப் பிரிவு இல்லை.',
    };
  }
  return null;
}

/**
 * The slot in which tomorrow's new lesson is pre-read.
 * Used by the dashboard to explain a "Nazira not done" hold to a parent.
 */
export function getNaziraSlot(date: Date = new Date()): Period | null {
  return getPeriods(date).find(x => x.kind === 'nazira') ?? null;
}
