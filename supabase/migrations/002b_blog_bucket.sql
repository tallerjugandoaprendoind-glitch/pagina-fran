-- =====================================================
-- Ejecuta esto en el SQL Editor de Supabase
-- si ves el error "Bucket not found"
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-covers',
  'blog-covers',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set public = true;

-- Policies
do $$
begin
  -- Read
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'Anyone can view blog covers'
  ) then
    execute $p$
      create policy "Anyone can view blog covers"
        on storage.objects for select
        using (bucket_id = 'blog-covers')
    $p$;
  end if;

  -- Upload
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'Admins can upload blog covers'
  ) then
    execute $p$
      create policy "Admins can upload blog covers"
        on storage.objects for insert
        with check (bucket_id = 'blog-covers')
    $p$;
  end if;
end $$;
