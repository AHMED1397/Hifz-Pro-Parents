// Supabase connection config for the Parent app.
//
// Unlike the Teacher app — which hard-codes a publishable key so it runs with
// zero setup — the Parent app reads credentials ONLY from the environment.
// Parent-facing apps must never ship a key that can read other families' rows;
// the key is only as safe as the RLS policies, and the shared project is still
// on the legacy permissive policies (see docs/PARENT_APP_PLAN.md gap G4).
//
// Create `.env` in the project root:
//   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...      (or ..._ANON_KEY)
//
// With no keys, HAS_SUPABASE is false and the app runs on src/data/mock.ts.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const HAS_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);
