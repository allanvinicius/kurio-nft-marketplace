# KURIO — Marketplace de NFTs

Implementação do desafio **Frontend — Marketplace de NFTs** (enunciado original em [`references/challenge-original.md`](references/challenge-original.md); frames do Figma em [`references/figma/`](references/figma)).

Aplicação React + TypeScript com descoberta (catálogo/detalhe), compra (carrinho, cotação, pagamento idempotente, recibo) e conta do colecionador (cadastro, login, perfil, avatar, senha, carteiras), totalmente funcional sobre um **backend simulado com MSW** (REST + Socket.IO) que também roda no build de demonstração.

| Responsabilidade | Tecnologia | Onde |
| --- | --- | --- |
| Interface | React 19 | `src/` |
| Linguagem | TypeScript (strict, `noUncheckedIndexedAccess`) | `tsconfig.json` |
| Build | Vite 8 | `vite.config.ts` |
| Roteamento / URL state / rotas privadas | TanStack Router (code-based) | `src/app/router/` |
| Estado remoto | TanStack Query 5 | `src/lib/query/`, `src/features/*/queries.ts` |
| Cliente HTTP | Axios (instância única com interceptors) | `src/lib/api/client.ts` |
| Tempo real | socket.io-client 4 | `src/lib/socket/realtime.ts` |
| Estilo | Tailwind CSS 4 (tokens do Figma em `@theme`) | `src/app/styles/globals.css` |
| Componentes | shadcn/ui (Radix) adaptados à identidade KURIO | `src/components/ui/`, `components.json` |
| Mocks | MSW 2 + `@mswjs/socket.io-binding` | `src/mocks/` |
| Formulários | React Hook Form + Zod | `src/features/**` |
| Dinheiro | decimal.js (strings decimais ponta a ponta) | `src/lib/money/eth.ts` |
| E2E + regressão visual | Playwright 1.63 | `tests/`, `playwright.config.ts` |
| Auditoria | Lighthouse 13 | `lighthouse/` |

> Documentação complementar: [ARCHITECTURE.md](ARCHITECTURE.md) · [DESIGN_SPEC.md](DESIGN_SPEC.md) · [ASSETS_MANIFEST.md](ASSETS_MANIFEST.md) · [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) · [docs/REST_API.md](docs/REST_API.md) · [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md) · [docs/TEST_SCENARIOS.md](docs/TEST_SCENARIOS.md) · [Processo de desenvolvimento](docs/PROCESSO_DE_DESENVOLVIMENTO.md)

---

## 1. Setup

Requisitos: **Node.js ≥ 20.19** (testado com Node 22.23) e npm 10.

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:5173. O MSW registra o Service Worker (`public/mockServiceWorker.js`) e intercepta o WebSocket na própria página — não há backend externo.

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks (Vite, porta 5173) |
| `npm run build` | Verificação de tipos + build otimizado em `dist/` (mocks incluídos) |
| `npm run preview` | Serve o build em http://localhost:4173 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (TypeScript + regras de hooks) |
| `npm run test:e2e` | Playwright E2E — Chromium desktop (1440) e mobile (Pixel 7, testes `@mobile`) |
| `npm run test:visual` | Regressão visual (início, detalhe, carrinho, pagamento; desktop 1440 e mobile 414) |
| `npm run test:visual:update` | Regrava as baselines visuais |
| `npm test` | Todos os projetos Playwright |
| `npm run test:report` | Abre o relatório HTML (`playwright-report/`) |
| `npm run lighthouse` | Auditoria Lighthouse (requer `npm run preview` ativo) |

O Playwright sobe sozinho `npm run build && vite preview` (porta 4173). Para rodar contra o dev server: `PW_BASE_URL=http://localhost:5173 npx playwright test`.

### Variáveis de ambiente (`.env.example`)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Ativa o backend MSW (REST + Socket.IO). **Necessário na demonstração.** |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas Axios. |
| `VITE_SOCKET_URL` | *(vazio = mesma origem)* | Origem do Socket.IO. |
| `VITE_SHOW_SCENARIO_PANEL` | `true` | Exibe o painel de cenários (ícone de frasco). |

## 2. Credenciais fictícias

| Usuário | E-mail | Senha | Observações |
| --- | --- | --- | --- |
| Ana Colecionadora | `ana@kurio.dev` | `Kurio@2026` | Carteira principal (Ethereum/MetaMask) e secundária (Polygon/Coinbase); favorito: Ivory Baron #088 |
| Bruno Nakamoto | `bruno@kurio.dev` | `Kurio@2026` | Sem carteiras (exercita o cadastro de carteira antes do pagamento) |

Senhas não são armazenadas em claro: o mock guarda `sha256(salt:senha)` e o cliente guarda apenas o token opaco da sessão.

Cupons: `KURIO10` (10%), `GENESIS` (0,5 ETH acima de 2 ETH), `EXPIRADO` (expirado). Qualquer outro código é inválido.

## 3. Cenários da simulação e reset

Selecione um cenário de três formas:

1. **URL:** `?scenario=<id>` em qualquer rota (persistido para os próximos carregamentos). Ex.: `/?scenario=slow`.
2. **Painel de cenários** (botão com ícone de frasco, canto inferior esquerdo no desktop / borda direita no mobile).
3. **API de controle:** `PUT /__mock/scenario {"id":"<id>"}` (usada pelos testes).

