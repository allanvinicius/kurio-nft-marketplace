# Arquitetura — KURIO

## 1. Visão geral

```
┌──────────────────────────── Navegador ─────────────────────────────┐
│  React (rotas TanStack Router)                                     │
│    │ hooks de feature (useCart, useQuote, useFavorites…)           │
│    ▼                                                               │
│  TanStack Query ──► Axios (src/lib/api) ──► fetch/XHR ─┐           │
│    ▲                                                   │ Service   │
│    │ setQueryData / invalidate                         │ Worker    │
│  RealtimeClient (socket.io-client) ◄── WebSocket ──┐   │ (MSW)     │
│                                                    │   ▼           │
│  ┌──────────── Backend simulado (src/mocks) ───────┴──────────┐    │
│  │ handlers REST (http.*)   servidor Socket.IO (ws.link +     │    │
│  │ domain.ts (catálogo,     @mswjs/socket.io-binding)         │    │
│  │ carrinho, cotação,       db.ts (estado + localStorage)     │    │
│  │ pedidos)                 scenarios.ts (latência/falhas)    │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

Estrutura (feature-oriented):

```
src/
├── app/            App, mount, providers (Realtime), router (rotas + schemas de URL), estilos
├── components/     ui/ (shadcn adaptado), layout/ (Header, Footer, MobileNav), shared/
├── features/       auth, catalog, nft, favorites, cart, checkout, orders, profile, wallets, devtools
├── lib/            api/ (Axios + endpoints), query/ (QueryClient + chaves), socket/, money/, auth/, cart/, utils/
├── mocks/          fixtures/, handlers/, persistence/, socket/, domain.ts, scenarios.ts, browser.ts
├── hooks/          useMediaQuery
└── types/api.ts    contratos REST e de eventos (compartilhados por app e mocks)
```

Regras: nenhum componente/hook/cliente contém respostas fictícias; toda resposta vem da rede (MSW). Componentes não acessam o Axios diretamente — usam hooks de feature, que usam `src/lib/api/endpoints.ts`.

## 2. Boot

`src/main.tsx` inicia o MSW **antes** de importar a aplicação. Motivo: o `engine.io-client` captura `globalThis.WebSocket` no momento da avaliação do módulo; se o app fosse importado antes, o Socket.IO usaria o WebSocket nativo (não interceptado). Depois do `worker.start()`, `src/app/mount.tsx` é importado dinamicamente.

## 3. Contratos

`src/types/api.ts` define requests, responses, erros (`ApiErrorBody` com `code`, `message`, `fields`, `details`) e eventos (`RealtimeEnvelope`). Valores monetários são `EthAmount = string`. Detalhes: [docs/REST_API.md](docs/REST_API.md) e [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md).

## 4. Roteamento e URL

TanStack Router (code-based) em `src/app/router/router.tsx`:

| Rota | Proteção | Observações |
| --- | --- | --- |
| `/` | — | busca/filtros/ordenação/página em search params (`q`, `category`, `network`, `min`, `max`, `tab`, `sort`, `page`), validados por Zod com `.catch()` |
| `/nft/$nftId` | — | 404 tratado na página |
| `/cart` | — | visitante ou usuário |
| `/checkout`, `/orders/$orderId`, `/profile`, `/wallets`, `/favorites` | `beforeLoad: requireAuth` | redireciona para `/login?redirect=<href>` |
| `/login`, `/register` | — | `redirect` validado (apenas caminhos internos) |
| `/em-breve` | — | seções fora do escopo |
| `*` | — | `NotFoundPage` |

Mudança de filtro/ordenação/aba reinicia a paginação (`useCatalogNavigation`); cada mudança cria entrada no histórico (voltar/avançar restauram), digitação na busca usa `replace`. Os parâmetros da URL são convertidos em `CatalogParams`, que formam a **chave** da query e os **query params** do `GET /api/nfts`.

Rotas além da home são lazy (`lazyRouteComponent`); preload por intenção (`defaultPreload: 'intent'`).

## 5. Estado remoto e cache (TanStack Query)

Chaves (`src/lib/query/client.ts`):

| Dado | Chave | staleTime |
| --- | --- | --- |
| Sessão | `['session', token]` | 60 s |
| Catálogo | `['catalog', params]` | 30 s, `keepPreviousData` |
| Destaques | `['featured']` | 60 s |
| Detalhe | `['nft', id]` | 15 s |
| Carrinho | `[kind, ownerId, 'cart']` (`kind` = `user`/`guest`) | 10 s |
| Cotação | `[kind, ownerId, 'cart', 'quote', cartVersion, network]` | 0 (sempre fresca), refetch em foco |
| Favoritos / perfil / carteiras / pedido | `['user', userId, …]` | 60 s (pedido: polling de 8 s **somente** enquanto pendente) |

- **gcTime:** 5 min.
- **Retry:** consultas repetem até 2× apenas para erros transitórios (rede, timeout, 5xx), backoff 400 ms·2ⁿ (máx. 3 s). 4xx nunca. **Mutations nunca repetem automaticamente** (evita operações duplicadas).
- **Cancelamento:** todas as queryFns repassam `signal` ao Axios — trocas rápidas de filtro cancelam a requisição anterior; respostas fora de ordem só preenchem a própria chave.
- **Atualização otimista com rollback:** favoritos (`useToggleFavorite`) e quantidade do carrinho (`useUpdateCartItem`): `onMutate` (cancela + snapshot + aplica), `onError` (restaura + aviso acessível), `onSettled` (revalida).
- **Invalidação:** mutations do carrinho gravam o carrinho retornado (nova `version` ⇒ nova cotação); `nft.updated` atualiza detalhe/catálogo/favoritos/carrinho no cache e invalida a cotação; `order.updated` atualiza o pedido e invalida o carrinho quando confirmado; reconexão do socket invalida catálogo, NFTs, carrinho/cotação e pedidos.
- **Estados:** skeleton (pending), vazio, erro com retry, sucesso, e "Atualizando…" para `isFetching` em segundo plano (sem deslocar layout).

## 6. Sessão

- `POST /auth/login|register` retornam `{ user, token, expiresAt }`. O cliente guarda apenas `{ token, userId, expiresAt }` em `localStorage` (`kurio.session`) — nunca a senha.
- Recuperação após refresh: `GET /auth/session` valida o token (`useSession`, `requireAuth`).
- **Época de sessão:** `sessionStore` incrementa `epoch` a cada login/logout/expiração. O Axios marca cada requisição com a época; respostas de uma época anterior são descartadas (`StaleSessionResponse`) — nenhuma resposta tardia de um usuário alcança o cache de outro.
- **Expiração:** qualquer `401 SESSION_EXPIRED/UNAUTHENTICATED` de uma requisição autenticada dispara `endSession('expired')`: cancela e remove `['user']`, remove a sessão em cache, troca o socket e, se a rota é privada, navega para `/login?redirect=<rota atual>`. No checkout, o formulário é salvo em `sessionStorage` (`kurio.checkout.draft`, por usuário) e restaurado após o novo login.
- **Logout/troca de usuário:** mesma limpeza; o socket da sessão anterior é encerrado (`removeAllListeners` + `disconnect`) antes de abrir o novo, que se identifica via `session.join`.
- Sincronização entre abas via evento `storage`.

## 7. Carrinho

- O carrinho vive no servidor (MSW). Visitante: identificado por `X-Cart-Id` (`kurio.guestCartId` em localStorage, gerado no cliente). Usuário: carrinho vinculado ao `userId`.
- **Merge no login:** `POST /cart/merge { guestCartId }` soma quantidades respeitando limites; o id de visitante é rotacionado. Se o merge falhar, o id é mantido para nova tentativa.
- Cada item guarda `addedUnitPrice`; quando difere do preço atual, a cotação traz `PRICE_CHANGED` (informativo; "Entendi" chama `POST /cart/acknowledge`). `SOLD_OUT` / `INSUFFICIENT_AVAILABILITY` / cupom inválido bloqueiam a finalização.
- Limites por edição: `min(disponível, maxPerOrder)` validados no cliente (UX) e no servidor (autoritativo).

## 8. Precisão financeira

`src/lib/money/eth.ts` usa `decimal.js` (precisão 40, `ROUND_HALF_EVEN`). Todos os valores trafegam como strings decimais; quantidades são inteiros validados. Subtotal, desconto, taxa e total exibidos vêm **da cotação da API**; o cliente só formata (o total de linha usa `quote.lines[].lineTotal` quando disponível). Exemplo verificado em teste: 2×1.19 + 6×1.39 + 9×1.79 + 0.016 = **26.846 ETH**.

## 9. Checkout e idempotência

1. Formulário validado (Zod + RHF, erros associados por `aria-describedby`).
2. Conexão simulada da carteira cadastrada: `POST /wallet-connections` (aceita/recusa); trocar carteira/rede/provedor desconecta (`DELETE`).
3. "Confirmar compra" ⇒ `POST /quotes` **revalida** preço, disponibilidade, cupom e taxa; abre o diálogo de revisão. Se o hash difere do que estava na tela, o diálogo explica a mudança.
4. Durante a revisão, se a cotação ao vivo mudar (`nft.updated`), o botão é bloqueado até "Revisar nova cotação".
5. `POST /orders` com `Idempotency-Key` e `quoteHash`. O servidor recalcula: hash diferente ⇒ `409 QUOTE_STALE` (com a nova cotação) ⇒ nova confirmação obrigatória.
6. **Idempotência** (`src/features/checkout/attempt.ts`): a tentativa (chave + payload + impressão digital) é salva em `localStorage` antes do envio. Cliques repetidos são ignorados (ref síncrona). Timeout/rede ⇒ estado "incerto" + 1 reenvio automático com a mesma chave; depois, "Tentar novamente" (mesma chave). Erro definitivo descarta a tentativa. Ao abrir `/checkout` com tentativa incerta, ela é reenviada automaticamente (refresh/queda). No servidor: mesma chave + mesmo conteúdo ⇒ mesmo pedido (`200`, `Idempotent-Replayed: true`); mesma chave + conteúdo diferente ⇒ `409 IDEMPOTENCY_CONFLICT`.
7. Pedido `pending` ⇒ `/orders/:id`. A liquidação (servidor simulado) confirma ou recusa, baixa o estoque, remove **somente** itens/quantidades comprados do carrinho e emite `order.updated` + `nft.updated`. Estados `confirmed`/`rejected` são terminais. O recibo é um **snapshot** gravado na criação do pedido (alterações posteriores do catálogo não o afetam).

## 10. Tempo real e reconciliação

`src/lib/socket/realtime.ts`:
- Um socket por sessão (`transports: ['websocket']`, reconexão 0,5–4 s).
- Deduplicação por `eventId` (LRU de 500) e ordenação por `version` por recurso (compara também com a versão em cache): duplicatas e eventos antigos são ignorados e contabilizados (`window.__kurioRealtime.stats`, somente leitura).
- `order.updated` só é aplicado se `event.userId === usuário atual` (o servidor também só envia para conexões do dono).
- **Reconexão:** ao reconectar, invalida catálogo, NFTs, carrinho/cotação e pedidos (REST é a fonte da verdade) e anuncia "Conexão em tempo real restabelecida".
- Avisos (preço alterado, disponibilidade, pedido confirmado/recusado) são exibidos por toasts `sonner` (região `aria-live`).
- Pedido pendente tem polling de segurança de 8 s, cobrindo o caso de o tempo real estar indisponível.

## 11. Acessibilidade

Link "Pular para o conteúdo"; foco movido ao `<main>` em navegação SPA; diálogos/drawers Radix com foco preso, Esc e **restauração de foco** (também para diálogos controlados); labels e erros associados (`aria-invalid`, `aria-describedby`); estados não dependentes de cor (ícones ⚠/✓, textos "esgotada", `aria-pressed`/`aria-checked`); alvos de toque ≥ 24 px; `prefers-reduced-motion` desativa shimmer/animações; sem overflow horizontal em 390/768/1024/1440 (verificado por script).

## 12. Decisões de UX e desvios do Figma

| Item | Decisão |
| --- | --- |
| Login/Cadastro | Desktop: diálogo sobre a home (como no Figma), com overlay leve para foco; mobile: tela cheia (frames mobile). |
| "Mercado" | Âncora para o catálogo na home (não há tela própria no Figma). "Criadores"/"Aprenda" levam a `/em-breve` (fora do escopo). |
| Abas "Contrato" / "Direitos autorais" | No Figma os textos estão trocados; aqui cada rótulo mostra o conteúdo correspondente. |
| Carrinho | Linha mostra a edição ao lado do ID do token (necessário para distinguir edições) e avisos de preço/estoque. |
| Pagamento | Endereço da carteira é somente leitura (vem da carteira cadastrada); adicionados status de conexão (Conectar/Desconectar), diálogo de revisão e indicador de tempo real. "Usar outra carteira?" alterna para a carteira secundária. |
| Mobile pagamento | Frame mobile não tem o formulário; ele aparece abaixo das carteiras (obrigatório pela validação). |
| Ordenação no mobile | Fica dentro da gaveta de filtros (o frame mobile não tem seletor visível). |
| Cards desktop | Coração aparece em hover/foco (ou quando favoritado); no mobile sempre visível, como no frame. |
| Filtro "Rede" | ✓ ao lado das redes selecionadas (estado não dependente só de cor). |
| Confirmação | Rota própria sem header/rodapé, reproduzindo o frame (cartão isolado). Pendente/recusado seguem o mesmo cartão. |
| Contagens de coleção/rede | Calculadas pela API a partir das 40 fixtures (no Figma são números ilustrativos). |
| Paginação | 9 itens por página (grade 3×3 do Figma) ⇒ 5 páginas. |
| Painel de cenários | Botão discreto adicional para demonstração/avaliação (pode ser desativado por `VITE_SHOW_SCENARIO_PANEL=false`). |

## 13. Limitações

Ver README §8 e [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md#limitações-do-transporte-simulado).
