# Database, Storage Limits & Parent Notifications

This document answers the questions raised while planning the Supabase backend
for **Hfz-Pro** (Teacher app), **Hfz-Parent** (Parent app), and the **Admin Web App**.

- The full database schema is in [`supabase/schema.sql`](../supabase/schema.sql).
- The section structure it models is in [`hifz_section_structure.md`](./hifz_section_structure.md).
- The Parent App specification is in [`PARENT_APP_SPEC.md`](./PARENT_APP_SPEC.md).
- The Admin Web App specification is in [`ADMIN_WEBAPP_SPEC.md`](./ADMIN_WEBAPP_SPEC.md).

---

## 1. Supabase free tier — how much can you store?

The **Free plan** (checked 2026) gives you, per project:

| Resource | Free limit | What it means for us |
|---|---|---|
| **Database size** | **500 MB** | Your rows (teachers, students, daily entries, exams…) |
| File storage | 1 GB | Photos/PDFs if you add them later |
| Egress (bandwidth) | 5 GB / month | Data downloaded by the apps |
| Auth users (MAU) | 50,000 / month | Teachers + parents logging in |
| Edge Function calls | 500,000 / month | Used to send push notifications |
| Realtime | 200 concurrent | Live updates |
| Active projects | 2 | 1 project can serve BOTH apps |
| **Auto-pause** | after 7 days idle | Wakes on first request (a few seconds) |

### Will 500 MB be enough? — Yes, for many years.

Our data is small **text** (no images in the DB). Rough row sizes:

| Table | Bytes/row (with indexes) | Rows/year | MB/year |
|---|---|---|---|
| `daily_entries` (the big one) | ~0.4 KB | students × 3 lessons × ~300 days | see below |
| `attendance` | ~0.2 KB | students × ~300 days | small |
| `exam_results` | ~0.5 KB | students × ~12 exams | tiny |
| students / teachers / classes | — | a few hundred total | negligible |

**Worked example for the whole college (~500 students):**

- Daily entries: `500 × 3 × 300 ≈ 450,000 rows/year × 0.4 KB ≈ 180 MB/year`
- Attendance: `500 × 300 ≈ 150,000 rows × 0.2 KB ≈ 30 MB/year`
- Everything else per year: well under **10 MB**

So **~220 MB/year** at full college scale. On the free 500 MB you get roughly
**2 years** of full-college history before you need to archive or upgrade.

**For a realistic start** (your 3 seeded classes ≈ 38 students):
`38 × 3 × 300 ≈ 34,000 rows/year ≈ 15 MB/year` → the free tier lasts **many
years**.

> **Notifications caveat:** the `notifications` table can grow fast (one row per
> parent per lesson per day). Keep it small by deleting rows older than ~30 days
> — a one-line scheduled job. It is an *outbox*, not permanent history.

### Practical advice
1. **One project, two apps.** The Teacher app and Parent app share the same
   database and the same 500 MB — no need for two projects.
2. **Don't store images in Postgres.** If you add student photos later, put them
   in **Storage** (1 GB) or an external bucket, not in a table column.
3. **The 7-day auto-pause** matters: if nobody opens either app for a week the
   project sleeps and the next request is slow while it wakes. With daily
   teacher use this basically never triggers. If it bothers you, the **Pro plan
   ($25/mo)** removes pausing and raises the DB to 8 GB + daily backups.
4. **Backups:** the free tier has **no automatic backups**. Until you go Pro,
   run a manual export (`pg_dump` / dashboard download) every so often, or keep
   the mock seed script as a rebuild path.

---

## 2. The database structure

`supabase/schema.sql` creates the following (aligned to the real madrasa):

**People & structure**
- `divisions` — Hifzul Quran · Girdan · Riwayath · Dawr (seeded)
- `teachers`, `parents` — PK is the Supabase Auth user id (`auth.uid()`)
- `classes`, `class_teachers` — one main teacher per class
- `students`, `parent_students` — a parent is linked to their child(ren)

