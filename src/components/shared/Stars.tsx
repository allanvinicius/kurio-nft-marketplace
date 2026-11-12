import { Star } from 'lucide-react'

export function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <p className="flex items-center gap-1 text-[16px] text-fg" role="img" aria-label={`Nota ${rating.toFixed(1)} de 5, ${count} avaliações de colecionadores`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className="size-[14px] text-accent" fill={i < Math.round(rating) ? 'currentColor' : 'none'} aria-hidden />
      ))}
      <span aria-hidden className="ml-1">
        {count} avaliações de colecionadores
      </span>
    </p>
  )
}
