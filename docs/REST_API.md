# Contratos REST

Base: `VITE_API_BASE_URL` (padrão `/api`). JSON em UTF-8. Tipos TypeScript em `src/types/api.ts`. Valores em ETH são **strings decimais** (`"1.19"`); quantidades são inteiros.

Autenticação: `Authorization: Bearer <token>`. Visitante: `X-Cart-Id: gcart_<uuid>` identifica o carrinho.

## Erros

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Revise os campos destacados.", "fields": { "email": "Informe um e-mail válido." }, "details": null } }
```

| HTTP | `code` | Uso |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_CURRENT_PASSWORD` | Payload/parâmetros inválidos (`fields` por campo) |
| 401 | `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `SESSION_EXPIRED` | Login inválido / sem token / sessão expirada |
| 403 | `FORBIDDEN`, `WALLET_REJECTED` | Recurso de outro usuário / carteira recusou conexão |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `INSUFFICIENT_AVAILABILITY`, `EDITION_UNAVAILABLE`, `QUOTE_STALE`, `IDEMPOTENCY_CONFLICT`, `WALLET_ROLE_EXISTS`, `CART_EMPTY`, `WALLET_REJECTED` | Conflitos |
| 422 | `COUPON_INVALID`, `COUPON_EXPIRED` | Cupom |
| 5xx | `TRANSIENT_FAILURE` | Falha transitória (retry permitido em consultas) |
| — | rede | `HttpResponse.error()` — o cliente mapeia para `NETWORK_ERROR`; timeout → `TIMEOUT` |

## Sessão e conta

| Método | Rota | Request | Response |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ username, email, password }` | `201 { user, token, expiresAt }` · 400 · 409 `EMAIL_TAKEN`/`USERNAME_TAKEN` |
| POST | `/auth/login` | `{ email, password }` | `200 { user, token, expiresAt }` · 401 `INVALID_CREDENTIALS` |
| GET | `/auth/session` | — | `200 { user, expiresAt }` · 401 `SESSION_EXPIRED` |
| POST | `/auth/logout` | — | `204` |

Expiração: TTL do cenário (8 h; 45 s em `session-short`) ou `POST /__mock/session/expire`.

## NFTs

| Método | Rota | Response |
| --- | --- | --- |
| GET | `/nfts?q&category&network&minPrice&maxPrice&tab&sort&page&pageSize` | `CatalogResponse { items: NftSummary[], page, pageSize, total, totalPages, facets: { categories[], networks[], priceRange }, applied }` |
| GET | `/nfts/featured` | `{ hero: NftSummary[], spotlight: NftSummary }` |
| GET | `/nfts/:id` | `NftDetail` (inclui `editions[{ id, label, price, available, maxPerOrder }]`, `gallery`, `reviews`) · 404 |

- `network`: lista separada por vírgula (`ethereum,polygon`). `tab`: `all|new|trending`. `sort`: `recent|price-asc|price-desc|name`.
- Facetas: cada contagem considera os demais filtros ativos.
- Parâmetros inválidos ⇒ 400 com `fields`.

## Favoritos (auth)

| Método | Rota | Response |
| --- | --- | --- |
| GET | `/favorites` | `{ nftIds: string[], items: NftSummary[] }` |
| PUT | `/favorites/:nftId` | `{ nftIds }` (idempotente) |
| DELETE | `/favorites/:nftId` | `{ nftIds }` |

## Carrinho (visitante ou auth)

| Método | Rota | Request | Response |
| --- | --- | --- | --- |
| GET | `/cart` | — | `Cart { id, ownerType, items[], couponCode, version, updatedAt }` |
| POST | `/cart/items` | `{ nftId, editionId, quantity }` | `201 Cart` · 409 `INSUFFICIENT_AVAILABILITY`/`EDITION_UNAVAILABLE` |
| PATCH | `/cart/items/:itemId` | `{ quantity }` | `Cart` · 409 (aumentar acima do limite; reduzir é sempre permitido) |
| DELETE | `/cart/items/:itemId` | — | `Cart` |
| POST | `/cart/acknowledge` | — | `Cart` (aceita os preços atuais) |
| PUT | `/cart/coupon` | `{ code }` | `Cart` · 422 `COUPON_INVALID`/`COUPON_EXPIRED` |
| DELETE | `/cart/coupon` | — | `Cart` |
| POST | `/cart/merge` (auth) | `{ guestCartId }` | `Cart` do usuário |

`CartItem`: `{ id, nftId, editionId, editionLabel, name, tokenId, image, quantity, unitPrice, addedUnitPrice, available, maxPerOrder }`.

## Cotação

`POST /quotes { network? }` ⇒ `Quote`:

