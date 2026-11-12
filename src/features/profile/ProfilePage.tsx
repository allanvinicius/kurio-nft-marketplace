import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/states'
import { ENS_LABEL_RE, USERNAME_RE, applyApiFieldErrors } from '@/lib/utils/forms'
import { errorMessage } from '@/lib/api/client'
import { AccountLayout } from './AccountLayout'
import { useChangePassword, useProfile, useUpdateAvatar, useUpdateProfile } from './queries'

const schema = z
  .object({
    displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40, 'Máximo de 40 caracteres.'),
    username: z.string().trim().toLowerCase().regex(USERNAME_RE, 'Use 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'),
    email: z.string().trim().email('Informe um e-mail válido.'),
    ensSuffix: z.enum(['.eth', '.kurio.eth']),
    ensName: z.string().trim().regex(ENS_LABEL_RE, 'Use letras minúsculas, números e hífen.'),
    walletNickname: z.string().trim().min(2, 'Informe um apelido para a carteira.').max(30, 'Máximo de 30 caracteres.'),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    const any = v.currentPassword || v.newPassword || v.confirmPassword
    if (!any) return
    if (!v.currentPassword) ctx.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe a senha atual.' })
    if (v.newPassword.length < 8 || !/[A-Za-z]/.test(v.newPassword) || !/\d/.test(v.newPassword)) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Mínimo de 8 caracteres, com letras e números.' })
    if (v.newPassword !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não conferem.' })
  })

type Values = z.infer<typeof schema>

export function ProfilePage() {
  const profile = useProfile()
  return (
    <AccountLayout active="profile">
      <h1 className="text-[18px] font-bold">Perfil do colecionador</h1>
      {profile.isPending ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <ErrorState className="mt-6" message={errorMessage(profile.error)} onRetry={() => void profile.refetch()} />
      ) : (
        <ProfileForm profile={profile.data} />
      )}
    </AccountLayout>
  )
}

function toValues(p: Profile): Values {
  return { displayName: p.displayName, username: p.username, email: p.email, ensSuffix: p.ensSuffix, ensName: p.ensName, walletNickname: p.walletNickname, currentPassword: '', newPassword: '', confirmPassword: '' }
}

function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const password = useChangePassword()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(profile) })
  const { register, control, handleSubmit, formState, setError, reset } = form
  const [status, setStatus] = useState<string | null>(null)
  const e = formState.errors

  // Dados confirmados pela API (ou refetch) passam a ser a nova base do formulário.
  useEffect(() => {
    if (!formState.isDirty) reset(toValues(profile))
  }, [profile, reset, formState.isDirty])

  const onSubmit = handleSubmit(async (v) => {
    setStatus(null)
    const tasks: string[] = []
    try {
      if (formState.dirtyFields.displayName || formState.dirtyFields.username || formState.dirtyFields.email || formState.dirtyFields.ensName || formState.dirtyFields.ensSuffix || formState.dirtyFields.walletNickname) {
        const saved = await update.mutateAsync({ displayName: v.displayName, username: v.username, email: v.email, ensName: v.ensName, ensSuffix: v.ensSuffix, walletNickname: v.walletNickname })
        tasks.push('Perfil atualizado')
        reset({ ...toValues(saved), currentPassword: v.currentPassword, newPassword: v.newPassword, confirmPassword: v.confirmPassword }, { keepDirty: false })
      }
    } catch (err) {
      if (!applyApiFieldErrors(err, setError)) toast.error('Não foi possível salvar o perfil', { description: errorMessage(err) })
      return
    }
    if (v.currentPassword) {
      try {
        await password.mutateAsync({ currentPassword: v.currentPassword, newPassword: v.newPassword })
        tasks.push('senha alterada')
        form.resetField('currentPassword')
        form.resetField('newPassword')
        form.resetField('confirmPassword')
      } catch (err) {
        if (!applyApiFieldErrors(err, setError)) toast.error('Não foi possível alterar a senha', { description: errorMessage(err) })
        return
      }
    }
    const msg = tasks.length ? `${tasks.join(' e ')}.` : 'Nenhuma alteração para salvar.'
    setStatus(msg)
    if (tasks.length) toast.success(msg)
  })

  return (
    <form noValidate onSubmit={onSubmit} className="mt-[30px]" aria-label="Dados do perfil">
      <div className="grid gap-x-7 gap-y-[22px] md:grid-cols-2">
        <FormField id="pf-displayName" label="Nome de exibição" required error={e.displayName?.message}>
          <Input {...register('displayName')} autoComplete="name" />
        </FormField>
        <FormField id="pf-username" label="Nome de usuário" required error={e.username?.message}>
          <Input {...register('username')} autoComplete="username" />
        </FormField>
        <FormField id="pf-email" label="E-mail" required error={e.email?.message}>
          <Input type="email" {...register('email')} autoComplete="email" />
        </FormField>
        <div className="flex flex-col gap-2">
          <span id="pf-ens-label" className="text-base">
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
            <Input {...register('ensName')} aria-labelledby="pf-ens-label" aria-invalid={e.ensName ? true : undefined} aria-describedby={e.ensName ? 'pf-ens-error' : undefined} aria-required />
          </div>
          {e.ensName ? (
            <p id="pf-ens-error" className="text-sm text-danger">
              ⚠ {e.ensName.message}
            </p>
          ) : null}
        </div>
        <FormField id="pf-nickname" label="Apelido da carteira" required error={e.walletNickname?.message}>
          <Input {...register('walletNickname')} />
        </FormField>
        <AvatarField profile={profile} />
      </div>

      <fieldset className="mt-10 max-w-[417px]">
        <legend className="text-[18px] font-bold">Alterar senha</legend>
        <div className="mt-[22px] flex flex-col gap-[22px]">
          <PasswordField id="pf-current" label="Senha atual" error={e.currentPassword?.message} autoComplete="current-password" {...register('currentPassword')} />
          <PasswordField id="pf-new" label="Nova senha" error={e.newPassword?.message} autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." {...register('newPassword')} />
          <PasswordField id="pf-confirm" label="Confirmar nova senha" error={e.confirmPassword?.message} autoComplete="new-password" {...register('confirmPassword')} />
        </div>
      </fieldset>

      <div className="mt-8 flex items-center gap-4">
        <Button type="submit" className="h-10 w-[131px] text-[15px]" loading={formState.isSubmitting}>
          Salvar
        </Button>
        <p role="status" className="text-[14px] text-success">
          {status}
        </p>
      </div>
    </form>
  )
}

