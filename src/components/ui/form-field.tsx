import * as React from 'react'
import { Label } from './label'
import { cn } from '@/lib/utils/cn'

export interface FieldA11yProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

/**
 * Campo de formulário acessível: label associada, erro ligado por aria-describedby
 * e aria-invalid no controle filho.
 */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  labelClassName,
  srOnlyLabel,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  labelClassName?: string
  srOnlyLabel?: boolean
  /** Elemento controlado (recebe id/aria-* por clone) ou render-prop para controles compostos (ex.: Select). */
  children: React.ReactElement<Record<string, unknown>> | ((a11y: FieldA11yProps) => React.ReactNode)
}) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  const a11y: FieldA11yProps = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined }
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} required={required} className={cn(srOnlyLabel && 'sr-only', labelClassName)}>
        {label}
      </Label>
      {typeof children === 'function'
        ? children(a11y)
        : React.cloneElement(children, a11y as unknown as Record<string, unknown>)}
      {hint ? (
        <p id={hintId} className="text-xs text-dim">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1 text-sm text-danger">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      ) : null}
    </div>
  )
}
