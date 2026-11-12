import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Wallet, WalletInput } from '@/types/api'
import { walletApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/client'
import { useStoredSession } from '@/lib/auth/session-store'

export function useWallets() {
  const session = useStoredSession()
  return useQuery({
    queryKey: qk.wallets(session?.userId ?? 'anon'),
    queryFn: ({ signal }) => walletApi.list({ signal }),
    enabled: Boolean(session),
    staleTime: 60_000,
  })
}

export function useSaveWallet() {
  const qc = useQueryClient()
  const session = useStoredSession()
  return useMutation({
    mutationFn: (vars: { id?: string; body: WalletInput }) => (vars.id ? walletApi.update(vars.id, vars.body) : walletApi.create(vars.body)),
    onSuccess: (wallet) => {
      const key = qk.wallets(session?.userId ?? 'anon')
      qc.setQueryData<Wallet[]>(key, (old) => {
        const list = old ?? []
        return list.some((w) => w.id === wallet.id) ? list.map((w) => (w.id === wallet.id ? wallet : w)) : [...list, wallet]
      })
      void qc.invalidateQueries({ queryKey: key })
    },
  })
}
