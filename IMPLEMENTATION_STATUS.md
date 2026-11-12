# Status da implementação

**Fase atual:** 7 — Qualidade e entrega (concluída, exceto deploy público).
**Última verificação:** 2026-11-11, Node 22.23.4, Chromium 153 (Playwright 1.63), Lighthouse 13.6.

Legenda: **Verificado** = validado por execução (teste automatizado, auditoria ou inspeção visual registrada); **Implementado** = presente, sem verificação automatizada dedicada; **Bloqueado** = depende de ação externa.

## Evidências de execução

| Comando | Resultado | Registro |
| --- | --- | --- |
| `npm run typecheck` | 0 erros | `docs/evidence/quality-checks.log` |
| `npm run lint` | 0 erros, 0 avisos | idem |
| `npm run build` | sucesso (Vite 8, ~0,6 s) | idem |
| `npx playwright test` (desktop + mobile + visual, contra `vite preview`) | **60 passed / 0 failed / 0 flaky** (1,5 min) | `docs/evidence/playwright-run.log`, `playwright-report/index.html` |
| `npm run lighthouse` (3 medições × 2 páginas × 2 perfis) | ver tabela abaixo | `lighthouse/reports/` (12 HTML + 12 JSON + `summary.json` + `SUMMARY.md`), `docs/evidence/lighthouse-run.log` |
| Varredura de overflow horizontal (390/768/1024/1440, 11 rotas) | sem overflow | script de inspeção (seção Responsividade) |

## Requisitos do enunciado

