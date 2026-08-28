# Hfz-Parent — Al Haqqaniyyah Hifz Section Parent App

Mobile app for **parents and guardians** of students in the Hifz Section of
**Al Haqqaniyyah Arabic College** (Kandy, Sri Lanka). React Native + Expo SDK 57,
sharing one Supabase Postgres backend with the Teacher app (`Hfz-Pro`) and the
Admin web app (`Hfz-Admin`).

Parents get: daily **Sabaq / Sabqi / Manzil** results with the ustadh's remark, the
**hold rule** explained in plain language, a personal **15-line Mushaf tracker**
with colour-coded lessons and Hazrat margin notes, **100-mark exam transcripts**,
attendance, madrasa announcements, a **live timetable**, and **push alerts** — in
**English, العربية and தமிழ்**.

---

## Specification

The app is built from the five documents in [`docs/`](./docs):

| Document | What it is |
|---|---|
| [`PARENT_APP_SPEC.md`](./docs/PARENT_APP_SPEC.md) | **The spec being implemented** — 7 screens, push payloads, RLS, file map |
| [`hifz_section_structure.md`](./docs/hifz_section_structure.md) | Domain master reference — divisions, 3-lesson day, hold rule, exams |
| [`DB_AND_NOTIFICATIONS.md`](./docs/DB_AND_NOTIFICATIONS.md) | Supabase sizing, schema summary, push architecture |
| [`CONNECT_SUPABASE.md`](./docs/CONNECT_SUPABASE.md) | How the Teacher app is wired to Supabase today |
| [`ADMIN_WEBAPP_SPEC.md`](./docs/ADMIN_WEBAPP_SPEC.md) | Admin spec — holds the **authoritative SQL schema** (18 tables) |
| [`HAQQANIYYAH_HIFZ_STRUCTURE_FULL.md`](./docs/HAQQANIYYAH_HIFZ_STRUCTURE_FULL.md) | Authoritative source doc; §3.4 is the real daily timetable |

**Read [`docs/PARENT_APP_PLAN.md`](./docs/PARENT_APP_PLAN.md) first.** It records what the
spec claims, what was actually found in the recovered Teacher app source, and the
ten gaps between them.

---

## Run it

```bash
npm install
npm start            # Expo dev server — press w for web, a for Android
```

**No configuration needed.** Without a `.env` the app runs entirely on the demo
family in `src/data/mock.ts` — two children, 30 days of lessons, exams and
notices — so every screen works offline.

To point at Supabase, copy [`.env.example`](./.env.example) to `.env` and fill in
the URL + key. ⚠️ The project must be on the **UUID schema**
(`supabase/schema.sql`) with `parent_students` populated — not the legacy
`setup_schema.sql` the Teacher app currently uses. See gap **G4**.

### Checks

```bash
npm run typecheck    # tsc --noEmit
npm run smoke        # executes the domain logic — 61 assertions
```

`npm run smoke` runs the real modules under Node (not re-implementations):
the timetable engine, the Hold Rule, the mock ledger's invariants, the
lazily-loaded 1.85 MB mushaf asset, the shared scoring helpers, and the
heatmap calendar's week-column alignment.

---

## What is built

```
app/
├── index.tsx                    entry gate (session check, or straight to demo)
├── (auth)/login.tsx             Screen 1 — password + SMS OTP sign-in
├── (tabs)/
│   ├── index.tsx                Screen 2 — dashboard: child switcher, live
│   │                            timetable, 3 lesson cards, hold banner,
│   │                            attendance badge, Mushaf launcher, stats
│   ├── history.tsx              Screen 4 — 30-day heatmap, lesson feed, attendance
│   ├── exams.tsx                Screen 5 — 100-mark transcripts
│   ├── announcements.tsx        Screen 6 — notices
│   └── settings.tsx             Screen 7 — family, language, push prefs
├── mushaf.tsx                   Screen 3 — fullscreen Personal Quran Tracker
└── student/[id].tsx             child profile
src/
├── components/                  MushafTracker · LiveScheduleCard · LessonCard ·
│                                LessonDetailModal · ChildSwitcherModal ·
│                                ExamResultCard + reused Card/StatusChip/…
├── data/                        types · mock · datasource · supabase(+config) ·
│                                mushaf · surahs
├── lib/                         timetable · hijri · score · notifications
├── i18n/                        en · ar · ta + parent strings
├── theme/tokens.ts              shared design system
└── context/AppProviders.tsx     children, active child, language, prefs
supabase/
├── schema.sql                   UUID schema, RLS on auth.uid(), notify trigger
├── seed.sql                     roster + catalog seed
└── functions/push/index.ts      Expo Push dispatcher
```

### Reused from the Teacher app (verified present, not assumed)
`src/data/mushaf.ts`, `assets/quran_indopak15_pages.json` (1.85 MB), `src/data/surahs.ts`,
`src/lib/hijri.ts`, `src/lib/score.ts`, `src/theme/tokens.ts`, `src/i18n/{en,ar,ta}.json`,
`Card`, `StatusChip`, `ProgressRing`, `Skeleton`, `EmptyState`, `FilterChips`,
`GradientHeader`, `Button`, `Toast`, `supabase/schema.sql`, `supabase/functions/push`.

### Written new for this app
`src/lib/timetable.ts` (the spec said to reuse it — it does not exist upstream, gap **G1**),
`src/components/MushafTracker.tsx` (gap **G8**), `src/lib/notifications.ts` (gap **G2**),
`src/components/ActivityHeatmap.tsx` + `src/lib/heatmap.ts` (gap **G10**),
the parent data layer (`types`, `mock`, `datasource`, `supabase`, `supabaseConfig`),
`AppProviders`, and all seven screens.

---

## Known gaps and honest status

The full list with evidence is in `docs/PARENT_APP_PLAN.md` §0.3. The three that
change behaviour today:

- **G4 — the backend is not parent-ready (blocking for live data).** The deployed
  project runs the legacy short-id schema with permissive RLS and no Supabase
  Auth, so it has no `parents` / `parent_students` tables. Until it is migrated
  to `supabase/schema.sql`, the app runs on demo data.
- **G5 — SMS OTP needs a paid SMS provider**, so password sign-in is the default path.
- **G8 — `QuranPageReader.tsx` is a teacher range-selector, not a viewer.** The
  read-only annotated tracker is `src/components/MushafTracker.tsx`.
- **G10 — no usable React Native heatmap library.** All three npm candidates
  were installed and inspected; the best one throws a `ReferenceError` on first
  render and depends on `defaultProps` (removed in React 19). The history
  heatmap is drawn with `react-native-svg` instead — see the plan for the
  evidence.

**Not built yet:** real auth gating behind Supabase Auth (Phase 6), push delivery
end-to-end (Phase 7 — needs the Edge Function deployed, `EXPO_ACCESS_TOKEN` set,
and the Database Webhook created), PDF report cards, iOS release.

---

## Screens to expect on demo data

- **Dashboard** — Muhammad Bilal (HFZ-2101, Floor 3 · Class 3-A), Ustadh
  Ash-Sheikh Dilhan, current page 146 (Juz 8). Sibling **Abdullah Rahman** is on
  hold because his Sabqi failed, which drives the amber hold banner.
- **Mushaf** — page 146 renders real IndoPak 15-line Arabic with Sabaq/Sabqi/Manzil
  highlights and `📅 15 Aug · Hazrat Dilhan` margin pills.
- **Exams** — 10-Juz Milestone: 6 questions + Tajweed 23/25 + Tarteel 14/15 =
  **93/100, A+, rank #1/24**, examiner Ash-Sheikh Dilhan.
