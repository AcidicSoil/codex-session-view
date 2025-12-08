import { useEffect, useMemo, useState } from 'react'
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFiles,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockItem,
} from '~/components/kibo-ui/code-block'
import {
  Snippet,
  SnippetCopyButton,
  SnippetHeader,
  SnippetTabsContent,
  SnippetTabsList,
  SnippetTabsTrigger,
} from '~/components/kibo-ui/snippet'
import type { SearchMatcher } from '~/utils/search'
import { buildSearchMatchers } from '~/utils/search'
import { HighlightedText } from '~/components/ui/highlighted-text'

interface SearchSnippetViewProps {
  value: string
  label: string
  format?: 'text' | 'code'
  language?: BundledLanguage
  highlightQuery?: string
  matchers?: SearchMatcher[]
  contextLines?: number
}

export function SearchSnippetView({
  value,
  label,
  format = 'text',
  language,
  highlightQuery,
  matchers,
  contextLines = 1,
}: SearchSnippetViewProps) {
  const derivedMatchers = useMemo(() => {
    if (matchers && matchers.length) return matchers
    return buildSearchMatchers(highlightQuery)
  }, [matchers, highlightQuery])

  const snippet = useMemo(() => {
    if (!value || !derivedMatchers.length) return null
    return computeSnippet(value, derivedMatchers, contextLines)
  }, [value, derivedMatchers, contextLines])

  const [showFull, setShowFull] = useState(false)

  useEffect(() => {
    setShowFull(false)
  }, [value, highlightQuery])

  const snippetActive = Boolean(snippet && !showFull)
  const displayValue = snippetActive && snippet ? snippet.text : value

  if (!value) return null

  if (format === 'code') {
    return (
      <div
        className="space-y-1"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Header label={label} hasSnippet={Boolean(snippet)} toggle={() => setShowFull((prev) => !prev)} showFull={showFull} />
        <CodeSnippetBody
          value={displayValue}
          label={label}
          language={language}
          highlightQuery={highlightQuery}
        />
      </div>
    )
  }

  return (
    <div
      className="space-y-1"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Header label={label} hasSnippet={Boolean(snippet)} toggle={() => setShowFull((prev) => !prev)} showFull={showFull} />
      <TextSnippetBody value={displayValue} label={label} highlightQuery={highlightQuery} matchers={derivedMatchers} originalValue={value} />
    </div>
  )
}

function Header({
  label,
  hasSnippet,
  toggle,
  showFull,
}: {
  label: string
  hasSnippet: boolean
  toggle: () => void
  showFull: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {hasSnippet ? (
        <button
          type="button"
          onClick={toggle}
          className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40"
        >
          {showFull ? 'Show Matches Only' : 'Show Full Context'}
        </button>
      ) : null}
    </div>
  )
}

function CodeSnippetBody({
  value,
  label,
  language,
  highlightQuery,
}: {
  value: string
  label: string
  language?: BundledLanguage
  highlightQuery?: string
}) {
  const codeLanguage = (language ?? 'json') as BundledLanguage
  const data = [{ language: codeLanguage, filename: label, code: value }]
  return (
    <CodeBlock data={data} defaultValue={codeLanguage} className="bg-background/80">
      <CodeBlockHeader className="items-center justify-between">
        <CodeBlockFiles>
          {(item) => (
            <CodeBlockFilename key={item.filename} value={item.language}>
              {item.filename}
            </CodeBlockFilename>
          )}
        </CodeBlockFiles>
        <CodeBlockCopyButton aria-label={`Copy ${label.toLowerCase()}`} />
      </CodeBlockHeader>
      <CodeBlockBody>
        {(item) => (
          <CodeBlockItem key={item.language} value={item.language} className="bg-background/95">
            <CodeBlockContent language={codeLanguage} highlightQuery={highlightQuery}>
              {item.code}
            </CodeBlockContent>
          </CodeBlockItem>
        )}
      </CodeBlockBody>
    </CodeBlock>
  )
}

function TextSnippetBody({
  value,
  label,
  highlightQuery,
  matchers,
  originalValue,
}: {
  value: string
  label: string
  highlightQuery?: string
  matchers?: SearchMatcher[]
  originalValue: string
}) {
  const tabValue = 'value'
  return (
    <Snippet defaultValue={tabValue}>
      <SnippetHeader>
        <SnippetTabsList>
          <SnippetTabsTrigger value={tabValue}>{label}</SnippetTabsTrigger>
        </SnippetTabsList>
        <SnippetCopyButton value={originalValue} aria-label={`Copy ${label.toLowerCase()}`} />
      </SnippetHeader>
      <SnippetTabsContent value={tabValue}>
        <HighlightedText text={value} query={highlightQuery} matchers={matchers} />
      </SnippetTabsContent>
    </Snippet>
  )
}

function computeSnippet(value: string, matchers: SearchMatcher[], contextLines: number) {
  const normalized = value.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const regexes = matchers.map((matcher) => {
    const sanitizedFlags = matcher.flags.replace(/g/g, '')
    return new RegExp(matcher.pattern, sanitizedFlags)
  })

  const matchedLines = new Set<number>()
  lines.forEach((line, index) => {
    if (regexes.some((regex) => regex.test(line))) {
      matchedLines.add(index)
    }
  })

  if (!matchedLines.size) return null

  const included = new Set<number>()
  matchedLines.forEach((lineIndex) => {
    for (let offset = -contextLines; offset <= contextLines; offset += 1) {
      const target = lineIndex + offset
      if (target >= 0 && target < lines.length) {
        included.add(target)
      }
    }
  })

  const sorted = Array.from(included).sort((a, b) => a - b)
  if (!sorted.length) return null

  const groups: Array<{ start: number; end: number }> = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i]
    if (current === prev + 1) {
      prev = current
      continue
    }
    groups.push({ start, end: prev })
    start = current
    prev = current
  }
  groups.push({ start, end: prev })

  const snippetLines: string[] = []
  groups.forEach((group, index) => {
    const chunk = lines.slice(group.start, group.end + 1)
    if ((index > 0 || group.start > 0) && chunk.length) {
      snippetLines.push('⋯')
    }
    snippetLines.push(...chunk)
    if (group.end < lines.length - 1 && index === groups.length - 1) {
      snippetLines.push('⋯')
    }
  })

  return {
    text: snippetLines.join('\n'),
  }
}

export type { SearchSnippetViewProps }