const PasswordField = ({ id, label, error, hint, ...rest }: { id: string; label: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) => {
  const [show, setShow] = useState(false)
  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      <PasswordInner show={show} onToggleVisibility={() => setShow((s) => !s)} {...rest} />
    </FormField>
  )
}

function PasswordInner({ show, onToggleVisibility, ...rest }: { show: boolean; onToggleVisibility: () => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className="pr-11" {...rest} />
      <button type="button" onClick={onToggleVisibility} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-subtle hover:text-fg" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={show}>
        {show ? <Eye className="size-5" aria-hidden /> : <EyeOff className="size-5" aria-hidden />}
      </button>
    </div>
  )
}

const MAX_SOURCE_BYTES = 5 * 1024 * 1024

/** Redimensiona para 256px (WebP) antes do envio: mantém o payload pequeno. */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const s = Math.min(bitmap.width, bitmap.height)
  ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size)
  return canvas.toDataURL('image/webp', 0.85)
}

function AvatarField({ profile }: { profile: Profile }) {
  const input = useRef<HTMLInputElement>(null)
  const avatar = useUpdateAvatar()
  const [error, setError] = useState<string | null>(null)
  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Formato não suportado. Use PNG, JPG ou WebP.')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('A imagem deve ter até 5 MB.')
      return
    }
    try {
      const dataUrl = await toAvatarDataUrl(file)
      await avatar.mutateAsync(dataUrl)
      toast.success('Avatar atualizado')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <span id="pf-avatar-label" className="text-base">
        Avatar
      </span>
      <div className="flex items-center gap-6">
        <span className="flex size-[50px] items-center justify-center overflow-hidden rounded-full bg-band text-accent-strong" data-testid="avatar-preview">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`Avatar de ${profile.displayName}`} className="size-full object-cover" /> : <ImageIcon className="size-6" aria-label="Sem avatar" />}
        </span>
        <input ref={input} id="pf-avatar" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-labelledby="pf-avatar-label" aria-describedby={error ? 'pf-avatar-error' : undefined} onChange={(e) => void onFile(e.target.files?.[0])} data-testid="avatar-input" />
        <Button type="button" className="h-10 w-[98px] text-[15px]" onClick={() => input.current?.click()} loading={avatar.isPending && avatar.variables !== null}>
          Alterar
        </Button>
        <button type="button" className="text-[15px] text-fg hover:text-accent-strong disabled:opacity-40" disabled={!profile.avatarUrl || avatar.isPending} onClick={() => avatar.mutate(null, { onSuccess: () => toast.success('Avatar removido'), onError: (e) => setError(errorMessage(e)) })}>
          Remover
        </button>
      </div>
      {error ? (
        <p id="pf-avatar-error" role="alert" className="text-sm text-danger">
          ⚠ {error}
        </p>
      ) : null}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2" aria-busy="true" aria-label="Carregando perfil">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}
