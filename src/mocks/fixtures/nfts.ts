import type { CategoryId, Edition, NetworkId, NftDetail, NftImage } from '@/types/api'
import { mulEth, toEthString, eth } from '@/lib/money/eth'

/**
 * Fixtures determinísticas do catálogo (40 NFTs).
 * Os 9 primeiros (ordem "Listados recentemente") reproduzem a primeira página do Figma.
 * As artes vêm dos frames do Figma (ver ASSETS_MANIFEST.md).
 */

type Art = 'emerald-ape' | 'violet-nomad' | 'ivory-baron' | 'golden-beat'

const ART_ALT: Record<Art, string> = {
  'emerald-ape': 'Macaco de pelagem marrom com óculos redondos de lentes verdes, jaqueta college verde e colar de esmeralda',
  'violet-nomad': 'Gorila grisalho com chapéu bucket verde-oliva e moletom roxo com capuz',
  'ivory-baron': 'Chimpanzé de pelagem escura com brinco dourado, gola alta verde e blazer marfim',
  'golden-beat': 'Orangotango dourado com fones de ouvido verdes e jaqueta bomber creme',
}

const ART_RATIO: Record<Art, number> = {
  'emerald-ape': 1,
  'violet-nomad': 1,
  'ivory-baron': 1,
  'golden-beat': 1,
}

const VIEW_LABEL = ['', 'obra completa', 'detalhe do rosto', 'detalhe do figurino', 'enquadramento alternativo'] as const

function image(art: Art, view: 1 | 2 | 3 | 4, name: string): NftImage {
  const ratio = view === 4 && art === 'violet-nomad' ? 412 / 536 : view === 3 ? 0.7 / 0.58 : view === 2 ? 0.64 / 0.64 : ART_RATIO[art]
  return {
    base: `/assets/nfts/${art}-${view}`,
    alt: view === 1 ? `${name}: ${ART_ALT[art]}` : `${name} — ${VIEW_LABEL[view]}`,
    ratio,
  }
}

interface Seed {
  name: string
  art: Art
  price: string
  compareAt?: string
  category: CategoryId
  network: NetworkId
  rarity?: 'raro'
  trending: number
  isNew?: boolean
  collection?: string
  attributes?: string[]
  /** Disponibilidade por edição [1/1, 1/10, 1/50, ABERTA]. */
  stock?: [number, number, number, number]
}

