import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { BASE_URL, RUNS, PAGES, PROFILES, CATEGORIES, TARGETS } from './lighthouse.config.mjs'

/**
 * Executa a auditoria e grava:
 *   lighthouse/reports/<pagina>-<perfil>-run<N>.report.{html,json}
 *   lighthouse/reports/summary.json e lighthouse/reports/SUMMARY.md (medianas)
 * Requer o preview rodando: `npm run build && npm run preview`.
 */
const outDir = path.resolve(import.meta.dirname, 'reports')
fs.mkdirSync(outDir, { recursive: true })
const chromePath = process.env.CHROME_PATH ?? (fs.existsSync('/opt/pw-browsers/chromium-1243/chrome-linux64/chrome') ? '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' : undefined)

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const results = []
for (const page of PAGES) {
  for (const [profile, config] of Object.entries(PROFILES)) {
    const runs = []
    for (let i = 1; i <= RUNS; i++) {
      const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
      try {
        const res = await lighthouse(`${BASE_URL}${page.path}`, { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES }, config)
        const lhr = res.lhr
        const base = path.join(outDir, `${page.id}-${profile}-run${i}.report`)
        fs.writeFileSync(`${base}.html`, res.report[0])
        fs.writeFileSync(`${base}.json`, res.report[1])
        const run = {
          scores: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
          lcp: lhr.audits['largest-contentful-paint']?.numericValue,
          cls: lhr.audits['cumulative-layout-shift']?.numericValue,
          tbt: lhr.audits['total-blocking-time']?.numericValue,
          fcp: lhr.audits['first-contentful-paint']?.numericValue,
          lighthouseVersion: lhr.lighthouseVersion,
          userAgent: lhr.environment?.hostUserAgent,
        }
        runs.push(run)
        console.log(`${page.id}/${profile} run ${i}:`, run.scores, `LCP ${Math.round(run.lcp)}ms CLS ${run.cls?.toFixed(3)} TBT ${Math.round(run.tbt)}ms`)
      } finally {
        await chrome.kill()
      }
    }
    results.push({
      page: page.id,
      url: page.path,
      profile,
      median: Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
      lcpMs: Math.round(median(runs.map((r) => r.lcp))),
      cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
      tbtMs: Math.round(median(runs.map((r) => r.tbt))),
      runs,
    })
  }
}

const env = {
  date: new Date().toISOString(),
  lighthouse: results[0]?.runs[0]?.lighthouseVersion,
  chrome: results[0]?.runs[0]?.userAgent,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpus: os.cpus().length,
  baseUrl: BASE_URL,
  runsPerPage: RUNS,
  conditions: 'Build otimizado (vite build) servido por vite preview; MSW ativo no cenário padrão; perfil Chrome novo por medição (Service Worker instalado a frio); throttling simulado.',
}
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ env, targets: TARGETS, results }, null, 2))
const rows = results.map((r) => `| ${r.page} | ${r.profile} | ${CATEGORIES.map((c) => `${r.median[c]}${r.median[c] >= TARGETS[c] ? '' : ' ⚠'}`).join(' | ')} | ${r.lcpMs} ms | ${r.cls} | ${r.tbtMs} ms |`)
const md = `# Lighthouse — medianas (${RUNS} medições)\n\n${Object.entries(env).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}\n\n| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |\n|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n\nMetas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90 (⚠ = abaixo da meta).\n`
fs.writeFileSync(path.join(outDir, 'SUMMARY.md'), md)
console.log('\n' + md)
