import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers'
import type { CodeOptionsMultipleThemes, BundledLanguage } from 'shiki'
import { codeToHtml } from 'shiki'
import { buildSearchMatchers, findHighlightRanges } from '~/utils/search'

export const highlight = (
  html: string,
  language?: BundledLanguage,
  themes?: CodeOptionsMultipleThemes['themes'],
) =>
  codeToHtml(html, {
    lang: language ?? 'typescript',
    themes: themes ?? {
      light: 'github-light',
      dark: 'github-dark-default',
    },
    transformers: [
      transformerNotationDiff({ matchAlgorithm: 'v3' }),
      transformerNotationHighlight({ matchAlgorithm: 'v3' }),
      transformerNotationWordHighlight({ matchAlgorithm: 'v3' }),
      transformerNotationFocus({ matchAlgorithm: 'v3' }),
      transformerNotationErrorLevel({ matchAlgorithm: 'v3' }),
    ],
  })

export const applySearchHighlights = (html: string, query?: string) => {
  const matchers = buildSearchMatchers(query)
  if (!matchers.length || typeof document === 'undefined') {
    return html
  }

  const template = document.createElement('template')
  template.innerHTML = html

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let current: Node | null = walker.nextNode()
  while (current) {
    nodes.push(current as Text)
    current = walker.nextNode()
  }

  nodes.forEach((node) => {
    const text = node.nodeValue
    if (!text) return

    const ranges = findHighlightRanges(text, matchers)
    if (!ranges.length) return

    const fragment = document.createDocumentFragment()
    let cursor = 0
    ranges.forEach((range) => {
      if (range.start > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, range.start)))
      }
      const mark = document.createElement('mark')
      mark.className = 'highlighted-word'
      mark.textContent = text.slice(range.start, range.end)
      fragment.appendChild(mark)
      cursor = range.end
    })

    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)))
    }

    node.replaceWith(fragment)
  })

  return template.innerHTML
}
