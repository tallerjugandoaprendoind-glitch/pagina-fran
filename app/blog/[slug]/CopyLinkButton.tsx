'use client'

export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  return (
    <button
      className={className}
      onClick={() => {
        navigator.clipboard.writeText(url)
          .then(() => {
            const btn = document.activeElement as HTMLButtonElement
            const orig = btn?.innerHTML
            if (btn && orig) {
              btn.innerHTML = '✓ Enlace copiado'
              setTimeout(() => { btn.innerHTML = orig }, 2000)
            }
          })
          .catch(() => {})
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      Copiar enlace
    </button>
  )
}
