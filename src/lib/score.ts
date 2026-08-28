import { DailyEntry, Student, Quality, EntryType, TargetPlan } from '../data/mock';

export const QUALITY_MULTIPLIER: Record<Quality, number> = {
  4: 1.0,   // Excellent
  3: 0.8,   // Good
  2: 0.6,   // Fair
  1: 0.4,   // Weak
};

export const ENTRY_TYPE_POINTS: Record<EntryType, number> = {
  sabaq: 1,
  sabqi: 1,
  manzil: 1,
};

/** Score multiplier from a lesson's pass/fail result (falls back to quality). */
function resultMult(e: DailyEntry): number {
  if (e.result) return e.result === 'pass' ? 1 : 0;
  return e.quality ? QUALITY_MULTIPLIER[e.quality] : 1;
}

export function calculateDaysBehind(
  student: Student,
  plan: TargetPlan,
  schoolDaysElapsed: number
): number {
  const expectedPage = plan.start_page + plan.daily_target_pages * schoolDaysElapsed;
  const daysBehind = (expectedPage - student.current_page) / plan.daily_target_pages;
  return Math.round(daysBehind * 10) / 10;
}

export function calculateWeeklyScore(
  entries: DailyEntry[],
  attendance: { att_date: string; status: string }[],
  plan: TargetPlan,
  student: Student
): number {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const cutoff = oneWeekAgo.toISOString().slice(0, 10);
  
  const recentEntries = entries.filter(e => e.entry_date >= cutoff);
  const recentAttendance = attendance.filter(a => a.att_date >= cutoff);
  
  let score = 0;
  
  const entriesByDate = new Map<string, DailyEntry[]>();
  recentEntries.forEach(e => {
    const arr = entriesByDate.get(e.entry_date) || [];
    arr.push(e);
    entriesByDate.set(e.entry_date, arr);
  });
  
  entriesByDate.forEach((dayEntries, date) => {
    const dayAttendance = recentAttendance.find(a => a.att_date === date);
    const isPresent = dayAttendance?.status === 'present';
    
    if (isPresent) score += 2;
    
    const sabaqEntry = dayEntries.find(e => e.entry_type === 'sabaq');
    const revisionEntries = dayEntries.filter(e => e.entry_type === 'sabqi' || e.entry_type === 'manzil');
    
    if (sabaqEntry) {
      const pages = sabaqEntry.page_to - sabaqEntry.page_from + 1;
      const mult = resultMult(sabaqEntry);
      score += pages * mult;
    }
    
    revisionEntries.forEach(rev => {
      const mult = resultMult(rev);
      score += 10 * mult;
    });
    
    const expectedPage = plan.start_page + plan.daily_target_pages * getSchoolDaysElapsed(plan.start_date, date);
    if (student.current_page >= expectedPage) {
      score += 5;
    }
  });
  
  return Math.round(score);
}

export function calculateDailyScore(entries: DailyEntry[], isPresent: boolean, plan: TargetPlan, student: Student, date: string): number {
  let score = 0;
  
  if (isPresent) score += 2;
  
  const sabaqEntry = entries.find(e => e.entry_type === 'sabaq');
  const revisionEntries = entries.filter(e => e.entry_type === 'sabqi' || e.entry_type === 'manzil');
  
  if (sabaqEntry) {
    const pages = sabaqEntry.page_to - sabaqEntry.page_from + 1;
    const mult = resultMult(sabaqEntry);
    score += pages * mult;
  }
  
  revisionEntries.forEach(rev => {
    const mult = resultMult(rev);
    score += 10 * mult;
  });
  
  const expectedPage = plan.start_page + plan.daily_target_pages * getSchoolDaysElapsed(plan.start_date, date);
  if (student.current_page >= expectedPage) {
    score += 5;
  }
  
  return Math.round(score);
}

function getSchoolDaysElapsed(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 5) { // Skip Friday (5 = Friday)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

export function getSmartContinueSuggestion(
  lastEntry: DailyEntry | null,
  surahs: { id: number; ayah_count: number; page_start: number }[]
): { surah_id: number; ayah_from: number; ayah_to: number; page_from: number; page_to: number } | null {
  if (!lastEntry) return null;
  
  const lastSurah = surahs.find(s => s.id === lastEntry.surah_id);
  if (!lastSurah) return null;
  
  const span = lastEntry.ayah_to - lastEntry.ayah_from + 1;
  let nextAyahFrom = lastEntry.ayah_to + 1;
  let nextSurahId = lastEntry.surah_id;
  let nextSurah = lastSurah;
  
  if (nextAyahFrom > lastSurah.ayah_count) {
    const nextSurahIndex = surahs.findIndex(s => s.id === lastEntry.surah_id) + 1;
    if (nextSurahIndex < surahs.length) {
      nextSurah = surahs[nextSurahIndex];
      nextSurahId = nextSurah.id;
      nextAyahFrom = 1;
    } else {
      return null; // End of Quran
    }
  }
  
  const nextAyahTo = Math.min(nextAyahFrom + span - 1, nextSurah.ayah_count);
  const pageRatioFrom = (nextAyahFrom - 1) / nextSurah.ayah_count;
  const pageRatioTo = (nextAyahTo - 1) / nextSurah.ayah_count;
  const surahPages = 20; // Approximate pages per surah
  const pageFrom = nextSurah.page_start + Math.floor(pageRatioFrom * surahPages);
  const pageTo = Math.min(nextSurah.page_start + Math.ceil(pageRatioTo * surahPages), 604);
  
  return {
    surah_id: nextSurahId,
    ayah_from: nextAyahFrom,
    ayah_to: nextAyahTo,
    page_from: pageFrom,
    page_to: pageTo,
  };
}

export function getDaysBehindBadge(daysBehind: number): { text: string; color: 'green' | 'gold' | 'red' } {
  if (daysBehind <= 0) {
    return { text: 'on track', color: 'green' };
  } else if (daysBehind <= 3) {
    return { text: `${daysBehind} day(s) behind`, color: 'gold' };
  } else {
    return { text: `${daysBehind} days behind`, color: 'red' };
  }
}

export function calculateQuranProgress(currentPage: number): { percent: number; juz: number } {
  const percent = Math.round((currentPage / 604) * 100);
  const juz = Math.ceil(currentPage / 20.13); // ~20 pages per juz
  return { percent, juz: Math.min(juz, 30) };
}

export function getGradeFromTotal(total: number): string {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  return 'D';
}

export function calculateExamTotal(marks: Record<string, number>, components: Record<string, number>): number {
  let total = 0;
  Object.entries(components).forEach(([component, max]) => {
    total += Math.min(marks[component] || 0, max);
  });
  return total;
}