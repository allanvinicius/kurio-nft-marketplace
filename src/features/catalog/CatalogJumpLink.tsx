import type { ComponentPropsWithRef } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import type { CatalogSearch } from '@/app/router/search-schemas'
import { useMediaQuery } from '@/hooks/useMediaQuery'

type Props = Omit<ComponentPropsWithRef<'a'>, 'href'> & {
  search?: CatalogSearch | true
}

export function CatalogJumpLink({ onClick, ...props }: Props) {
  const onHome = useRouterState({ select: (state) => state.location.pathname === '/' })
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const scrollOptions = { behavior: onHome && !reducedMotion ? 'smooth' : 'auto' } as const

  return (
    <Link
      {...props}
      to="/"
      hash="catalogo"
      hashScrollIntoView={scrollOptions}
      onClick={(event) => {
        onClick?.(event)
        if (
          event.defaultPrevented || event.button !== 0 ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          (props.target && props.target !== '_self') ||
          event.currentTarget.href !== window.location.href
        ) return

        // The router doesn't scroll again when the URL is already the same.
        event.preventDefault()
        document.getElementById('catalogo')?.scrollIntoView(scrollOptions)
      }}
    />
  )
}
