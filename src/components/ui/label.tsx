import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils/cn'

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }>(
  ({ className, required, children, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn('text-base text-fg', className)} {...props}>
      {children}
      {required ? (
        <>
          <span aria-hidden className="ml-0.5 text-required">*</span>
          <span className="sr-only"> (obrigatório)</span>
        </>
      ) : null}
    </LabelPrimitive.Root>
  ),
)
Label.displayName = 'Label'
