import { queryOptions } from '@tanstack/react-query'
import { nftApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/client'
import { isApiError } from '@/lib/api/client'

export function nftQueryOptions(id: string) {
  return queryOptions({
    queryKey: qk.nft(id),
    queryFn: ({ signal }) => nftApi.detail(id, { signal }),
    staleTime: 15_000,
    retry: (count, error) => !(isApiError(error) && error.status < 500 && error.status > 0) && count < 2,
  })
}
