import { z } from 'zod'
import type { CatalogParams, CatalogSort, CatalogTab, CategoryId, NetworkId } from '@/types/api'

const CATEGORIES = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis', 'generativa', 'jogos', 'assinaturas', 'utilidade'] as const satisfies readonly CategoryId[]
const NETWORKS = ['ethereum', 'polygon', 'solana'] as const satisfies readonly NetworkId[]
const TABS = ['all', 'new', 'trending'] as const satisfies readonly CatalogTab[]
const SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const satisfies readonly CatalogSort[]
const DECIMAL = /^\d+(\.\d{1,6})?$/

/**
 * Estado do catálogo na URL. Valores inválidos são descartados (`catch`) para que
 * links quebrados nunca derrubem a página. Defaults ficam fora da URL.
 */
export const catalogSearchSchema = z.object({
  q: z.coerce.string().trim().max(80).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  network: z
    .string()
    .transform((v) => {
      if (!v) return undefined
      const list = v.split(',').filter((n): n is NetworkId => (NETWORKS as readonly string[]).includes(n))
      return list.length ? [...new Set(list)].sort().join(',') : undefined
    })
    .optional()
    .catch(undefined),
  min: z.coerce.string().regex(DECIMAL).optional().catch(undefined),
  max: z.coerce.string().regex(DECIMAL).optional().catch(undefined),
  tab: z.enum(TABS).optional().catch(undefined),
  sort: z.enum(SORTS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(999).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9

export function searchToParams(s: CatalogSearch): CatalogParams {
  return {
    q: s.q || undefined,
    category: s.category,
    networks: s.network ? (s.network.split(',') as NetworkId[]) : undefined,
    minPrice: s.min,
    maxPrice: s.max,
    tab: s.tab ?? 'all',
    sort: s.sort ?? 'recent',
    page: s.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export const redirectSearchSchema = z.object({
  redirect: z
    .string()
    .refine((v) => v.startsWith('/') && !v.startsWith('//'), 'redirect inválido')
    .optional()
    .catch(undefined),
})

export type RedirectSearch = z.infer<typeof redirectSearchSchema>

export const comingSoonSchema = z.object({ secao: z.string().max(40).optional().catch(undefined) })
