# Hfz-Parent — Build Plan

> **Repo:** `AHMED1397/Hifz-Pro-Parents`
> **Product:** Parent Mobile App for the Hifz Section of Al Haqqaniyyah Arabic College
> **Plan version:** 1.0 · **Date:** 2026-08-28
> **Sources:** the 5 spec docs in `docs/` (see below) + the recovered `Hfz-Pro` Teacher App source.

---

## 0. What this plan is based on (all verified, not assumed)

### 0.1 The five specification documents

All five are now saved in this repo under `docs/`:

| File | Bytes | Role |
|---|---|---|
| `hifz_section_structure.md` | 3,519 | Master domain reference — 4 divisions, 3-lesson day, hold rule, nazira, exams |
| `PARENT_APP_SPEC.md` | 29,386 | **The spec we are building to** — 7 screens, push spec, RLS, file map |
| `DB_AND_NOTIFICATIONS.md` | 8,095 | Supabase free-tier sizing, schema summary, push architecture |
| `CONNECT_SUPABASE.md` | 2,273 | How the Teacher app is currently wired to Supabase |
| `ADMIN_WEBAPP_SPEC.md` | 92,327 | Admin app spec — contains the **authoritative SQL schema** (18 tables) |

Plus one extra recovered for the timetable (see §0.3):
`HAQQANIYYAH_HIFZ_STRUCTURE_FULL.md` — the authoritative source doc that
`hifz_section_structure.md` points at (gist `fc6b0063…`).

### 0.2 The Teacher App source was recovered

`AHMED1397/Hifz-Pro-Admin` contains only `teacher-app.rar` (5.3 MB, RAR5). It was
extracted: **129 entries → 97 files + 32 directories**. It is the real `Hfz-Pro`
Expo app, which is what `PARENT_APP_SPEC.md` §7 tells us to reuse.

**Verified reusable assets (exist, with real content):**

| Module | Lines | Notes |
|---|---|---|
| `src/data/mushaf.ts` | 349 | Lazy 15-line mushaf engine, page↔surah↔juz index, Arabic numerals |
| `assets/quran_indopak15_pages.json` | **1,856,561 B** | The actual line-by-line Arabic text `mushaf.ts` lazy-loads |
| `assets/quran_uthmani15_pages.json` | 1,802,411 B | Uthmani script variant (not needed for v1) |
| `src/data/surahs.ts` | 119 | 114-surah catalog (ar/en/ta, ayah count, juz, page) |
| `src/components/QuranPageReader.tsx` | 433 | Page renderer with multi-colour highlight segments |
| `src/lib/hijri.ts` | 145 | Date formatting, ISO helpers, week/month bounds |
| `src/lib/score.ts` | — | `calculateQuranProgress`, `getGradeFromTotal`, `calculateExamTotal`, days-behind |
| `src/theme/tokens.ts` | 146 | Brand `#1E5FE0` blue + `#C9973F` gold, gradients, spacing, elevation |
| `src/i18n/{en,ar,ta}.json` | — | Existing trilingual dictionaries |
| `src/components/*` | 18 files | Card, StatusChip, ProgressRing, Skeleton, EmptyState, Toast, bottom-sheet, WheelPicker… |
| `supabase/schema.sql` | 540 | **UUID schema + `parents`, `parent_students`, RLS on `auth.uid()`, `notify_parents_on_entry()`** |
| `supabase/functions/push/index.ts` | — | Expo Push dispatcher Edge Function |

**Verified stack** (`teacher-app/package.json`): Expo `~57.0.17`, React Native `0.86.2`,
React `19.2.3`, expo-router `~57.0.16`, NativeWind `^4.2.6` + Tailwind `^3.4`,
`@tanstack/react-query ^5.101.4`, `@supabase/supabase-js ^2.112.3`, `i18next ^26` /
`react-i18next ^17`, TypeScript `~6.0.3`. This matches `PARENT_APP_SPEC.md` §2 exactly.

