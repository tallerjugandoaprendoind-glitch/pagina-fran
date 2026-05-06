'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

type ToastContextType = {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe estar dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info
  const styles = {
    success: 'bg-white border-mocha-300 text-ink-900',
    error: 'bg-white border-red-300 text-ink-900',
    info: 'bg-white border-brand-300 text-ink-900',
  }
  const iconStyles = {
    success: 'text-mocha-600',
    error: 'text-red-600',
    info: 'text-brand-600',
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3 pr-2 rounded-lg border-2 shadow-card-hover animate-slide-up ${styles[toast.type]}`}
      role="status"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[toast.type]}`} />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button onClick={onDismiss} className="p-0.5 hover:bg-ink-100 rounded text-ink-400">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/**
 * Modal de confirmación pulcro — reemplaza confirm() del navegador.
 */
type ConfirmContextType = {
  confirm: (opts: { title: string; message: string; danger?: boolean; confirmText?: string }) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe estar dentro de <ConfirmProvider>')
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean
    title: string
    message: string
    danger: boolean
    confirmText: string
    resolve?: (v: boolean) => void
  }>({
    open: false, title: '', message: '', danger: false, confirmText: 'Confirmar',
  })

  const confirm = useCallback((opts: { title: string; message: string; danger?: boolean; confirmText?: string }) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: opts.title,
        message: opts.message,
        danger: opts.danger || false,
        confirmText: opts.confirmText || 'Confirmar',
        resolve,
      })
    })
  }, [])

  function handleClose(value: boolean) {
    state.resolve?.(value)
    setState((s) => ({ ...s, open: false }))
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink-900/40 animate-fade-in" onClick={() => handleClose(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-card-hover animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink-900 mb-2">{state.title}</h3>
            <p className="text-sm text-ink-600 mb-6 leading-relaxed">{state.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => handleClose(false)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => handleClose(true)}
                className={state.danger
                  ? 'inline-flex items-center justify-center px-5 py-2.5 bg-red-600 text-white rounded-md font-semibold transition-all duration-150 hover:bg-red-700 active:scale-[0.98]'
                  : 'btn-primary'
                }
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
