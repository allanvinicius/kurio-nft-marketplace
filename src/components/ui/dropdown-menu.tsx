import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils/cn'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn('z-50 min-w-48 rounded-[4px] border border-line bg-surface p-1 text-fg shadow-xl', className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  ),
)
DropdownMenuContent.displayName = 'DropdownMenuContent'
export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Item ref={ref} className={cn('flex cursor-pointer items-center gap-2 rounded-[3px] px-3 py-2 text-[15px] outline-none data-[highlighted]:bg-band data-[highlighted]:text-accent-strong', className)} {...props} />
  ),
)
DropdownMenuItem.displayName = 'DropdownMenuItem'
export const DropdownMenuSeparator = () => <DropdownMenuPrimitive.Separator className="my-1 h-px bg-line" />
export const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => <DropdownMenuPrimitive.Label className="px-3 py-2 text-xs text-muted">{children}</DropdownMenuPrimitive.Label>
