# Al Haqqaniyyah Hifz Section — Parent App Specification (`Hfz-Parent`)

> **Document Version:** 1.0.0  
> **Last Updated:** August 2026  
> **Platform Target:** iOS & Android (React Native with Expo & Expo Router)  
> **Backend:** Supabase (Shared Postgres database with `Hfz-Pro` Teacher App & Admin Web App)  
> **Authoritative Timetable & Structure Reference:** [`docs/hifz_section_structure.md`](./hifz_section_structure.md)  
> **Database & Push Notifications Reference:** [`docs/DB_AND_NOTIFICATIONS.md`](./DB_AND_NOTIFICATIONS.md)

---

## 1. Executive Summary & Vision

The **Hfz-Parent App** (also known as *Hfz-Family*) is the official mobile application designed for parents and guardians of students enrolled in the Hifz Section at **Al Haqqaniyyah Arabic College**.

### Core Objectives:
1. **Real-Time Transparency**: Parents receive instant updates and push notifications when their child completes their daily lessons (**Sabaq**, **Sabqi**, **Manzil**), pre-reads (**Nazira**), or attendance.
2. **Personal Mushaf Visualizer**: Parents can open their child's dedicated 15-line Quran viewer to see every page, ayah, and line their child has memorized, complete with soft color-coded lesson highlights and outside margin annotations showing completion dates and Hazrat teacher names (e.g. `📅 15 Aug · Hazrat Dilhan`).
3. **Multi-Child Household Support**: Seamlessly toggle between multiple enrolled siblings from a single parent account.
4. **Official Exam Transcripts**: View verified exam results out of 100 marks with full question-by-question breakdowns, grades, class positions, and official Examiner names.
5. **Daily Madrasa Schedule Live Status**: Real-time awareness of the student's daily routine (from 3:45 AM Tahajjud/Wake-up to 9:30 PM Lights Out, Friday holidays, and Saturday half-days).
6. **Tri-Lingual Accessibility**: Full native support for **English**, **Arabic (العربية)**, and **Tamil (தமிழ்)** with automatic RTL/LTR layout switching.

---

