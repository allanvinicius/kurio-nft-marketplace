import { Link, useNavigate } from '@tanstack/react-router'
import { Download, Heart, LifeBuoy, LogOut, MapPin, ShoppingCart, TrendingUp, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useLogout } from '@/features/auth/session'

type Section = 'profile' | 'wallets' | 'favorites'

const itemClass = 'relative flex h-[45px] w-full items-center gap-3 pl-4 pr-3 text-[16px] text-accent-strong transition-colors hover:bg-band/60'

/** Layout das telas de conta (frames "Perfil do Colecionador" e "Carteiras"). */
export function AccountLayout({ active, children }: { active: Section; children: React.ReactNode }) {
  const logout = useLogout()
  const navigate = useNavigate()
  const activeCls = 'bg-[#2a1a14] before:absolute before:inset-y-0 before:left-0 before:w-[6px] before:bg-accent'
  return (
    <div className="container-site pb-10 pt-6 md:pt-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-7 [&>*]:min-w-0">
        <nav aria-label="Minha conta" className="self-start bg-surface lg:pb-0">
          <h2 className="px-[10px] pb-1 pt-[18px] text-[20px] font-bold max-lg:hidden">Meu perfil</h2>
          <ul className="flex gap-1 overflow-x-auto scrollbar-none max-lg:p-2 lg:mt-1 lg:flex-col lg:gap-0">
            <li className="shrink-0">
              <Link to="/profile" className={cn(itemClass, active === 'profile' && activeCls)} aria-current={active === 'profile' ? 'page' : undefined}>
                <UserRound className="size-[18px]" aria-hidden /> Dados do perfil
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/wallets" className={cn(itemClass, active === 'wallets' && activeCls)} aria-current={active === 'wallets' ? 'page' : undefined}>
                <MapPin className="size-[18px]" aria-hidden /> Carteiras
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/em-breve" search={{ secao: 'atividade' }} className={itemClass}>
                <ShoppingCart className="size-[18px]" aria-hidden /> Atividade <span className="sr-only">(indisponível na demonstração)</span>
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/favorites" className={cn(itemClass, active === 'favorites' && activeCls)} aria-current={active === 'favorites' ? 'page' : undefined}>
                <Heart className="size-[18px]" aria-hidden /> Lista de interesse
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/em-breve" search={{ secao: 'ofertas' }} className={itemClass}>
                <TrendingUp className="size-[18px]" aria-hidden /> Ofertas <span className="sr-only">(indisponível na demonstração)</span>
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/em-breve" search={{ secao: 'downloads' }} className={itemClass}>
                <Download className="size-[18px]" aria-hidden /> Arquivos baixados <span className="sr-only">(indisponível na demonstração)</span>
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/em-breve" search={{ secao: 'suporte' }} className={itemClass}>
                <LifeBuoy className="size-[18px]" aria-hidden /> Suporte <span className="sr-only">(indisponível na demonstração)</span>
              </Link>
            </li>
            <li className="shrink-0 lg:mt-0 lg:border-t lg:border-line-strong/60">
              <button
                type="button"
                className={cn(itemClass, 'font-bold text-accent-strong lg:h-12')}
                onClick={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: '/' }) })}
                disabled={logout.isPending}
              >
                <LogOut className="size-5" aria-hidden /> Sair
              </button>
            </li>
          </ul>
        </nav>
        <div>{children}</div>
      </div>
    </div>
  )
}
