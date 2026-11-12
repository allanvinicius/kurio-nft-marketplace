# Lighthouse — medianas (3 medições)

- **date**: 2026-11-11T23:09:45.059Z
- **lighthouse**: 13.6.0
- **chrome**: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- **node**: v22.23.4
- **os**: Linux 6.18.44-fc-v378 (x64)
- **cpus**: 4
- **baseUrl**: http://localhost:4173
- **runsPerPage**: 3
- **conditions**: Build otimizado (vite build) servido por vite preview; MSW ativo no cenário padrão; perfil Chrome novo por medição (Service Worker instalado a frio); throttling simulado.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| inicio | mobile | 80 ⚠ | 100 | 100 | 100 | 3452 ms | 0 | 470 ms |
| inicio | desktop | 99 | 100 | 100 | 100 | 972 ms | 0 | 10 ms |
| detalhe | mobile | 84 ⚠ | 100 | 100 | 100 | 3392 ms | 0.039 | 328 ms |
| detalhe | desktop | 99 | 100 | 100 | 100 | 938 ms | 0 | 0 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90 (⚠ = abaixo da meta).
