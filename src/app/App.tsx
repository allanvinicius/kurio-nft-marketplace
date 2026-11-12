import { useEffect } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { AppRouter } from './router/router'
import { PROTECTED_PREFIXES } from './router/router'
import { RealtimeProvider } from './providers/realtime'
import { onSessionRejected } from '@/lib/api/client'
import { endSession } from '@/features/auth/session'

/** Reage a 401 de sessão expirada em qualquer requisição: limpa dados privados e preserva o destino. */
function useSessionExpiryHandling(queryClient: QueryClient, router: AppRouter) {
  useEffect(
    () =>
      onSessionRejected(() => {
        void endSession(queryClient, 'expired').then(() => {
          toast.warning('Sua sessão expirou', { id: 'session-expired', description: 'Entre novamente para continuar de onde parou.' })
          const loc = router.state.location
          if (PROTECTED_PREFIXES.some((p) => loc.pathname.startsWith(p))) {
            void router.navigate({ to: '/login', search: { redirect: loc.href }, replace: true })
          }
        })
      }),
    [queryClient, router],
  )
}

export function App({ queryClient, router }: { queryClient: QueryClient; router: AppRouter }) {
  useSessionExpiryHandling(queryClient, router)
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RouterProvider router={router} />
      </RealtimeProvider>
    </QueryClientProvider>
  )
}
