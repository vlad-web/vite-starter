import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import fg from 'fast-glob'
import posthtml from 'posthtml'
import posthtmlInclude from 'posthtml-include'
import { optimize } from 'svgo'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import sharp from 'sharp'

// sass.dart.js throws with a huge internal call stack — this keeps only
// the useful part (message + file:line snippet) when an error is printed
Error.stackTraceLimit = 0

const root = fileURLToPath(new URL('./app', import.meta.url))
const iconsDir = fileURLToPath(new URL('./app/images/icons', import.meta.url))
const partialsDir = fileURLToPath(new URL('./app/partials', import.meta.url))

// <include src="partials/header.html"></include> in any *.html under app/
function htmlIncludes() {
  return {
    name: 'html-includes',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const result = await posthtml([posthtmlInclude({ root })]).process(html)
        return result.html
      },
    },
    configureServer(server) {
      // partials aren't in Vite's module graph (they're inlined by posthtml-include
      // above, not imported), so the dev server has no idea index.html depends on
      // them — watch the folder ourselves and force a reload when one changes
      server.watcher.add(partialsDir)
      server.watcher.on('change', (file) => {
        if (file.startsWith(partialsDir)) server.ws.send({ type: 'full-reload' })
      })
    },
  }
}

// Bakes app/images/icons/*.svg into one inline <symbol> sprite,
// use in markup as <svg class="icon"><use href="#icon-name"></use></svg>
function svgSprite() {
  return {
    name: 'svg-sprite',
    transformIndexHtml(html) {
      const files = fg.sync('*.svg', { cwd: iconsDir, absolute: true })
      if (!files.length) return html

      const symbols = files.map((file) => {
        const name = basename(file, extname(file))
        const raw = readFileSync(file, 'utf-8')
        const { data } = optimize(raw, {
          plugins: [
            'preset-default',
            { name: 'prefixIds', params: { prefix: name } },
          ],
        })
        const viewBox = data.match(/viewBox="([^"]+)"/)?.[1]
        const inner = data.replace(/<svg[^>]*>/, '').replace('</svg>', '')
        return `<symbol id="icon-${name}"${viewBox ? ` viewBox="${viewBox}"` : ''}>${inner}</symbol>`
      })

      const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>${symbols.join('')}</defs></svg>`
      return html.replace('<body>', `<body>\n${sprite}`)
    },
  }
}

// Converts every built jpg/png to webp and rewrites all references to it
// (HTML/CSS/JS) — no fallback, output ships webp only
function webpImages() {
  const rasterExt = /\.(jpe?g|png)$/i
  return {
    name: 'webp-images',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      const renames = new Map()

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'asset' || !rasterExt.test(fileName)) continue

        const source = Buffer.isBuffer(chunk.source) ? chunk.source : Buffer.from(chunk.source)
        const webpBuffer = await sharp(source).rotate().webp({ quality: 82 }).toBuffer()
        const newFileName = fileName.replace(rasterExt, '.webp')

        renames.set(fileName, newFileName)
        delete bundle[fileName]
        this.emitFile({ type: 'asset', fileName: newFileName, source: webpBuffer })
      }

      if (!renames.size) return

      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'asset' && typeof chunk.source === 'string') {
          for (const [oldName, newName] of renames) chunk.source = chunk.source.split(oldName).join(newName)
        } else if (chunk.type === 'chunk') {
          for (const [oldName, newName] of renames) chunk.code = chunk.code.split(oldName).join(newName)
        }
      }
    },
  }
}

// Every *.html directly under app/ becomes its own build entry (multi-page)
function htmlInputs() {
  const files = fg.sync('*.html', { cwd: root })
  return Object.fromEntries(
    files.map((file) => [
      file.replace(/\.html$/, ''),
      fileURLToPath(new URL(`./app/${file}`, import.meta.url)),
    ]),
  )
}

export default defineConfig({
  root,
  base: './',
  publicDir: fileURLToPath(new URL('./app/public', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: htmlInputs(),
    },
  },
  resolve: {
    alias: {
      '@js': fileURLToPath(new URL('./app/js', import.meta.url)),
      '@scss': fileURLToPath(new URL('./app/sass', import.meta.url)),
      '@images': fileURLToPath(new URL('./app/images', import.meta.url)),
      '@fonts': fileURLToPath(new URL('./app/fonts', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        // lets `@use 'helpers'` resolve from app/sass regardless of the file's own location
        loadPaths: [fileURLToPath(new URL('./app/sass', import.meta.url))],
      },
    },
  },
  plugins: [htmlIncludes(), svgSprite(), webpImages(), ViteImageOptimizer({ test: /\.svg$/i })],
  server: {
    open: true,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
})
