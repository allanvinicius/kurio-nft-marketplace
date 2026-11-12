# Eventos em tempo real (Socket.IO)

## Transporte

- Cliente: `socket.io-client` 4 (`src/lib/socket/realtime.ts`), `transports: ['websocket']`, `path: '/socket.io'`, reconexão automática (0,5 s → 4 s).
- Servidor simulado: `src/mocks/socket/server.ts` com `ws.link()` do **MSW 2** + **`@mswjs/socket.io-binding`**, que codifica/decodifica pacotes Engine.IO/Socket.IO. O MSW substitui o construtor `WebSocket` na página; a conexão é atendida pelo handler (não há servidor de rede).
- O MSW normaliza o caminho `/socket.io/` para `/`, por isso o link casa a raiz de qualquer host; conexões sem `EIO` na query (ex.: HMR do Vite) são repassadas ao servidor real (`server.connect()`).
- O servidor envia `ping` Engine.IO a cada 20 s (o binding anuncia `pingInterval` 25 s).
- Funciona igualmente no build de produção/deploy (o mesmo código MSW é empacotado com `VITE_ENABLE_MOCKS=true`).

## Envelope

```ts
interface RealtimeEnvelope<T, P> {
  eventId: string    // identidade estável (deduplicação)
  type: T
  resourceId: string // recurso afetado
  version: number    // versão do recurso após o evento (ordenação)
  occurredAt: string
  userId?: string    // eventos privados: dono do recurso
  payload: P
}
```

## Eventos

| Direção | Evento | Payload | Comportamento no cliente |
| --- | --- | --- | --- |
| C→S | `session.join` | `{ token \| null }` | Associa a conexão ao usuário (ou visitante). Enviado a cada `connect`. |
| S→C | `session.ready` | `{ userId \| null }` | Confirmação. |
| S→C | `nft.updated` | `{ nftId, name, price, totalAvailable, editions[{ id, label, price, available }], change }` | Atualiza detalhe, catálogo (todas as páginas em cache), destaques, favoritos e itens do carrinho; invalida a cotação; avisa se o NFT está no carrinho (preço/disponibilidade). |
| S→C | `order.updated` | `{ orderId, status, transaction, rejectionReason }` + `userId` | Só aplicado se `userId` = usuário atual e `version` maior; atualiza o pedido, invalida carrinho (confirmado) e anuncia confirmação/recusa. |

Emissores: alterações de preço/estoque (`/__mock/nft-update`, cenários de checkout, liquidação de pedidos) e liquidação de pedidos (`settleOrder`). `order.updated` é enviado apenas às conexões autenticadas do dono.

## Garantias do cliente

- **Duplicatas:** `eventId` já visto ⇒ ignorado (`stats.ignoredDuplicate`).
- **Eventos antigos:** `version` ≤ versão conhecida (mapa local ou versão em cache vinda do REST) ⇒ ignorado (`stats.ignoredStale`); nunca regride um estado mais recente nem reaplica efeitos.
- **Sessões:** um socket por sessão; ao trocar/encerrar a sessão o socket anterior é desconectado e seus listeners removidos. Eventos de pedido de outro usuário ⇒ ignorados (`stats.ignoredForeign`).
- **Reconexão:** no `connect` subsequente, o cliente invalida catálogo, NFTs, carrinho/cotação e pedidos (reconcilia com REST) e anuncia o restabelecimento.
- **Pedido pendente:** além do evento, polling de segurança de 8 s via `GET /orders/:id` enquanto `pending`; o servidor liquida pedidos vencidos ao ser consultado (recuperação após aba fechada/refresh).

## Limitações do transporte simulado

- Apenas WebSocket (sem fallback de long-polling); sem rooms/namespaces/acks nativos — o roteamento por usuário é feito no handler.
- O "servidor" vive na aba: outras abas/dispositivos não recebem os eventos nem compartilham estado.
- O handshake é sintetizado pelo binding (`sid: "test"`).
- `connect_error` real de rede não ocorre; a indisponibilidade é simulada fechando a conexão (cenário `offline`, `/__mock/socket/disconnect`).
