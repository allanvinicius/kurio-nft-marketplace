import { useSyncExternalStore } from 'react'

/** Media query reativa. Usada para não baixar imagens de layouts ocultos (desktop x mobile). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => true,
  )
}

export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
