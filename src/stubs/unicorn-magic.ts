import path from 'node:path'
import { fileURLToPath } from 'node:url'

type DelayOptions = {
  seconds?: number
  milliseconds?: number
}

export function toPath(input: string | URL | { href: string } | undefined | null) {
  if (!input) return ''
  if (typeof input === 'string') return input
  if (input instanceof URL) {
    return fileURLToPath(input)
  }
  if (typeof input === 'object' && 'href' in input) {
    return fileURLToPath(new URL(input.href))
  }
  return String(input)
}

export function traversePathUp(start: string | URL, predicate: (candidate: string) => boolean | void) {
  let current = path.resolve(toPath(start))
  let parent = current
  while (parent) {
    parent = path.dirname(current)
    if (predicate(current)) {
      return current
    }
    if (parent === current) {
      break
    }
    current = parent
  }
  return undefined
}

export async function delay(options: DelayOptions = {}) {
  const { seconds, milliseconds } = options
  let duration: number | undefined
  if (typeof seconds === 'number') {
    duration = seconds * 1000
  } else if (typeof milliseconds === 'number') {
    duration = milliseconds
  }
  if (typeof duration !== 'number' || Number.isNaN(duration)) {
    throw new TypeError('delay() expects `seconds` or `milliseconds`.')
  }
  await new Promise((resolve) => setTimeout(resolve, duration))
}

export default {
  toPath,
  traversePathUp,
  delay,
}
