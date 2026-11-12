import { createRootRouteWithContext, createRoute, createRouter, lazyRouteComponent, redirect, type ParsedLocation } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { RootLayout } from '@/components/layout/RootLayout'
import { RouteSkeleton } from '@/components/layout/RouteSkeleton'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { RouteErrorPage } from '@/components/shared/RouteErrorPage'
import { HomeRoutePage } from '@/features/catalog/HomePage'
import { catalogSearchSchema, comingSoonSchema, redirectSearchSchema, searchToParams } from './search-schemas'
import { sessionStore } from '@/lib/auth/session-store'
import { sessionQueryOptions, endSession } from '@/features/auth/session'
import { catalogQueryOptions, featuredQueryOptions } from '@/features/catalog/queries'
import { nftQueryOptions } from '@/features/nft/queries'
import { isApiError } from '@/lib/api/client'

export interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFoundPage />,
})

/** Guarda das rotas privadas: exige sessão válida, preservando o destino para retomada. */
async function requireAuth({ context, location }: { context: RouterContext; location: ParsedLocation }) {
  const stored = sessionStore.get()
  const to = { to: '/login' as const, search: { redirect: location.href } }
  if (!stored) throw redirect(to)
  try {
    await context.queryClient.ensureQueryData(sessionQueryOptions(stored.token))
  } catch (e) {
    if (isApiError(e) && e.status === 401) {
      await endSession(context.queryClient, 'expired')
      throw redirect(to)
    }
    // Falha transitória: deixa a página carregar e tratar o erro localmente.
  }
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(featuredQueryOptions())
    void context.queryClient.prefetchQuery(catalogQueryOptions(searchToParams(deps)))
  },
  component: HomeRoutePage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftQueryOptions(params.nftId))
  },
  component: lazyRouteComponent(() => import('@/features/nft/NftDetailPage'), 'NftDetailPage'),
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: lazyRouteComponent(() => import('@/features/cart/CartPage'), 'CartPage'),
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/checkout/CheckoutPage'), 'CheckoutPage'),
})

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/orders/OrderPage'), 'OrderPage'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: redirectSearchSchema,
  component: lazyRouteComponent(() => import('@/features/auth/AuthPage'), 'LoginRoutePage'),
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: redirectSearchSchema,
  component: lazyRouteComponent(() => import('@/features/auth/AuthPage'), 'RegisterRoutePage'),
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/profile/ProfilePage'), 'ProfilePage'),
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/wallets/WalletsPage'), 'WalletsPage'),
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favorites',
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import('@/features/favorites/FavoritesPage'), 'FavoritesPage'),
})

const comingSoonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/em-breve',
  validateSearch: comingSoonSchema,
  component: lazyRouteComponent(() => import('@/components/shared/ComingSoonPage'), 'ComingSoonPage'),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
  comingSoonRoute,
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RouteSkeleton,
    defaultPendingMs: 200,
    defaultPendingMinMs: 0,
    scrollRestoration: true,
    defaultErrorComponent: RouteErrorPage,
    defaultNotFoundComponent: () => <NotFoundPage />,
  })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}

export const PROTECTED_PREFIXES = ['/checkout', '/orders', '/profile', '/wallets', '/favorites']
