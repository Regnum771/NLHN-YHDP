import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

// Bottom sheet over the current screen; closing returns the learner to where they were.
export function Sheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  // Callers pass a new onClose on every render (the exam re-renders each second); keeping it in
  // a ref lets the focus effect depend on `open` alone, so focus is moved once, when the sheet opens.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
