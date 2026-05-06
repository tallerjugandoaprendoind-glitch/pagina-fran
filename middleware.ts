import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware ligero que añade el pathname actual como header
 * para que los layouts/server components puedan saber en qué ruta están.
 *
 * Es necesario porque Next.js 14 no expone `usePathname` ni equivalente
 * en server components. Sin esto, no podemos detectar si el admin está
 * navegando a /learn/[id] (vista previa) o a otra ruta.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static (assets estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico
     * - archivos públicos
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2)$).*)',
  ],
}
