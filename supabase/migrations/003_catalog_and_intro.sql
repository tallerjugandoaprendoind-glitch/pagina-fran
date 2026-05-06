-- =====================================================
-- capyABA · Catálogo público + campo intro de curso
-- Ejecutar en SQL Editor de Supabase
-- =====================================================

-- 1. Permitir que alumnos autenticados vean los cursos publicados
--    (sin necesidad de estar inscritos en ellos)
drop policy if exists "Students view enrolled courses" on courses;

create policy "Students view published courses"
  on courses for select
  to authenticated
  using (
    is_published = true
    or exists (
      select 1 from enrollments
      where enrollments.course_id = courses.id
        and enrollments.student_id = auth.uid()
    )
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- 2. Campos de introducción gratuita del curso
alter table public.courses
  add column if not exists intro_title text,
  add column if not exists intro_video_url text,
  add column if not exists intro_content text,
  add column if not exists cert_preview_url text;
