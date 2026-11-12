import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage({ title = 'Página não encontrada', message = 'O endereço acessado não existe ou foi removido.' }: { title?: string; message?: string }) {
  return (
    <section className="container-site flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center" aria-labelledby="nf-title">
      <p className="text-6xl font-bold text-accent-strong" aria-hidden>
        404
      </p>
      <h1 id="nf-title" className="text-2xl font-bold">
        {title}
      </h1>
      <p className="max-w-md text-muted">{message}</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
