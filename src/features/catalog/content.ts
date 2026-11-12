import type { NftImage } from '@/types/api'
import type { CatalogSearch } from '@/app/router/search-schemas'

/**
 * Conteúdo EDITORIAL estático da home (banner, chamadas e Diário da Cunhagem).
 * Não são dados de negócio: preços, disponibilidade e catálogo vêm sempre da API.
 * O primeiro destaque é fixo para permitir o preload da imagem LCP (ver Lighthouse).
 */
export const HERO_SLIDES = [
  {
    nftId: 'emerald-ape-042',
    name: 'Emerald Ape #042',
    image: '/assets/nfts/emerald-ape-1',
    alt: 'Emerald Ape #042: macaco com óculos redondos de lentes verdes e jaqueta college verde',
    title: 'Seja dono do futuro\nda arte digital',
    description: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    mobileTitle: 'Seja dono da\ncultura digital',
    mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
  },
  {
    nftId: 'ivory-baron-088',
    name: 'Ivory Baron #088',
    image: '/assets/nfts/ivory-baron-1',
    alt: 'Ivory Baron #088: chimpanzé com gola alta verde e blazer marfim',
    title: 'Colecione arte\ncom personalidade',
    description: 'Descubra como artistas digitais reinventam o retrato. Explore obras como Ivory Baron e monte uma coleção que reflita seu estilo.',
    mobileTitle: 'Colecione arte\ncom estilo',
    mobileDescription: 'Descubra retratos digitais e colecione obras que reflitam seu estilo.',
  },
  {
    nftId: 'golden-beat-207',
    name: 'Golden Beat #207',
    image: '/assets/nfts/golden-beat-1',
    alt: 'Golden Beat #207: orangotango dourado com fones de ouvido verdes',
    title: 'Colecione no ritmo\nda cultura digital',
    description: 'Descubra obras que aproximam música e arte digital. Explore criações como Golden Beat e leve para sua coleção a energia de uma nova cena criativa.',
    mobileTitle: 'Colecione no\nseu ritmo',
    mobileDescription: 'Descubra NFTs que unem música e arte digital.',
  },
] as const

const img = (base: string, alt: string, ratio = 1): NftImage => ({ base: `/assets/nfts/${base}`, alt, ratio })

export const PROMOS: Array<{ title: string; text: string; image: NftImage; search: CatalogSearch }> = [
  {
    title: 'Lançamentos gênesis\nde edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: img('emerald-ape-1', 'Macaco com óculos verdes e jaqueta college'),
    search: { tab: 'new' },
  },
  {
    title: 'Arte digital selecionada\ne muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: img('ivory-baron-1', 'Chimpanzé com blazer marfim'),
    search: { category: 'arte-digital' },
  },
]

export const DIARY_POSTS = [
  { title: 'Como funciona a propriedade de NFTs', excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.', date: '12 de setembro', dateTime: '2026-09-12', minutes: 6, image: img('ivory-baron-1', 'Chimpanzé de blazer') },
  { title: '10 artistas digitais para acompanhar', excerpt: 'Conheça criadores que moldam a cultura digital.', date: '13 de setembro', dateTime: '2026-09-13', minutes: 2, image: img('emerald-ape-1', 'Macaco de óculos verdes') },
  { title: 'Raridade, atributos e procedência', excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.', date: '15 de setembro', dateTime: '2026-09-15', minutes: 3, image: img('violet-nomad-1', 'Gorila com chapéu bucket') },
  { title: 'Como proteger sua carteira', excerpt: 'Proteja sua carteira, seus ativos e sua identidade.', date: '15 de setembro', dateTime: '2026-09-15', minutes: 2, image: img('golden-beat-1', 'Orangotango com fones de ouvido') },
]