| id | Efeito |
| --- | --- |
| `default` | Sucesso, latência 120–380 ms (determinística, semente 42) |
| `fast` | Sem latência; pagamento confirma em 600 ms (usado nos testes) |
| `slow` | ~2,5 s por resposta (skeletons visíveis) |
| `variable-latency` | 100 ms – 1,8 s |
| `out-of-order` | Consultas do catálogo alternam 1,6 s / 100 ms (respostas antigas chegam depois) |
| `empty-catalog` | Listagem vazia |
| `catalog-error` | `GET /api/nfts` → 503 |
| `offline` | `GET /api/nfts` falha na rede e o Socket.IO recusa conexões |
| `favorites-failure` | Mutations de favoritos → 500 (rollback otimista) |
| `session-short` | Sessões expiram 45 s após o login |
| `wallet-reject` | Conexão de carteira recusada (403) |
| `checkout-price-change` | Na 1ª tentativa de pedido o preço muda (`nft.updated`) → `409 QUOTE_STALE` |
| `checkout-sold-out` | Na 1ª tentativa a edição esgota (`nft.updated`) → `409 INSUFFICIENT_AVAILABILITY` |
| `order-timeout` | O 1º `POST /api/orders` cria o pedido mas só responde após 15 s (cliente expira em 6 s e recupera pela chave de idempotência) |
| `payment-rejected` | Pagamentos recusados |
| `slow-payment` | Pedido fica pendente por 12 s (queda/refresh durante o pagamento) |

**Reset:** painel → "Resetar cenário conhecido" (restaura o seed, limpa sessão/carrinho local e recarrega) ou `POST /__mock/reset`. Os dados simulados persistem em `localStorage` (`kurio.mock.db`) para sobreviver a refresh.

Ações do painel (todas via endpoints `/__mock/*` do MSW — a UI só reage pela rede): alterar preço/disponibilidade do 1º item do carrinho (emite `nft.updated`), reenviar o último evento (duplicata), enviar evento antigo, derrubar a conexão em tempo real, expirar a sessão no servidor.

## 4. Como reproduzir os fluxos de falha

| Fluxo | Passos |
| --- | --- |
| Preço muda durante o checkout | Entrar como Ana → adicionar NFT → `/checkout` → Conectar carteira → Confirmar compra (abre a revisão) → painel: "Alterar preço do 1º item" → aviso em tempo real, confirmação bloqueada até "Revisar nova cotação". |
| Cotação desatualizada no envio | `/checkout?scenario=checkout-price-change` → confirmar → API responde `QUOTE_STALE`; o diálogo mostra a nova cotação e exige nova confirmação. |
| Edição esgota na compra | `?scenario=checkout-sold-out` → confirmar → aviso de disponibilidade; botão bloqueado até ajustar o carrinho. |
| Timeout com recuperação | `?scenario=order-timeout` → confirmar → após 6 s "Verificando seu pedido…" → reenvio com a mesma `Idempotency-Key` → mesmo pedido (`Idempotent-Replayed: true`). |
| Pagamento recusado | `?scenario=payment-rejected` → confirmar → tela "Pagamento recusado"; itens permanecem no carrinho. |
| Queda durante pedido pendente | `?scenario=slow-payment` → confirmar → painel "Derrubar conexão" e/ou recarregar a página → o pedido pendente é recuperado via REST e conclui sem duplicar. |
| Sessão expirada | Logado, painel → "Expirar sessão no servidor" → navegar para Carteiras → redireciona para login preservando o destino; no checkout o rascunho é mantido. |
| Falha de favorito | `?scenario=favorites-failure` → favoritar → rollback + aviso. |
| Rede lenta / erro / offline | `?scenario=slow`, `?scenario=catalog-error`, `?scenario=offline` → skeletons / erro com "Tentar novamente". |
| Respostas fora de ordem | `?scenario=out-of-order` → alternar abas rapidamente → a última seleção prevalece. |

## 5. Testes

- **60 testes** (44 E2E desktop, 8 E2E mobile, 8 regressão visual) — todos passando na última execução (ver [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)).
- Cada teste usa um contexto novo do navegador (storage e Service Worker isolados) e o cenário determinístico `fast`.
- REST passa pelos handlers MSW e tempo real pelo `socket.io-client` (eventos disparados pelo "servidor" via `/__mock/*`).
- Relatório HTML em `playwright-report/`; traces e screenshots são gravados apenas para falhas (`test-results/`).
- Baselines visuais versionadas em `tests/visual/__screenshots__/`.

## 6. Lighthouse

```bash
npm run build
npm run preview
npm run lighthouse
```

Saída em `lighthouse/reports/` (HTML/JSON de cada medição, `summary.json`, `SUMMARY.md`). Configuração versionada em `lighthouse/lighthouse.config.mjs`. Resultados e análise: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md#lighthouse).

## 7. Deploy (Vercel)

`vercel.json` já configura build, rewrites de SPA (acesso direto e refresh em qualquer rota), cabeçalhos do `mockServiceWorker.js` e cache dos assets. Passos:

```bash
npx vercel --prod
```

(Netlify: `public/_redirects` já incluso.) O deploy não foi publicado a partir deste ambiente por falta de credenciais — ver limitações.

## 8. Limitações conhecidas

- **Backend simulado no navegador:** o estado vive por navegador (localStorage); outra aba/dispositivo não compartilha dados nem eventos em tempo real.
- **Socket.IO via MSW:** apenas transporte WebSocket (sem long-polling), sem rooms/namespaces nativos (o isolamento por usuário é feito no handler). Ver [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md).
- **Performance mobile do Lighthouse** abaixo de 90 (≈80–87) por causa do custo do próprio MSW na thread principal; análise em IMPLEMENTATION_STATUS.
- Fora do escopo (comunicado na UI, sem simular sucesso): Criadores, Aprenda, Diário, Atividade, Ofertas, Arquivos baixados, Suporte, newsletter, recuperação de senha e login social.
- Deploy público não realizado neste ambiente (sem acesso à conta Vercel).
