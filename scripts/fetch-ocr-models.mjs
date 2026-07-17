import { createRequire } from 'node:module'
import { mkdirSync, existsSync, copyFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(__dirname, '../frontend')
const ocrDir = join(frontendDir, 'public/ocr')
const ortDir = join(frontendDir, 'public/ort')

const require = createRequire(join(frontendDir, 'package.json'))
const { V6_TINY_MODEL } = await import(require.resolve('ppu-paddle-ocr/web'))

const targets = [
  { url: V6_TINY_MODEL.detection, file: 'detection.onnx' },
  { url: V6_TINY_MODEL.recognition, file: 'recognition.onnx' },
  { url: V6_TINY_MODEL.charactersDictionary, file: 'dict.txt' },
]

mkdirSync(ocrDir, { recursive: true })
for (const { url, file } of targets) {
  const dest = join(ocrDir, file)
  if (existsSync(dest)) {
    console.log(`[ocr] skip ${file} (exists)`)
    continue
  }
  console.log(`[ocr] downloading ${file} from ${url}`)
  let res = await fetch(url)
  if (!res.ok) {
    console.warn(`[ocr] first attempt failed ${res.status}, retrying once...`)
    res = await fetch(url)
  }
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  console.log(`[ocr] downloaded ${file} (${buf.byteLength} bytes)`)
}

mkdirSync(ortDir, { recursive: true })
const ortDist = dirname(require.resolve('onnxruntime-web'))
for (const f of readdirSync(ortDist)) {
  if (!f.startsWith('ort-wasm-simd-threaded')) continue
  const dest = join(ortDir, f)
  if (existsSync(dest)) continue
  copyFileSync(join(ortDist, f), dest)
  console.log(`[ort] copied ${f}`)
}
console.log('OCR assets ready.')
