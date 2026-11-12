# Especificação de design — KURIO

Fonte: 15 PNGs exportados do Figma em 2× (`references/figma/`). Todas as medidas abaixo estão em **CSS px** (pixel do PNG ÷ 2). "Medido" = amostrado nos PNGs (script de amostragem de pixels e recortes); "Estimado" = inferido visualmente.

## 1. Inventário de telas

| Arquivo | Tela | PNG (px) | CSS (px) | Rota |
| --- | --- | --- | --- | --- |
| `home.png` | Início (desktop) | 2880×7336 | 1440×3668 | `/` |
| `Detalhes do NFT.png` | Detalhe | 2880×4492 | 1440×2246 | `/nft/$nftId` |
| `Carrinho de NFTs.png` | Carrinho | 2880×3508 | 1440×1754 | `/cart` |
| `Pagamento.png` | Pagamento | 2880×3314 | 1440×1657 | `/checkout` |
| `Confirmação de Pedido.png` (renomeado `Confirmacao de Pedido.png`) | Confirmação | 2880×3314 | 1440×1657 | `/orders/$orderId` |
| `Login.png` | Login (diálogo sobre a home) | 2880×3962 | 1440×1981 | `/login` |
| `Cadastro.png` | Cadastro (diálogo) | 2880×3962 | 1440×1981 | `/register` |
| `Perfil do Colecionador.png` | Perfil | 2880×2160 | 1440×1080 | `/profile` |
| `Carteiras.png` | Carteiras | 2880×2160 | 1440×1080 | `/wallets` |
| `mobile-home.png` | Início mobile | 828×1792 | 414×896 | `/` |
| `mobile-detalhes-do-nft.png` | Detalhe mobile | 828×1792 | 414×896 | `/nft/$nftId` |
| `mobile-carrinho-de-nfts.png` | Carrinho mobile | 828×1792 | 414×896 | `/cart` |
| `mobile-pagamento.png` | Pagamento mobile | 828×1792 | 414×896 | `/checkout` |
| `mobile-login.png` | Login mobile | 828×1792 | 414×896 | `/login` |
| `mobile-cadastro.png` | Cadastro mobile | 828×1792 | 414×896 | `/register` |

Sem frames mobile: perfil, carteiras, confirmação, favoritos — interpretações responsivas no mesmo sistema visual.

## 2. Cores (medidas)

| Token | Hex | Uso |
| --- | --- | --- |
| `bg` | `#140d0a` | fundo da página |
| `surface` | `#241612` | sidebar, cards, inputs, modais, rodapé |
| `band` | `#38220f` | faixa do rodapé, pill de carteiras, fundo do newsletter |
| `line` | `#3f2319` | bordas de inputs/paginação/divisores |
| `line-strong` | `#8a5b33` | linha sob o header, divisores de seção |
| `accent` | `#d28a4c` | botões primários, badges, sliders, barras ativas |
| `accent-strong` | `#e89b55` | textos/links em destaque, preços, contagens |
| `fg` | `#f5f1eb` | texto principal |
| `cream` | `#fdf2da` | nome do NFT nos cards |
| `muted` | `#cfb28c` | parágrafos secundários |
| `subtle` | `#b39463` | placeholders, ID do token |
| `dim` | `#a48b6d` | itens inativos (coleções), preço riscado |
| `required` | `#ef7a52` (estimado) | asterisco de obrigatório |
| `danger` / `success` | `#ff9b87` / `#9fd8a8` | estados não desenhados (erro/sucesso), contraste AA sobre `surface` |

## 3. Tipografia

Família monoespaçada em todas as telas → **Roboto Mono** (variable, 400–700), empacotada localmente via `@fontsource-variable/roboto-mono` (sem dependência de CDN). Larguras medidas confirmam ~0,6 em/caractere.

| Elemento | Tamanho / peso | Medição |
| --- | --- | --- |
| Logo "KURIO" | 15 px / 700, tracking 0.04 em | 48 px para 5 caracteres |
| Navegação | 16 px / 400 (ativo 700 accent + barra 3 px) | "Mercado" = 68 px |
| Hero título | 43 px / 700, line-height 70 px | "SEJA DONO DO FUTURO" = 490 px |
| Hero subtítulo | 14 px / 400, lh 24 px, `muted` | 65 caracteres = 546 px |
| Abas / ordenação | 15 px | "Todos os NFTs" = 117 px |
| Nome no card | 16 px `cream` | — |
| Preço no card | 18 px / 700 `accent-strong` | — |
| Título de seção do sidebar | 20 px / 700 | — |
| Título do detalhe | 28 px / 700; preço 22 px / 700 | — |
| Rodapé: títulos | 18 px / 700; links 14 px (lh 30 px) | "Central de ajuda" = 134 px |
| Formulários: labels | 16 px; inputs 15 px; placeholders `subtle` | — |
| Mobile títulos | 20–22 px / 700 | — |

