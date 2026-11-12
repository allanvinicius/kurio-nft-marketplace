# Manifesto de assets

Os únicos assets recebidos foram os 15 PNGs de tela do Figma (2×). Não houve exportação individual de artes, ícones ou fontes. As artes dos NFTs foram **recortadas da área da própria arte** nos frames (nunca de UI), convertidas para WebP e servidas localmente. Ao receber os originais, basta substituir os arquivos em `public/assets/nfts/` mantendo os nomes (`<arte>-<vista>-<tamanho>.webp`) — nenhuma mudança de código é necessária.

## NFTs (`public/assets/nfts/`)

Cada arte tem 4 vistas × 3 tamanhos (240/480/960 px de largura, WebP q82). Referência no código: `NftImage.base = /assets/nfts/<arte>-<vista>`; `src/lib/utils/image.ts` monta `src`/`srcset`.

| Id da arte | Origem (frame / região em px 2×) | Resolução de origem | Vistas | Status |
| --- | --- | --- | --- | --- |
| `emerald-ape` | `home.png` hero (1768,230)–(2612,1072) | 844×842 | 1 completa · 2 rosto · 3 figurino · 4 enquadramento | Extraída do Figma (temporária até o original) |
| `violet-nomad` | `home.png` card linha 2 col 1 (1014,2280)–(1426,2816) | 412×536 (retrato) | idem; vista 4 mantém o retrato | Extraída — **upscale** para 480/960 (perda de nitidez) |
| `ivory-baron` | `home.png` card linha 2 col 3 (2150,2316)–(2614,2780) | 464×464 | idem | Extraída — upscale para 960 |
| `golden-beat` | `home.png` card linha 3 col 1 (982,3152)–(1446,3616) | 464×464 | idem (topo do cabelo levemente cortado como no card) | Extraída — upscale para 960 |

As vistas 2–4 são recortes da mesma arte (o Figma repete a mesma imagem nas 4 miniaturas da galeria). Os 40 NFTs das fixtures reutilizam as 4 artes, como o próprio Figma faz.

Proporção: 1:1 (exceto `violet-nomad-4`, 412:536; vista 3, 0,70:0,58). `width`/`height` sempre declarados para evitar CLS.

## Marca, ícones e fontes

| Asset | Implementação | Status |
| --- | --- | --- |
| Logo "KURIO" | Texto Roboto Mono 700 (o Figma usa texto) | Equivalente |
| Favicon | `public/favicon.svg` ("K" accent sobre `bg`) | Criado (temporário) |
| Ícones de interface | `lucide-react` (busca, carrinho, coração, lixeira, setas, etc.) | Substituto próximo dos ícones do Figma |
| Ícones sociais, Google, Facebook | SVG inline em `src/components/shared/brand-icons.tsx` | Recriados (lucide 1.x não inclui marcas) |
| Envelope "THANK YOU" | SVG inline (`ThankYouIcon`) | Recriado a partir do frame |
| Fonte | Roboto Mono Variable via `@fontsource-variable/roboto-mono` (WOFF2 local, subset latin) | Fonte identificada pelas métricas; empacotada localmente |
| Pill "METAMASK • WALLETCONNECT • COINBASE" | Componente `WalletsPill` (texto) | Recriado |

## Referências

`references/figma/*.png` são apenas referência de design; **não** são usados como fundo ou recorte de UI.
