// app/(admin)/admin/blog/new/page.tsx
// ✅ 'use client' NO es necesario aquí porque BlogPostEditor ya lo es.
// Solo renderizamos el componente sin props que contengan handlers.

import { BlogPostEditor } from '@/components/admin/BlogPostEditor'

export default function NewBlogPostPage() {
  return <BlogPostEditor />
}
