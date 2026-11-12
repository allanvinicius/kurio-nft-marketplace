import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { CatalogParams } from '@/types/api'
import { nftApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/client'

/**
 * Cada combinação de parâmetros tem sua própria entrada de cache (chave = parâmetros).
 * O `signal` do TanStack Query cancela a requisição anterior quando os filtros mudam;
 * respostas que chegam fora de ordem só podem preencher a SUA chave, nunca a atual.
 */
export function catalogQueryOptions(params: CatalogParams) {
  return queryOptions({
    queryKey: qk.catalog(params),
    queryFn: ({ signal }) => nftApi.list(params, { signal }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

export function featuredQueryOptions() {
  return queryOptions({
    queryKey: qk.featured(),
    queryFn: ({ signal }) => nftApi.featured({ signal }),
    staleTime: 60_000,
  })
}
