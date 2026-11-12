import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** shadcn/ui Dialog (Radix): foco preso, Esc fecha, foco restaurado ao gatilho. */

/**
 * Diálogos controlados (sem DialogTrigger) não têm para onde devolver o foco no Radix.
 * Guardamos o elemento ativo na abertura e o restauramos no fechamento.
 */
function useFocusReturn(props: { onOpenAutoFocus?: (e: Event) => void; onCloseAutoFocus?: (e: Event) => void }) {
  const returnTo = React.useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: (e: Event) => {
      const active = document.activeElement
      const content = e.currentTarget instanceof Node ? e.currentTarget : null
      returnTo.current = active instanceof HTMLElement && active !== document.body && !content?.contains(active) ? active : null
      props.onOpenAutoFocus?.(e)
    },
    onCloseAutoFocus: (e: Event) => {
      props.onCloseAutoFocus?.(e)
      const el = returnTo.current
      if (!e.defaultPrevented && el && document.contains(el)) {
        e.preventDefault()
        el.focus()
      }
    },
  }
}
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-xl font-bold text-fg', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'
export const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { overlayClassName?: string; hideClose?: boolean; accentBar?: boolean }
>(({ className, children, overlayClassName, hideClose, accentBar = true, ...props }, ref) => {
  const focusReturn = useFocusReturn(props)
  return (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-black/55 data-[state=open]:animate-in', overlayClassName)} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-surface text-fg shadow-2xl outline-none',
        accentBar && 'border-b-[10px] border-accent',
        className,
      )}
      {...props}
      {...focusReturn}
    >
      {children}
      {hideClose ? null : (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded p-1 text-accent-strong hover:text-fg" aria-label="Fechar">
          <X className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
  )
})
DialogContent.displayName = 'DialogContent'

/** Drawer lateral/inferior (shadcn "Sheet") sobre Radix Dialog. */
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'left' | 'right' | 'bottom' }
>(({ className, children, side = 'left', ...props }, ref) => {
  const focusReturn = useFocusReturn(props)
  return (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col overflow-y-auto bg-surface text-fg shadow-2xl outline-none',
        side === 'left' && 'inset-y-0 left-0 w-[min(88vw,360px)]',
        side === 'right' && 'inset-y-0 right-0 w-[min(88vw,360px)]',
        side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[24px]',
        className,
      )}
      {...props}
      {...focusReturn}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded p-1 text-accent-strong hover:text-fg" aria-label="Fechar">
        <X className="size-5" aria-hidden />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
  )
})
SheetContent.displayName = 'SheetContent'