const SEEDS: Seed[] = [
  { name: 'Emerald Ape #042', art: 'emerald-ape', price: '1.19', category: 'arte-digital', network: 'ethereum', trending: 92, isNew: true, attributes: ['Óculos', 'Esmeralda', 'Raro'], stock: [1, 6, 24, 300] },
  { name: 'Sage Nomad #009', art: 'violet-nomad', price: '1.69', category: 'arte-digital', network: 'ethereum', trending: 81, isNew: true, attributes: ['Chapéu bucket', 'Moletom', 'Sábio'], stock: [0, 4, 18, 250] },
  { name: 'Neon Vessel #552', art: 'ivory-baron', price: '1.99', compareAt: '2.29', category: 'arte-3d', network: 'polygon', trending: 88, isNew: true, rarity: 'raro', attributes: ['Gola alta', 'Brinco', 'Neon'] },
  { name: 'Cosmic Bloom #118', art: 'violet-nomad', price: '1.29', category: 'generativa', network: 'solana', trending: 64, isNew: true },
  { name: 'Violet Nomad #314', art: 'violet-nomad', price: '1.39', category: 'colecionaveis', network: 'ethereum', trending: 74, isNew: true, stock: [1, 5, 20, 400] },
  { name: 'Ivory Baron #088', art: 'ivory-baron', price: '1.79', category: 'arte-digital', network: 'ethereum', trending: 90, isNew: true, rarity: 'raro', stock: [1, 3, 15, 200] },
  { name: 'Golden Beat #207', art: 'golden-beat', price: '0.99', category: 'musica', network: 'polygon', trending: 77, isNew: true },
  { name: 'Golden Pulse #233', art: 'golden-beat', price: '0.79', category: 'musica', network: 'solana', trending: 55 },
  { name: 'Golden Signal #160', art: 'golden-beat', price: '0.39', category: 'musica', network: 'ethereum', trending: 58 },
  { name: 'Jade Monarch #071', art: 'emerald-ape', price: '2.49', category: 'colecionaveis', network: 'ethereum', trending: 85, rarity: 'raro' },
  { name: 'Velvet Drifter #145', art: 'violet-nomad', price: '0.62', category: 'fotografia', network: 'polygon', trending: 41 },
  { name: 'Obsidian Duke #019', art: 'ivory-baron', price: '3.15', category: 'arte-3d', network: 'ethereum', trending: 79 },
  { name: 'Amber Rhythm #302', art: 'golden-beat', price: '0.45', category: 'musica', network: 'polygon', trending: 47 },
  { name: 'Moss Sentinel #066', art: 'emerald-ape', price: '1.05', category: 'jogos', network: 'solana', trending: 62 },
  { name: 'Lilac Wanderer #211', art: 'violet-nomad', price: '0.88', category: 'assinaturas', network: 'ethereum', trending: 36 },
  { name: 'Marble Count #407', art: 'ivory-baron', price: '4.20', category: 'arte-digital', network: 'ethereum', trending: 83, rarity: 'raro' },
  { name: 'Honey Tempo #125', art: 'golden-beat', price: '0.27', category: 'musica', network: 'solana', trending: 33 },
  { name: 'Forest Regent #003', art: 'emerald-ape', price: '12.30', category: 'colecionaveis', network: 'ethereum', trending: 97, rarity: 'raro', stock: [1, 2, 5, 40] },
  { name: 'Dusk Pilgrim #278', art: 'violet-nomad', price: '0.54', category: 'fotografia', network: 'polygon', trending: 29 },
  { name: 'Pearl Envoy #131', art: 'ivory-baron', price: '2.05', category: 'utilidade', network: 'polygon', trending: 52 },
  { name: 'Sunset Groove #349', art: 'golden-beat', price: '0.15', category: 'musica', network: 'polygon', trending: 44 },
  { name: 'Verdant Oracle #057', art: 'emerald-ape', price: '5.60', category: 'generativa', network: 'ethereum', trending: 71 },
  { name: 'Plum Voyager #188', art: 'violet-nomad', price: '0.74', category: 'jogos', network: 'solana', trending: 38 },
  { name: 'Ivory Curator #240', art: 'ivory-baron', price: '1.45', category: 'arte-digital', network: 'solana', trending: 60 },
  { name: 'Brass Harmony #091', art: 'golden-beat', price: '0.58', category: 'assinaturas', network: 'ethereum', trending: 49 },
  { name: 'Emerald Scout #120', art: 'emerald-ape', price: '0.95', category: 'jogos', network: 'polygon', trending: 57 },
  { name: 'Orchid Hermit #333', art: 'violet-nomad', price: '0.33', category: 'utilidade', network: 'solana', trending: 22 },
  { name: 'Shadow Patron #014', art: 'ivory-baron', price: '6.75', category: 'colecionaveis', network: 'ethereum', trending: 89, rarity: 'raro' },
  { name: 'Citrine Echo #256', art: 'golden-beat', price: '0.21', category: 'fotografia', network: 'solana', trending: 26 },
  { name: 'Canopy Baron #077', art: 'emerald-ape', price: '1.85', category: 'arte-3d', network: 'polygon', trending: 66 },
  { name: 'Mauve Seeker #199', art: 'violet-nomad', price: '0.47', category: 'generativa', network: 'polygon', trending: 31 },
  { name: 'Cream Statesman #102', art: 'ivory-baron', price: '2.80', category: 'utilidade', network: 'ethereum', trending: 69 },
  { name: 'Saffron Loop #318', art: 'golden-beat', price: '0.09', category: 'jogos', network: 'polygon', trending: 18 },
  { name: 'Grove Keeper #048', art: 'emerald-ape', price: '3.40', category: 'fotografia', network: 'ethereum', trending: 73 },
  { name: 'Violet Mystic #222', art: 'violet-nomad', price: '0.66', category: 'assinaturas', network: 'polygon', trending: 35 },
  { name: 'Alabaster Lord #011', art: 'ivory-baron', price: '8.90', category: 'arte-3d', network: 'ethereum', trending: 94, rarity: 'raro' },
  { name: 'Gilded Chorus #287', art: 'golden-beat', price: '0.02', category: 'musica', network: 'solana', trending: 12 },
  { name: 'Ivy Commander #036', art: 'emerald-ape', price: '2.15', category: 'utilidade', network: 'solana', trending: 63 },
  { name: 'Heather Sage #265', art: 'violet-nomad', price: '0.99', category: 'colecionaveis', network: 'solana', trending: 42 },
  { name: 'Linen Magnate #154', art: 'ivory-baron', price: '1.15', category: 'generativa', network: 'ethereum', trending: 51 },
]

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const NETWORK_LABELS: Record<NetworkId, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

