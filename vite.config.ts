import { defineConfig, type Plugin, type Rollup } from 'vite'

type OutputBundle = Rollup.OutputBundle
type OutputChunk = Rollup.OutputChunk
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * O app só é importado após o MSW iniciar (ver src/main.tsx). Para não serializar downloads,
 * injeta <link rel="modulepreload"> dos chunks de boot (MSW + app): o navegador baixa e
 * compila em paralelo, mas só AVALIA na ordem correta.
 */
function bootPreload(): Plugin {
  return {
    name: 'kurio-boot-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle as OutputBundle | undefined
        if (!bundle) return html
        const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === 'chunk')
        const roots = chunks.filter((c) => c.facadeModuleId && /src[\\/](app[\\/]mount\.tsx|mocks[\\/]browser\.ts)$/.test(c.facadeModuleId))
        const files = new Set<string>()
        const visit = (c: OutputChunk) => {
          if (files.has(c.fileName)) return
          files.add(c.fileName)
          for (const imp of c.imports) {
            const child = bundle[imp]
            if (child && child.type === 'chunk') visit(child)
          }
        }
        roots.forEach(visit)
        const tags = [...files].filter((f) => !html.includes(f)).map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`).join('\n    ')
        return html.replace('</head>', `    ${tags}\n  </head>`)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.BOOT_PRELOAD === '1' ? [bootPreload()] : [])],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/](msw|@mswjs|engine\.io-parser|socket\.io-parser|headers-polyfill|outvariant|strict-event-emitter|@bundled-es-modules|graphql)[\\/]/.test(id)) return 'mocks'
            if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
            if (/[\\/]@tanstack[\\/]/.test(id)) return 'tanstack'
          }
          return undefined
        },
      },
    },
  },
})
