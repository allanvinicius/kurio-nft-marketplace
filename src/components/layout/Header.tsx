import { CatalogJumpLink } from '@/features/catalog/CatalogJumpLink'
import { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, LogIn, LogOut, Search, ShoppingCart, UserRound, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCartCount } from '@/features/cart/queries'
import { useLogout, useSession } from '@/features/auth/session'
import { SearchDialog } from './SearchDialog'

type NavKey = 'inicio' | 'mercado' | 'criadores' | 'aprenda'

function activeNav(pathname: string): NavKey | null {
  if (/^\/(nft|cart|checkout|orders|favorites)/.test(pathname)) return 'mercado'
  if (pathname.startsWith('/em-breve')) return null
  return 'inicio'
}

const navItem = 'relative flex h-full items-center px-0.5 text-[16px] text-fg transition-colors hover:text-accent-strong'
const activeBar = 'after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-accent'

export function Header({ lined }: { lined: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const secao = useRouterState({ select: (s) => (s.location.search as { secao?: string }).secao })
  const active = pathname.startsWith('/em-breve') ? (secao === 'aprenda' ? 'aprenda' : secao === 'criadores' ? 'criadores' : null) : activeNav(pathname)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="hidden md:block">
      <div className={cn('container-site relative flex h-[68px] items-center justify-between', lined && 'border-b border-line-strong')}>
        <Link to="/" className="text-[15px] font-bold tracking-[0.04em] text-fg" aria-label="KURIO — página inicial">
          KURIO
        </Link>
        <nav aria-label="Principal" className="flex h-full items-stretch gap-6 lg:absolute lg:left-[376px] lg:gap-10 xl:left-[376px]">
          <Link to="/" className={cn(navItem, active === 'inicio' && cn('font-bold text-accent-strong', activeBar))} aria-current={active === 'inicio' ? 'page' : undefined}>
            Início
          </Link>
          <CatalogJumpLink className={cn(navItem, active === 'mercado' && cn('font-bold text-accent-strong', activeBar))} aria-current={active === 'mercado' ? 'page' : undefined}>
            Mercado
          </CatalogJumpLink>
          <Link to="/em-breve" search={{ secao: 'criadores' }} className={cn(navItem, active === 'criadores' && cn('font-bold text-accent-strong', activeBar))}>
            Criadores
          </Link>
          <Link to="/em-breve" search={{ secao: 'aprenda' }} className={cn(navItem, active === 'aprenda' && cn('font-bold text-accent-strong', activeBar))}>
            Aprenda
          </Link>
        </nav>
        <div className="flex items-center gap-5">
          <button type="button" onClick={() => setSearchOpen(true)} className="rounded-full p-1.5 text-fg hover:text-accent-strong" aria-label="Buscar NFTs">
            <Search className="size-6" aria-hidden />
          </button>
          <CartLink />
          <AccountArea />
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}

export function CartLink({ className }: { className?: string }) {
  const count = useCartCount()
  return (
    <Link to="/cart" className={cn('relative rounded-full p-1.5 text-fg hover:text-accent-strong', className)} aria-label={`Carrinho: ${count} ${count === 1 ? 'item' : 'itens'}`}>
      <ShoppingCart className="size-6" aria-hidden />
      {count > 0 ? (
        <span aria-hidden className="absolute -right-0.5 top-0 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-bg" data-testid="cart-count">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}

function AccountArea() {
  const session = useSession()
  const href = useRouterState({ select: (s) => s.location.href })
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const logout = useLogout()
  const navigate = useNavigate()

  if (session.status === 'loading') {
    return <div role="group" aria-label="Carregando conta" aria-busy="true"><Skeleton className="h-[35px] w-[100px]" /></div>
  }

  if (session.status === 'guest') {
    const redirect = pathname === '/login' || pathname === '/register' ? undefined : href
    return (
      <Button asChild size="sm" className="h-[35px] w-[100px] gap-1 px-2 text-[17px] font-medium">
        <Link to="/login" search={{ redirect }}>
          <LogIn className="size-5" aria-hidden />
          Entrar
        </Link>
      </Button>
    )
  }

  const name = session.user?.displayName ?? 'Minha conta'
  const avatar = session.user?.avatarUrl
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-[35px] items-center gap-2 rounded-[4px] border border-accent px-2 text-sm text-fg hover:bg-accent/10" aria-label={`Menu da conta de ${name}`}>
        {avatar ? <img src={avatar} alt="" className="size-6 rounded-full object-cover" /> : <UserRound className="size-5 text-accent-strong" aria-hidden />}
        <span className="max-w-[9rem] truncate" data-testid="account-name">
          {name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{session.user?.email ?? ''}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/profile' })}>
          <UserRound className="size-4" aria-hidden /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/wallets' })}>
          <Wallet className="size-4" aria-hidden /> Carteiras
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/favorites' })}>
          <Heart className="size-4" aria-hidden /> Lista de interesse
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            logout.mutate(undefined, {
              onSettled: () => void navigate({ to: '/' }),
            })
          }
        >
          <LogOut className="size-4" aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