const BASE_DATE = Date.UTC(2026, 8, 30, 12, 0, 0)

function pad4(n: number) {
  return n.toString().padStart(4, '0')
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/#/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function editionsFor(seed: Seed, idx: number, id: string): Edition[] {
  const p = seed.price
  const stock = seed.stock ?? [idx % 3 === 0 ? 0 : 1, 2 + (idx % 6), 8 + ((idx * 7) % 22), 120 + idx * 5]
  const half = toEthString(eth(p).dividedBy(2).toDecimalPlaces(4))
  return [
    { id: `${id}-1of1`, label: '1/1', price: mulEth(p, 4), available: stock[0], maxPerOrder: 1 },
    { id: `${id}-1of10`, label: '1/10', price: mulEth(p, 2), available: stock[1], maxPerOrder: 3 },
    { id: `${id}-1of50`, label: '1/50', price: p, available: stock[2], maxPerOrder: 10 },
    { id: `${id}-open`, label: 'ABERTA', price: half, available: stock[3], maxPerOrder: 25 },
  ]
}

export const DEFAULT_EDITION_LABEL = '1/50' as const

function buildNft(seed: Seed, idx: number): NftDetail {
  const tokenNum = seed.name.split('#')[1] ?? String(idx)
  const id = slugify(seed.name)
  const editions = editionsFor(seed, idx, id)
  const collection = seed.collection ?? 'Kurio Apes'
  const networkLabel = NETWORK_LABELS[seed.network]
  const totalAvailable = editions.reduce((s, e) => s + e.available, 0)
  const reviewsCount = idx === 0 ? 19 : 7 + ((idx * 5) % 17)
  return {
    id,
    name: seed.name,
    tokenId: `#${pad4(Number(tokenNum))}`,
    collection,
    category: seed.category,
    network: seed.network,
    image: image(seed.art, 1, seed.name),
    gallery: [image(seed.art, 1, seed.name), image(seed.art, 2, seed.name), image(seed.art, 3, seed.name), image(seed.art, 4, seed.name)],
    price: seed.price,
    compareAtPrice: seed.compareAt ?? null,
    rarity: seed.rarity ?? null,
    createdAt: new Date(BASE_DATE - idx * 36 * 3600 * 1000).toISOString(),
    trendingScore: seed.trending,
    isNew: seed.isNew ?? false,
    version: 1,
    totalAvailable,
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${networkLabel}, com arte desbloqueável e acesso para colecionadores.`,
    longDescription: [
      `${seed.name} é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${networkLabel}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    attributes: seed.attributes ?? ['Retrato', CATEGORY_LABELS[seed.category], seed.rarity ? 'Raro' : 'Comum'],
    rating: 4.8,
    reviewsCount,
    reviews: [
      { id: `${id}-r1`, author: 'Marina Okoye', rating: 5, comment: 'Acabamento impecável e procedência clara. Chegou na carteira em segundos.', createdAt: '2026-09-21T14:00:00.000Z' },
      { id: `${id}-r2`, author: 'Theo Varga', rating: 5, comment: 'A edição 1/50 tem ótimo equilíbrio entre raridade e preço.', createdAt: '2026-09-18T10:30:00.000Z' },
      { id: `${id}-r3`, author: 'Lia Moreau', rating: 4, comment: 'Arte linda; gostaria de mais detalhes sobre os desbloqueáveis.', createdAt: '2026-09-12T19:45:00.000Z' },
    ],
    editions,
    contract: '0x7A42...19E8 • Contrato inteligente ERC-721 verificado.',
    royalties: 'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    networkNote: `Cunhado na ${networkLabel} com procedência imutável e metadados armazenados no IPFS.`,
  }
}

export function buildNftFixtures(): NftDetail[] {
  return SEEDS.map(buildNft)
}

export const FEATURED_HERO_IDS = ['emerald-ape-042', 'ivory-baron-088', 'golden-beat-207']
export const SPOTLIGHT_ID = 'sage-nomad-009'
