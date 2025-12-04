import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '~/lib/utils'

interface FormattedContentProps extends HTMLAttributes<HTMLDivElement> {
  text: string | null | undefined
  dense?: boolean
}

function renderBlock(block: string, key: number): ReactNode {
  const trimmed = block.trim()
  if (!trimmed) {
    return <br key={`break-${key}`} />
  }
  const lines = trimmed.split(/\n/g)
  const looksLikeList = lines.every((line) => /^[-*]\s+/.test(line.trim()))
  if (looksLikeList) {
    return (
      <ul key={`list-${key}`} className="list-disc list-inside space-y-1">
        {lines.map((line, index) => (
          <li key={`list-${key}-${index}`}>{line.replace(/^[-*]\s*/, '')}</li>
        ))}
      </ul>
    )
  }

  const fragments = trimmed.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <p key={`p-${key}`} className="whitespace-pre-wrap">
      {fragments.map((fragment, index) => {
        if (/^\*\*[^*]+\*\*$/.test(fragment)) {
          return (
            <strong key={`bold-${key}-${index}`} className="font-semibold text-lime-200">
              {fragment.slice(2, -2)}
            </strong>
          )
        }
        if (/^`[^`]+`$/.test(fragment)) {
          return (
            <code key={`code-${key}-${index}`} className="rounded bg-black/40 px-1 py-0.5 text-[0.85em]">
              {fragment.slice(1, -1)}
            </code>
          )
        }
        return <span key={`span-${key}-${index}`}>{fragment}</span>
      })}
    </p>
  )
}

export function FormattedContent({ text, dense, className, ...props }: FormattedContentProps) {
  const content = typeof text === 'string' ? text : ''
  const blocks = content.split(/\n{2,}/g)
  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-amber-50/90',
        'prose prose-invert max-w-none prose-p:my-0 prose-ul:my-0 prose-li:my-0',
        dense ? 'space-y-2' : 'space-y-3',
        className,
      )}
      {...props}
    >
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  )
}
