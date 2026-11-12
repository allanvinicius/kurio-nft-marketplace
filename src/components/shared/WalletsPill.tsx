import { cn } from '@/lib/utils/cn'

export function WalletsPill({ className }: { className?: string }) {
  return (
    <p className={cn('inline-flex min-h-[26px] flex-wrap items-center gap-x-2.5 rounded-[4px] py-1 border border-[#55321f] bg-band px-2.5 text-[9.5px] font-bold uppercase tracking-wide text-accent-strong', className)}>
      <span>MetaMask</span>
      <span aria-hidden>•</span>
      <span>WalletConnect</span>
      <span aria-hidden>•</span>
      <span>Coinbase</span>
    </p>
  )
}
