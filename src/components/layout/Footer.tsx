import { CatalogJumpLink } from '@/features/catalog/CatalogJumpLink'
import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { CategoryId } from '@/types/api'
import { cn } from '@/lib/utils/cn'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '@/components/shared/brand-icons'
import { WalletsPill } from '@/components/shared/WalletsPill'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const COLLECTIONS: Array<{ id: CategoryId; label: string }> = [
  { id: 'arte-digital', label: 'Arte digital' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'musica', label: 'Música' },
  { id: 'arte-3d', label: 'Arte 3D' },
  { id: 'utilidade', label: 'Utilidade' },
]

const SOCIAL = [
  { href: 'https://www.facebook.com', label: 'Facebook', Icon: FacebookIcon },
  { href: 'https://www.instagram.com', label: 'Instagram', Icon: InstagramIcon },
  { href: 'https://x.com', label: 'Twitter', Icon: TwitterIcon },
  { href: 'https://www.linkedin.com', label: 'LinkedIn', Icon: LinkedinIcon },
  { href: 'https://www.youtube.com', label: 'YouTube', Icon: YoutubeIcon },
]

const linkClass = 'text-[14px] leading-[30px] text-fg hover:text-accent-strong'

function Newsletter() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[17px] font-bold leading-[17px] text-fg">Antecipe-se ao próximo lançamento</h2>
      <form
        noValidate
        className="flex h-10 overflow-hidden rounded-[4px]"
        onSubmit={(e) => {
          e.preventDefault()
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) setMessage({ tone: 'error', text: 'Informe um e-mail válido.' })
          // Newsletter está fora do escopo: não simulamos sucesso.
          else setMessage({ tone: 'info', text: 'A inscrição na newsletter não está disponível nesta demonstração.' })
        }}
      >
        <label htmlFor={`${id}-email`} className="sr-only">
          E-mail para receber lançamentos
        </label>
        <input
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="digite seu e-mail..."
          aria-invalid={message?.tone === 'error' || undefined}
          aria-describedby={message ? `${id}-msg` : undefined}
          className="min-w-0 flex-1 bg-band px-3 text-[16px] text-fg placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2"
        />
        <button type="submit" className="bg-accent px-4 text-[19px] font-bold text-bg hover:bg-accent-hover">
          Enviar
        </button>
      </form>
      <p id={message ? `${id}-msg` : undefined} role="status" className={cn('text-[14px] leading-[22px]', message?.tone === 'error' ? 'text-danger' : 'text-muted')}>
        {message?.text ?? 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 pb-24 md:mt-[100px] md:pb-0">
      <div className="container-site">
        <section aria-label="Benefícios KURIO" className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[249px_266px_265px_1fr] lg:gap-0 lg:pb-4 lg:pl-12 lg:pr-[30px] lg:pt-8">
          {FEATURES.map((f, i) => (
            <div key={f.letter} className={cn('flex flex-col gap-3 lg:pr-3', i > 0 && 'lg:border-l lg:border-accent lg:pl-4')}>
              <span aria-hidden className="flex size-[74px] items-center justify-center rounded-full bg-accent text-2xl font-bold text-bg">
                {f.letter}
              </span>
              <h2 className="mt-2 text-[17px] font-bold text-fg">{f.title}</h2>
              <p className="text-[14px] leading-[22px] text-muted">{f.text}</p>
            </div>
          ))}
          <div className="lg:border-l lg:border-accent lg:pl-4">
            <Newsletter />
          </div>
        </section>
        <div className="grid gap-4 bg-band px-8 py-6 text-[14px] text-fg sm:grid-cols-2 lg:h-[88px] lg:grid-cols-4 xl:grid-cols-[303px_302px_303px_1fr] lg:items-center lg:gap-0 lg:py-0">
          <span className="font-bold tracking-[0.08em]">KURIO</span>
          <span className="max-w-[16rem] leading-[22px]">Feito para colecionadores, criadores e cultura</span>
          <a href="mailto:contato@email.com" className="hover:text-accent-strong">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="hover:text-accent-strong">
            +55 11 4002 8922
          </a>
        </div>
        <div className="grid gap-8 bg-surface px-8 pb-9 pt-7 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[303px_302px_303px_1fr] lg:gap-0">
          <nav aria-labelledby="ft-perfil">
            <h2 id="ft-perfil" className="mb-1 text-[18px] font-bold">
              Meu perfil
            </h2>
            <ul className="flex flex-col">
              <li><Link to="/profile" className={linkClass}>Meu perfil</Link></li>
              <li><Link to="/em-breve" search={{ secao: 'colecao' }} className={linkClass}>Minha coleção</Link></li>
              <li><Link to="/em-breve" search={{ secao: 'atividade' }} className={linkClass}>Atividade</Link></li>
              <li><Link to="/em-breve" search={{ secao: 'estudio' }} className={linkClass}>Estúdio do criador</Link></li>
              <li><Link to="/favorites" className={linkClass}>Lista de interesse</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="ft-ajuda">
            <h2 id="ft-ajuda" className="mb-1 text-[18px] font-bold">
              Central de ajuda
            </h2>
            <ul className="flex flex-col">
              {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((t) => (
                <li key={t}>
                  <Link to="/em-breve" search={{ secao: 'suporte' }} className={linkClass}>
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="ft-colecoes">
            <h2 id="ft-colecoes" className="mb-1 text-[18px] font-bold">
              Coleções
            </h2>
            <ul className="flex flex-col">
              {COLLECTIONS.map((c) => (
                <li key={c.id}>
                  <CatalogJumpLink search={{ category: c.id }} className={linkClass}>
                    {c.label}
                  </CatalogJumpLink>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="mb-1 text-[18px] font-bold">Redes sociais</h2>
            <ul className="flex gap-2">
              {SOCIAL.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (abre em nova aba)`} className="flex size-8 items-center justify-center rounded-[4px] border border-accent text-accent-strong hover:bg-accent/10">
                    <Icon className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
            <h2 className="mb-3 mt-6 text-[18px] font-bold">Carteiras compatíveis</h2>
            <WalletsPill />
          </div>
        </div>
      </div>
      <p className="py-4 text-center text-[14px] text-fg">
        <span className="text-xs">©</span> 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}