### 0.3 Gaps found between the spec and reality

These are the things the spec claims that **do not hold**, and how the plan handles them.

| # | Spec claim | Reality (verified) | Plan |
|---|---|---|---|
| **G1** | §7: `src/lib/timetable.ts` is "100% reusable directly from `Hfz-Pro`" | **The file does not exist.** `find` over the whole Teacher App returns nothing, and `grep -rni "timetable\|tahajjud\|kahf"` matches only one line inside `docs/`. | **Write it from scratch.** Timetable data recovered from the authoritative structure doc (§3.4 Daily Timetable) — see §0.4. |
| **G2** | §7: `src/lib/notifications.ts` | Not present (Teacher app has no push client). | New module; `expo-notifications` is **absent** from the Teacher `package.json` and must be added. |
| **G3** | §5.1 RLS: `WHERE exams.status = 'published'` | The real column is **`exams.published boolean`** (`schema.sql` uses `e.published = true`). The spec snippet would fail to run. | Use the column that exists. `supabase/schema.sql` already has the correct parent policies — reuse it as-is. |
| **G4** | Backend: "Shared Postgres database with `Hfz-Pro`" | The **deployed** project (`uakfztuuncatxmlyhpst`) runs the **legacy** `setup_schema.sql`: short string ids (`t1`,`c1`,`s5`,`e10`), permissive RLS, **no Supabase Auth** (teacher dropdown + shared password). It has **no `parents` / `parent_students` tables**, so a parent cannot be scoped to their child. | **Blocking.** Phase 0 migrates the shared project to `schema.sql` (UUID + `auth.uid()` + `parent_students`) or stands up a second project. Until then the app runs on the mock datasource. |
| **G5** | §3 Screen 1: Phone OTP login | SMS OTP needs a paid SMS provider on Supabase Auth (Twilio/MessageBird). | Ship **Admission No + PIN** first (works today, matches how the college already issues access), keep OTP as a flag-gated upgrade. |
| **G6** | §7: `mushaf.ts` is a "complete 604-page dataset" | It is a **lazy loader**; the data lives in the 1.85 MB JSON asset, and without it you get page/juz/surah index only — **no Arabic lines**. | Ship the IndoPak asset with the app (it is a required runtime asset, not a build artifact). |
| **G7** | §1/§2: "Full native support for English, Arabic and Tamil" | The reused `src/i18n/index.ts` registers **only `en`** — `ar.json` and `ta.json` are shipped but never loaded, so Arabic and Tamil could never render. | Rewritten `src/i18n/index.ts`: all three merged, plus `changeLanguage()` that flips `I18nManager` RTL. Parent-only copy lives in `src/i18n/parentStrings.ts`. |
| **G8** | §7: `QuranPageReader.tsx` is "the Quran page rendering component with multi-colored highlights and Hazrat margin annotation pills" | It is a **range selector**, not a viewer: its props are `{visible, onClose, initialPage, onConfirm(selection)}` and it exists so a teacher can pick a portion to record. | Wrote `src/components/MushafTracker.tsx` — read-only page renderer with per-lesson highlights, margin pills, tap-to-inspect, and page/Juz/Surah jump — on the same `mushaf.ts` data layer. The two teacher-entry components (`QuranPageReader`, `SurahPickerSheet`) were **not** carried over. |
| **G9** | — (not mentioned in the spec) | `mushaf.ts` probes **`assets/quran_uthmani15_pages.json` first**, then IndoPak. The parent app ships one script only, and a static `require` of a file missing from the bundle is a **Metro build error**, not a catchable runtime one. | Reduced `loadFile()` to the IndoPak asset only; the lazy `require` is kept so the 1.85 MB JSON never parses at startup. |
| **G10** | §3 Screen 4: "30-Day Activity Heatmap Grid" | No usable React Native heatmap library exists for this stack. All three npm candidates were installed and inspected: **`react-native-calendar-heatmap`** throws `ReferenceError: getValueCache is not defined` on first render (proved by executing its unmodified source with the UI layer stubbed) and relies on `defaultProps` on a function component, which React 19 removed; **`react-native-heatmap`** pins `react-native-svg ^6.3.1` against this app's 15.15.4; **`react-native-heatmap-chart`** peer-depends on `react-native ^0.41.2`. `react-native-gifted-charts@1.4.78` — the obvious choice, and already used by the Teacher app — has **no HeatMap** at all (its charts are Bar/Bubble/CandleStick/Line/Pie/PiePro/PopulationPyramid/Radar). The well-known heatmaps (`react-calendar-heatmap`, `heatmap-calendar-react`, `shadcn-heatmap`) are web-only: they need CSS classes and the DOM. | Built `src/components/ActivityHeatmap.tsx` on `react-native-svg` (already a dependency — and what those libraries render with anyway). Pure calendar logic lives in `src/lib/heatmap.ts` so it is covered by `npm run smoke`. |