| Requisito | Status | Arquivos | Evidência |
| --- | --- | --- | --- |
| Stack obrigatória (React, TS, TanStack Router/Query, Axios, REST, Socket.IO, Tailwind, shadcn/ui, MSW, Playwright, Lighthouse) | Verificado | `package.json`, `src/**` | build + suíte E2E exercitando cada camada |
| Início: destaques, catálogo, busca, filtros, ordenação, navegação | Verificado | `src/features/catalog/*` | `01-catalog`, visual `inicio-*` |
| URL state (busca/filtros/ordenação/paginação), refresh e histórico | Verificado | `src/app/router/search-schemas.ts`, `useCatalogNavigation.ts` | `01-catalog` (back/forward/reload) |
| Filtros combináveis; filtro reinicia paginação | Verificado | idem | `01-catalog` |
| Consultas refletem parâmetros; vazio, falha, fora de ordem | Verificado | `catalog/queries.ts`, `mocks/handlers/catalog.ts` | `01-catalog`, `12-loading-errors` |
| Detalhe: acesso direto, inexistente, edição indisponível, limite de quantidade | Verificado | `src/features/nft/NftDetailPage.tsx` | `02-detail`, `05-cart` (limite) |
| Galeria, informações, edição, quantidade, favoritos, compra | Verificado | idem | `02-detail`, `04-favorites`, `06-purchase` |
| Favoritos persistentes para o usuário | Verificado | `src/features/favorites/*` | `04-favorites` |
| Carrinho: adicionar/alterar/remover respeitando disponibilidade | Verificado | `src/features/cart/*`, `mocks/handlers/cart.ts` | `05-cart` |
| Carrinho após refresh; itens do visitante preservados ao autenticar | Verificado | `lib/cart/guest-cart.ts`, `features/auth/session.ts` | `05-cart` |
| Cupom aplicar/remover, inválido/expirado | Verificado | `CartSummary.tsx` | `05-cart` |
| Subtotal/desconto/taxa/total coerentes com a API | Verificado | `QuoteTotals`, `mocks/domain.ts` | `05-cart`, `06-purchase` (valores exatos) |
| Alterações de preço/disponibilidade com carrinho aberto | Verificado | `lib/socket/realtime.ts`, `QuoteIssues.tsx` | `09-realtime-checkout` |
| ETH como string decimal com precisão | Verificado | `lib/money/eth.ts` | totais exatos nos testes (ex.: 26.846, 2.158) |
| Pagamento: validação, revisão antes do envio | Verificado | `features/checkout/CheckoutPage.tsx` | `06`, `07`, `09` |
| Carteiras cadastradas, rede, conexão/recusa/desconexão simuladas | Verificado | idem, `mocks/handlers/orders.ts` | `07` (recusa), `06` (conexão); desconexão: botão "Desconectar" (Implementado) |
| Revalidar preço/disponibilidade/cupom/taxas; mudança exige nova confirmação | Verificado | `CheckoutPage.tsx` (ReviewDialog), `POST /quotes`, `QUOTE_STALE` | `09-realtime-checkout` |
| Impedir pedidos duplicados (cliques/timeout) | Verificado | `features/checkout/attempt.ts` | `07-payment-failures` |
| Pedido pendente/confirmado/recusado com recuperação após refresh/reconexão | Verificado | `features/orders/OrderPage.tsx` | `07`, `10-realtime-robustness` |
| Confirmação só para pedido confirmado; preservar itens em falha; remover só o comprado | Verificado | `mocks/domain.ts#settleOrder` | `06`, `07` |
| Recibo como snapshot imutável | Verificado | `Order.receipt` | `06-purchase` (preço muda após compra) |
| Login: autenticação, validação, retorno ao fluxo | Verificado | `features/auth/*` | `03-auth`, `06` |
| Cadastro: validação e conflito | Verificado | idem | `03-auth` |
| Perfil: dados, avatar, senha | Verificado | `features/profile/*` | `08-account` |
| Carteiras: principal e secundária, validação | Verificado | `features/wallets/*` | `08-account` |
| Sessão recuperável; expiração na navegação e no checkout com retomada | Verificado (navegação) / Implementado (checkout: rascunho em sessionStorage + redirect) | `App.tsx`, `session.ts`, `CheckoutPage.tsx` | `03-auth` |
| Logout/troca de usuário limpam cache privado e subscriptions | Verificado | `session.ts#endSession`, `realtime.ts` | `03-auth`, `10` (eventos de outra sessão) |
| Senhas não armazenadas em claro | Verificado | `mocks/fixtures/users.ts`, `db.ts#hashPassword` | `03-auth` (storage não contém a senha) |
| Contratos tipados; loading/vazio/erro/sucesso/atualização em 2º plano | Verificado | `types/api.ts`, `components/shared/states.tsx` | `12`, `01` |
| Cancelamento/descarte de respostas obsoletas | Verificado | `signal` nas queryFns; época de sessão no Axios | `01` (fora de ordem) |
| Atualização otimista com rollback | Verificado | `favorites/queries.ts`, `cart/queries.ts` | `04-favorites` |
| Rotas inexistentes e acesso direto a qualquer tela | Verificado | `router.tsx`, `vercel.json` | `02-detail` (404), testes acessam rotas diretamente |
| Contratos REST documentados, incl. erros 400/401/403/404/409/5xx | Verificado | `docs/REST_API.md` | `01` (400), `03` (401/409), `07` (409), `12` (5xx) |
| Idempotência: mesma tentativa ⇒ mesmo pedido; conteúdo diferente ⇒ conflito | Verificado | `mocks/handlers/orders.ts` | `07-payment-failures` |
| MSW na camada de rede, estado consistente, persistência e reset | Verificado | `src/mocks/**` | toda a suíte; reset: `/__mock/reset` |
| Cenários de rede/falha configuráveis e reproduzíveis (PRNG com semente) | Verificado | `mocks/scenarios.ts` | `01`, `07`, `09`, `10`, `12` |
| ≥ 2 usuários, fixtures suficientes (40 NFTs, 9 coleções, 3 redes) | Verificado | `mocks/fixtures/*` | `01`, `03` |
| Socket.IO via MSW (`@mswjs/socket.io-binding`) exercitando `socket.io-client` | Verificado | `mocks/socket/server.ts`, `lib/socket/realtime.ts` | `09`, `10` |
| Mocks ativos no build de demonstração | Verificado | `main.tsx`, `VITE_ENABLE_MOCKS` | suíte roda contra `vite preview` |
| `nft.updated` / `order.updated` com id, recurso e versão; duplicatas/antigos; reconexão; isolamento | Verificado | `realtime.ts` | `10-realtime-robustness` |
| Cenário obrigatório NFT no carrinho → mudança → aviso → checkout bloqueia cotação desatualizada | Verificado | — | `09` (teste 1) |
| Interrupção com pedido pendente → reconectar/recarregar sem nova compra | Verificado | — | `10` (teste 3) |
| Fidelidade visual (desktop e mobile) | Verificado (comparação lado a lado com os 15 frames) | `DESIGN_SPEC.md` | baselines `tests/visual/__screenshots__/` |
| Responsividade 390/768/1440 (+1024) sem overflow | Verificado | — | script de overflow; testes `@mobile` |
| Skeletons com shimmer e `prefers-reduced-motion` | Verificado (skeletons) / Implementado (reduced motion via CSS) | `globals.css`, `ui/skeleton.tsx` | `12-loading-errors` |
| Acessibilidade (teclado, foco, diálogos, labels, alt, contraste, feedback) | Verificado | — | `11-a11y`, Lighthouse Accessibility 100 |
| Playwright: 12 grupos de cenários, desktop + mobile, visual, HTML report, traces em falhas | Verificado | `tests/**`, `docs/TEST_SCENARIOS.md` | 60/60 |
| Lighthouse: início e detalhe, mobile/desktop, 3 medições, mediana, HTML/JSON, versões | Verificado | `lighthouse/**` | ver abaixo |
| Metas Lighthouse | Parcial: desktop todas ≥ 95; mobile Performance 80/84 (< 90) | — | justificativa abaixo |
| Documentação (README, ARCHITECTURE, contratos, eventos, sessão, carrinho, cache, reconciliação) | Verificado | `*.md`, `docs/*.md` | — |
| Deploy público | **Bloqueado** | `vercel.json`, `public/_redirects` | sem credenciais Vercel/Netlify neste ambiente |

