import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Loader2, MoreVertical, PlugZap, Unplug, Wallet as WalletIcon, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { CreateOrderRequest, NetworkId, Quote, Wallet, WalletConnection, WalletProvider } from '@/types/api'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { NftImage } from '@/components/shared/NftImage'
import { WalletsPill } from '@/components/shared/WalletsPill'
import { ErrorState, EmptyState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useCart, useQuote } from '@/features/cart/queries'
import { CouponForm, QuoteTotals } from '@/features/cart/CartSummary'
import { QuoteIssues } from '@/features/cart/QuoteIssues'
import { useWallets } from '@/features/wallets/queries'
import { useProfile } from '@/features/profile/queries'
import { useSession } from '@/features/auth/session'
import { useRealtimeStatus } from '@/app/providers/realtime'
import { quoteApi, walletApi } from '@/lib/api/endpoints'
import { errorMessage, isApiError } from '@/lib/api/client'
import { formatEth } from '@/lib/money/eth'
import { qk } from '@/lib/query/client'
import { readJsonStorage, writeStorage } from '@/lib/utils/storage'
import { ENS_FULL_RE, ENS_LABEL_RE, USERNAME_RE, WALLET_ADDRESS_RE, applyApiFieldErrors, shortAddress } from '@/lib/utils/forms'
import { cn } from '@/lib/utils/cn'
import { readAttempt, useOrderSubmission } from './attempt'

const NETWORKS: Array<{ id: NetworkId; label: string }> = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
]
const PROVIDERS: Array<{ id: WalletProvider; label: string; letter: string }> = [
  { id: 'walletconnect', label: 'WalletConnect', letter: 'W' },
  { id: 'metamask', label: 'MetaMask', letter: 'M' },
  { id: 'coinbase', label: 'Coinbase Wallet', letter: 'C' },
]

const schema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  username: z.string().trim().regex(USERNAME_RE, 'Use 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'),
  network: z.enum(['ethereum', 'polygon', 'solana'], { message: 'Selecione uma rede.' }),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  walletId: z.string().min(1, 'Selecione uma carteira cadastrada.'),
  secondaryAddress: z
    .string()
    .trim()
    .refine((v) => !v || WALLET_ADDRESS_RE.test(v) || ENS_FULL_RE.test(v), 'Use um endereço 0x válido ou um nome ENS (ex.: nome.eth).'),
  provider: z.enum(['metamask', 'walletconnect', 'coinbase'], { message: 'Selecione o tipo de carteira.' }),
  referralCode: z.string().trim().min(3, 'Informe o código de indicação.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  ensSuffix: z.enum(['.eth', '.kurio.eth']),
  ensName: z.string().trim().regex(ENS_LABEL_RE, 'Use letras minúsculas, números e hífen.'),
  note: z.string().max(280, 'Máximo de 280 caracteres.'),
})

type FormValues = z.infer<typeof schema>

const DRAFT_KEY = 'kurio.checkout.draft'

type ConnState = { status: 'idle' } | { status: 'connecting'; provider: WalletProvider } | { status: 'connected'; connection: WalletConnection } | { status: 'rejected'; message: string }

export function CheckoutPage() {
  const session = useSession()
  const userId = session.status === 'guest' ? null : session.userId
  const cart = useCart()
  const wallets = useWallets()
  const profile = useProfile()

  if (cart.isPending || wallets.isPending || profile.isPending) return <CheckoutSkeleton />
  if (cart.isError || wallets.isError || profile.isError) {
    const err = cart.error ?? wallets.error ?? profile.error
    return (
      <div className="container-site py-12">
        <ErrorState message={errorMessage(err)} onRetry={() => void Promise.all([cart.refetch(), wallets.refetch(), profile.refetch()])} />
      </div>
    )
  }
  const pendingAttempt = readAttempt(userId)
  if (!cart.data.items.length && !pendingAttempt) {
    return (
      <div className="container-site py-12">
        <EmptyState
          title="Nada para pagar"
          message="Seu carrinho está vazio. Adicione NFTs antes de finalizar."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      </div>
    )
  }
  if (!wallets.data.length) {
    return (
      <div className="container-site py-12">
        <EmptyState
          title="Cadastre uma carteira"
          message="Para pagar, cadastre sua carteira principal. Ela será usada para receber os NFTs comprados."
          action={
            <Button asChild>
              <Link to="/wallets">
                <WalletIcon className="size-4" aria-hidden /> Cadastrar carteira
              </Link>
            </Button>
          }
        />
      </div>
    )
  }
  return <CheckoutForm userId={userId!} wallets={wallets.data} defaults={{ ...profile.data }} />
}

