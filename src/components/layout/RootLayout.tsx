import { lazy, Suspense, useEffect, useRef } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'

const ScenarioPanel = lazy(() => import('@/features/devtools/ScenarioPanel').then((m) => ({ default: m.ScenarioPanel })))
const SHOW_PANEL = import.meta.env.VITE_ENABLE_MOCKS !== 'false' && import.meta.env.VITE_SHOW_SCENARIO_PANEL !== 'false'

const TITLES: Array<[RegExp, string]> = [
  [/^\/$/, 'KURIO — Marketplace de NFTs'],
  [/^\/nft\//, 'Detalhes do NFT — KURIO'],
  [/^\/cart/, 'Carrinho de NFTs — KURIO'],
  [/^\/checkout/, 'Pagamento — KURIO'],
  [/^\/orders\//, 'Pedido — KURIO'],
  [/^\/login/, 'Entrar — KURIO'],
  [/^\/register/, 'Criar conta — KURIO'],
  [/^\/profile/, 'Perfil do colecionador — KURIO'],
  [/^\/wallets/, 'Carteiras — KURIO'],
  [/^\/favorites/, 'Lista de interesse — KURIO'],
]

const LINED = /^\/($|login|register|profile|wallets|favorites|em-breve)/
const NO_MOBILE_FOOTER = /^\/(nft|cart|checkout|login|register)/
/** A barra inferior aparece só nas telas de navegação (frames mobile de detalhe, carrinho e pagamento têm ações fixas próprias). */
const MOBILE_NAV = /^\/($|favorites|profile|wallets|em-breve)/
/** Frame "Confirmação de Pedido": cartão isolado sobre o fundo, sem header/rodapé. */
const NO_CHROME = /^\/orders\//

export function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const mainRef = useRef<HTMLElement>(null)
  const lastPath = useRef(pathname)

  // Gerência de foco/título em navegação SPA: leva o foco ao conteúdo principal
  // apenas quando a rota muda (não na carga inicial).
  useEffect(() => {
    document.title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'KURIO'
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <>
      <a href="#conteudo" className="sr-only-focusable fixed left-4 top-4 z-[100] rounded bg-accent px-4 py-2 font-bold text-bg">
        Pular para o conteúdo
      </a>
      {NO_CHROME.test(pathname) ? null : <Header lined={LINED.test(pathname)} />}
      <main id="conteudo" ref={mainRef} tabIndex={-1} className={cn('min-h-[100dvh] outline-none md:pb-0', MOBILE_NAV.test(pathname) && 'pb-24')}>
        <Outlet />
      </main>
      {NO_CHROME.test(pathname) ? null : (
        <div className={cn(NO_MOBILE_FOOTER.test(pathname) && 'hidden md:block')}>
          <Footer />
        </div>
      )}
      {MOBILE_NAV.test(pathname) ? <MobileNav /> : null}
      <Toaster
        theme="dark"
        position="top-right"
        closeButton
        richColors={false}
        toastOptions={{
          classNames: {
            toast: '!bg-surface !text-fg !border !border-line-strong !font-mono',
            description: '!text-muted',
            title: '!font-bold',
          },
        }}
      />
      {SHOW_PANEL ? (
        <Suspense fallback={null}>
          <ScenarioPanel />
        </Suspense>
      ) : null}
    </>
  )
}
