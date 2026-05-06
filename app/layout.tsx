import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider, ConfirmProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'CapyABA — Francesca Ramírez Bontá · IBA / IBT',
  description: 'Análisis Conductual Aplicado basado en evidencia para niños y familias. Terapia infantil, formación IBT/IBA y supervisiones profesionales.',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
