/**
 * Configuração versionada da auditoria Lighthouse.
 * - Build otimizado (`npm run build`) servido por `vite preview` em http://localhost:4173
 * - Cenário padrão dos mocks (MSW ativo, latência 120–380 ms), sem simplificações.
 * - 3 medições por página e perfil; reportamos a mediana de cada categoria.
 */
export const BASE_URL = process.env.LH_BASE_URL ?? 'http://localhost:4173'
export const RUNS = Number(process.env.LH_RUNS ?? 3)
export const PAGES = [
  { id: 'inicio', path: '/' },
  { id: 'detalhe', path: '/nft/emerald-ape-042' },
]
export const PROFILES = {
  // Perfil padrão do Lighthouse: Moto G Power emulado, 4G lento simulado, CPU 4x.
  mobile: { extends: 'lighthouse:default', settings: { formFactor: 'mobile', throttlingMethod: 'simulate' } },
  // Preset desktop oficial (1350x940, throttling desktop).
  desktop: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
      throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
      throttlingMethod: 'simulate',
    },
  },
}
export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
export const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
