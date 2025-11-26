import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '~/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import type { ChatMode } from '~/lib/sessions/model'
import { requestChatAnalysis } from '~/features/chatbot/chatbot.runtime'

interface SessionAnalysisPopoutProps {
  sessionId: string
  mode: ChatMode
}

export function SummaryPopout(props: SessionAnalysisPopoutProps) {
  return (
    <AnalysisSheet
      {...props}
      analysisType="summary"
      triggerLabel="Summary"
      title="Session summary"
      description="Generates the structured Goals/Main changes/Issues/Follow-ups report."
    />
  )
}

export function CommitPopout(props: SessionAnalysisPopoutProps) {
  return (
    <AnalysisSheet
      {...props}
      analysisType="commits"
      triggerLabel="Commits"
      title="Commit suggestions"
      description="Draft Conventional Commit subjects for the viewer session."
    />
  )
}

interface AnalysisSheetProps extends SessionAnalysisPopoutProps {
  analysisType: 'summary' | 'commits'
  triggerLabel: string
  title: string
  description: string
}

function AnalysisSheet({ sessionId, mode, analysisType, triggerLabel, title, description }: AnalysisSheetProps) {
  const [open, setOpen] = useState(false)
  const query = useQuery({
    queryKey: ['session-analysis', sessionId, mode, analysisType],
    queryFn: async () => {
      if (analysisType === 'summary') {
        return requestChatAnalysis<{ summaryMarkdown: string }>({ sessionId, mode, analysisType: 'summary' })
      }
      return requestChatAnalysis<{ commitMessages: string[] }>({ sessionId, mode, analysisType: 'commits' })
    },
    enabled: open,
    staleTime: 60_000,
  })

  const content = useMemo(() => {
    if (analysisType === 'summary' && query.data && 'summaryMarkdown' in query.data) {
      return <SummaryContent markdown={query.data.summaryMarkdown} />
    }
    if (analysisType === 'commits' && query.data && 'commitMessages' in query.data) {
      return <CommitContent commits={query.data.commitMessages} />
    }
    return null
  }, [analysisType, query.data])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </SheetHeader>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : query.isError ? (
          <div className="space-y-2 text-sm text-destructive">
            <p>Failed to load analysis.</p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        ) : content ? (
          <ScrollArea className="h-full rounded-2xl border border-border/60 p-3">
            {content}
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">No analysis available yet.</p>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SummaryContent({ markdown }: { markdown: string }) {
  const sections = useMemo(() => parseSummaryMarkdown(markdown), [markdown])
  return (
    <div className="space-y-4 text-sm">
      {sections.map((section) => (
        <div key={section.heading} className="space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.heading}</p>
            <Separator className="my-1" />
          </div>
          <ul className="list-disc space-y-1 pl-4">
            {section.bullets.map((bullet, index) => (
              <li key={`${section.heading}-${index}`}>{bullet}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function CommitContent({ commits }: { commits: string[] }) {
  if (!commits.length) {
    return <p className="text-sm text-muted-foreground">No commit suggestions returned.</p>
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commit subjects</p>
      <ul className="list-disc space-y-1 pl-4 font-mono text-xs">
        {commits.map((commit) => (
          <li key={commit}>{commit}</li>
        ))}
      </ul>
    </div>
  )
}

interface SummarySection {
  heading: string
  bullets: string[]
}

function parseSummaryMarkdown(markdown: string): SummarySection[] {
  const sections: SummarySection[] = []
  const regex = new RegExp('## ([^\\n]+)\\n([\\s\\S]*?)(?=\\n## |$)', 'g')
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    const heading = match[1].trim()
    const body = match[2]
    const bullets = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.replace(/^-\s*/, ''))
    sections.push({ heading, bullets })
  }
  return sections
}
