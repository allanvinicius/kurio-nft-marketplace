import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

/** shadcn/ui Button adaptado à identidade KURIO (accent laranja, cantos de 4px). */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-bg hover:bg-accent-hover',
        outline: 'border border-accent text-accent-strong hover:bg-accent/10',
        ghost: 'text-fg hover:bg-surface',
        link: 'text-accent-strong underline-offset-4 hover:underline font-medium',
        subtle: 'border border-line bg-bg text-fg hover:border-accent',
      },
      size: {
        sm: 'h-9 rounded-[4px] px-3 text-sm',
        md: 'h-10 rounded-[4px] px-4 text-[15px]',
        lg: 'h-[45px] rounded-[4px] px-6 text-base',
        pill: 'h-12 rounded-full px-8 text-base',
        icon: 'size-10 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={asChild ? undefined : disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" /> : null}
          {children}
        </>
      )}
    </Comp>
  )
})
Button.displayName = 'Button'