function CheckoutForm({ userId, wallets, defaults }: { userId: string; wallets: Wallet[]; defaults: { displayName: string; username: string; email: string; ensName: string; ensSuffix: '.eth' | '.kurio.eth' } }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const realtime = useRealtimeStatus()
  const primary = wallets.find((w) => w.role === 'primary') ?? wallets[0]!
  const secondary = wallets.find((w) => w.role === 'secondary')
  const draft = readJsonStorage<Partial<FormValues> & { userId: string }>(DRAFT_KEY, 'session')
  const initial: FormValues = {
    displayName: defaults.displayName,
    username: defaults.username,
    network: primary.network,
    profileName: primary.profileName,
    walletId: primary.id,
    secondaryAddress: primary.secondaryAddress ?? '',
    provider: primary.provider,
    referralCode: primary.referralCode,
    email: defaults.email,
    ensSuffix: defaults.ensSuffix,
    ensName: defaults.ensName || primary.ensName,
    note: '',
    ...(draft && draft.userId === userId ? draft : {}),
  }
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: 'onTouched' })
  const { register, control, handleSubmit, formState, setError, setValue } = form
  const values = useWatch({ control })
  const network = (values.network ?? 'ethereum') as NetworkId
  const walletId = values.walletId ?? primary.id
  const provider = values.provider as WalletProvider | undefined
  const wallet = wallets.find((w) => w.id === walletId) ?? primary

  // Rascunho por usuário (sessionStorage): sobrevive à expiração de sessão e ao re-login.
  useEffect(() => {
    writeStorage(DRAFT_KEY, JSON.stringify({ ...values, userId }), 'session')
  }, [values, userId])

  const quote = useQuote(network)
  const cartQuery = useCart()
  const [conn, setConn] = useState<ConnState>({ status: 'idle' })
  const connectedId = conn.status === 'connected' ? conn.connection.id : null

  // Trocar carteira/rede/provedor invalida a conexão atual (desconexão simulada).
  const connKey = `${walletId}|${network}|${provider}`
  const lastConnKey = useRef(connKey)
  useEffect(() => {
    if (lastConnKey.current === connKey) return
    lastConnKey.current = connKey
    if (connectedId) void walletApi.disconnect(connectedId).catch(() => undefined)
    setConn({ status: 'idle' })
  }, [connKey, connectedId])

  const connect = async () => {
    if (!provider) {
      setError('provider', { message: 'Selecione o tipo de carteira.' }, { shouldFocus: true })
      return
    }
    setConn({ status: 'connecting', provider })
    try {
      const connection = await walletApi.connect({ walletId: wallet.id, provider, network })
      setConn({ status: 'connected', connection })
      toast.success(`${PROVIDERS.find((p) => p.id === provider)?.label} conectada`, { description: `${shortAddress(connection.address)} na rede ${NETWORKS.find((n) => n.id === network)?.label}.` })
      return true
    } catch (e) {
      const message = errorMessage(e)
      setConn({ status: 'rejected', message })
      if (window.matchMedia('(width < 48rem)').matches) {
        toast.error('Não foi possível conectar a carteira', { description: message })
      }
      return false
    }
  }
  const disconnect = async () => {
    if (conn.status !== 'connected') return
    try {
      await walletApi.disconnect(conn.connection.id)
    } finally {
      setConn({ status: 'idle' })
      toast.info('Carteira desconectada')
    }
  }

  // Revisão + envio
  const submission = useOrderSubmission(userId)
  const [review, setReview] = useState<{ quote: Quote; changedFrom: Quote | null; reason: string | null } | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const pendingAttempt = readAttempt(userId)

  // Recuperação: tentativa incerta (refresh/queda) é reenviada com a mesma chave.
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current) return
    const attempt = readAttempt(userId)
    if (!attempt) return
    resumed.current = true
    if (attempt.orderId) {
      void navigate({ to: '/orders/$orderId', params: { orderId: attempt.orderId }, replace: true })
      return
    }
    void submission.resume().then((r) => {
      if (r?.ok && r.order) void navigate({ to: '/orders/$orderId', params: { orderId: r.order.id }, replace: true })
    })
  }, [userId, navigate, submission])

  const openReview = handleSubmit(async () => {
    const mobile = window.matchMedia('(width < 48rem)').matches
    if (conn.status !== 'connected' && !mobile) {
      toast.error('Conecte sua carteira', { description: 'Selecione a carteira e a rede e clique em “Conectar carteira”.' })
      document.getElementById('wallet-connect-section')?.focus()
      return
    }
    setReviewing(true)
    try {
      if (conn.status !== 'connected' && !(await connect())) return
      // Revalida preço, disponibilidade, cupom e taxas com a API antes de confirmar.
      const fresh = await quoteApi.create({ network })
      qc.setQueryData(qk.quote({ kind: 'user', id: userId }, fresh.cartVersion, network), fresh)
      const shown = quote.data
      const changed = shown && shown.hash !== fresh.hash ? shown : null
      setReview({ quote: fresh, changedFrom: changed, reason: changed ? 'Os valores mudaram desde a última visualização. Revise antes de confirmar.' : null })
    } catch (e) {
      toast.error('Não foi possível revalidar a compra', { description: errorMessage(e) })
    } finally {
      setReviewing(false)
    }
  })

  const confirmOrder = async () => {
    if (!review || conn.status !== 'connected') return
    const v = form.getValues()
    const payload: CreateOrderRequest = {
      quoteId: review.quote.id,
      quoteHash: review.quote.hash,
      walletId: wallet.id,
      connectionId: conn.connection.id,
      network,
      collector: { displayName: v.displayName.trim(), username: v.username.trim(), profileName: v.profileName.trim(), email: v.email.trim(), referralCode: v.referralCode.trim(), ensName: `${v.ensName}${v.ensSuffix}`, note: v.note || undefined },
    }
    const result = await submission.submit(payload)
    if (!result) return
    if (result.ok && result.order) {
      writeStorage(DRAFT_KEY, null, 'session')
      setReview(null)
      void navigate({ to: '/orders/$orderId', params: { orderId: result.order.id } })
      return
    }
    const err = result.error
    if (isApiError(err)) {
      if (err.code === 'QUOTE_STALE' && err.details) {
        const next = err.details as Quote
        setReview({ quote: next, changedFrom: review.quote, reason: 'Os valores mudaram enquanto você confirmava. Confira a nova cotação e confirme novamente.' })
        submission.reset()
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'user' && q.queryKey[2] === 'cart' })
        return
      }
      if (err.code === 'INSUFFICIENT_AVAILABILITY' || err.code === 'CART_EMPTY') {
        setReview(null)
        submission.reset()
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'user' && q.queryKey[2] === 'cart' })
        toast.error('Disponibilidade alterada', { description: err.message })
        return
      }
      if (err.code === 'WALLET_REJECTED') {
        setConn({ status: 'idle' })
        setReview(null)
        submission.reset()
        toast.error('Carteira desconectada', { description: err.message })
        return
      }
      if (err.code === 'VALIDATION_ERROR') {
        setReview(null)
        submission.reset()
        applyApiFieldErrors(err, setError, { 'collector.displayName': 'displayName', 'collector.username': 'username', 'collector.email': 'email', walletId: 'walletId', network: 'network' })
      }
    }
  }

  // Cotação ao vivo mudou com o diálogo aberto (ex.: nft.updated): exige nova revisão.
  const liveHash = quote.data?.hash
  const reviewStale = Boolean(review && liveHash && !quote.isFetching && liveHash !== review.quote.hash)

  const totalLabel = quote.data ? formatEth(quote.data.total) : '—'
  const busy = submission.isBusy

  return (
    <div className="md:pt-8">
      <MobileTopBar title="Pagamento com carteira" align="left" className="px-7" />
      <div className="container-site max-md:px-7">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/', hash: 'catalogo' }, { label: 'Pagamento' }]} />
        <h1 className="sr-only">Pagamento</h1>

        {pendingAttempt && !pendingAttempt.orderId ? (
          <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-[6px] border border-accent/60 bg-info-bg p-4 text-[14px]">
            <Loader2 className="size-4 animate-spin text-accent-strong motion-reduce:animate-none" aria-hidden />
            <span className="flex-1">
              {submission.phase === 'uncertain'
                ? 'Não conseguimos confirmar se seu pedido foi recebido. Tentar novamente usa a mesma chave — não haverá cobrança duplicada.'
                : 'Verificando um pedido enviado anteriormente…'}
            </span>
            {submission.phase === 'uncertain' ? (
              <Button size="sm" onClick={() => void submission.resume().then((r) => { if (r?.ok && r.order) void navigate({ to: '/orders/$orderId', params: { orderId: r.order.id } }) })}>
                <RefreshCw className="size-4" aria-hidden /> Verificar novamente
              </Button>
            ) : null}
          </div>
        ) : null}

        <form noValidate onSubmit={openReview} className="mt-8 grid gap-10 max-md:mt-3 max-md:gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:grid-cols-[763px_1fr] lg:gap-8" aria-describedby="checkout-help">
          <p id="checkout-help" className="sr-only">
            Campos marcados com asterisco são obrigatórios. Após preencher, revise a cotação antes de confirmar a compra.
          </p>

          {/* Mobile: carteiras cadastradas (frame mobile-pagamento) */}
          <section aria-labelledby="m-wallets" className="order-1 md:hidden">
            <div className="flex items-center justify-between">
              <h2 id="m-wallets" className="text-[18px] font-bold">
                Carteira conectada
              </h2>
              <Link to="/wallets" className="text-[16px] font-bold text-accent-strong">
                Trocar carteira
              </Link>
            </div>
            <div role="radiogroup" aria-labelledby="m-wallets" className="mt-4 flex flex-col gap-4">
              {[...wallets].sort((a) => (a.role === 'secondary' ? -1 : 1)).map((w) => (
                <label key={w.id} className={cn('flex cursor-pointer items-center gap-4 rounded-[18px] bg-surface p-5', w.id === walletId && 'ring-1 ring-accent/70')}>
                  <input
                    type="radio"
                    name="m-wallet"
                    className="size-5 accent-[#d28a4c]"
                    checked={w.id === walletId}
                    onChange={() => {
                      setValue('walletId', w.id, { shouldDirty: true })
                      setValue('network', w.network)
                      setValue('provider', w.provider)
                      setValue('profileName', w.profileName)
                      setValue('secondaryAddress', w.secondaryAddress ?? '')
                      setValue('referralCode', w.referralCode)
                    }}
                  />
                  <span className="flex-1">
                    <span className="block text-[17px] font-bold">{w.nickname}</span>
                    <span className="block text-[15px] text-muted">{w.secondaryAddress && w.role === 'secondary' ? w.secondaryAddress : shortAddress(w.address)}</span>
                    <span className="block text-[15px] text-muted">{w.role === 'primary' ? `Rede principal ${NETWORKS.find((n) => n.id === w.network)?.label}` : `Rede ${NETWORKS.find((n) => n.id === w.network)?.label}`}</span>
                  </span>
                  <Link to="/wallets" aria-label={`Editar carteira ${w.nickname}`} className="p-1 text-muted">
                    <MoreVertical className="size-5" aria-hidden />
                  </Link>
                </label>
              ))}
            </div>
          </section>

          {/* Dados do colecionador */}
          <section aria-labelledby="collector-title" className="order-3 hidden md:block lg:order-1">
            <h2 id="collector-title" className="text-[18px] font-bold">
              Perfil do colecionador
            </h2>
            <div className="mt-5 grid gap-x-6 gap-y-[22px] sm:grid-cols-2">
              <FormField id="co-displayName" label="Nome de exibição" required error={formState.errors.displayName?.message}>
                <Input {...register('displayName')} autoComplete="name" />
              </FormField>
              <FormField id="co-username" label="Nome de usuário" required error={formState.errors.username?.message}>
                <Input {...register('username')} autoComplete="username" />
              </FormField>
              <FormField id="co-network" label="Rede" required error={formState.errors.network?.message}>
                {(a11y) => (
                <Controller
                  control={control}
                  name="network"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...a11y} onBlur={field.onBlur}>
                        <SelectValue placeholder="Selecione uma rede" />
                      </SelectTrigger>
                      <SelectContent>
                        {NETWORKS.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                )}
              </FormField>
              <FormField id="co-profileName" label="Nome do perfil" required error={formState.errors.profileName?.message}>
                <Input {...register('profileName')} />
              </FormField>
              <FormField id="co-address" label="Endereço da carteira" required hint={`Carteira ${wallet.role === 'primary' ? 'principal' : 'secundária'} cadastrada (${wallet.nickname}). Gerencie em Carteiras.`} error={formState.errors.walletId?.message}>
                <Input value={wallet.address} readOnly aria-readonly="true" className="text-muted" />
              </FormField>
              <FormField id="co-secondary" label="ENS ou carteira secundária (opcional)" srOnlyLabel error={formState.errors.secondaryAddress?.message} className="sm:mt-[30px]">
                <Input {...register('secondaryAddress')} placeholder="ENS ou carteira secundária (opcional)" />
              </FormField>
              <FormField id="co-provider" label="Tipo de carteira" required error={formState.errors.provider?.message}>
                {(a11y) => (
                <Controller
                  control={control}
                  name="provider"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...a11y} onBlur={field.onBlur}>
                        <SelectValue placeholder="Selecione uma carteira" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                )}
              </FormField>
              <FormField id="co-referral" label="Código de indicação" required error={formState.errors.referralCode?.message}>
                <Input {...register('referralCode')} />
              </FormField>
              <FormField id="co-email" label="E-mail" required error={formState.errors.email?.message}>
                <Input type="email" {...register('email')} autoComplete="email" />
              </FormField>
              <div className="flex flex-col gap-2">
                <span id="co-ens-label" className="text-base">
                  Nome ENS<span aria-hidden className="ml-1 text-required">*</span>
                  <span className="sr-only"> (obrigatório)</span>
                </span>
                <div className="flex gap-2.5">
                  <Controller
                    control={control}
                    name="ensSuffix"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-[100px] shrink-0" aria-label="Sufixo ENS">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=".eth">.eth</SelectItem>
                          <SelectItem value=".kurio.eth">.kurio.eth</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input {...register('ensName')} aria-labelledby="co-ens-label" aria-invalid={formState.errors.ensName ? true : undefined} aria-describedby={formState.errors.ensName ? 'co-ens-error' : undefined} aria-required />
                </div>
                {formState.errors.ensName ? (
                  <p id="co-ens-error" className="text-sm text-danger">
                    ⚠ {formState.errors.ensName.message}
                  </p>
                ) : null}
              </div>
            </div>

            {secondary ? (
              <label className="mt-6 flex w-fit cursor-pointer items-center gap-2 text-[16px]">
                <input
                  type="checkbox"
                  role="switch"
                  className="size-4 accent-[#d28a4c]"
                  checked={walletId === secondary.id}
                  onChange={(e) => {
                    const w = e.target.checked ? secondary : primary
                    setValue('walletId', w.id, { shouldDirty: true })
                    setValue('network', w.network)
                    setValue('provider', w.provider)
                    setValue('profileName', w.profileName)
                    setValue('secondaryAddress', w.secondaryAddress ?? '')
                  }}
                />
                Usar outra carteira? <span className="text-muted">({secondary.nickname})</span>
              </label>
            ) : (
              <p className="mt-6 text-[14px] text-muted">
                Usar outra carteira?{' '}
                <Link to="/wallets" className="text-accent-strong underline">
                  Cadastre uma carteira secundária
                </Link>
              </p>
            )}

            <FormField id="co-note" label="Observação do colecionador (opcional)" error={formState.errors.note?.message} className="mt-6 sm:max-w-[350px]">
              <Textarea {...register('note')} maxLength={280} />
            </FormField>
          </section>

          {/* Resumo + carteira e rede */}
          <aside aria-labelledby="your-nfts" className="order-2 flex flex-col">
            <h2 id="your-nfts" className="hidden text-[18px] font-bold md:block">
              Seus NFTs
            </h2>
            <div className="mt-3 hidden justify-between border-b border-line-strong pb-2 text-[17px] font-bold md:flex">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>
            <ul className="mt-3 hidden flex-col gap-3 md:flex" data-testid="checkout-lines">
              {quote.isPending
                ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[70px] w-full" />)
                : (quote.data?.lines ?? []).map((l) => (
                    <li key={l.cartItemId} className="flex items-center gap-3 bg-surface pr-4">
                      <NftImage image={l.image} sizes="70px" width={70} className="size-[70px] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-bold leading-tight">{l.name}</p>
                        <p className="text-[14px] text-subtle" title={`Edição ${l.editionLabel}`}>
                          ID do token: {l.tokenId}
                        </p>
                      </div>
                      <span className="text-[14px] text-muted">(x {l.quantity})</span>
                      <span className="w-[100px] text-right text-[18px] font-bold text-accent-strong">{formatEth(l.lineTotal)}</span>
                    </li>
                  ))}
            </ul>
            <div className="mt-3 hidden md:block">
              <QuoteIssues quote={quote.data} />
            </div>
            <details className="mt-3 hidden md:block">
              <summary className="cursor-pointer text-center text-[15px] text-fg">Tem um código promocional? Aplique aqui</summary>
              <div className="mt-3">
                <CouponForm couponCode={cartQuery.data?.couponCode ?? null} compact />
              </div>
            </details>
            <div className="hidden md:block">
              <QuoteTotals quote={quote.data} loading={quote.isPending} className="mt-3" updating={quote.isFetching && !quote.isPending} />
            </div>

            <section id="wallet-connect-section" tabIndex={-1} aria-labelledby="wallet-network" className="outline-none md:mt-6">
              <h2 id="wallet-network" className="text-[18px] font-bold md:text-center">
                Carteira e rede
              </h2>
              <div role="radiogroup" aria-labelledby="wallet-network" aria-describedby={formState.errors.provider ? 'provider-radio-error' : undefined} className="mt-4 flex flex-col gap-4">
                {PROVIDERS.map((p, i) => {
                  const checked = provider === p.id
                  return (
                    <label key={p.id} className={cn('flex h-[45px] cursor-pointer items-center gap-4 border px-5 max-md:h-[62px] max-md:rounded-[18px] max-md:border-0 max-md:bg-surface', checked ? 'border-fg' : 'border-line')}>
                      <input type="radio" name="provider-radio" value={p.id} checked={checked} onChange={() => setValue('provider', p.id, { shouldValidate: true, shouldDirty: true })} className="size-[18px] accent-[#d28a4c] max-md:order-3 max-md:ml-auto" />
                      <span aria-hidden className="hidden size-10 items-center justify-center rounded-full bg-band text-[15px] font-bold text-accent-strong max-md:flex">
                        {p.letter}
                      </span>
                      {i === 0 ? (
                        <>
                          <WalletsPill className="max-md:hidden" />
                          <span className="md:sr-only">{p.label}</span>
                        </>
                      ) : (
                        <span className="text-[16px]">{p.label}</span>
                      )}
                    </label>
                  )
                })}
              </div>
              {formState.errors.provider ? (
                <p id="provider-radio-error" className="mt-2 text-sm text-danger">
                  ⚠ {formState.errors.provider.message}
                </p>
              ) : null}

              <div className="mt-4 hidden rounded-[6px] border border-line bg-surface p-4 text-[14px] md:block" aria-live="polite" data-testid="wallet-connection">
                {conn.status === 'connected' ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="size-4" aria-hidden />
                      Conectada: {shortAddress(conn.connection.address)} · {NETWORKS.find((n) => n.id === conn.connection.network)?.label}
                    </p>
                    <Button type="button" size="sm" variant="subtle" onClick={() => void disconnect()}>
                      <Unplug className="size-4" aria-hidden /> Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={cn('flex items-center gap-2', conn.status === 'rejected' ? 'text-danger' : 'text-muted')}>
                      {conn.status === 'rejected' ? <AlertTriangle className="size-4" aria-hidden /> : null}
                      {conn.status === 'rejected' ? conn.message : conn.status === 'connecting' ? 'Aguardando aprovação na carteira…' : 'Carteira não conectada.'}
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={() => void connect()} loading={conn.status === 'connecting'}>
                      {conn.status !== 'connecting' ? <PlugZap className="size-4" aria-hidden /> : null}
                      {conn.status === 'rejected' ? 'Tentar novamente' : 'Conectar carteira'}
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <p className="mt-3 flex items-baseline justify-end gap-6 text-[18px] md:hidden">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-accent-strong">{totalLabel}</span>
            </p>
            <p className="mt-2 hidden items-center justify-end gap-1.5 text-[12px] text-dim md:flex" aria-live="polite">
              <span aria-hidden className={cn('size-2 rounded-full', realtime === 'connected' ? 'bg-success' : 'bg-danger')} />
              Tempo real: {realtime === 'connected' ? 'conectado' : realtime === 'reconnecting' ? 'reconectando…' : realtime}
            </p>
            <Button type="submit" className="mt-4 h-[45px] w-full text-[16px] max-md:fixed max-md:inset-x-7 max-md:bottom-[max(2rem,env(safe-area-inset-bottom))] max-md:z-30 max-md:h-[58px] max-md:w-auto max-md:rounded-full max-md:bg-gradient-to-r max-md:from-accent max-md:to-[#c27c43]" loading={reviewing} disabled={busy || !quote.data?.purchasable} data-testid="confirm-purchase">
              Confirmar compra
            </Button>
            {quote.data && !quote.data.purchasable ? (
              <p className="mt-2 text-center text-[12px] text-danger">
                Ajuste o{' '}
                <Link to="/cart" className="underline">
                  carrinho
                </Link>{' '}
                para continuar.
              </p>
            ) : null}
            <div className="h-24 md:hidden" aria-hidden />
          </aside>
        </form>
      </div>

      <ReviewDialog
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setReview(null)
            submission.reset()
          }
        }}
        review={review}
        stale={reviewStale}
        onRefresh={() => quote.data && setReview({ quote: quote.data, changedFrom: review?.quote ?? null, reason: 'A cotação foi atualizada em tempo real. Confira os novos valores.' })}
        onConfirm={() => void confirmOrder()}
        phase={submission.phase}
        error={submission.error}
        walletLabel={`${PROVIDERS.find((p) => p.id === provider)?.label ?? ''} · ${shortAddress(wallet.address)}`}
      />
    </div>
  )
}

