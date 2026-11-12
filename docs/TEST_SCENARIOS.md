# Cenários de teste (Playwright)

Configuração: `playwright.config.ts`. Projetos:

| Projeto | Viewport | Escopo |
| --- | --- | --- |
| `desktop-chromium` | 1440×900 | todos os specs `tests/e2e` |
| `mobile-chromium` | Pixel 7 (412×915, touch) | testes marcados `@mobile` (fluxos principais) |
| `visual` | 1440×1600 e 414×896 | `tests/visual` (baselines em `tests/visual/__screenshots__`) |

Isolamento: contexto novo por teste (localStorage, sessionStorage e Service Worker próprios) ⇒ o MSW carrega o seed do zero; cenário `fast` aplicado via `?scenario=`. Tempo: latência zero e liquidação de pagamento em 600 ms no cenário `fast`; cenários com tempo controlado (`order-timeout`: 15 s servidor × 6 s cliente; `slow-payment`: 12 s + liquidação forçada por `/__mock/orders/:id/settle`). Eventos de tempo real são disparados pelo "servidor" (`/__mock/nft-update`, `/socket/replay`, `/socket/stale`, `/socket/disconnect`) e recebidos pelo `socket.io-client`.

Relatório HTML: `playwright-report/`. Traces/screenshots: gravados apenas em falhas (`trace: retain-on-failure`).

## Mapa requisito → teste

| # Enunciado | Requisito | Spec / teste |
| --- | --- | --- |
| 1 | Busca, filtros combinados, ordenação, paginação, histórico | `01-catalog`: filtros combinados… (desktop+mobile), busca textual/vazio, respostas fora de ordem, catálogo vazio, contrato 400 |
| 2 | Acesso direto ao detalhe e recurso inexistente | `02-detail`: acesso direto/galeria/edições/limite (desktop+mobile), edição esgotada, 404 de NFT e de rota |
| 3 | Cadastro, login, expiração, logout, troca de usuário | `03-auth`: cadastro (validação, conflito, sem senha no storage), login inválido + refresh, expiração preservando destino, logout e troca isolando dados |
| 4 | Favoritos, falha de mutation e recuperação | `04-favorites`: persistência, rollback em 500 e nova tentativa, visitante → login |
| 5 | Carrinho, quantidades, remoção, cupom, persistência refresh/login | `05-cart`: fluxo completo (desktop+mobile) incl. cupons inválido/expirado/válido e merge; limite por edição |
| 6 | Compra completa até o recibo | `06-purchase`: catálogo → detalhe → carrinho → login → checkout → recibo, snapshot imutável, carrinho esvaziado (desktop+mobile); remoção parcial só do comprado |
| 7 | Falha de pagamento, clique repetido, timeout com recuperação | `07-payment-failures`: recusado, 3 cliques ⇒ 1 pedido, timeout ⇒ mesmo pedido (mesma chave, `Idempotent-Replayed`), conflito de chave, carteira recusada |
| 8 | Perfil, avatar, senha, carteiras com erros | `08-account`: perfil (obrigatório, conflito 409, persistência) (desktop+mobile), avatar (formato inválido, envio, remoção), senha (incorreta, sucesso, novo login), carteiras (validação, endereço inválido, principal + secundária) |
| 9 | Preço/disponibilidade via Socket.IO no checkout | `09-realtime-checkout`: preço muda com revisão aberta ⇒ bloqueio + nova cotação (desktop+mobile), `QUOTE_STALE`, edição esgotada, propagação para carrinho/detalhe/catálogo |
| 10 | Duplicados/antigos, desconexão, pedido pendente | `10-realtime-robustness`: duplicata + evento antigo ignorados, reconexão reconcilia via REST, queda + refresh com pedido pendente ⇒ mesmo pedido, eventos de outra sessão ignorados |
| 11 | Teclado, foco de diálogos, validação | `11-a11y`: skip link, diálogo com foco preso/restaurado e busca por teclado, filtros por teclado, erros associados no login |
| 12 | Skeletons, falha e nova tentativa | `12-loading-errors`: skeletons em rede lenta (desktop+mobile), 5xx + retry, falha de rede + retry, skeleton do detalhe e do resumo |
| — | Regressão visual | `visual/visual.spec.ts`: início, detalhe, carrinho, pagamento (desktop e mobile) |

## Executar

```bash
npm run test:e2e
```

```bash
npm run test:visual
```

```bash
npx playwright test tests/e2e/07-payment-failures.spec.ts --project=desktop-chromium --trace on
```