### 0.4 The real timetable (recovered — feeds G1)

From `HAQQANIYYAH_HIFZ_STRUCTURE_FULL.md` §3.4, the live-period engine must model:

- **3:45 AM** wake → **4:50/5:00** tea → **Fajr** → **5:30–7:30** morning class (Sabaq heard,
  some ustadhs ~9:00) → **7:30–8:30** breakfast → **8:30–10:30** class (Sabq then Manzil) →
  **10:30** tea → **10:45–11:30** class → **11:30–12:30** Qailulah → **12:30** lunch + Zuhr →
  **1:25–4:45 PM** school section → **4:45–5:45** Asar → **5:45–Maghrib** Nazira/Mashk →
  **Maghrib–7:45** lesson → **7:45** dinner + Isha + Taleem → after-Isha lesson → **9:30 PM** sleep.
- **Weekly:** Sun–Thu full · **Friday off** (Surah Al-Kahf + Jumu'ah) · **Saturday half-day**
  (lessons from 11:30, no school section).

---

## 1. Scope for v1

**In:** the 7 screens of `PARENT_APP_SPEC.md`, trilingual UI, mock-first data layer,
read-only Supabase client, push token registration, live timetable.

**Out (v2+):** SMS OTP, PDF report cards, in-app messaging with the ustadh, iOS store release.

### Non-negotiables
1. **Read-only for parents.** No writes except `device_tokens`, notification read-state, and the "add child" request.
2. **RLS is the security boundary** — the client must never be trusted to filter by `student_id`.
3. **Offline-first:** React Query + AsyncStorage cache; every screen renders from cache when the network is down.
4. **Mock fallback:** with no `.env` keys the app must run fully on `src/data/mock.ts` (the Teacher app's proven pattern).

---

## 2. Architecture

```
app/  (expo-router routes — thin screens only)
 └─ src/
     ├─ data/      datasource.ts (interface) ├─ supabase.ts (live) └─ mock.ts (offline)
     ├─ lib/       timetable.ts · hijri.ts · score.ts · notifications.ts
     ├─ components/ QuranPageReader · LiveScheduleCard · ChildSwitcherModal · LessonDetailModal · ExamResultCard
     ├─ i18n/      en · ar · ta  (+ RTL switching)
     └─ theme/     tokens.ts
supabase/  schema.sql (UUID + RLS) · functions/push/index.ts
```

**Data flow:** `useQuery` hook → `datasource.ts` → Supabase **or** mock → screen.
Screens never import `supabase` directly.

**Child context:** one `ActiveChildProvider` at the root holds `activeChildId` +
`children[]`; every query is keyed on it, so the sibling switcher is a one-line
`setActiveChildId` and all screens re-fetch consistently.

---

## 3. Phases

### Phase 0 — Backend unblock (the real critical path)
- [ ] Decide: migrate `uakfztuuncatxmlyhpst` to `schema.sql`, or new project.
- [ ] Run `supabase/schema.sql` (UUID schema, 18 tables, RLS, `notify_parents_on_entry`).
- [ ] Migrate legacy `t1/c1/s5/e10` ids → UUIDs using the `legacy_id` columns the schema already carries.
- [ ] Create parent auth users; populate `parents` + `parent_students`.
- [ ] Swap permissive policies for the `auth.uid()` policies.
- [ ] Re-seed `surahs` 1–114 from `src/data/surahs.ts`.
- **Exit:** a parent JWT can `select` its own child's `students`, `daily_entries`, `attendance`, and only **published** `exam_results`. Verify with an explicit negative test (parent B must see nothing of parent A's child).

### Phase 1 — Scaffold + shared core *(started — see §4)*
- [x] Expo 57 / expo-router / NativeWind / react-query / i18next project shell
- [x] Copy verified reusable modules (mushaf + asset, surahs, hijri, score, tokens, QuranPageReader, components, i18n)
- [x] `src/lib/timetable.ts` authored from the real schedule (G1)
- [x] Parent `datasource.ts` + `mock.ts` (2 children, 30 days of entries, exams, announcements)
- [x] Root layout, tab bar, `ActiveChildProvider`
- **Exit:** `tsc --noEmit` clean; app boots to the dashboard on mock data.

### Phase 2 — Dashboard (Screen 2)
Child switcher header · live timetable widget · Sabaq/Sabqi/Manzil cards ·
**hold banner** (derived: `sabqi`/`manzil` fail ⇒ tomorrow's Sabaq blocked) ·
attendance badge · monthly stats · Mushaf launcher.
- **Exit:** a failed Sabqi in the mock shows the amber hold banner.

### Phase 3 — Personal Mushaf Tracker (Screen 3)
`QuranPageReader` + 3 highlight colours (Sabaq `#FEF08A`/`#78350F`, Sabqi `#EDE9FE`/`#5B21B6`,
Manzil `#D1FAE5`/`#065F46`) · Hazrat margin pills `📅 15 Aug · Hazrat Dilhan` ·
tap-to-inspect bottom sheet · page/Juz/Surah jump · filter pills.
- **Exit:** opening page 146 renders real IndoPak lines with highlights and margin pills.

### Phase 4 — History (Screen 4) + Exams (Screen 5)
30-day heatmap (green all-pass / red any-fail / grey Friday-off) · filterable lesson feed ·
attendance breakdown · 100-mark transcript with 6×10 + Tajweed 25 + Tarteel 15, grade, class rank, examiner.
- **Exit:** grade computed by the shared `getGradeFromTotal`, never re-implemented.

### Phase 5 — Announcements (Screen 6) + Settings (Screen 7)
Audience filtering (`everyone`/`all_parents`/floor/class) · unread badges ·
language switcher with RTL · 4 push preference toggles · add-child request.

### Phase 6 — Auth + real data
Admission No + PIN first (G5) → `parent_students` lookup → children list.
Then Phone OTP behind a feature flag.

### Phase 7 — Push
`expo-notifications` + token upsert into `device_tokens` → deploy `supabase/functions/push`
→ set `EXPO_ACCESS_TOKEN` → Database Webhook on `notifications` INSERT.
Event types per `PARENT_APP_SPEC.md` §4.1: `sabaq_pass`, `sabaq_fail`, `hold_active`,
`absent`, `exam_publish`, `announcement`.
- **Exit:** teacher saves an entry → parent phone rings.

---

## 4. Status of Phase 1 in this repo — and how it was verified

Scaffolded, type-checked, and executed.

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` (`tsc --noEmit`) | **exit 0**, no errors |
| Domain logic | `npm run smoke` (`tsx scripts/smoke-check.cts`) | **61/61 assertions pass** |
| Metro bundle (web) | `npx expo start --web` | **Web Bundled 23265ms — `expo-router/entry.js` (1723 modules)**, no unresolved modules |

The smoke check **imports and runs the shipped modules**, not copies:

- `src/lib/timetable.ts` (new, G1) — Friday/Saturday/full-day classification, the
  05:30–07:30 Sabaq block, Saturday off until 11:30, `getLivePeriod()` at 06:00
  resolving to `morning_class` with progress 0.25 and `next = breakfast`, and
  graceful resolution before the 03:45 start.
- `holdStateFor()` — a child with a failed **Sabqi** is on hold with
  `lessonType: 'sabqi'`; a child who passed everything is not.
- `src/data/mock.ts` invariants — 150 ledger rows, **no entries on a Friday**,
  uniqueness on `(student, date, type)`, Nazira present on every Sabaq row,
  exam totals equal to the sum of their component marks.
- `assets/quran_indopak15_pages.json` via `mushaf.ts` — `hasMushafFile()` true,
  **page 146 → 15 lines, juz 8, 5 ayahs with Arabic text** (matches the spec's
  own worked example).
- `src/lib/score.ts` — `calculateQuranProgress(146)` = 24%; grade boundaries
  93→A+, 88→A, 62→C, 55→D.
- `src/lib/heatmap.ts` (new, G10) — 30 cells for a fixed Friday `today`; every
  Friday cell is `friday` even where entries exist; mixed days are `partial`,
  not `pass`; `toWeeks()` yields 5 columns × 7 slots with leading blanks equal
  to the first day's weekday, **every real cell on the row matching its own
  weekday**, Fridays on row 5, and no cell lost.

Three real bugs were found **by running** this and then fixed:

1. The demo hold depended on *today* being a teaching day, so on a Friday the
   second child silently had no failed Sabqi and the hold banner vanished.
   `buildEntries()` now pins the failure to the most recent non-Friday.
2. `mushaf.ts` required the unshipped Uthmani asset first (G9).
3. A `Pressable` was wrapped around a heatmap `<Rect>`; a react-native `View`
   cannot be a child of `<Svg>`. Moved to the `onPress` prop that
   react-native-svg shapes accept (confirmed by its type declarations).

**Not yet verified:** on-device behaviour (Android/iOS), push delivery
end-to-end, and live Supabase reads — all three need the Phase 0 backend
migration and an Expo build, which cannot be done from here.

## 5. Deliberate deviations from the spec

| Spec says | Built as | Why |
|---|---|---|
| §6 tab bar: "Home, **Mushaf**, History, Exams, More" | Mushaf is a **fullscreen modal** (`app/mushaf.tsx`) opened from the dashboard launcher; tabs are Home · History · Exams · Announcements · More | The spec's own file map puts `mushaf.tsx` at the router root, and Screen 3 is specified as fullscreen with a close button. Both can't hold; the file map + Screen 3 won. |
| §3 Screen 1: Phone OTP "recommended" | Password sign-in is the default; OTP sits behind a second tab | SMS OTP needs a paid provider on Supabase Auth (G5). |
| §7: reuse `QuranPageReader` | Wrote `MushafTracker` | G8 — the reused component is a selector. |
| `CONNECT_SUPABASE.md`: key hard-coded in the client so it runs with no setup | Parent app reads credentials **only** from `.env` | A parent-facing app must not ship a key whose only protection is RLS on a project that is still on permissive policies (G4). |

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Legacy→UUID migration touches the live Teacher app | Teachers lose data entry | Do it on a copy; dual-run; `legacy_id` columns make it reversible |
| SMS OTP cost | Blocks Screen 1 | Admission No + PIN first (G5) |
| 1.85 MB mushaf asset in git | Repo bloat | Required runtime asset; Uthmani variant excluded |
| Free-tier 7-day auto-pause | Slow first open | Acceptable; Pro plan ($25/mo) removes it |
| `notifications` table growth | Free-tier 500 MB | 30-day outbox purge job (per `DB_AND_NOTIFICATIONS.md`) |
