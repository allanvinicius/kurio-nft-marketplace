import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanSearch, ShoppingCart, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCartCount } from '@/features/cart/queries'
import { useStoredSession } from '@/lib/auth/session-store'
import { SearchDialog } from './SearchDialog'

/** Barra inferior do frame mobile (Figma "mobile-home"). */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const session = useStoredSession()
  const count = useCartCount()
  const [searchOpen, setSearchOpen] = useState(false)
  const item = (active: boolean) => cn('flex size-12 items-center justify-center rounded-full', active ? 'text-accent-strong' : 'text-muted')
  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="relative mx-auto flex h-[68px] max-w-[480px] items-center justify-between rounded-t-[28px] bg-surface px-6 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
        <Link to="/" className={item(pathname === '/')} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined}>
          <House className="size-6" fill={pathname === '/' ? 'currentColor' : 'none'} aria-hidden />
        </Link>
        <Link to="/favorites" className={item(pathname === '/favorites')} aria-label="Lista de interesse">
          <Heart className="size-6" fill="currentColor" aria-hidden />
        </Link>
        <span className="w-14" aria-hidden />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="absolute left-1/2 top-0 flex size-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-accent-strong to-[#b8763e] text-fg shadow-lg ring-[6px] ring-bg"
          aria-label="Buscar NFTs"
        >
          <ScanSearch className="size-7" aria-hidden />
        </button>
        <Link to="/cart" className={cn(item(pathname === '/cart'), 'relative')} aria-label={`Carrinho: ${count} ${count === 1 ? 'item' : 'itens'}`}>
          <ShoppingCart className="size-6" aria-hidden />
          {count > 0 ? (
            <span aria-hidden className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-bg">
              {count}
            </span>
          ) : null}
        </Link>
        <Link to={session ? '/profile' : '/login'} className={item(pathname === '/profile' || pathname === '/wallets')} aria-label={session ? 'Meu perfil' : 'Entrar'}>
          <UserRound className="size-6" fill="currentColor" aria-hidden />
        </Link>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  )
}