## 4. Grid, espaçamentos e dimensões (desktop 1440)

- Container: **1200 px** (margens de 120 px). Header: 68 px, linha inferior `line-strong` nas telas de navegação.
- Navegação: começa em x=496 (376 px do container), espaçamento 40 px.
- Hero: coluna de texto + imagem 450×450 (raio 24 px) alinhada à direita; texto inicia ~44 px abaixo do topo da imagem; botão EXPLORAR 140×40; dots 8 px.
- Catálogo: sidebar **310 px** + gap 48 px + grade 3 colunas de **258 px** (gap 34 px). Card: caixa `surface` 258×299 com imagem 250×250 (raio 16 px), padding 31/4/18 px; nome 12 px abaixo; linhas a cada ~428 px.
- Paginação: botões 35×35, raio 4 px, ativo `accent`.
- Promoções: 2 cartões 586×250 (raio 8 px) com imagem 287×250 (raio 16 px).
- Diário: 4 cartões 268 px (imagem 195 px), gap 24 px.
- Rodapé: bloco de benefícios com colunas 249/266/265/1fr e separadores `accent`; círculos 74 px; faixa 88 px; colunas de links em 303 px.
- Detalhe: miniaturas 100×100 (gap 16 px) → caixa da imagem 444×444 (padding 20 px, imagem raio 20 px) → coluna de informações a partir de x=725. Chips de edição 26 px (pill); botões de quantidade 31×46 (pill accent); COMPRAR/Favoritar 130×40.
- Carrinho: tabela 782 px (colunas 311/138/136/…); linhas 70 px `surface`; resumo 332 px a partir de x=988.
- Pagamento: formulário 2 colunas (369 px cada, gap 24 px) + coluna "Seus NFTs" 405 px.
- Confirmação: cartão 578 px centralizado, topo y=166, borda inferior 10 px `accent`.
- Login/Cadastro: diálogo 500 px, campos 340 px, borda inferior 10 px `accent`.
- Perfil/Carteiras: menu lateral 310 px (item ativo com barra 6 px) + formulário 2 colunas (417 px).

Breakpoints implementados: `<768` mobile (frames mobile), `768–1023` tablet (header desktop, filtros em gaveta), `≥1024` desktop, `≥1280` larguras fixas do Figma.

## 5. Componentes compartilhados

Header, MobileNav (barra inferior com botão central flutuante), MobileTopBar (voltar + título), Footer, NftCard (+ skeleton), QuantityStepper, Breadcrumbs, WalletsPill, Stars, FormField, Button/Input/Select/Dialog/Sheet/Tabs/Slider/RadioGroup/DropdownMenu (shadcn/ui adaptados), estados (ErrorState, EmptyState, BackgroundUpdating), Skeleton com shimmer.

## 6. Estados não desenhados (criados no mesmo sistema visual)

Skeletons (catálogo, detalhe, resumo do carrinho, checkout, perfil, carteiras, pedido); vazio (catálogo, carrinho, favoritos); erro com "Tentar novamente"; atualização em segundo plano; erros de campo (⚠ + texto `danger`, borda `danger`); conexão de carteira (desconectada/conectando/conectada/recusada); diálogo de revisão; pedido pendente e recusado; avisos de preço alterado/esgotado; página 404 e "indisponível nesta demonstração"; menu da conta logada.

## 7. Verificação visual realizada

Capturas com Playwright em 1440×900 e 414×896 @2× comparadas lado a lado com os PNGs (home, detalhe, login, cadastro, carrinho, pagamento, confirmação, perfil, carteiras e os 6 frames mobile); diferenças de posição/tamanho/tipografia corrigidas iterativamente. Baselines de regressão em `tests/visual/__screenshots__/`. Fidelidade não é declarada "pixel-perfect" absoluta: ver desvios em ARCHITECTURE.md §12 (artes extraídas em resolução limitada; conteúdo dinâmico diferente do mock estático do Figma).
