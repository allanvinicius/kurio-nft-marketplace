import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export const inputClass =
  'h-10 w-full rounded-[4px] border border-line bg-surface px-3 text-[15px] text-fg placeholder:text-subtle transition-colors focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent-strong disabled:opacity-60 aria-[invalid=true]:border-danger'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(inputClass, className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputClass, 'h-auto min-h-[150px] py-2', className)} {...props} />
))
Textarea.displayName = 'Textarea'
