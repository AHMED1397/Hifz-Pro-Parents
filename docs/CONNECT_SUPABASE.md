# Connecting the app to Supabase

The app is now wired to Supabase. It automatically uses Supabase when the
`.env` keys are present, and falls back to built-in mock data otherwise.

## What's already done in the repo
- `@supabase/supabase-js` + AsyncStorage session persistence
  (`src/data/supabase.ts`).
- Accepts either `EXPO_PUBLIC_SUPABASE_KEY` (new publishable key) or
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (classic anon key).
- `.env` in the project root holds your project URL + key. **`.env` is
  git-ignored**, so create the same file on each machine that runs the app:

  ```
  EXPO_PUBLIC_SUPABASE_URL=https://uakfztuuncatxmlyhpst.supabase.co
  EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_p-5cnDS1MzjEnTwgDzilKQ_eIReb4WX
  ```

## One-time database setup (do this in Supabase)
Open your project → **SQL Editor** → **New query**, then run these two files
from the `supabase/` folder, in order:

1. **`setup_schema.sql`** — creates the tables using the SAME ids the app uses
   (`t1`, `c1`, `s5`, `e10`, …) and the same column names. It also enables Row
   Level Security with permissive policies so the app's publishable key can read
   and write (the app currently signs in with a teacher dropdown + shared
   password, not Supabase Auth).

2. **`seed.sql`** — loads the real roster and catalog:
   - 32 teachers (Ash-Sheikh …)
   - 32 classes across 7 floors
   - 336 students
   - 114 surahs
   - 86 exams (stage, cumulative, monthly per year/month, year-end per year,
     riwayah)

That's it — restart the app and it will read/write live data. Daily entries,
attendance, and exam results the teachers enter are saved to Supabase.

> **Re-running:** both files are safe to re-run. `setup_schema.sql` drops and
> recreates the tables; `seed.sql` truncates the seed tables and re-inserts.

## Security note (important for later)
The permissive policies are fine for a trusted single-madrasa staff app, but the
publishable key can read/write all rows. When you build the Parent app or want
per-teacher isolation, switch to real **Supabase Auth** and replace the
permissive policies with the `auth.uid()` policies already written in
`supabase/schema.sql` (the UUID-based version). Tell me and I'll migrate the
login to Supabase Auth and tighten the rules.
