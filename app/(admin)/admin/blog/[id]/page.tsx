// app/(admin)/admin/blog/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BlogPostEditor } from '@/components/admin/BlogPostEditor'

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!post) notFound()

  // Parse content — puede venir como:
  // 1. Array de páginas [{id, blocks:[]}]  (formato nuevo)
  // 2. Array de bloques [{id, type, content}] (formato antiguo)
  // 3. String JSON de cualquiera de los dos
  // 4. null/undefined
  let parsedContent: any[] = []
  if (typeof post.content === 'string') {
    try { parsedContent = JSON.parse(post.content) } catch { parsedContent = [] }
  } else if (Array.isArray(post.content)) {
    parsedContent = post.content
  }

  const normalized = {
    ...post,
    cover_url: post.cover_url || '',
    content: parsedContent,
    tags: Array.isArray(post.tags) ? post.tags : [],
  }

  return <BlogPostEditor post={normalized as any} />
}