## 2. System Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           PARENT MOBILE APP                              │
│         (React Native 0.86 + Expo 57 + Expo Router + NativeWind)         │
│  ┌──────────────────────┬──────────────────────┬──────────────────────┐  │
│  │   Home & Live Feed   │   Personal Mushaf    │   Exams & Progress   │  │
│  │  (Lessons & Schedule)│ (Highlights & Notes) │  (Transcripts/Ranks) │  │
│  └──────────────────────┴──────────────────────┴──────────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND (Shared Project)                      │
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  │
│  │  Postgres Database │  │   Row-Level (RLS)  │  │   Auth & Sessions  │  │
│  │  (Shared Schema)   │  │  (Parent-Child Link│  │  (Phone OTP/Email) │  │
│  └─────────┬──────────┘  └────────────────────┘  └────────────────────┘  │
│            │                                                             │
│            ▼ (DB Webhook on notification queue)                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Supabase Edge Function (`push`) ──► Expo Push API ──► FCM / APNs  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack:
- **Framework**: React Native 0.86 with Expo SDK 57 & Expo Router.
- **State Management & Caching**: `@tanstack/react-query` with offline persistence.
- **Storage**: `@react-native-async-storage/async-storage` for device caching and offline state.
- **Push Notifications**: `expo-notifications` relaying through Expo Push Notification Service to Firebase Cloud Messaging (FCM v1) on Android and Apple Push Notification Service (APNs) on iOS.
- **Quran Layout Engine**: 15-line Mushaf engine (`src/data/mushaf.ts`) with Arabic glyph ligature matching and segment-based highlighters.
- **Localization**: `react-i18next` with complete translation strings for `en`, `ar`, `ta`.

---

## 3. Core Features & Screen-by-Screen Specifications

---

### Screen 1: Authentication & Child Linking

#### 1.1 Login Options:
1. **Phone Number OTP Login** (Recommended for parents):
   - Parent enters their mobile number registered in the college system.
   - Receives a 6-digit SMS OTP via Supabase Auth.
   - On successful verification, the app queries `parent_students` and automatically links all children belonging to that guardian.
2. **Admission Number + PIN / Password Login**:
   - Parent enters child's Admission No (e.g., `HFZ-2101`) + Secret Access PIN provided by the administration.
3. **Add Another Child**:
   - Inside settings or from the child switcher header, parents can submit an admission number + date of birth to link additional siblings.

---

### Screen 2: Dashboard / Home Screen (`app/(tabs)/index.tsx`)

The central dashboard gives an instant, comprehensive snapshot of the active child's day.

```
┌─────────────────────────────────────────────────────────────────┐
│ 🟢 Al Haqqaniyyah Hifz · Parent Portal           🌐 En | Ar | Ta│
├─────────────────────────────────────────────────────────────────┤
│ [👦 Muhammad Bilal] ▾ (HFZ-2101 · Floor 3 · Class 3-A)          │
│ Ustadh: Ash-Sheikh Dilhan · Current: P.146 (Juz 8)              │
├─────────────────────────────────────────────────────────────────┤
│ ⏰ LIVE MADRASA TIMETABLE                                       │
│ 🟢 CURRENT PERIOD: Morning Sabaq Class (5:30 AM – 7:30 AM)      │
│ ⏳ NEXT: Breakfast Break (7:30 AM – 8:30 AM)                    │
├─────────────────────────────────────────────────────────────────┤
│ 📖 TODAY'S LESSONS (Friday, 28 Aug 2026)                        │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⚡ SABAQ (New Lesson) — PASSED ✓                            │ │
│ │ Surah Al-An'am (Ayah 1–8) · Page 146                        │ │
│ │ 📏 Lines Recited: 10 lines                                  │ │
│ │ 👁️ Nazira Pre-read: Done ✓                                  │ │
│ │ ⚠️ Mistakes: 0 · Forgets: 0                                 │ │
│ │ 💬 Hazrat Remark: "Masha'Allah fluent recitation"           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔄 SABQI (Recent Revision) — PASSED ✓                       │ │
│ │ Juz 8 · Page 141 – 146                                      │ │
│ │ Mistakes: 1 · Forgets: 0                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📚 MANZIL (Old Revision) — PASSED ✓                         │ │
│ │ Juz 30 · Mistakes: 0                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 📖 [Open Bilal's Personal Mushaf Tracker ➔]                     │
│ View 15-line Quran with highlights, dates & Hazrat notes       │
├─────────────────────────────────────────────────────────────────┤
│ 📊 MONTHLY STATS SUMMARY                                        │
│ Attendance: 98% (Present) · Pass Rate: 94% · Lessons Done: 42   │
└─────────────────────────────────────────────────────────────────┘
```

#### Key Dashboard Components:
1. **Child Switcher Header**:
   - Displays active child's photo/avatar, full name, admission number, floor, class, and assigned Ustadh.
   - Tap dropdown to immediately switch between enrolled siblings.
2. **Live Madrasa Timetable Widget**:
   - Synchronized with `src/lib/timetable.ts`.
   - Displays current period name, exact time range, progress bar, and countdown to next period.
   - **Friday Holiday Awareness**: Shows "Jumu'ah & Surah Al-Kahf recitation day" banner.
   - **Saturday Half-Day Awareness**: Shows adjusted afternoon timetable.
3. **Daily Lesson Cards (Sabaq, Sabqi, Manzil)**:
   - **Sabaq Card**:
     - Status: `Passed ✓`, `Repeat / Failed ✕`, or `Pending ⏳`.
     - Exact lines recited (e.g. `10 lines`).
     - Nazira pre-read status (`Done ✓` or `Not Done ✕`).
     - Mistakes and forgets count.
     - Teacher remark quote box.
   - **Hold Alert Banner**: If Sabqi or Manzil failed, a high-visibility amber banner alerts parents:
     *"⚠️ Today's Sabqi revision was not passed. Tomorrow's new Sabaq lesson is placed on hold until Sabqi is cleared."*
4. **Attendance Badge**:
   - `Present 🟢`, `Absent 🔴`, `On Leave 🟡`, or `Late 🟠`.
5. **Prominent Mushaf Launcher Button**:
   - Gradient hero banner: `📖 Open [Child Name]'s Mushaf Tracker`.

---

### Screen 3: Child's Personal Quran Tracker (`app/mushaf.tsx`)

Every student has an individualized Mushaf view displaying their personal memorization journey.

```
┌─────────────────────────────────────────────────────────────────┐
│ ✕ Close              📖 Bilal's Quran Tracker          [Jump ▾] │
│ Adm: HFZ-2101 · Current: Page 146 (Juz 8) · Total Pages: 146/604│
├─────────────────────────────────────────────────────────────────┤
│ [All Lessons (42)]  [Sabaq (28)]  [Sabqi (10)]  [Manzil (4)]    │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  الجزء الثامن              سُورَةُ الأنعَامِ                │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ ﷽                                                           │ │
│ │ الْحَمْدُ لِلَّهِ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ...۝١   │ │
│ │ وَهُوَ اللَّهُ فِي السَّمَاوَاتِ وَفِي الْأَرْضِ...۝٣             │ │
│ │ وَمَا تَأْتِيهِم مِّنْ آيَةٍ مِّنْ آيَاتِ رَبِّهِمْ...۝٤       │ │
│ │ فَقَدْ كَذَّبُوا بِالْحَقِّ لَمَّا جَاءَهُمْ...۝٥                │ │
│ │ أَلَمْ يَرَوْا كَمْ أَهْلَكْنَا مِن قَبْلِهِم...۝٦           │ │
│ │                                  [📅 15 Aug · Hazrat Dilhan]│ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │                             ١٤٦                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ [◀ Previous Page]            Page 146 of 604        [Next Page ▶]│
└─────────────────────────────────────────────────────────────────┘
```

#### Quran Tracker Highlights & Annotations:
1. **Color-Coded Recitation Highlights**:
   - **Sabaq (New Lesson)**: Soft amber gold (`#FEF08A` background with `#78350F` dark text).
   - **Sabqi (Recent Revision)**: Soft lavender purple (`#EDE9FE` background with `#5B21B6` dark text).
   - **Manzil (Old Revision)**: Soft mint emerald (`#D1FAE5` background with `#065F46` dark text).
2. **Hazrat Margin Annotation Pills**:
   - At the exact line where each past lesson was completed (e.g. line 6, line 10, or line 15), an outside margin pill is pinned displaying:
     `📅 {Day Month} · {Hazrat Name}` (e.g., `📅 15 Aug · Hazrat Dilhan`).
3. **Interactive Lesson Record Modal**:
   - Tapping any margin pill or highlighted text opens a bottom sheet showing:
     - 👳 **Hazrat (Teacher)**: `Hazrat Dilhan`
     - 📅 **Recitation Date**: `15 Aug 2026`
     - 📖 **Lesson Type**: `SABAQ (New Lesson)`
     - 📏 **Exact Lines**: `10 lines (Lines 1–10)`
     - 🎯 **Result**: `Passed ✓`
     - 👁️ **Nazira Pre-read**: `Done / Correct ✓`
     - ⚠️ **Mistakes & Forgets**: `0 mistakes · 0 forgets`
     - 💬 **Teacher Remarks**: `"Masha'Allah fluent recitation"`
4. **Fast Navigation & Jump Tools**:
   - Backward & forward page navigation through all 604 pages.
   - Quick Jump modal: Jump directly to child's active page, any Juz (1–30), or any Surah (1–114).
   - Filter pills: Toggle visibility of Sabaq, Sabqi, or Manzil highlights.

---

### Screen 4: Recitation History & Progress Heatmap (`app/(tabs)/history.tsx`)

Detailed log of all past lessons and attendance records.

#### Components:
1. **30-Day Activity Heatmap Grid**:
   - Green cell: All lessons passed on that day.
   - Red cell: One or more lessons required repeat / failed.
   - Gray cell: Weekend / Friday holiday / No classes.
2. **Historical Lesson Feed**:
   - Filterable by `All`, `Sabaq`, `Sabqi`, `Manzil`.
   - Each card displays:
     - Date, Surah, Ayah range, and Page number.
     - Lines recited badge.
     - Result chip (`Pass` / `Fail`).
     - Mistakes and forgets counters.
     - Teacher remark quote box.
3. **Monthly Attendance Breakdown**:
   - Total present days, absent days, and approved leave days.

---

### Screen 5: Exam Transcripts & Results (`app/(tabs)/exams.tsx`)

Official examination transcripts published by the Madrasa Examination Committee.

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏆 EXAM TRANSCRIPTS & RESULTS                                   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 10-JUZ MILESTONE EXAMINATION (August 2026)                  │ │
│ │ 👳 Examiner: Ash-Sheikh Dilhan · Date: 15 Aug 2026          │ │
│ │                                                             │ │
│ │ Question Breakdown:                                         │ │
│ │ • Q1: 10/10   • Q2: 10/10   • Q3: 10/10   • Q4: 10/10       │ │
│ │ • Q5: 10/10   • Q6: 6/10    • Tajweed: 23/25 • Tarteel: 14/15│ │
│ │                                                             │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ TOTAL SCORE: 93 / 100        GRADE: A+        RANK: #1 in Class │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Exam Details Displayed:
- Exam Title (e.g. *5-Juz Milestone Exam*, *Monthly Exam*, *Annual Year-End Exam*).
- **Official Examiner Name** (resolved from `examiner_name` or `teachers` table).
- Total Score out of 100.
- Letter Grade (`A+`, `A`, `B`, `C`, `Fail`).
- Rank / Position in Class (e.g. `#1 in Class`).
- 8-Component Breakdown:
  - 6 Quran Recall Questions (10 marks each = 60 marks).
  - Tajweed Rules & Makharij (25 marks).
  - Tarteel & Fluency (15 marks).

---

### Screen 6: Announcements & Notices (`app/(tabs)/announcements.tsx`)

Madrasa communications, exam date schedules, holiday calendars, and administrative circulars.
- Filter by: `General Announcements`, `Exam Schedules`, `Holidays & Breaks`.
- Unread indicator badge on the app icon and bottom navigation bar.

---

### Screen 7: Settings & Family Management (`app/(tabs)/settings.tsx`)

- **Family Profile**: View linked children and guardian information.
- **Add Child Request**: Enter child admission number and birthday to link sibling.
- **Language Switcher**: Toggle between **English**, **العربية**, and **தமிழ்**.
- **Push Notification Preferences**:
  - `Daily Sabaq / Lesson Alerts` (Immediate push when teacher records lesson).
  - `Attendance Alerts` (Immediate push if child is marked absent).
  - `Exam Results Published`.
  - `Madrasa Announcements`.
- **Madrasa Contact & Ustadh Info**: Direct contact information for class teachers and Madrasa administration.

---

## 4. Push Notification Architecture & Payload Specification

Push notifications are powered by the Supabase database trigger `notify_parents_on_entry` combined with an Edge Function dispatching to the Expo Push Service.

### 4.1 Notification Event Types:

| Event Code | Trigger | Notification Title | Notification Body |
|---|---|---|---|
| `sabaq_pass` | Teacher saves Sabaq with result `pass` | `📖 Sabaq Passed ✓` | `{ChildName} passed today's Sabaq ({lines} lines) in Surah {SurahName}.` |
| `sabaq_fail` | Teacher saves Sabaq with result `fail` | `⚠️ Sabaq Repeat` | `{ChildName}'s Sabaq will be repeated tomorrow ({mistakes} mistakes).` |
| `hold_active` | Sabqi/Manzil failed or Nazira missed | `⛔ Sabaq on Hold` | `Tomorrow's new Sabaq is on hold due to Sabqi revision.` |
| `absent` | Attendance recorded as `absent` | `🚨 Attendance Alert` | `{ChildName} was marked ABSENT today.` |
| `exam_publish` | Exam results set to `published` | `🏆 Exam Results Published` | `{ChildName} scored {total}/100 (Grade {grade}) in {ExamName}.` |
| `announcement` | New announcement for parents | `📢 Madrasa Notice` | `{AnnouncementTitle}` |

### 4.2 Standard Push Payload (JSON):

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "📖 Sabaq Passed ✓",
  "body": "Muhammad Bilal passed today's Sabaq (10 lines) in Surah Al-An'am.",
  "sound": "default",
  "priority": "high",
  "badge": 1,
  "data": {
    "student_id": "s1",
    "entry_id": "e-s1-2026-08-28-sabaq",
    "type": "daily_entry",
    "url": "/mushaf?studentId=s1&page=146"
  }
}
```

---

## 5. Security & Row-Level Security (RLS) Policies

Parents must only ever access records belonging to their linked children.

### 5.1 RLS Setup in Postgres (`supabase/schema.sql`):

```sql
-- Helper function to check if auth.uid() is the parent of a student
CREATE OR REPLACE FUNCTION is_parent_of(student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parent_students
    WHERE parent_id = auth.uid()
      AND student_id = student_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Students Table RLS for Parents
CREATE POLICY "Parents view own children" ON students
  FOR SELECT
  USING (is_parent_of(id));

-- 2. Daily Entries Table RLS for Parents
CREATE POLICY "Parents view own children entries" ON daily_entries
  FOR SELECT
  USING (is_parent_of(student_id));

-- 3. Attendance Table RLS for Parents
CREATE POLICY "Parents view own children attendance" ON attendance
  FOR SELECT
  USING (is_parent_of(student_id));

-- 4. Exam Results Table RLS for Parents (Only Published Exams)
CREATE POLICY "Parents view published exam results" ON exam_results
  FOR SELECT
  USING (
    is_parent_of(student_id)
    AND EXISTS (
      SELECT 1 FROM exams
      WHERE exams.id = exam_results.exam_id
        AND exams.status = 'published'
    )
  );
```

---

## 6. Directory Structure & File Map for `Hfz-Parent`

The Parent App repository will mirror the clean architecture established in `Hfz-Pro`:

```
hfz-parent/
├── app/
│   ├── _layout.tsx                 # Root layout, QueryClient, Toast, Auth Provider
│   ├── (auth)/
│   │   ├── login.tsx               # Phone OTP / Admission No login
│   │   └── verify-otp.tsx          # 6-digit SMS OTP verification
│   ├── (tabs)/
│   │   ├── _layout.tsx             # Bottom tab bar (Home, Mushaf, History, Exams, More)
│   │   ├── index.tsx               # Main Dashboard with child switcher, lessons & timetable
│   │   ├── history.tsx             # 30-day heatmap & categorized lesson history
│   │   ├── exams.tsx               # Official exam transcripts with examiner names
│   │   ├── announcements.tsx       # Madrasa notices & circulars
│   │   └── settings.tsx            # Multi-child management, language & notifications
│   ├── mushaf.tsx                  # Fullscreen Student Personal Quran Tracker & Inspector
│   └── student/[id].tsx            # Child Profile detail & progress view
├── src/
│   ├── components/
│   │   ├── QuranPageReader.tsx     # 15-line Mushaf engine with highlights & Hazrat margin pills
│   │   ├── LiveScheduleCard.tsx    # Live Madrasa period widget (Sun-Thu, Fri, Sat)
│   │   ├── ChildSwitcherModal.tsx  # Quick sibling selector modal
│   │   ├── LessonDetailModal.tsx   # Tap-to-inspect lesson details modal
│   │   └── ExamResultCard.tsx      # 100-mark transcript card with examiner badge
│   ├── data/
│   │   ├── mushaf.ts               # 604-page 15-line Quran dataset & layout builder
│   │   ├── surahs.ts               # 114 Surahs catalog with Arabic/English names
│   │   ├── datasource.ts           # Unified data interface (Supabase + Mock fallback)
│   │   └── mock.ts                 # Demo dataset for offline exploration
│   ├── lib/
│   │   ├── timetable.ts            # Madrasa timetable engine with live period resolver
│   │   ├── hijri.ts                # Gregorian to Hijri converter & date formatters
│   │   ├── score.ts                # Quran progress calculations
│   │   └── notifications.ts        # Expo push token registration & listener
│   ├── i18n/
│   │   ├── en.json                 # English translations
│   │   ├── ar.json                 # Arabic translations (العربية)
│   │   └── ta.json                 # Tamil translations (தமிழ்)
│   └── theme/
│       └── tokens.ts               # Shared colors, gradients, typography, and shadows
├── app.json                        # Expo app configuration (bundle ID, push plugins)
└── package.json
```

---

## 7. Shared Business Logic & Code Reusability

The following core modules are **100% reusable** directly from `AHMED1397/Hfz-Pro`:
1. `src/data/mushaf.ts`: Complete 604-page 15-line Quran page-by-page and line-by-line dataset.
2. `src/data/surahs.ts`: Full catalog of 114 Surahs with page ranges, ayah counts, and names.
3. `src/lib/timetable.ts`: Madrasa timetable engine supporting all daily periods, Friday off / Kahf day, and Saturday half-days.
4. `src/lib/hijri.ts`: Hijri calendar conversion and date formatting.
5. `src/theme/tokens.ts`: Unified design system tokens (primary blues, amber highlights, emerald passes, crimson fails).
6. `src/components/QuranPageReader.tsx`: The Quran page rendering component with multi-colored highlights and Hazrat margin annotation pills.

---

## 8. Rollout & Next Steps

1. **Phase 1: Project Initialization**:
   - Initialize the Expo app with `npx create-expo-app hfz-parent --template tabs`.
   - Copy over the shared `src/data/`, `src/lib/`, `src/theme/`, and `src/i18n/` directories.
2. **Phase 2: Authentication & Child Switcher**:
   - Implement Phone OTP authentication with Supabase Auth.
   - Build the Child Switcher header and sibling selector modal.
3. **Phase 3: Dashboard & Live Timetable**:
   - Build the Home dashboard showing live lesson cards, Nazira status, and the current Madrasa period widget.
4. **Phase 4: Personal Quran Tracker**:
   - Embed `QuranPageReader` with color-coded Sabaq, Sabqi, and Manzil highlights, plus Hazrat margin notes.
5. **Phase 5: Push Notifications**:
   - Configure FCM v1 and APNs in Expo EAS.
   - Deploy Supabase Edge Function to dispatch live push notifications on lesson submissions.
