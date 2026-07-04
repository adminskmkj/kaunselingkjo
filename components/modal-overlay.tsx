'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalOverlayProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

export function ModalOverlay({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg',
}: ModalOverlayProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const maxW = size === 'md' ? 'max-w-lg' : 'max-w-2xl'

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/65 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[min(92dvh,880px)] w-full ${maxW} flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-8">
          <h2 id="modal-title" className="text-xl font-bold text-slate-900 sm:text-2xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8 sm:py-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-8">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  )
}