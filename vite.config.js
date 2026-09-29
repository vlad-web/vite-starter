import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'
import fg from 'fast-glob'
import posthtml from 'posthtml'
import posthtmlInclude from 'posthtml-include'
import { optimize } from 'svgo'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// sass.dart.js throws with a huge internal call stack — this keeps only
// the useful part (message + file:line snippet) when an error is printed
Error.stackTraceLimit = 0

const root = fileURLToPath(new URL('./app', import.meta.url))
const iconsDir = fileURLToPath(new URL('./app/images/icons', import.meta.url))

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
  plugins: [htmlIncludes(), svgSprite(), ViteImageOptimizer()],
  server: {
    open: true,
  },
})