```json
{
  "id": "quo_9b1c2d3e_7", "hash": "9b1c2d3e", "cartId": "…", "cartVersion": 7, "network": "ethereum",
  "lines": [{ "cartItemId": "ci_…", "name": "Emerald Ape #042", "editionLabel": "1/50", "quantity": 2, "unitPrice": "1.19", "lineTotal": "2.38", "available": 24, "…": "…" }],
  "coupon": { "code": "KURIO10", "status": "applied", "description": "10% de desconto no lançamento" },
  "subtotal": "2.38", "discount": "0.238", "networkFee": "0.016", "total": "2.158",
  "issues": [{ "code": "PRICE_CHANGED", "cartItemId": "ci_…", "previous": "1.19", "current": "1.29", "message": "…" }],
  "purchasable": true, "createdAt": "…", "expiresAt": "…"
}
```

Taxa de rede: Ethereum 0.016 · Polygon 0.002 · Solana 0.001. `hash` muda sempre que linhas, quantidades, preços, disponibilidade suficiente, cupom, desconto, taxa, total ou rede mudam.

## Carteiras e conexão (auth)

| Método | Rota | Request | Response |
| --- | --- | --- | --- |
| GET | `/wallets` | — | `Wallet[]` |
| POST | `/wallets` | `WalletInput` (`role: primary|secondary`) | `201 Wallet` · 400 · 409 `WALLET_ROLE_EXISTS` |
| PATCH | `/wallets/:id` | `Partial<WalletInput>` | `Wallet` · 403 (outro usuário) · 404 |
| POST | `/wallet-connections` | `{ walletId, provider, network }` | `201 WalletConnection` · 403 `WALLET_REJECTED` |
| DELETE | `/wallet-connections/:id` | — | `204` |

Validação: endereço `0x` + 40 hex; ENS/secundária `0x…` ou `nome.eth`; e-mail; campos obrigatórios.

## Pedidos (auth)

| Método | Rota | Headers / Request | Response |
| --- | --- | --- | --- |
| POST | `/orders` | `Idempotency-Key: <≥8 chars>` · `{ quoteId, quoteHash, walletId, connectionId, network, collector }` | `201 Order` (novo) · `200 Order` + `Idempotent-Replayed: true` (mesma chave e conteúdo) · `409 IDEMPOTENCY_CONFLICT` (mesma chave, conteúdo diferente) · `409 QUOTE_STALE` (`details` = nova `Quote`) · `409 INSUFFICIENT_AVAILABILITY` · `409 WALLET_REJECTED` (sem conexão) · `409 CART_EMPTY` · 400 |
| GET | `/orders?status=` | — | `Order[]` do usuário |
| GET | `/orders/:id` | — | `Order` · 403 (outro usuário) · 404 |

`Order`: `{ id, userId, status: pending|confirmed|rejected, version, idempotencyKey, receipt: { lines[], subtotal, discount, networkFee, total, couponCode, network, walletLabel, walletAddress, provider }, transaction: { hash, explorerUrl } | null, rejectionReason, createdAt, updatedAt }`. O `receipt` é um snapshot imutável.

## Perfil (auth)

| Método | Rota | Request | Response |
| --- | --- | --- | --- |
| GET | `/profile` | — | `Profile` |
| PATCH | `/profile` | `{ displayName, username, email, ensName, ensSuffix, walletNickname }` | `Profile` · 400 · 409 `USERNAME_TAKEN`/`EMAIL_TAKEN` |
| PUT | `/profile/avatar` | `{ dataUrl }` (png/jpeg/webp, ≤ ~1 MB; o cliente redimensiona para 256 px) | `Profile` · 400 |
| DELETE | `/profile/avatar` | — | `Profile` |
| POST | `/profile/password` | `{ currentPassword, newPassword }` | `204` · 400 `INVALID_CURRENT_PASSWORD`/`VALIDATION_ERROR` |

## Controle da simulação (`/__mock/*`, sem latência)

| Método | Rota | Efeito |
| --- | --- | --- |
| GET/PUT | `/__mock/scenario` | Lê / define o cenário (`{ id }`) |
| POST | `/__mock/reset` | Restaura o seed (`{ scenario? }`) |
| POST | `/__mock/fail-next` | `{ route: "PUT /api/favorites/:id", status: 500 | "network", times }` |
| POST | `/__mock/nft-update` | `{ nftId, editionId?, price?, available? }` ⇒ altera e emite `nft.updated` |
| POST | `/__mock/session/expire` | Expira todas as sessões |
| POST | `/__mock/socket/disconnect` | Derruba as conexões Socket.IO |
| POST | `/__mock/socket/replay` | Reenvia o último evento (mesmo `eventId`) |
| POST | `/__mock/socket/stale` | Emite `nft.updated` com versão antiga |
| GET | `/__mock/events`, `/__mock/socket/clients` | Diagnóstico |
| POST | `/__mock/orders/:id/settle` | Liquida um pedido pendente imediatamente |
