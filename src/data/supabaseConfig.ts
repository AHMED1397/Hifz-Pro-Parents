// Supabase connection config for the Parent app.
//
// Same pattern as the Teacher app: defaults are built in so the app connects
// with NO .env setup, and `.env.local` overrides them when present.
//
//   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
//
// ⚠️ SECURITY: this publishable key can read every row, because the shared
// project still runs the legacy permissive policies from
// `supabase/setup_schema.sql` (`create policy p_all ... using (true)`) and has
// no Supabase Auth. That is acceptable for a single trusted madrasa, but it
// means the parent's child list is filtered CLIENT-SIDE by guardian phone, not
// enforced by the database. See docs/PARENT_APP_PLAN.md gap G4 for the
// migration to real `auth.uid()` RLS.

const DEFAULT_SUPABASE_URL = 'https://uakfztuuncatxmlyhpst.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_p-5cnDS1MzjEnTwgDzilKQ_eIReb4WX';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_KEY;

export const HAS_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);
