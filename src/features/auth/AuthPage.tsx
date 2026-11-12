import { useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { GoogleIcon, FacebookBrandIcon } from '@/components/shared/brand-icons'
import { HomePage } from '@/features/catalog/HomePage'
import { applyApiFieldErrors, USERNAME_RE } from '@/lib/utils/forms'
import { errorMessage, isApiError } from '@/lib/api/client'
import { useLogin, useRegister } from './session'
import { sessionStore } from '@/lib/auth/session-store'

const loginApi = getRouteApi('/login')
const registerApi = getRouteApi('/register')

export function LoginRoutePage() {
  const { redirect } = loginApi.useSearch()
  return <AuthScreen mode="login" redirect={redirect} />
}

export function RegisterRoutePage() {
  const { redirect } = registerApi.useSearch()
  return <AuthScreen mode="register" redirect={redirect} />
}

function AuthScreen({ mode, redirect }: { mode: 'login' | 'register'; redirect?: string }) {
  const navigate = useNavigate()
  const expired = sessionStore.lastEnd()?.reason === 'expired'
  const done = () => void navigate({ to: redirect ?? '/', replace: true })
  const close = () => void navigate({ to: '/' })
  return (
    <>
      {/* Fundo do frame "Login/Cadastro": a home, inerte enquanto o diálogo está aberto. */}
      <div className="hidden md:block" aria-hidden>
        <HomePage search={{}} />
      </div>
      <Dialog open onOpenChange={(o) => !o && close()}>
        <DialogContent
          overlayClassName="bg-black/35 max-md:bg-bg"
          className={cn(
            'max-w-[500px] px-6 pb-12 pt-[50px] md:px-20',
            'max-md:inset-0 max-md:left-0 max-md:top-0 max-md:h-[100dvh] max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:border-b-0 max-md:bg-bg max-md:px-7 max-md:pt-20',
          )}
        >
          <p className="mb-16 text-center text-[42px] font-bold tracking-[0.08em] md:hidden" aria-hidden>
            KURIO
          </p>
          <div className="mb-8 hidden items-center justify-center gap-2 text-[20px] md:flex" role="tablist" aria-label="Acesso">
            <Link to="/login" search={{ redirect }} role="tab" aria-selected={mode === 'login'} className={cn('font-bold', mode === 'login' ? 'text-accent-strong' : 'text-fg hover:text-accent-strong')} replace>
              Entrar
            </Link>
            <span aria-hidden className="h-6 w-px bg-accent" />
            <Link to="/register" search={{ redirect }} role="tab" aria-selected={mode === 'register'} className={cn('font-bold', mode === 'register' ? 'text-accent-strong' : 'text-fg hover:text-accent-strong')} replace>
              Criar conta
            </Link>
          </div>
          <DialogTitle className="mb-4 text-center text-[24px] md:sr-only">{mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}</DialogTitle>
          <DialogDescription className="mb-6 text-center text-[13px] text-fg max-md:sr-only">
            {mode === 'login' ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.' : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
          </DialogDescription>
          {expired && mode === 'login' ? (
            <p role="alert" className="mb-4 rounded-[4px] border border-accent/60 bg-info-bg px-3 py-2 text-[13px] text-fg">
              Sua sessão expirou. Entre novamente para continuar de onde parou.
            </p>
          ) : null}
          {mode === 'login' ? <LoginForm onDone={done} /> : <RegisterForm onDone={done} />}
          <SocialButtons />
          <p className="mt-8 text-center text-[16px] text-muted md:hidden">
            {mode === 'login' ? (
              <Link to="/register" search={{ redirect }} replace>
                Novo na Kurio? <span className="text-accent-strong">Crie uma conta</span>
              </Link>
            ) : (
              <Link to="/login" search={{ redirect }} replace>
                Já tem uma conta? <span className="text-accent-strong">Entre</span>
              </Link>
            )}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

const fieldClass =
  'h-10 w-full rounded-[2px] border border-line bg-surface px-4 text-[13px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent-strong aria-[invalid=true]:border-danger max-md:h-[52px] max-md:rounded-[6px] max-md:bg-bg max-md:text-[15px]'

function PasswordInput({ id, placeholder, invalid, describedBy, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; describedBy?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={visible ? 'text' : 'password'} placeholder={placeholder} aria-invalid={invalid || undefined} aria-describedby={describedBy} className={cn(fieldClass, 'pr-12')} {...rest} />
      <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-subtle hover:text-fg" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible}>
        {visible ? <Eye className="size-5" aria-hidden /> : <EyeOff className="size-5" aria-hidden />}
      </button>
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-[12px] text-danger">
      ⚠ {message}
    </p>
  )
}

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

function LoginForm({ onDone }: { onDone: () => void }) {
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: () => {
        toast.success('Bem-vindo de volta!')
        onDone()
      },
      onError: (e) => {
        if (!applyApiFieldErrors(e, setError)) setFormError(isApiError(e) && e.code === 'INVALID_CREDENTIALS' ? 'E-mail ou senha incorretos.' : errorMessage(e))
      },
    })
  })
  const e = formState.errors
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3 max-md:gap-5" aria-label="Entrar">
      {formError ? (
        <p role="alert" className="rounded-[4px] border border-danger/60 bg-danger-bg px-3 py-2 text-[13px] text-danger">
          ⚠ {formError}
        </p>
      ) : null}
      <div>
        <label htmlFor="login-email" className="sr-only">
          E-mail
        </label>
        <input id="login-email" type="email" autoComplete="email" placeholder="contato@email.com" aria-invalid={e.email ? true : undefined} aria-describedby={e.email ? 'login-email-err' : undefined} className={fieldClass} {...register('email')} />
        <FieldError id="login-email-err" message={e.email?.message} />
      </div>
      <div>
        <label htmlFor="login-password" className="sr-only">
          Senha
        </label>
        <PasswordInput id="login-password" autoComplete="current-password" placeholder="Senha" invalid={Boolean(e.password)} describedBy={e.password ? 'login-password-err' : undefined} {...register('password')} />
        <FieldError id="login-password-err" message={e.password?.message} />
      </div>
      <button type="button" onClick={() => toast.info('Recuperação de senha indisponível nesta demonstração.', { description: 'Use as credenciais fictícias do README.' })} className="self-end text-[13px] text-accent-strong hover:underline max-md:text-[16px]">
        Esqueceu a senha?
      </button>
      <Button type="submit" className="mt-3 h-[45px] text-[17px] max-md:h-[60px] max-md:rounded-[10px] max-md:text-[19px]" loading={login.isPending}>
        Entrar
      </Button>
      <p className="text-center text-[11px] text-dim">Demonstração: ana@kurio.dev ou bruno@kurio.dev · senha Kurio@2026</p>
    </form>
  )
}

