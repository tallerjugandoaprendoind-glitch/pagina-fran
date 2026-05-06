-- =====================================================
-- CapyABA · Blog Posts
-- Ejecutar en SQL Editor de Supabase
-- =====================================================

create table public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,           -- HTML del editor Tiptap
  cover_url text,
  cover_emoji text default '📝',
  cover_bg text default '#F2C8B6',
  category text not null default 'Divulgación',
  author_name text not null default 'Francesca R.B.',
  author_initials text not null default 'FR',
  read_time int not null default 5,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- RLS
alter table public.blog_posts enable row level security;

-- Cualquiera puede leer posts publicados
create policy "Public can read published posts"
  on public.blog_posts for select
  using (is_published = true);

-- Solo admins pueden hacer todo
create policy "Admins can do everything"
  on public.blog_posts for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Storage bucket para imágenes del blog
insert into storage.buckets (id, name, public)
values ('blog-covers', 'blog-covers', true)
on conflict (id) do nothing;

create policy "Anyone can view blog covers"
  on storage.objects for select
  using (bucket_id = 'blog-covers');

create policy "Admins can upload blog covers"
  on storage.objects for insert
  with check (
    bucket_id = 'blog-covers' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete blog covers"
  on storage.objects for delete
  using (
    bucket_id = 'blog-covers' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