**Academic records**
- `surahs` (reference), `target_plans` (pace/deadline)
- `daily_entries` — **the core table**: one row per (student, date, lesson).
  3 lesson types `sabaq | sabqi | manzil`, `result = pass | fail`,
  `nazira_done` (gates next-day Sabaq), line/page/juz ranges.
- `attendance` — one row per (student, date)
- `exams`, `exam_examiners`, `exam_results` — 100-mark exams
  (Hifz = 6 questions×10 + Tajweed 25 + Tarteel 15, stored in `components` jsonb)
- `announcements`

**Notifications**
- `device_tokens` — each phone's Expo push token
- `notifications` — outbox that triggers a push (see §3)

**Security (RLS)** is enabled on every table:
- A **teacher** sees/edits only **their own class**.
- A **parent** sees only **their own child's** data, and only **published** exam
  results.
- Reference tables (`surahs`, `divisions`) are readable by any logged-in user.

There is also a trigger `notify_parents_on_entry`: whenever a teacher saves a
daily entry, it automatically queues a notification row for that student's
parents.

---

## 3. Parent app — how do you send notifications?

**This app targets Android.** The recommended, free approach is
**Expo push notifications** (Expo relays to Firebase Cloud Messaging / FCM for
you, so you don't manage FCM keys in code). It works for both the Teacher and
Parent app.

### The flow (all on the free tier)

```
Teacher saves daily entry
        │  (INSERT into daily_entries)
        ▼
DB trigger  notify_parents_on_entry()
        │  (INSERT one row per parent into `notifications`)
        ▼
Supabase Database Webhook  (fires on INSERT into notifications)
        │
        ▼
Edge Function  `push`   ──►  Expo Push API  ──►  FCM  ──►  Parent's phone 🔔
        (looks up device_tokens for the recipient and sends)
```

### What you build once

1. **In the Parent app (client):**
   - Add `expo-notifications`.
   - On login, ask permission and get the Expo push token
     (`Notifications.getExpoPushTokenAsync()`), then upsert it into
     `device_tokens` (user_id = the parent, user_type = 'parent').
   - Because this is a **standalone Android build**, you must create an
     **FCM v1 credential** once and give it to Expo (`eas credentials`), or use
     EAS Build which sets it up. (Expo Go can receive during development.)

2. **In Supabase:**
   - Deploy the Edge Function in
     [`supabase/functions/push/index.ts`](../supabase/functions/push/index.ts).
   - Set the secret `EXPO_ACCESS_TOKEN` (create it in Expo → Access Tokens).
   - Create a **Database Webhook**: table `notifications`, event **Insert**,
     target = the `push` Edge Function.

That's it. From then on, every daily entry / attendance / exam publish you want
to alert on just needs a row inserted into `notifications` (the trigger already
does it for daily entries — you can add more triggers the same way).

### Cost check
- Push sending itself is **free** through Expo.
- Each notification = **1 Edge Function call**. Free tier allows **500,000/month**
  — far more than you'll use (`500 students × ~90 alerts/month ≈ 45,000`).

### Types of notifications you'll likely want
| Event | Trigger source | Example |
|---|---|---|
| Daily update | INSERT on `daily_entries` (already wired) | "Ahmed — New lesson: Passed today ✓" |
| Absent | INSERT on `attendance` where status='absent' | "Ahmed was marked absent today" |
| Hold active | when Sabq/Manzil fails or Nazira missed | "Tomorrow's Sabaq is on hold" |
| Exam result | when an exam is `published` | "Ahmed — Year-End result available" |
| Announcement | INSERT on `announcements` (audience parents) | school notice |

---

## 4. Recommended next steps

1. Create a Supabase project → run `supabase/schema.sql`.
2. Seed `surahs` (1–114) from `src/data/surahs.ts`, and create the auth users +
   `teachers`/`classes`/`class_teachers` rows.
3. Put the project URL + anon key in `.env`
   (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) — the app then
   automatically switches from mock data to Supabase.
4. Build the Parent app against the **same** project; RLS already restricts each
   parent to their own child.
5. Wire push last: deploy the `push` function + webhook.