## Lighthouse

Build otimizado + `vite preview`, cenário padrão dos mocks (latência 120–380 ms), Chrome novo a cada medição (Service Worker instalado a frio), throttling simulado. Medianas de 3 medições:

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | mobile | **80** ⚠ | 100 | 100 | 100 | 3452 ms | 0 | 470 ms |
| Início | desktop | 99 | 100 | 100 | 100 | 972 ms | 0 | 10 ms |
| Detalhe | mobile | **84** ⚠ | 100 | 100 | 100 | 3392 ms | 0.039 | 328 ms |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 938 ms | 0 | 0 ms |

**Por que Performance mobile < 90:** o "backend" roda na própria página. Antes de qualquer dado existir, o navegador precisa baixar e executar o MSW (chunk `mocks`, 166 KB gzip) e registrar o Service Worker; cada resposta REST também é processada na thread principal. No perfil mobile (CPU 4× mais lenta) o Lighthouse atribui ~0,8 s de *scripting* ao chunk do MSW e ~0,5 s ao React — o que eleva TBT e atrasa o LCP (a primeira imagem do catálogo depende do `GET /api/nfts`). No trace observado (sem simulação) o LCP ocorre em ~0,7 s. Num backend real o custo do MSW desaparece.

**Otimizações aplicadas:** code splitting por rota; chunks separados (react, tanstack, mocks); imagens WebP responsivas (240/480/960) com `srcset`/`sizes`, `width`/`height` e `fetchpriority`; preload da imagem LCP com `imagesrcset` idêntico ao do elemento; montagem apenas da variante de layout ativa (evita baixar a imagem desktop no mobile); fonte local WOFF2 (subset latin); `min-height` no `<main>` (CLS do rodapé de 0,165 → 0); `aria`/alvos de toque corrigidos (Accessibility 93 → 100).

**Tentado e descartado:** `modulepreload` dos chunks de boot (piorou a simulação mobile: 81→75, por disputar banda com a imagem LCP; mantido opcional via `BOOT_PRELOAD=1`); `content-visibility` em seções abaixo da dobra (sem ganho mensurável e impedia a pintura em screenshots).

Nenhuma funcionalidade, imagem ou fonte foi removida para pontuar.

## Responsividade

Varredura automatizada (elementos ultrapassando a viewport, ignorando contêineres com scroll intencional) em `/`, `/nft/:id`, `/cart`, `/checkout`, `/profile`, `/wallets`, `/favorites`, `/login`, `/register`, `/em-breve`, 404 — em 390, 768, 1024 e 1440 px: **nenhum overflow**. Dois problemas encontrados e corrigidos: grid da conta expandido pela lista de navegação (mobile) e colunas fixas do Figma em 1024 px (agora aplicadas a partir de 1280 px).

## Pendências e limitações

1. **Deploy:** configuração pronta (`vercel.json`), publicação depende de credenciais do avaliador/candidato (`npx vercel --prod`).
2. **Performance mobile** abaixo da meta (justificado acima).
3. **Artes:** extraídas dos PNGs; três delas em resolução de origem ~464 px (upscale para 960). Substituir por originais em `public/assets/nfts/` quando disponíveis.
4. **Tempo real simulado** limitado à aba (sem fan-out entre abas/dispositivos).
5. Seções fora do escopo exibem "indisponível nesta demonstração".

## Próximas ações sugeridas

- Publicar na Vercel e repetir `npm run lighthouse` com `LH_BASE_URL=<url pública>`.
- Substituir as artes pelos originais do Figma.
