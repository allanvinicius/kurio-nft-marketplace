import type { NftImage } from '@/types/api'

export type ImageSize = 240 | 480 | 960

export function imageSrc(img: NftImage, size: ImageSize): string {
  return `${img.base}-${size}.webp`
}

export function imageSrcSet(img: NftImage): string {
  return `${img.base}-240.webp 240w, ${img.base}-480.webp 480w, ${img.base}-960.webp 960w`
}
