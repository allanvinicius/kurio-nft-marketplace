import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Wallet, WalletInput, WalletRole } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/states'
import { AccountLayout } from '@/features/profile/AccountLayout'
import { useProfile } from '@/features/profile/queries'
import { ENS_FULL_RE, ENS_LABEL_RE, WALLET_ADDRESS_RE, applyApiFieldErrors, shortAddress } from '@/lib/utils/forms'
import { errorMessage } from '@/lib/api/client'
import { useSaveWallet, useWallets } from './queries'

const schema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.'),
  nickname: z.string().trim().min(2, 'Informe um apelido para a carteira.'),
  network: z.enum(['ethereum', 'polygon', 'solana'], { message: 'Selecione uma rede.' }),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.'),
  address: z.string().trim().regex(WALLET_ADDRESS_RE, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'),
  secondaryAddress: z.string().trim().refine((v) => !v || WALLET_ADDRESS_RE.test(v) || ENS_FULL_RE.test(v), 'Use um endereço 0x válido ou um nome ENS (ex.: nome.eth).'),
  provider: z.enum(['metamask', 'walletconnect', 'coinbase'], { message: 'Selecione o tipo de carteira.' }),
  referralCode: z.string().trim().min(3, 'Informe o código de indicação.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  ensSuffix: z.enum(['.eth', '.kurio.eth']),
  ensName: z.string().trim().regex(ENS_LABEL_RE, 'Use letras minúsculas, números e hífen.'),
})

type Values = z.input<typeof schema>

function toValues(w: Partial<Wallet> | undefined): Values {
  return {
    displayName: w?.displayName ?? '',
    nickname: w?.nickname ?? '',
    network: (w?.network ?? '') as Values['network'],
    profileName: w?.profileName ?? '',
    address: w?.address ?? '',
    secondaryAddress: w?.secondaryAddress ?? '',
    provider: (w?.provider ?? '') as Values['provider'],
    referralCode: w?.referralCode ?? '',
    email: w?.email ?? '',
    ensSuffix: w?.ensSuffix ?? '.eth',
    ensName: w?.ensName ?? '',
  }
}

export function WalletsPage() {
  const wallets = useWallets()
  const profile = useProfile()
  const [addingSecondary, setAddingSecondary] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const primary = wallets.data?.find((w) => w.role === 'primary')
  const secondary = wallets.data?.find((w) => w.role === 'secondary')

  return (
    <AccountLayout active="wallets">
      {wallets.isPending ? (
        <WalletsSkeleton />
      ) : wallets.isError ? (
        <ErrorState message={errorMessage(wallets.error)} onRetry={() => void wallets.refetch()} />
      ) : (
        <>
          <section aria-labelledby="primary-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 id="primary-title" className="text-[18px] font-bold">
                  Carteira principal
                </h1>
                <p className="mt-1 text-[14px] text-muted">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
              </div>
              {primary ? <span className="text-[13px] text-dim">Atualizada em {new Date(primary.updatedAt).toLocaleDateString('pt-BR')}</span> : <span className="text-[18px] font-bold text-accent-strong">Adicionar</span>}
            </div>
            <WalletForm
              role="primary"
              wallet={primary}
              defaults={{ displayName: profile.data?.displayName, email: profile.data?.email, ensName: profile.data?.ensName, profileName: profile.data?.username, nickname: profile.data?.walletNickname }}
            />
          </section>

          <section aria-labelledby="secondary-title" className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="secondary-title" className="text-[18px] font-bold">
                Carteira secundária
              </h2>
              {!secondary && primary ? (
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-[15px]">
                    <input type="checkbox" className="size-4 accent-[#d28a4c]" checked={sameAsPrimary} onChange={(e) => {
                      setSameAsPrimary(e.target.checked)
                      if (e.target.checked) setAddingSecondary(true)
                    }} />
                    Igual à carteira principal
                  </label>
                  <button type="button" onClick={() => setAddingSecondary(true)} className="text-[18px] font-bold text-accent-strong hover:underline" aria-expanded={addingSecondary}>
                    Adicionar
                  </button>
                </div>
              ) : null}
            </div>
            {secondary ? (
              <WalletForm role="secondary" wallet={secondary} defaults={{}} />
            ) : !primary ? (
              <p className="mt-2 text-[14px] text-muted">Cadastre a carteira principal antes da secundária.</p>
            ) : addingSecondary ? (
              <WalletForm
                key={sameAsPrimary ? 'same' : 'blank'}
                role="secondary"
                wallet={undefined}
                defaults={sameAsPrimary && primary ? { ...primary, nickname: 'Reserva', address: '', secondaryAddress: '' } : { displayName: primary.displayName, email: primary.email }}
                onCancel={() => {
                  setAddingSecondary(false)
                  setSameAsPrimary(false)
                }}
              />
            ) : (
              <p className="mt-2 text-[14px] text-muted">Você ainda não adicionou uma carteira secundária.</p>
            )}
          </section>
        </>
      )}
    </AccountLayout>
  )
}

