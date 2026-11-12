import { useCallback, useState, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils/cn'

type ImageProps = ComponentPropsWithoutRef<'img'>

export function LoadingImage(props: ImageProps) {
  return <ImageWithPlaceholder key={JSON.stringify([props.src, props.srcSet, props.sizes])} {...props} />
}

function ImageWithPlaceholder({ className, onLoad, onError, ...props }: ImageProps) {
  const [settled, setSettled] = useState(false)
  const checkCache = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) setSettled(true)
  }, [])

  return (
    <img
      {...props}
      ref={checkCache}
      className={cn(!settled && 'skeleton', className)}
      onLoad={(event) => {
        setSettled(true)
        onLoad?.(event)
      }}
      onError={(event) => {
        setSettled(true)
        onError?.(event)
      }}
    />
  )
}
