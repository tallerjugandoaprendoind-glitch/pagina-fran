-- =====================================================
-- CapyABA · Schema SQL para Supabase
-- Ejecutar en SQL Editor de Supabase
-- =====================================================

create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. PROFILES
-- =====================================================
create type user_role as enum ('admin', 'student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'student',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- 2. COURSES
-- =====================================================
create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  cover_url text,
  passing_score int not null default 80 check (passing_score between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- 3. MODULES
-- =====================================================
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  "order" int not null default 0,
  created_at timestamptz default now()
);
create index idx_modules_course on public.modules(course_id, "order");

-- =====================================================
-- 4. LESSONS
-- =====================================================
create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  video_url text,
  content text,
  "order" int not null default 0,
  duration_minutes int,
  is_required boolean default true,
  created_at timestamptz default now()
);
create index idx_lessons_module on public.lessons(module_id, "order");

-- =====================================================
-- 5. ENROLLMENTS
-- =====================================================
create type enrollment_status as enum ('active', 'completed', 'revoked');

create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  status enrollment_status not null default 'active',
  final_score numeric(5,2),
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique(course_id, student_id)
);
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_course on public.enrollments(course_id);

-- =====================================================
-- 6. LESSON PROGRESS
-- =====================================================
create table public.lesson_progress (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watch_percentage int default 0 check (watch_percentage between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique(enrollment_id, lesson_id)
);

-- =====================================================
-- 7. QUIZZES
-- =====================================================
create type quiz_type as enum ('quiz', 'exam');

create table public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  title text not null,
  description text,
  type quiz_type not null default 'quiz',
  passing_score int default 80 check (passing_score between 0 and 100),
  time_limit_minutes int,
  max_attempts int default 3,
  created_at timestamptz default now(),
  check (course_id is not null or module_id is not null)
);

-- =====================================================
-- 8. QUESTIONS
-- =====================================================
create type question_type as enum (
  'single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay'
);

create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type question_type not null,
  question_text text not null,
  options jsonb,
  correct_answer jsonb,
  points int default 1,
  "order" int default 0,
  explanation text
);

-- =====================================================
-- 9. QUIZ ATTEMPTS
-- =====================================================
create table public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score numeric(5,2),
  passed boolean,
  needs_review boolean default false,
  started_at timestamptz default now(),
  submitted_at timestamptz
);

-- =====================================================
-- 10. ATTEMPT ANSWERS
-- =====================================================
create table public.attempt_answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer jsonb,
  is_correct boolean,
  points_earned numeric(5,2),
  feedback text
);

-- =====================================================
-- 11. ASSIGNMENTS
-- =====================================================
create table public.assignments (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  title text not null,
  instructions text,
  fields jsonb not null,
  due_days int,
  created_at timestamptz default now()
);

-- =====================================================
-- 12. ASSIGNMENT SUBMISSIONS
-- =====================================================
create table public.assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  answers jsonb not null,
  score numeric(5,2),
  reviewed_by uuid references public.profiles(id),
  feedback text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  unique(enrollment_id, assignment_id)
);

-- =====================================================
-- 13. CERTIFICATES
-- =====================================================
create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid unique not null references public.enrollments(id) on delete cascade,
  student_name text not null,
  course_title text not null,
  final_score numeric(5,2) not null,
  issued_at timestamptz default now(),
  ai_generated_text text,
  pdf_url text,
  verification_code text unique default substring(md5(random()::text), 1, 12)
);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
-- Ejecutar esto en una query aparte o manualmente en el panel de Storage:
-- insert into storage.buckets (id, name, public) values ('certificates', 'certificates', true);

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.profiles 
    where id = user_id and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function public.calculate_enrollment_progress(p_enrollment_id uuid)
returns numeric as $$
declare
  v_total int;
  v_completed int;
begin
  select count(*) into v_total
  from public.lessons l
  join public.modules m on l.module_id = m.id
  join public.enrollments e on e.course_id = m.course_id
  where e.id = p_enrollment_id and l.is_required = true;

  select count(*) into v_completed
  from public.lesson_progress lp
  join public.lessons l on lp.lesson_id = l.id
  where lp.enrollment_id = p_enrollment_id 
    and lp.completed_at is not null
    and l.is_required = true;

  if v_total = 0 then return 0; end if;
  return round((v_completed::numeric / v_total) * 100, 2);
end;
$$ language plpgsql stable;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.certificates enable row level security;