function WalletForm({ role, wallet, defaults, onCancel }: { role: WalletRole; wallet: Wallet | undefined; defaults: Partial<Wallet>; onCancel?: () => void }) {
  const save = useSaveWallet()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(wallet ?? defaults) })
  const { register, control, handleSubmit, formState, setError, reset } = form
  const e = formState.errors
  const p = role === 'primary' ? 'wp' : 'ws'
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    if (wallet && !formState.isDirty) reset(toValues(wallet))
  }, [wallet, reset, formState.isDirty])

  const onSubmit = handleSubmit((v) => {
    setSaved(null)
    const body: WalletInput = { role, ...schema.parse(v), secondaryAddress: v.secondaryAddress?.trim() ? v.secondaryAddress.trim() : null }
    save.mutate(
      { id: wallet?.id, body },
      {
        onSuccess: (w) => {
          reset(toValues(w))
          const msg = `Carteira ${role === 'primary' ? 'principal' : 'secundária'} salva (${shortAddress(w.address)}).`
          setSaved(msg)
          toast.success(msg)
          if (!wallet) onCancel?.()
        },
        onError: (err) => {
          if (!applyApiFieldErrors(err, setError)) toast.error('Não foi possível salvar a carteira', { description: errorMessage(err) })
        },
      },
    )
  })

  return (
    <form noValidate onSubmit={onSubmit} className="mt-[30px]" aria-label={role === 'primary' ? 'Carteira principal' : 'Carteira secundária'}>
      <div className="grid gap-x-7 gap-y-[22px] md:grid-cols-2">
        <FormField id={`${p}-displayName`} label="Nome de exibição" required error={e.displayName?.message}>
          <Input {...register('displayName')} />
        </FormField>
        <FormField id={`${p}-nickname`} label="Apelido da carteira" required error={e.nickname?.message}>
          <Input {...register('nickname')} />
        </FormField>
        <FormField id={`${p}-network`} label="Rede" required error={e.network?.message}>
          {(a11y) => (
          <Controller
            control={control}
            name="network"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger {...a11y} onBlur={field.onBlur}>
                  <SelectValue placeholder="Selecione uma rede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          )}
        </FormField>
        <FormField id={`${p}-profileName`} label="Nome do perfil" required error={e.profileName?.message}>
          <Input {...register('profileName')} />
        </FormField>
        <FormField id={`${p}-address`} label="Endereço da carteira" required error={e.address?.message}>
          <Input {...register('address')} placeholder="Endereço 0x da carteira" spellCheck={false} autoComplete="off" />
        </FormField>
        <FormField id={`${p}-secondary`} label="ENS ou carteira secundária (opcional)" srOnlyLabel className="md:mt-[30px]" error={e.secondaryAddress?.message}>
          <Input {...register('secondaryAddress')} placeholder="ENS ou carteira secundária (opcional)" spellCheck={false} />
        </FormField>
        <FormField id={`${p}-provider`} label="Tipo de carteira" required error={e.provider?.message}>
          {(a11y) => (
          <Controller
            control={control}
            name="provider"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger {...a11y} onBlur={field.onBlur}>
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metamask">MetaMask</SelectItem>
                  <SelectItem value="walletconnect">WalletConnect</SelectItem>
                  <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          )}
        </FormField>
        <FormField id={`${p}-referral`} label="Código de indicação" required error={e.referralCode?.message}>
          <Input {...register('referralCode')} />
        </FormField>
        <FormField id={`${p}-email`} label="E-mail" required error={e.email?.message}>
          <Input type="email" {...register('email')} />
        </FormField>
        <div className="flex flex-col gap-2">
          <span id={`${p}-ens-label`} className="text-base">
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
            <Input {...register('ensName')} aria-labelledby={`${p}-ens-label`} aria-invalid={e.ensName ? true : undefined} aria-describedby={e.ensName ? `${p}-ens-error` : undefined} aria-required />
          </div>
          {e.ensName ? (
            <p id={`${p}-ens-error`} className="text-sm text-danger">
              ⚠ {e.ensName.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button type="submit" className="h-10 px-1 text-[15px]" loading={save.isPending}>
          Salvar carteira
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <p role="status" className="text-[14px] text-success">
          {saved}
        </p>
      </div>
    </form>
  )
}

function WalletsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando carteiras">
      <Skeleton className="h-6 w-48" />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
