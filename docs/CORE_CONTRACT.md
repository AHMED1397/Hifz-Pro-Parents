# Core Contract — the shared Hifz data contract

Source of truth: **`github.com/AHMED1397/Hifz-Core`** (private). Everything below is
transcribed here so this repo stays aligned without needing read access to that
repository, and so a future update can be diffed against a written baseline.

The parts of the contract this app executes live in **`src/lib/contract.ts`** and are
asserted by **`npm run smoke`** (section "Core contract"). Do not re-implement a rule
in a component — extend `contract.ts` and add an assertion.

---

## 1. `students`

| Column | Type / range | Notes |
| --- | --- | --- |
| `admission_no` | `text` **PK** | format `ADM-2024-001` |
| `legacy_id` | `text` unique, not null | `s1` … `s336` — **every FK in the schema points at this**, not at the PK |
| `current_year` | `smallint` 1–5 | academic year |
| `track` | `text` | `'hifz'` · `'dawr'` · `'nazira'` |
| `current_page` | `smallint` 1–604 | 15-line Madani mushaf |
| `class_id` | `text` | → `classes.id` |
| `juz_target` | `smallint` | end-of-year juz |

**Class moves.** A promotion or transfer updates `class_id` **and** appends a row to
`student_transfers`. A student is never reset, deleted or re-created — their
`daily_entries`, `attendance` and `exam_results` history follows them across floors and
facades. For a parent this means the timeline must not be filtered by the *current*
`class_id`; it is keyed by `legacy_id`.

## 2. `daily_entries`

| Column | Notes |
| --- | --- |
| `student_id` | → `students.legacy_id` |
| `entry_date` | one row per lesson type per day |
| `entry_type` | `'sabaq'` \| `'sabqi'` \| `'manzil'` |
| **`lines_count`** | **exact lines recited, 1–30+** — authoritative over the `line_from`/`line_to` range |
| `line_from`, `line_to` | legacy range columns, kept for backwards compatibility |
| `nazira_done` | `boolean` |
| `result` | `'pass'` \| `'fail'` |
| `teacher_id` | the Ustadh who actually took the lesson (see §4) |
| unique | `(student_id, entry_date, entry_type)` |

### CRITICAL BUSINESS RULE

> If `nazira_done = false` **or** `result = 'fail'`, `lines_count` **MUST be 0**.

A failed recitation, or a Sabaq taken without Nazira, earns no countable lines even if a
range was recorded. This repo enforces it in one place:

```ts
creditedLines(entry) // → 0 on fail or !nazira_done, else lines_count ?? (line_to - line_from + 1) ?? 0
```

Every screen that shows "lines recited" (lesson card, lesson detail, history rows, the
Analytics total) goes through `creditedLines()`. Never compute `line_to - line_from + 1`
inline again.

## 3. Year targets

| Year | Juz | Work |
| --- | --- | --- |
| 1 | 1–6 | memorisation + Tajweed / Makharij |
| 2 | 7–20 | memorisation |
| 3 | 21–30 | memorisation — completion |
| 4 | 30 (done) | **Dawr**: no new Sabaq, 1–3 juz Manzil revision + Dawr exams |
| 5 | 30 (done) | **Dawr**: same |

`trackForYear(4) === 'dawr'`, so the dashboard replaces the "New Lesson" card with a
Dawr notice instead of showing a lesson that will never be recorded.

## 4. Absence and relief teaching

When a student is absent, the batch is split across the Ustadhs **on the same floor**
(`classes.floor`). The relief teacher writes the entry under **their own `teacher_id`**,
and the substitution is logged in `teacher_relief_allocations`.

Parent-app consequence: teacher names must be resolved **per entry**, never from
`students.class_id` → `class_teachers`. This app already does that; keep it that way.

## 5. Multi-app non-breaking rule

Three apps read these tables. Therefore:

1. **Never delete or rename a column.** Add new ones.
2. **Always read with a fallback** — `entry.lines_count ?? 0`. Rows written before a
   column existed are normal, not an error.
3. Treat `legacy_id` (`s1`…`s336`), not `admission_no`, as the join key for lesson data.

`src/data/supabase.ts` applies the fallbacks on every mapper.

## 6. Timetable

Sun–Thu: 05:30–07:30 Sabaq · 08:30–10:30 Sabqi + Manzil · 10:45–11:30 lessons ·
11:30–12:30 Qailulah · 12:30–13:25 lunch + Luhar · 13:25–16:45 school · 16:45–17:45 Asar ·
17:45–Maghrib Nazira / Mashk · Maghrib–19:45 lesson · after Isha–21:30 revision ·
21:30 lights out.

**Friday — off. Saturday — half day, lessons from 11:30.**

`src/lib/timetable.ts` is the executable form of this table and is covered by the smoke
check.

## 7. Tables not modelled here

`student_transfers` and `teacher_relief_allocations` are institution-side audit logs. A
parent has no write access and nothing to render from them, so this repo does not
declare types for them. Their effects are already visible through per-entry
`teacher_id` and through an unbroken `legacy_id` history.

---

### Keeping aligned on every update

1. Re-read the directive in `Hifz-Core` and diff it against this file.
2. Change `src/lib/contract.ts`, then add a matching `ok(...)` in
   `scripts/smoke-check.cts` → `npm run smoke`.
3. `npm run check:i18n` for any new user-facing wording (en / ar / ta).
4. Never rename a column in a mapper — add the new one beside the old with a fallback.
