-- ============================================================================
--  Al Haqqaniyyah Arabic College — Hifz Section
--  Supabase / PostgreSQL schema  (Teacher app + Parent app)
-- ----------------------------------------------------------------------------
--  Run this whole file in the Supabase SQL editor (SQL → New query → Run).
--  It is idempotent-ish: uses "create ... if not exists" and drops/recreates
--  policies, so you can re-run after edits.
--
--  Design notes
--  • Aligned to the real madrasa structure (docs/hifz_section_structure.md):
--      4 divisions, 3 daily lessons (Sabaq → Sabq → Manzil), Pass/Fail,
--      Nazira register, Hold rule, backward memorization, 100-mark exams.
--  • Auth: teachers and parents both sign in through Supabase Auth. Their
--    auth.users.id is stored as the PK of `teachers` / `parents`, so RLS can
--    use auth.uid() directly.
--  • Parent app reads its own children's data only (RLS via parent_students).
--  • Push notifications: device tokens + a `notifications` outbox table that a
--    Database Webhook → Edge Function turns into Expo push messages.
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================================
--  1. DIVISIONS  (Hifzul Quran, Girdan, Riwayath, Dawr)
-- ============================================================================
create table if not exists divisions (
  id          smallint primary key,
  code        text unique not null,          -- 'hifz' | 'girdan' | 'riwayath' | 'dawr'
  name_en     text not null,
  name_ar     text,
  sort_order  smallint not null default 0
);

insert into divisions (id, code, name_en, name_ar, sort_order) values
  (1, 'hifz',     'Hifzul Quran', 'حفظ القرآن',  1),
  (2, 'girdan',   'Girdan',        'قردان',        2),
  (3, 'riwayath', 'Riwayath',      'روايات',       3),
  (4, 'dawr',     'Dawr',          'دور',          4)
on conflict (id) do nothing;

