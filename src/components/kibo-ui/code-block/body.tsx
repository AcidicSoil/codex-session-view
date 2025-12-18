"use client"

import { cn } from '~/lib/utils'

import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import type { BundledLanguage, CodeOptionsMultipleThemes } from 'shiki'
import { useCodeBlockContext, type CodeBlockData } from './context'
import {
  codeBlockClassName,
  darkModeClassNames,
  lineDiffClassNames,
  lineFocusedClassNames,
  lineHighlightClassNames,
  lineNumberClassNames,
  wordHighlightClassNames,
} from './styles'
import { applySearchHighlights, highlight } from './highlight'

export type CodeBlockBodyProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: (item: CodeBlockData) => ReactNode
}

export const CodeBlockBody = ({ children, ...props }: CodeBlockBodyProps) => {
  const { data } = useCodeBlockContext()
  return <div {...props}>{data.map(children)}</div>
}

export type CodeBlockItemProps = HTMLAttributes<HTMLDivElement> & {
  value: string
  lineNumbers?: boolean
}

export const CodeBlockItem = ({ children, lineNumbers = true, className, value, ...props }: CodeBlockItemProps) => {
  const { value: activeValue } = useCodeBlockContext()
  if (value !== activeValue) return null

  return (
    <div
      className={cn(
        codeBlockClassName,
        lineHighlightClassNames,
        lineDiffClassNames,
        lineFocusedClassNames,
        wordHighlightClassNames,
        darkModeClassNames,
        lineNumbers && lineNumberClassNames,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockContentProps = HTMLAttributes<HTMLDivElement> & {
  themes?: CodeOptionsMultipleThemes['themes']
  language?: BundledLanguage
  syntaxHighlighting?: boolean
  children: string
  highlightQuery?: string
}

export const CodeBlockContent = ({
  children,
  themes,
  language,
  syntaxHighlighting = true,
  highlightQuery,
  ...props
}: CodeBlockContentProps) => {
  const [baseHtml, setBaseHtml] = useState<string | null>(null)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!syntaxHighlighting) {
      setBaseHtml(null)
      setHtml(null)
      return
    }

    let cancelled = false
    setBaseHtml(null)
    setHtml(null)

    highlight(children as string, language, themes)
      .then((markup) => {
        if (!cancelled) setBaseHtml(markup)
      })
      // biome-ignore lint/suspicious/noConsole: shiki fallback logging is acceptable
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [children, themes, syntaxHighlighting, language])

  useEffect(() => {
    if (!syntaxHighlighting || !baseHtml) return
    setHtml(applySearchHighlights(baseHtml, highlightQuery))
  }, [baseHtml, highlightQuery, syntaxHighlighting])

  if (!syntaxHighlighting || !html) {
    return <CodeBlockFallback>{children}</CodeBlockFallback>
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} {...props} />
}

export type CodeBlockFallbackProps = HTMLAttributes<HTMLDivElement>

export const CodeBlockFallback = ({ children, ...props }: CodeBlockFallbackProps) => (
  <div {...props}>
    <pre className="w-full">
      <code>
        {children
          ?.toString()
          .split('\n')
          .map((line, index) => (
            <span className="line" key={index}>
              {line}
            </span>
          ))}
      </code>
    </pre>
  </div>
)
