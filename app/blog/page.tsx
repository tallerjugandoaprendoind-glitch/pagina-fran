import { createClient } from '@/lib/supabase/server'
import BlogClient from './BlogClient'

export const revalidate = 60

export default async function BlogPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_url, cover_emoji, cover_bg, category, author_name, author_initials, read_time, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  return <BlogClient posts={(posts || []) as any[]} />
}
