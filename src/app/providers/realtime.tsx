import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RealtimeClient, type RealtimeStatus } from '@/lib/socket/realtime'
import { useStoredSession } from '@/lib/auth/session-store'

const RealtimeContext = createContext<RealtimeClient | null>(null)

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '')

/**
 * Mantém um socket por sessão. Ao trocar de sessão (login, logout, expiração, troca de usuário)
 * o socket anterior é encerrado e seus listeners liberados antes de abrir o novo.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [client] = useState(() => new RealtimeClient(queryClient, SOCKET_URL))
  const session = useStoredSession()

  useEffect(() => {
    client.connect({ token: session?.token ?? null, userId: session?.userId ?? null })
  }, [client, session?.token, session?.userId])

  useEffect(() => () => client.disconnect(), [client])

  useEffect(
    () =>
      client.onNotice((n) => {
        const opts = { id: n.id, description: n.description }
        if (n.kind === 'order-rejected') toast.error(n.title, opts)
        else if (n.kind === 'order-confirmed') toast.success(n.title, opts)
        else toast.info(n.title, opts)
      }),
    [client],
  )

  if (typeof window !== 'undefined') {
    // Exposto somente para diagnóstico (painel de cenários / testes). Não altera estado.
    ;(window as unknown as { __kurioRealtime?: { stats: RealtimeClient['stats']; status: () => RealtimeStatus } }).__kurioRealtime = {
      stats: client.stats,
      status: () => client.status,
    }
  }

  return <RealtimeContext.Provider value={client}>{children}</RealtimeContext.Provider>
}

export function useRealtime(): RealtimeClient {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime fora do RealtimeProvider')
  return ctx
}

export function useRealtimeStatus(): RealtimeStatus {
  const client = useRealtime()
  return useSyncExternalStore(
    (cb) => client.onStatus(cb),
    () => client.status,
    () => 'idle' as RealtimeStatus,
  )
}

