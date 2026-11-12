import type { NftImage as NftImageData } from '@/types/api'
import { imageSrc, imageSrcSet } from '@/lib/utils/image'
import { cn } from '@/lib/utils/cn'

/**
 * Imagem responsiva de NFT: srcset WebP (240/480/960), dimensões intrínsecas
 * para evitar CLS e `alt` descritivo vindo da API.
 */
export function NftImage({
  image,
  sizes,
  className,
  priority,
  decorative,
  width = 480,
}: {
  image: NftImageData
  sizes: string
  className?: string
  priority?: boolean
  decorative?: boolean
  width?: number
}) {
  return (
    <img
      src={imageSrc(image, 480)}
      srcSet={imageSrcSet(image)}
      sizes={sizes}
      alt={decorative ? '' : image.alt}
      width={width}
      height={Math.round(width / image.ratio)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('block object-cover', className)}
    />
  )
}
