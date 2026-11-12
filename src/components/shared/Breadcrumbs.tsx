import { Link } from '@tanstack/react-router'

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: '/' | '/cart'; hash?: string }> }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden md:block">
      <ol className="flex flex-wrap items-center gap-2 text-[16px] font-bold text-fg">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {it.to && i < items.length - 1 ? (
              <Link to={it.to} hash={it.hash} className="hover:text-accent-strong">
                {it.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined}>{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