const registerSchema = z
  .object({
    username: z.string().trim().toLowerCase().regex(USERNAME_RE, 'Use 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'),
    email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    password: z
      .string()
      .min(8, 'A senha precisa de ao menos 8 caracteres.')
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letras e números na senha.'),
    confirm: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem.' })

function RegisterForm({ onDone }: { onDone: () => void }) {
  const reg = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { username: '', email: '', password: '', confirm: '' } })
  const onSubmit = handleSubmit(({ username, email, password }) => {
    setFormError(null)
    reg.mutate(
      { username, email, password },
      {
        onSuccess: () => {
          toast.success('Conta criada!', { description: 'Seu perfil de colecionador está pronto.' })
          onDone()
        },
        onError: (e) => {
          if (!applyApiFieldErrors(e, setError)) setFormError(errorMessage(e))
        },
      },
    )
  })
  const e = formState.errors
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3 max-md:gap-5" aria-label="Criar conta">
      {formError ? (
        <p role="alert" className="rounded-[4px] border border-danger/60 bg-danger-bg px-3 py-2 text-[13px] text-danger">
          ⚠ {formError}
        </p>
      ) : null}
      <div>
        <label htmlFor="reg-username" className="sr-only">
          Nome de usuário
        </label>
        <input id="reg-username" autoComplete="username" placeholder="Nome de usuário" aria-invalid={e.username ? true : undefined} aria-describedby={e.username ? 'reg-username-err' : undefined} className={cn(fieldClass, 'max-md:text-center')} {...register('username')} />
        <FieldError id="reg-username-err" message={e.username?.message} />
      </div>
      <div>
        <label htmlFor="reg-email" className="sr-only">
          E-mail
        </label>
        <input id="reg-email" type="email" autoComplete="email" placeholder="Digite seu e-mail" aria-invalid={e.email ? true : undefined} aria-describedby={e.email ? 'reg-email-err' : undefined} className={fieldClass} {...register('email')} />
        <FieldError id="reg-email-err" message={e.email?.message} />
      </div>
      <div>
        <label htmlFor="reg-password" className="sr-only">
          Senha
        </label>
        <PasswordInput id="reg-password" autoComplete="new-password" placeholder="Senha" invalid={Boolean(e.password)} describedBy={e.password ? 'reg-password-err' : 'reg-password-hint'} {...register('password')} />
        {e.password ? <FieldError id="reg-password-err" message={e.password.message} /> : <p id="reg-password-hint" className="sr-only">Mínimo de 8 caracteres, com letras e números.</p>}
      </div>
      <div>
        <label htmlFor="reg-confirm" className="sr-only">
          Confirmar senha
        </label>
        <PasswordInput id="reg-confirm" autoComplete="new-password" placeholder="Confirmar senha" invalid={Boolean(e.confirm)} describedBy={e.confirm ? 'reg-confirm-err' : undefined} {...register('confirm')} />
        <FieldError id="reg-confirm-err" message={e.confirm?.message} />
      </div>
      <Button type="submit" className="mt-3 h-[45px] text-[17px] max-md:h-[60px] max-md:rounded-[10px] max-md:text-[19px]" loading={reg.isPending}>
        <span className="md:hidden">Criar perfil</span>
        <span className="max-md:hidden">Criar conta</span>
      </Button>
    </form>
  )
}

function SocialButtons() {
  const notAvailable = () => toast.info('Login social indisponível nesta demonstração.', { description: 'Use e-mail e senha.' })
  return (
    <div className="mt-8">
      <div className="relative flex items-center justify-center md:-mx-20">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <span className="relative bg-surface px-3 text-[13px] text-fg max-md:bg-bg max-md:text-[16px]">Ou continue com</span>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <button type="button" onClick={notAvailable} aria-disabled="true" className="flex h-10 items-center justify-center gap-3 rounded-[2px] border border-line text-[13px] text-accent-strong hover:border-accent max-md:h-[52px] max-md:text-[16px]">
          <GoogleIcon className="size-5" /> Continuar com Google
        </button>
        <button type="button" onClick={notAvailable} aria-disabled="true" className="flex h-10 items-center justify-center gap-3 rounded-[2px] border border-line text-[13px] text-accent-strong hover:border-accent max-md:h-[52px] max-md:text-[16px]">
          <FacebookBrandIcon className="size-5" /> Continuar com Facebook
        </button>
      </div>
    </div>
  )
}
