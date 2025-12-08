import type { ElementType, ReactNode } from 'react'
import { useMemo } from 'react'
import { cn } from '~/lib/utils'
import { buildSearchMatchers, findHighlightRanges, type SearchMatcher } from '~/utils/search'

export interface HighlightedTextProps {
  text?: string | number | null
  query?: string | null
  matchers?: SearchMatcher[]
  as?: ElementType
  className?: string
  highlightClassName?: string
  children?: ReactNode
  maxMatches?: number
}

const DEFAULT_HIGHLIGHT = cn(
  'rounded-sm px-0.5 py-px text-foreground shadow-[0_0_12px_rgba(251,191,36,0.35)]',
  'bg-amber-200/70 dark:bg-amber-300/20'
)

export function HighlightedText({
  text,
  query,
  matchers,
  as: Component = 'span',
  className,
  highlightClassName,
  children,
  maxMatches = 200,
}: HighlightedTextProps) {
  const baseText = useMemo(() => {
    if (typeof text === 'number') return String(text)
    if (typeof text === 'string') return text
    if (children && typeof children === 'string') return children
    if (text == null && typeof children === 'number') return String(children)
    if (typeof children === 'string') return children
    return (text ?? '') as string
  }, [text, children])

  const derivedMatchers = useMemo(() => {
    if (matchers && matchers.length) return matchers
    return buildSearchMatchers(query)
  }, [matchers, query])

  const segments = useMemo(() => {
    if (!baseText || !derivedMatchers.length) return null
    const ranges = findHighlightRanges(baseText, derivedMatchers, { maxMatches })
    if (!ranges.length) return null
    const nodes: ReactNode[] = []
    let cursor = 0
    ranges.forEach((range, index) => {
      if (range.start > cursor) {
        nodes.push(baseText.slice(cursor, range.start))
      }
      nodes.push(
        <mark
          key={`highlight-${range.start}-${range.end}-${index}`}
          className={cn(DEFAULT_HIGHLIGHT, highlightClassName)}
        >
          {baseText.slice(range.start, range.end)}
        </mark>
      )
      cursor = range.end
    })
    if (cursor < baseText.length) {
      nodes.push(baseText.slice(cursor))
    }
    return nodes
  }, [baseText, derivedMatchers, highlightClassName, maxMatches])

  if (!segments) {
    return <Component className={className}>{baseText}</Component>
  }

  return <Component className={className}>{segments}</Component>
}
