import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware que:
 * 1. Redirige HTTP → HTTPS en producción (requerido por Culqi: SSL en todas las URLs)
 * 2. Añade el pathname actual como header para layouts/server components
 * 3. Rate limiting en endpoints de pago para prevenir card testing / fraude
 */

// ── Rate limiting en memoria (edge-compatible) ────────────────────────────
// Almacena { intentos, timestamp_primer_intento } por clave (userId o IP)
// Límite: 5 intentos por ventana de 10 minutos por usuario/IP
const PAYMENT_RATE_LIMIT = 5
const PAYMENT_WINDOW_MS = 10 * 60 * 1000 // 10 minutos

const attempts = new Map<string, { count: number; windowStart: number }>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now - record.windowStart > PAYMENT_WINDOW_MS) {
    // Primera vez o ventana expirada: resetear
    attempts.set(key, { count: 1, windowStart: now })
    return false
  }

  if (record.count >= PAYMENT_RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

// Limpiar entradas viejas cada 100 requests para no acumular memoria
let cleanupCounter = 0
function maybeCleanup() {
  cleanupCounter++
  if (cleanupCounter % 100 !== 0) return
  const now = Date.now()
  for (const [key, record] of attempts.entries()) {
    if (now - record.windowStart > PAYMENT_WINDOW_MS) {
      attempts.delete(key)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  // ── HTTPS redirect (Culqi requirement: SSL en todas las URLs) ──
  const proto = request.headers.get('x-forwarded-proto')
  if (proto === 'http' && process.env.NODE_ENV === 'production') {
    const httpsUrl = request.nextUrl.clone()
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, { status: 301 })
  }

  // ── Rate limiting en endpoints de pago ────────────────────────────────
  const { pathname } = request.nextUrl
  const isPaymentEndpoint =
    pathname.startsWith('/api/payments/culqi') ||
    pathname.startsWith('/api/payments/paypal')

  if (isPaymentEndpoint && request.method === 'POST') {
    maybeCleanup()

    // Usar el header de Supabase auth como clave si está disponible,
    // si no, usar la IP como fallback
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'

    // Intentamos leer el sub del JWT del cookie de Supabase para identificar al usuario
    // (el JWT no está verificado aquí, solo usamos el sub como clave de rate limit)
    let rateLimitKey = ip
    try {
      const authCookie =
        request.cookies.get('sb-access-token')?.value ||
        // Supabase SSR usa este formato de cookie
        [...request.cookies.getAll()].find(c => c.name.includes('auth-token'))?.value
      if (authCookie) {
        const payload = JSON.parse(atob(authCookie.split('.')[1]))
        if (payload?.sub) rateLimitKey = `user:${payload.sub}`
      }
    } catch {
      // Si no se puede parsear el JWT, usar IP
    }

    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Demasiados intentos de pago. Espera unos minutos e intenta de nuevo.' },
        { status: 429 }
      )
    }
  }
  // ─────────────────────────────────────────────────────────────────────

  // ── Pathname header para server components ──
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

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
