import Decimal from 'decimal.js'
import type { EthAmount } from '@/types/api'

/**
 * Aritmética monetária em ETH.
 * Nunca usamos `number` para valores: tudo trafega e é calculado como decimal.
 * Precisão: 18 casas (wei). Arredondamento ROUND_HALF_EVEN para apresentação.
 */
const Eth = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN })

const DECIMAL_RE = /^-?\d+(\.\d+)?$/

export function isEthAmount(value: unknown): value is EthAmount {
  return typeof value === 'string' && DECIMAL_RE.test(value)
}

export function eth(value: EthAmount | number): Decimal {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error('Use string decimal para valores fracionários em ETH')
    return new Eth(value)
  }
  if (!isEthAmount(value)) throw new Error(`Valor ETH inválido: ${String(value)}`)
  return new Eth(value)
}

/** Serializa para string decimal canônica (sem zeros à direita, sem notação exponencial). */
export function toEthString(value: Decimal): EthAmount {
  return value.toDecimalPlaces(18).toFixed()
}

export function addEth(...values: EthAmount[]): EthAmount {
  return toEthString(values.reduce((acc, v) => acc.plus(eth(v)), new Eth(0)))
}

export function subEth(a: EthAmount, b: EthAmount): EthAmount {
  return toEthString(eth(a).minus(eth(b)))
}

export function mulEth(a: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantidade deve ser inteiro não negativo')
  return toEthString(eth(a).times(quantity))
}

export function percentOf(a: EthAmount, percent: number): EthAmount {
  return toEthString(eth(a).times(percent).dividedBy(100))
}

export function minEth(a: EthAmount, b: EthAmount): EthAmount {
  return eth(a).lessThanOrEqualTo(eth(b)) ? a : b
}

export function maxEth(a: EthAmount, b: EthAmount): EthAmount {
  return eth(a).greaterThanOrEqualTo(eth(b)) ? a : b
}

export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  return eth(a).comparedTo(eth(b)) as -1 | 0 | 1
}

export function equalsEth(a: EthAmount, b: EthAmount): boolean {
  return eth(a).equals(eth(b))
}

export function isZeroEth(a: EthAmount): boolean {
  return eth(a).isZero()
}

/**
 * Formata para exibição: mínimo de 2 casas, máximo de `maxDecimals`, sem perder precisão
 * relevante (até 6 casas por padrão, como "0.016" ou "26.846").
 */
export function formatEth(value: EthAmount, opts: { maxDecimals?: number; suffix?: boolean } = {}): string {
  const { maxDecimals = 6, suffix = true } = opts
  const d = eth(value).toDecimalPlaces(maxDecimals)
  const [int, frac = ''] = d.toFixed().split('.')
  const trimmed = frac.replace(/0+$/, '')
  const padded = trimmed.length < 2 ? trimmed.padEnd(2, '0') : trimmed
  const text = `${int}.${padded}`
  return suffix ? `${text} ETH` : text
}

/** Formata número de ETH no padrão pt-BR usado no filtro de preço (ex.: 12,30). */
export function formatEthPtBr(value: EthAmount): string {
  return formatEth(value, { suffix: false, maxDecimals: 2 }).replace('.', ',')
}
