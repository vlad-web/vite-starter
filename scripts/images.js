import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import sharp from 'sharp'
import { optimize } from 'svgo'

// app/images/** -> dist/images/**: jpg/png become webp, svg gets optimized.
// icons/ is skipped — those are baked into the inline sprite by vite.config.js.
const srcDir = fileURLToPath(new URL('../app/images', import.meta.url))
const outDir = fileURLToPath(new URL('../dist/images', import.meta.url))

const files = await fg('**/*.{jpg,jpeg,png,svg}', {
	cwd: srcDir,
	ignore: ['icons/**'],
	caseSensitiveMatch: false,
})

if (!files.length) {
	console.log('No images found in app/images')
	process.exit(0)
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

const results = await Promise.all(
	files.map(async (file) => {
		const { dir, name, ext } = parse(file)
		const isSvg = ext.toLowerCase() === '.svg'
		const outFile = join(outDir, dir, `${name}${isSvg ? '.svg' : '.webp'}`)
		const source = join(srcDir, file)

		await mkdir(dirname(outFile), { recursive: true })

		if (isSvg) {
			const svg = await readFile(source, 'utf-8')
			await writeFile(outFile, optimize(svg, { path: source }).data)
		} else {
			// rotate() bakes in the EXIF orientation — sharp drops the tag on output
			await sharp(source).rotate().webp({ quality: 82 }).toFile(outFile)
		}

		return { file, before: (await stat(source)).size, after: (await stat(outFile)).size }
	}),
)

for (const { file, before, after } of results) {
	console.log(`${file}  ${kb(before)} -> ${kb(after)}`)
}

const before = results.reduce((sum, r) => sum + r.before, 0)
const after = results.reduce((sum, r) => sum + r.after, 0)
console.log(`\n${results.length} files, ${kb(before)} -> ${kb(after)} (-${Math.round((1 - after / before) * 100)}%), saved to dist/images`)
