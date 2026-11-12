import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, SheetContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockControlApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/client'
import { useCart } from '@/features/cart/queries'
import { useRealtime, useRealtimeStatus } from '@/app/providers/realtime'
import { addEth } from '@/lib/money/eth'

const actionClassName = 'h-auto min-h-9 min-w-0 whitespace-normal wrap-anywhere px-2 py-1.5 text-center text-xs leading-tight'

/**
 * Painel de cenários (demonstração/avaliação). Todas as ações chamam endpoints
 * `/__mock/*` do MSW, que alteram o estado do servidor simulado; a interface só
 * reage pelas respostas REST e pelos eventos Socket.IO resultantes.
 */
export function ScenarioPanel() {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const cart = useCart()
  const realtime = useRealtime()
  const status = useRealtimeStatus()
  const scenarios = useQuery({ queryKey: ['__mock', 'scenario'], queryFn: () => mockControlApi.scenario(), enabled: open, staleTime: 0 })
  const [stats, setStats] = useState(realtime.stats)
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setStats({ ...realtime.stats }), 500)
    return () => clearInterval(t)
  }, [open, realtime])

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      toast.message(`Cenário: ${label}`)
    } catch (e) {
      toast.error(`Falha ao executar "${label}"`, { description: errorMessage(e) })
    }
  }
  const firstItem = cart.data?.items[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-40 flex size-11 max-md:right-0 max-md:top-[38%] max-md:size-9 max-md:rounded-r-none md:bottom-4 md:left-4 items-center justify-center rounded-full border border-line-strong bg-surface text-accent-strong shadow-lg hover:bg-band md:bottom-4 md:left-4"
        aria-label="Abrir painel de cenários da simulação"
        data-testid="scenario-panel-toggle"
      >
        <FlaskConical className="size-5" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="gap-3 px-4 py-5 md:px-5" aria-describedby="scn-desc">
          <DialogTitle className="pr-8 text-base">Cenários da simulação</DialogTitle>
          <DialogDescription id="scn-desc">Controle o backend MSW e o servidor Socket.IO simulado. Ações afetam apenas este navegador.</DialogDescription>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="scn-select" className="text-sm font-bold">
              Cenário ativo
            </label>
            <Select
              value={scenarios.data?.current.id}
              onValueChange={(id) => void run(`cenário "${id}" ativado`, async () => {
                await mockControlApi.setScenario(id)
                await scenarios.refetch()
                await qc.invalidateQueries()
              })}
            >
              <SelectTrigger id="scn-select" className="h-9 text-sm">
                <SelectValue placeholder="Carregando…" />
              </SelectTrigger>
              <SelectContent>
                {(scenarios.data?.scenarios ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted">{scenarios.data?.current.description}</p>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <p className="text-sm font-bold">Tempo real (Socket.IO)</p>
            <p className="text-xs text-muted" data-testid="realtime-status">
              Status: {status} · recebidos {stats.received} · aplicados {stats.applied} · duplicados {stats.ignoredDuplicate} · antigos {stats.ignoredStale} · de outra sessão {stats.ignoredForeign}
            </p>
            <Button size="sm" className={actionClassName} variant="outline" disabled={!firstItem} onClick={() => firstItem && void run('preço alterado', () => mockControlApi.nftUpdate({ nftId: firstItem.nftId, editionId: firstItem.editionId, price: addEth(firstItem.unitPrice, '0.10') }))}>
              Alterar preço do 1º item do carrinho (+0.10)
            </Button>
            <Button size="sm" className={actionClassName} variant="outline" disabled={!firstItem} onClick={() => firstItem && void run('disponibilidade reduzida', () => mockControlApi.nftUpdate({ nftId: firstItem.nftId, editionId: firstItem.editionId, available: Math.max(0, firstItem.quantity - 1) }))}>
              Reduzir disponibilidade do 1º item
            </Button>
            <Button size="sm" className={actionClassName} variant="outline" onClick={() => void run('evento duplicado reenviado', () => mockControlApi.replayEvent())}>
              Reenviar último evento (duplicata)
            </Button>
            <Button size="sm" className={actionClassName} variant="outline" onClick={() => void run('evento antigo enviado', () => mockControlApi.staleEvent(firstItem?.nftId ?? 'emerald-ape-042'))}>
              Enviar evento antigo (versão menor)
            </Button>
            <Button size="sm" className={actionClassName} variant="outline" onClick={() => void run('socket desconectado', () => mockControlApi.disconnectSocket())}>
              Derrubar conexão em tempo real
            </Button>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <p className="text-sm font-bold">Sessão e dados</p>
            <Button size="sm" className={actionClassName} variant="outline" onClick={() => void run('sessão expirada no servidor', () => mockControlApi.expireSession())}>
              Expirar sessão no servidor
            </Button>
            <Button
              size="sm"
              className={actionClassName}
              onClick={() =>
                void run('dados restaurados', async () => {
                  await mockControlApi.reset()
                  for (const k of ['kurio.session', 'kurio.guestCartId', 'kurio.checkout.attempt']) localStorage.removeItem(k)
                  sessionStorage.clear()
                  window.location.assign('/')
                })
              }
            >
              Resetar cenário conhecido (dados + sessão)
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </>
  )
}