-- PROFILES
create policy "Users view own profile" on profiles
  for select using (auth.uid() = id or is_admin(auth.uid()));
create policy "Users update own profile" on profiles
  for update using (auth.uid() = id);

-- COURSES: admin gestiona todo, alumnos ven sus cursos publicados
create policy "Admins manage courses" on courses
  for all using (is_admin(auth.uid()));
create policy "Students view enrolled courses" on courses
  for select using (
    exists(
      select 1 from enrollments 
      where course_id = courses.id 
      and student_id = auth.uid() 
      and status = 'active'
    )
  );

-- MODULES y LESSONS
create policy "Admins manage modules" on modules
  for all using (is_admin(auth.uid()));
create policy "Students view enrolled modules" on modules
  for select using (
    exists(
      select 1 from enrollments e
      where e.course_id = modules.course_id
      and e.student_id = auth.uid()
      and e.status = 'active'
    )
  );

create policy "Admins manage lessons" on lessons
  for all using (is_admin(auth.uid()));
create policy "Students view enrolled lessons" on lessons
  for select using (
    exists(
      select 1 from enrollments e
      join modules m on m.course_id = e.course_id
      where m.id = lessons.module_id
      and e.student_id = auth.uid()
      and e.status = 'active'
    )
  );

-- ENROLLMENTS
create policy "Admins manage enrollments" on enrollments
  for all using (is_admin(auth.uid()));
create policy "Students view own enrollments" on enrollments
  for select using (student_id = auth.uid());

-- LESSON PROGRESS
create policy "Students manage own progress" on lesson_progress
  for all using (
    exists(
      select 1 from enrollments 
      where id = lesson_progress.enrollment_id 
      and student_id = auth.uid()
    )
  );
create policy "Admins view all progress" on lesson_progress
  for select using (is_admin(auth.uid()));

-- QUIZZES y QUESTIONS
create policy "Admins manage quizzes" on quizzes
  for all using (is_admin(auth.uid()));
create policy "Students view quizzes" on quizzes
  for select using (
    exists(
      select 1 from enrollments e
      where (e.course_id = quizzes.course_id 
             or exists(select 1 from modules m where m.id = quizzes.module_id and m.course_id = e.course_id))
      and e.student_id = auth.uid()
      and e.status = 'active'
    )
  );

create policy "Admins manage questions" on questions
  for all using (is_admin(auth.uid()));
create policy "Students view questions" on questions
  for select using (
    exists(
      select 1 from quizzes q
      join enrollments e on (e.course_id = q.course_id or exists(
        select 1 from modules m where m.id = q.module_id and m.course_id = e.course_id
      ))
      where q.id = questions.quiz_id
      and e.student_id = auth.uid()
    )
  );

-- QUIZ ATTEMPTS
create policy "Students manage own attempts" on quiz_attempts
  for all using (
    exists(
      select 1 from enrollments 
      where id = quiz_attempts.enrollment_id 
      and student_id = auth.uid()
    )
  );
create policy "Admins view all attempts" on quiz_attempts
  for all using (is_admin(auth.uid()));

create policy "Students manage own answers" on attempt_answers
  for all using (
    exists(
      select 1 from quiz_attempts qa
      join enrollments e on qa.enrollment_id = e.id
      where qa.id = attempt_answers.attempt_id
      and e.student_id = auth.uid()
    )
  );
create policy "Admins review answers" on attempt_answers
  for all using (is_admin(auth.uid()));

-- ASSIGNMENTS
create policy "Admins manage assignments" on assignments
  for all using (is_admin(auth.uid()));
create policy "Students view assignments" on assignments
  for select using (
    exists(
      select 1 from enrollments e
      where (e.course_id = assignments.course_id
             or exists(select 1 from modules m where m.id = assignments.module_id and m.course_id = e.course_id))
      and e.student_id = auth.uid()
    )
  );

create policy "Students submit assignments" on assignment_submissions
  for all using (
    exists(
      select 1 from enrollments 
      where id = assignment_submissions.enrollment_id 
      and student_id = auth.uid()
    )
  );
create policy "Admins review submissions" on assignment_submissions
  for all using (is_admin(auth.uid()));

-- CERTIFICATES
create policy "Students view own certificates" on certificates
  for select using (
    exists(
      select 1 from enrollments 
      where id = certificates.enrollment_id 
      and student_id = auth.uid()
    )
  );
create policy "Admins manage certificates" on certificates
  for all using (is_admin(auth.uid()));
create policy "Public verify certificates" on certificates
  for select using (true);
