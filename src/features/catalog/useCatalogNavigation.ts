import { useNavigate } from '@tanstack/react-router'
import type { CatalogSearch } from '@/app/router/search-schemas'

/**
 * Atualiza o estado do catálogo na URL. Toda mudança de filtro/ordenação reinicia a
 * paginação (page = undefined => 1). Cada mudança gera entrada no histórico, permitindo
 * restaurar o estado com voltar/avançar; digitação na busca usa `replace`.
 */
export function useCatalogNavigation() {
  const navigate = useNavigate()
  const update = (patch: Partial<CatalogSearch>, opts: { keepPage?: boolean; replace?: boolean } = {}) =>
    navigate({
      to: '/',
      search: (prev: CatalogSearch) => {
        const next: CatalogSearch = { ...prev, ...patch }
        if (!opts.keepPage) next.page = undefined
        // Omite defaults da URL.
        if (next.tab === 'all') next.tab = undefined
        if (next.sort === 'recent') next.sort = undefined
        if (next.page === 1) next.page = undefined
        if (!next.q) next.q = undefined
        return next
      },
      replace: opts.replace,
      resetScroll: false,
    })
  const clear = () => navigate({ to: '/', search: {}, resetScroll: false })
  return { update, clear }
}
