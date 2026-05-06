import Image from 'next/image'
import { cn } from '@/lib/utils'

export function CapyLogoFull({ className, size = 180 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/capyaba-logo.png"
      alt="CapyABA"
      width={size * 1.5}
      height={size}
      className={cn('object-contain', className)}
      priority
    />
  )
}

export function CapyMascot({ className, size = 160 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/capyaba-mascot.png"
      alt="Capy"
      width={size}
      height={size * 1.45}
      className={cn('object-contain', className)}
      priority
    />
  )
}

export function CapyLogoText({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }
  return (
    <span
      className={cn('font-bold tracking-tight', sizes[size], className)}
      style={{ letterSpacing: '-0.03em' }}
    >
      <span style={{ color: '#5F4D36' }}>capy</span>
      <span style={{ color: '#E8959A' }}>ABA</span>
    </span>
  )
}
