# Lighthouse — medianas (3 medições)

- **date**: 2026-11-12T12:16:34.112Z
- **lighthouse**: 13.6.0
- **chrome**: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36
- **node**: v24.22.1
- **os**: Windows_NT 10.0.19045 (x64)
- **cpus**: 6
- **baseUrl**: http://localhost:4187
- **runsPerPage**: 3
- **conditions**: Build otimizado (vite build) servido por vite preview; MSW ativo no cenário padrão; perfil Chrome novo por medição (Service Worker instalado a frio); throttling simulado.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| inicio | mobile | 81 ⚠ | 100 | 100 | 100 | 3478 ms | 0.028 | 240 ms |
| inicio | desktop | 97 | 100 | 100 | 100 | 1045 ms | 0.002 | 0 ms |
| detalhe | mobile | 87 ⚠ | 100 | 100 | 100 | 3327 ms | 0.039 | 247 ms |
| detalhe | desktop | 99 | 100 | 100 | 100 | 885 ms | 0 | 0 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90 (⚠ = abaixo da meta).