-- ============================================================================
--  2. PEOPLE — teachers, parents
--     PK = auth.users.id so RLS can compare with auth.uid() with no joins.
-- ============================================================================
create table if not exists teachers (
  id          uuid primary key,              -- = auth.users.id
  full_name   text not null,
  takhallus   text,                          -- honorific / title suffix
  phone       text unique,
  role        text not null default 'teacher'
              check (role in ('teacher','examiner','admin_staff','admin')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists parents (
  id          uuid primary key,              -- = auth.users.id
  full_name   text not null,
  phone       text unique,
  relation    text default 'father'          -- father | mother | guardian
              check (relation in ('father','mother','guardian','other')),
  preferred_lang text default 'en' check (preferred_lang in ('en','ta','ar')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================================
--  3. CLASSES  &  the teacher ⇄ class link
-- ============================================================================
create table if not exists classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  floor         smallint check (floor between 0 and 7),  -- 0 = Ground Floor
  division_id   smallint not null references divisions(id) default 1,
  faculty       text not null default 'hifz'
                check (faculty in ('hifz','tajweed_qiraat','ten_qiraat')),
  created_at    timestamptz not null default now()
);

create table if not exists class_teachers (
  class_id    uuid references classes(id) on delete cascade,
  teacher_id  uuid references teachers(id) on delete cascade,
  role        text default 'main' check (role in ('main','assistant')),
  primary key (class_id, teacher_id)
);

-- ============================================================================
--  4. STUDENTS  &  the parent ⇄ student link
-- ============================================================================
create table if not exists students (
  id            uuid primary key default gen_random_uuid(),
  admission_no  text unique not null,
  full_name     text not null,
  age           smallint check (age between 5 and 25),
  class_id      uuid references classes(id) on delete set null,
  division_id   smallint references divisions(id) default 1,
  -- current memorization position (memorization runs backwards Juz 30 → 1)
  current_juz   smallint check (current_juz between 1 and 30),
  current_page  smallint check (current_page between 1 and 604),
  current_line  smallint check (current_line between 1 and 15),
  days_behind   numeric(5,1) default 0,
  joined_on     date default current_date,
  status        text not null default 'active'
                check (status in ('active','alumni','left','hold')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_students_class on students (class_id);

-- A parent can have several children; a child can have several guardians.
create table if not exists parent_students (
  parent_id   uuid references parents(id) on delete cascade,
  student_id  uuid references students(id) on delete cascade,
  relation    text default 'father'
              check (relation in ('father','mother','guardian','other')),
  primary key (parent_id, student_id)
);
create index if not exists idx_parent_students_student on parent_students (student_id);

-- ============================================================================
--  5. SURAHS  (reference, seeded once, read by everyone)
-- ============================================================================
create table if not exists surahs (
  id          smallint primary key,          -- 1..114
  name_ar     text,
  name_en     text,
  name_ta     text,
  ayah_count  smallint,
  juz_start   smallint,
  page_start  smallint
);

-- ============================================================================
--  6. TARGET PLANS  (per-student pace / deadline)
-- ============================================================================
create table if not exists target_plans (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid references students(id) on delete cascade,
  start_page          smallint default 1,
  end_page            smallint default 604,
  daily_target_lines  smallint default 12,   -- Sabaq standard = 10–12 lines/day
  daily_target_pages  numeric(4,2) default 1,
  start_date          date,
  target_date         date,
  unique (student_id)
);

-- ============================================================================
--  7. DAILY ENTRIES  — the core record.
--     ONE row per (student, date, lesson type).  3 lessons/day:
--       sabaq  = new lesson       sabqi = current-juz revision
--       manzil = completed-juz rotational revision
--     result  = pass | fail  (drives the Hold rule)
--     nazira_done gates next-day sabaq.
-- ============================================================================
create table if not exists daily_entries (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references students(id) on delete cascade,
  class_id     uuid references classes(id) on delete cascade,
  teacher_id   uuid references teachers(id),
  entry_date   date not null,
  entry_type   text not null check (entry_type in ('sabaq','sabqi','manzil')),

  -- range (Sabaq/Sabqi use surah+ayah+page+line; Manzil uses juz range)
  surah_id     smallint references surahs(id),
  surah_to     smallint references surahs(id),
  ayah_from    smallint,
  ayah_to      smallint,
  page_from    smallint,
  page_to      smallint,
  line_from    smallint,        -- 1..15 (Madani mushaf)
  line_to      smallint,
  juz_start    smallint,        -- Manzil: starting juz (back-compat)
  juz_amount   numeric(4,2),    -- Manzil: number of juz revised (= array_length(juz_list))
  juz_list     smallint[],      -- Manzil: exact juz revised (multi-select, 1..30)

  result       text not null default 'pass' check (result in ('pass','fail')),
  nazira_done  boolean,         -- Sabaq: today's pre-read passed before the new lesson
  mistakes     smallint default 0,
  forgets      smallint default 0, -- times the student blanked/forgot during recitation
  remark       text,             -- note the teacher writes to the parents
  days_behind  numeric(5,1),
  created_at   timestamptz not null default now(),
  edited_at    timestamptz,
  unique (student_id, entry_date, entry_type)
);

create index if not exists idx_entries_student_date on daily_entries (student_id, entry_date);
create index if not exists idx_entries_class_date   on daily_entries (class_id, entry_date);
create index if not exists idx_entries_type_date    on daily_entries (entry_type, entry_date);

-- ============================================================================
--  8. ATTENDANCE  — one row per (student, date)
-- ============================================================================
create table if not exists attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references students(id) on delete cascade,
  class_id    uuid references classes(id) on delete cascade,
  att_date    date not null,
  status      text not null check (status in ('present','absent','leave','late')),
  reason      text,
  marked_by   uuid references teachers(id),
  created_at  timestamptz not null default now(),
  unique (student_id, att_date)
);
create index if not exists idx_attendance_class_date on attendance (class_id, att_date);

-- ============================================================================
--  9. EXAMS  — 100 marks. Hifz = 6 questions×10 + Tajweed 25 + Tarteel 15.
--     components jsonb keeps the per-question max: {"q1":10,...,"tarteel":15}
-- ============================================================================
create table if not exists exams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  faculty      text not null check (faculty in ('hifz','qiraath')),
  category     text not null
               check (category in ('stage','cumulative','monthly','year_end','riwayah')),
  exam_type    text,
  held_on      date,
  published    boolean not null default false,
  components   jsonb not null,
  total_marks  smallint not null default 100,
  created_at   timestamptz not null default now()
);

create table if not exists exam_examiners (
  exam_id     uuid references exams(id) on delete cascade,
  teacher_id  uuid references teachers(id) on delete cascade,
  primary key (exam_id, teacher_id)
);

create table if not exists exam_results (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid references exams(id) on delete cascade,
  student_id  uuid references students(id) on delete cascade,
  marks       jsonb,                         -- {"q1":9,"q2":8,...,"tarteel":13}
  total       smallint check (total between 0 and 100),
  grade       text,
  position    smallint,
  entered_by  uuid references teachers(id),
  created_at  timestamptz not null default now(),
  unique (exam_id, student_id)
);
create index if not exists idx_exam_results_student on exam_results (student_id);

-- ============================================================================
-- 10. ANNOUNCEMENTS  (audience: teachers / parents / all)
-- ============================================================================
create table if not exists announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  body        text,
  audience    text not null default 'all_teachers'
              check (audience in ('all_teachers','all_parents','everyone','class')),
  class_id    uuid references classes(id) on delete cascade,
  created_by  uuid references teachers(id),
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 11. PUSH NOTIFICATIONS  (Parent app + Teacher app)
--     • device_tokens : one row per installed device (Expo push token)
--     • notifications : outbox. Insert a row → a Database Webhook fires an
--       Edge Function that reads the recipient's tokens and calls Expo's
--       push API. See docs/DB_AND_NOTIFICATIONS.md.
-- ============================================================================
create table if not exists device_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,                -- teachers.id OR parents.id (auth.uid())
  user_type    text not null check (user_type in ('teacher','parent')),
  expo_token   text not null,                -- ExponentPushToken[...]
  platform     text default 'android' check (platform in ('android','ios','web')),
  enabled      boolean not null default true,
  updated_at   timestamptz not null default now(),
  unique (expo_token)
);
create index if not exists idx_device_tokens_user on device_tokens (user_id);

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,                -- teachers.id OR parents.id
  recipient_type text not null check (recipient_type in ('teacher','parent')),
  student_id   uuid references students(id) on delete cascade,  -- optional context
  title        text not null,
  body         text not null,
  data         jsonb,                        -- deep-link payload {"screen":"student","id":...}
  category     text default 'update'
               check (category in ('daily_update','attendance','exam','hold','announcement','update')),
  read_at      timestamptz,
  sent_at      timestamptz,                  -- set by the Edge Function after Expo accepts it
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_recipient on notifications (recipient_id, created_at desc);

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================================
alter table teachers        enable row level security;
alter table parents         enable row level security;
alter table classes         enable row level security;
alter table class_teachers  enable row level security;
alter table students        enable row level security;
alter table parent_students enable row level security;
alter table surahs          enable row level security;
alter table divisions       enable row level security;
alter table target_plans    enable row level security;
alter table daily_entries   enable row level security;
alter table attendance      enable row level security;
alter table exams           enable row level security;
alter table exam_examiners  enable row level security;
alter table exam_results    enable row level security;
alter table announcements   enable row level security;
alter table device_tokens   enable row level security;
alter table notifications   enable row level security;

-- ---- helper predicates ------------------------------------------------------
-- is the current auth user a teacher of this class?
--   exists (select 1 from class_teachers ct where ct.class_id = <cid> and ct.teacher_id = auth.uid())
-- is the current auth user a parent of this student?
--   exists (select 1 from parent_students ps where ps.student_id = <sid> and ps.parent_id = auth.uid())

-- ---- reference tables: readable by every authenticated user -----------------
drop policy if exists p_surahs_read    on surahs;
create policy p_surahs_read    on surahs    for select to authenticated using (true);
drop policy if exists p_divisions_read on divisions;
create policy p_divisions_read on divisions for select to authenticated using (true);

-- ---- teachers ---------------------------------------------------------------
drop policy if exists p_teachers_self on teachers;
create policy p_teachers_self on teachers
  for select to authenticated using (id = auth.uid());

-- ---- parents ----------------------------------------------------------------
drop policy if exists p_parents_self on parents;
create policy p_parents_self on parents
  for select to authenticated using (id = auth.uid());

-- ---- classes: teacher of the class, OR parent of a student in the class -----
drop policy if exists p_classes_read on classes;
create policy p_classes_read on classes
  for select to authenticated using (
    exists (select 1 from class_teachers ct
              where ct.class_id = classes.id and ct.teacher_id = auth.uid())
    or exists (select 1 from students st
                 join parent_students ps on ps.student_id = st.id
                 where st.class_id = classes.id and ps.parent_id = auth.uid())
  );

drop policy if exists p_class_teachers_read on class_teachers;
create policy p_class_teachers_read on class_teachers
  for select to authenticated using (teacher_id = auth.uid());

-- ---- students: teacher of their class OR their parent -----------------------
drop policy if exists p_students_read on students;
create policy p_students_read on students
  for select to authenticated using (
    exists (select 1 from class_teachers ct
              where ct.class_id = students.class_id and ct.teacher_id = auth.uid())
    or exists (select 1 from parent_students ps
                 where ps.student_id = students.id and ps.parent_id = auth.uid())
  );

drop policy if exists p_parent_students_read on parent_students;
create policy p_parent_students_read on parent_students
  for select to authenticated using (parent_id = auth.uid());

-- ---- target plans -----------------------------------------------------------
drop policy if exists p_target_plans_read on target_plans;
create policy p_target_plans_read on target_plans
  for select to authenticated using (
    exists (select 1 from students st
              join class_teachers ct on ct.class_id = st.class_id
              where st.id = target_plans.student_id and ct.teacher_id = auth.uid())
    or exists (select 1 from parent_students ps
                 where ps.student_id = target_plans.student_id and ps.parent_id = auth.uid())
  );

-- ---- daily entries: teacher writes own class; parent reads own child --------
drop policy if exists p_entries_read on daily_entries;
create policy p_entries_read on daily_entries
  for select to authenticated using (
    exists (select 1 from class_teachers ct
              where ct.class_id = daily_entries.class_id and ct.teacher_id = auth.uid())
    or exists (select 1 from parent_students ps
                 where ps.student_id = daily_entries.student_id and ps.parent_id = auth.uid())
  );

drop policy if exists p_entries_insert on daily_entries;
create policy p_entries_insert on daily_entries
  for insert to authenticated with check (
    exists (select 1 from class_teachers ct
              where ct.class_id = daily_entries.class_id and ct.teacher_id = auth.uid())
  );

drop policy if exists p_entries_update on daily_entries;
create policy p_entries_update on daily_entries
  for update to authenticated using (
    exists (select 1 from class_teachers ct
              where ct.class_id = daily_entries.class_id and ct.teacher_id = auth.uid())
  );

-- ---- attendance -------------------------------------------------------------
drop policy if exists p_attendance_read on attendance;
create policy p_attendance_read on attendance
  for select to authenticated using (
    exists (select 1 from class_teachers ct
              where ct.class_id = attendance.class_id and ct.teacher_id = auth.uid())
    or exists (select 1 from parent_students ps
                 where ps.student_id = attendance.student_id and ps.parent_id = auth.uid())
  );

drop policy if exists p_attendance_write on attendance;
create policy p_attendance_write on attendance
  for all to authenticated using (
    exists (select 1 from class_teachers ct
              where ct.class_id = attendance.class_id and ct.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from class_teachers ct
              where ct.class_id = attendance.class_id and ct.teacher_id = auth.uid())
  );

-- ---- exams: catalog readable by all authenticated --------------------------
drop policy if exists p_exams_read on exams;
create policy p_exams_read on exams for select to authenticated using (true);
drop policy if exists p_exam_examiners_read on exam_examiners;
create policy p_exam_examiners_read on exam_examiners for select to authenticated using (true);

-- exam results: examiner enters; teacher/parent see only PUBLISHED
drop policy if exists p_exam_results_insert on exam_results;
create policy p_exam_results_insert on exam_results
  for insert to authenticated with check (
    exists (select 1 from exam_examiners ee
              where ee.exam_id = exam_results.exam_id and ee.teacher_id = auth.uid())
  );

drop policy if exists p_exam_results_read on exam_results;
create policy p_exam_results_read on exam_results
  for select to authenticated using (
    exists (select 1 from exams e where e.id = exam_results.exam_id and e.published = true)
    and (
      exists (select 1 from students st
                join class_teachers ct on ct.class_id = st.class_id
                where st.id = exam_results.student_id and ct.teacher_id = auth.uid())
      or exists (select 1 from parent_students ps
                   where ps.student_id = exam_results.student_id and ps.parent_id = auth.uid())
    )
  );

-- ---- announcements ----------------------------------------------------------
drop policy if exists p_announcements_read on announcements;
create policy p_announcements_read on announcements
  for select to authenticated using (
    audience = 'everyone'
    or (audience = 'all_teachers'
          and exists (select 1 from teachers t where t.id = auth.uid()))
    or (audience = 'all_parents'
          and exists (select 1 from parents p where p.id = auth.uid()))
    or (audience = 'class' and class_id is not null and (
          exists (select 1 from class_teachers ct
                    where ct.class_id = announcements.class_id and ct.teacher_id = auth.uid())
          or exists (select 1 from students st
                       join parent_students ps on ps.student_id = st.id
                       where st.class_id = announcements.class_id and ps.parent_id = auth.uid())
        ))
  );

-- ---- device tokens: a user manages only their own rows ---------------------
drop policy if exists p_device_tokens_all on device_tokens;
create policy p_device_tokens_all on device_tokens
  for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- notifications: recipient reads / marks-read only their own -------------
drop policy if exists p_notifications_read on notifications;
create policy p_notifications_read on notifications
  for select to authenticated using (recipient_id = auth.uid());
drop policy if exists p_notifications_update on notifications;
create policy p_notifications_update on notifications
  for update to authenticated using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
-- (Inserts into notifications are done by the server / Edge Function using the
--  service-role key, which bypasses RLS. Teachers can also be granted insert if
--  you want the app to write them directly — add a policy here if so.)

-- ============================================================================
-- 13. AUTO-NOTIFY  — when a teacher saves a daily entry, queue a parent push.
--     The row inserted into `notifications` triggers the Database Webhook that
--     calls the `push` Edge Function. Uses SECURITY DEFINER to bypass RLS.
-- ============================================================================
create or replace function notify_parents_on_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s_name text;
  type_label text;
begin
  select full_name into s_name from students where id = new.student_id;
  type_label := case new.entry_type
                  when 'sabaq'  then 'New lesson (Sabaq)'
                  when 'sabqi'  then 'Revision (Sabq)'
                  when 'manzil' then 'Manzil'
                  else new.entry_type end;

  insert into notifications (recipient_id, recipient_type, student_id, title, body, category, data)
  select ps.parent_id, 'parent', new.student_id,
         coalesce(s_name,'Your child') || ' — ' || type_label,
         case when new.result = 'pass' then 'Passed today ✓' else 'Needs revision today' end
           || coalesce(' · ' || nullif(new.remark,''), ''),
         'daily_update',
         jsonb_build_object('screen','student','student_id', new.student_id, 'date', new.entry_date)
  from parent_students ps
  where ps.student_id = new.student_id;

  return new;
end;
$$;

drop trigger if exists trg_notify_parents_on_entry on daily_entries;
create trigger trg_notify_parents_on_entry
  after insert on daily_entries
  for each row execute function notify_parents_on_entry();

-- ============================================================================
-- 14. SEED HELP  (examples — uncomment / adapt)
-- ----------------------------------------------------------------------------
-- Teachers/parents rows must reuse the auth user's id. Typical flow:
--   1. Create the auth user (dashboard: Authentication → Add user, or the app
--      sign-up). Copy its UUID.
--   2. insert into teachers (id, full_name, phone) values ('<uuid>','Ustadh ...','+94...');
--   3. insert into classes (name, floor, division_id, faculty)
--        values ('Floor 3 – Class A', 3, 1, 'hifz');
--   4. insert into class_teachers (class_id, teacher_id, role)
--        select c.id, '<uuid>', 'main' from classes c where c.name = 'Floor 3 – Class A';
--
-- Surahs 1–114: seed from the app's src/data/surahs.ts list (id, names, ayah_count,
-- juz_start, page_start).
-- ============================================================================
