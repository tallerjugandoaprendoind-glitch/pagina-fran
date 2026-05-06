import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — CapyABA',
  description: 'Artículos sobre ciencia del comportamiento y ABA',
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
