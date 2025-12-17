import { SearchSnippetView } from '~/components/viewer/SearchSnippetView'
import type { BundledLanguage } from '~/components/kibo-ui/code-block'
import type { SearchMatcher } from '~/utils/search'
import { safeStringify } from './utils'
import type { TimelineEvent } from './types'

interface DetailProps {
  event: TimelineEvent
  searchQuery?: string
  matchers?: SearchMatcher[]
}

export function TimelineDetail({ event, searchQuery, matchers }: DetailProps) {
  switch (event.type) {
    case 'Message': {
      const text = safeStringify(event.content)
      return text ? (
        <DetailText value={text} label="Content" highlightQuery={searchQuery} matchers={matchers} />
      ) : (
        <EmptyDetail message="No message content." />
      )
    }
    case 'Reasoning':
      return event.content ? (
        <DetailText value={event.content} label="Trace" highlightQuery={searchQuery} matchers={matchers} />
      ) : (
        <EmptyDetail message="No reasoning trace." />
      )
    case 'FunctionCall':
      return (
        <div className="space-y-3">
          <DetailText
            value={safeStringify(event.args) || '(no args captured)'}
            label="Args"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
          <DetailText
            value={safeStringify(event.result) || '(no result captured)'}
            label="Result"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
        </div>
      )
    case 'LocalShellCall':
      return (
        <div className="space-y-3">
          {event.command ? (
            <DetailText
              value={event.command}
              label="Command"
              format="code"
              language="bash"
              highlightQuery={searchQuery}
            />
          ) : null}
          {event.stdout ? (
            <DetailText
              value={event.stdout}
              label="stdout"
              format={event.stdoutFormat === 'code' ? 'code' : 'text'}
              language={event.stdoutFormat === 'code' ? 'diff' : undefined}
              highlightQuery={searchQuery}
              matchers={matchers}
            />
          ) : null}
          {event.stderr ? (
            <DetailText
              value={event.stderr}
              label="stderr"
              format={event.stderrFormat === 'code' ? 'code' : 'text'}
              language={event.stderrFormat === 'code' ? 'diff' : undefined}
              highlightQuery={searchQuery}
              matchers={matchers}
            />
          ) : null}
          {!event.command && !event.stdout && !event.stderr ? <EmptyDetail message="No captured output." /> : null}
        </div>
      )
    case 'WebSearchCall':
      return event.query ? (
        <DetailText value={event.query} label="Query" highlightQuery={searchQuery} matchers={matchers} />
      ) : (
        <EmptyDetail message="No query string." />
      )
    case 'CustomToolCall':
      return (
        <div className="space-y-3">
          <DetailText
            value={safeStringify(event.input) || '(no input captured)'}
            label="Input"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
          <DetailText
            value={safeStringify(event.output) || '(no output captured)'}
            label="Output"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
        </div>
      )
    case 'FileChange':
      return event.diff ? (
        <DetailText value={event.diff} label="Diff" format="code" language="diff" highlightQuery={searchQuery} />
      ) : (
        <EmptyDetail message="No diff provided." />
      )
    default: {
      const payload = safeStringify(event)
      return payload ? (
        <DetailText value={payload} label="Event" format="code" language="json" highlightQuery={searchQuery} />
      ) : (
        <EmptyDetail message="No additional data." />
      )
    }
  }
}

function DetailText(props: {
  value: string
  label: string
  format?: 'text' | 'code'
  language?: BundledLanguage
  highlightQuery?: string
  matchers?: SearchMatcher[]
}) {
  if (!props.value) return null
  return <SearchSnippetView {...props} />
}

function EmptyDetail({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground">{message}</p>
}
