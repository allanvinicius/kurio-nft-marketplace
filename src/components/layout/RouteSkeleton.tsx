import { Skeleton } from '@/components/ui/skeleton'

export function RouteSkeleton() {
  return (
    <div className="container-site pt-8" role="group" aria-label="Carregando página" aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <div className="mt-6 grid gap-6 md:grid-cols-[3fr_2fr]">
        <Skeleton className="h-64 w-full rounded-card" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  )
}
