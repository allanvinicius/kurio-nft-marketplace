import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createQueryClient } from '@/lib/query/client'
import { createAppRouter } from '@/app/router/router'
import { App } from '@/app/App'

export function mountApp(el: HTMLElement) {
  const queryClient = createQueryClient()
  const router = createAppRouter(queryClient)
  createRoot(el).render(
    <StrictMode>
      <App queryClient={queryClient} router={router} />
    </StrictMode>,
  )
}