function ReviewDialog({
  open,
  onOpenChange,
  review,
  stale,
  onRefresh,
  onConfirm,
  phase,
  error,
  walletLabel,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  review: { quote: Quote; changedFrom: Quote | null; reason: string | null } | null
  stale: boolean
  onRefresh: () => void
  onConfirm: () => void
  phase: ReturnType<typeof useOrderSubmission>['phase']
  error: Error | null
  walletLabel: string
}) {
  if (!review) return null
  const q = review.quote
  const busy = phase === 'sending' || phase === 'verifying'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] p-6 sm:p-8" onEscapeKeyDown={(e) => busy && e.preventDefault()} onPointerDownOutside={(e) => busy && e.preventDefault()}>
        <DialogTitle>Revise sua compra</DialogTitle>
        <DialogDescription className="mt-1">Valores confirmados pela API agora. Nenhuma cobrança é feita antes da sua confirmação.</DialogDescription>

        {review.reason ? (
          <div role="alert" className="mt-4 rounded-[6px] border border-accent/70 bg-info-bg p-3 text-[14px]">
            <p className="font-bold text-accent-strong">⚠ {review.reason}</p>
            {review.changedFrom ? (
              <p className="mt-1 text-muted">
                Total anterior <s>{formatEth(review.changedFrom.total)}</s> → novo total <strong className="text-fg">{formatEth(q.total)}</strong>
              </p>
            ) : null}
          </div>
        ) : null}
        {stale ? (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-[6px] border border-danger/60 bg-danger-bg p-3 text-[14px]">
            <span className="flex-1 text-danger">⚠ A cotação mudou em tempo real (preço ou disponibilidade). Revise antes de confirmar.</span>
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Revisar nova cotação
            </Button>
          </div>
        ) : null}

        <ul className="mt-5 flex flex-col gap-2" data-testid="review-lines">
          {q.lines.map((l) => (
            <li key={l.cartItemId} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="min-w-0 truncate">
                {l.name} <span className="text-dim">({l.editionLabel}) x{l.quantity}</span>
              </span>
              <span className="shrink-0 font-bold text-accent-strong">{formatEth(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-line pt-3">
          <QuoteTotals quote={q} loading={false} />
        </div>
        <p className="mt-3 text-[13px] text-muted">Carteira: {walletLabel}</p>
        {q.issues.length ? (
          <div className="mt-3">
            <QuoteIssues quote={q} showAcknowledge={false} />
          </div>
        ) : null}

        {phase === 'verifying' ? (
          <p role="status" className="mt-4 flex items-center gap-2 text-[14px] text-accent-strong">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> A resposta demorou. Verificando seu pedido com a mesma chave de idempotência…
          </p>
        ) : null}
        {phase === 'uncertain' ? (
          <p role="alert" className="mt-4 text-[14px] text-danger">
            ⚠ Não conseguimos confirmar o recebimento do pedido ({error?.message}). Tentar novamente é seguro: o mesmo pedido será recuperado, sem duplicidade.
          </p>
        ) : null}
        {phase === 'failed' && error ? (
          <p role="alert" className="mt-4 text-[14px] text-danger">
            ⚠ {error.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="subtle" onClick={() => onOpenChange(false)} disabled={busy}>
            Voltar
          </Button>
          <Button onClick={onConfirm} loading={busy} disabled={busy || stale || !q.purchasable} data-testid="confirm-order">
            {phase === 'uncertain' ? 'Tentar novamente' : `Confirmar e pagar ${formatEth(q.total)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="container-site pt-8" aria-busy="true" aria-label="Carregando pagamento">
      <Skeleton className="h-5 w-56" />
      <div className="mt-8 grid gap-10 xl:grid-cols-[763px_1fr]">
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-[70px] w-full" />
          <Skeleton className="h-[70px] w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  )
}

