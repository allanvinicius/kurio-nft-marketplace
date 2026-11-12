import { Link, useSearch } from '@tanstack/react-router'
import { Construction } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LABELS: Record<string, string> = {
  criadores: 'Criadores',
  aprenda: 'Aprenda',
  atividade: 'Atividade',
  ofertas: 'Ofertas',
  downloads: 'Arquivos baixados',
  suporte: 'Suporte e central de ajuda',
  colecao: 'Minha coleção',
  estudio: 'Estúdio do criador',
  diario: 'Diário da Cunhagem',
}

/** Seções fora do escopo do desafio: comunicam claramente a indisponibilidade (sem simular sucesso). */
export function ComingSoonPage() {
  const { secao } = useSearch({ from: '/em-breve' })
  const label = (secao && LABELS[secao]) || 'Esta seção'
  return (
    <section className="container-site flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center" aria-labelledby="cs-title">
      <Construction className="size-10 text-accent-strong" aria-hidden />
      <h1 id="cs-title" className="text-2xl font-bold">
        {label} — indisponível nesta demonstração
      </h1>
      <p className="max-w-lg text-muted">Esta área não faz parte do escopo da entrega. Nenhuma ação foi executada.</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
