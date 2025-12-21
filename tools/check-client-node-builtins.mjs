import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const targetDir = process.argv[2] ?? 'dist/client'
const needle = 'node:'

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const resolved = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(resolved)))
      continue
    }
    if (!entry.isFile()) continue
    if (!/\.(mjs|cjs|js)$/i.test(entry.name)) continue
    files.push(resolved)
  }
  return files
}

async function run() {
  let files
  try {
    files = await walk(targetDir)
  } catch (error) {
    console.error(`[check-client-node-builtins] failed to read ${targetDir}:`, error)
    process.exit(1)
  }

  if (!files.length) {
    console.error(`[check-client-node-builtins] no JS files found under ${targetDir}`)
    process.exit(1)
  }

  const offenders = []
  for (const file of files) {
    const contents = await readFile(file, 'utf8')
    if (contents.includes(needle)) {
      offenders.push(file)
    }
  }

  if (offenders.length) {
    console.error(`[check-client-node-builtins] found ${needle} in client assets:`)
    for (const file of offenders) {
      console.error(`- ${path.relative(process.cwd(), file)}`)
    }
    process.exit(1)
  }

  console.log(`[check-client-node-builtins] OK: no ${needle} found in ${targetDir}`)
}

await run()
