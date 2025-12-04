import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { MisalignmentEvidence } from '~/lib/sessions/model'
import { Button } from '~/components/ui/button'
import { FormattedContent } from '~/components/ui/formatted-content'
import { BookmarkToggle } from '~/components/chatbot/BookmarkToggle'
import { cn } from '~/lib/utils'

export interface EvidenceContext {
  userMessages?: string[]
  assistantMessages?: string[]
  summary?: string
}

interface EvidenceCardProps {
  index: number
  evidence: MisalignmentEvidence
  ruleId: string
  sessionId?: string
  onJumpToEvent?: (eventIndex: number) => void | Promise<void>
  context?: EvidenceContext
}

export function EvidenceCard({
  index,
  evidence,
  ruleId,
  sessionId,
  onJumpToEvent,
  context,
}: EvidenceCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const hasContext = Boolean(context?.userMessages?.length || context?.assistantMessages?.length)
  const handleToggle = () => {
    setExpanded(true)
    setFlipped((prev) => !prev)
  }
  const handleJump = () => {
    if (typeof evidence.eventIndex === 'number') {
      void onJumpToEvent?.(evidence.eventIndex)
    }
  }

  return (
    <motion.div
      layout
      className={cn(
        'group relative cursor-pointer rounded-2xl border border-lime-400/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950 p-4 text-amber-50 shadow-[0_0_0_1px_rgba(190,242,100,0.12),0_18px_40px_rgba(0,0,0,0.65)]',
        expanded && 'p-5',
      )}
      onClick={handleToggle}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-amber-300/80">
          Evidence #{index + 1}
        </div>
        <BookmarkToggle type="event" entityId={`${sessionId ?? 'session'}:${evidence.eventIndex ?? index}`} />
      </div>
      <div className="text-xs text-amber-200/80">
        {evidence.eventIndex != null ? `Event #${evidence.eventIndex + 1}` : 'Session context'}
      </div>
      <div className="relative min-h-[120px]">
        <AnimatePresence initial={false} mode="wait">
          {!flipped ? (
            <motion.div
              key="front"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 space-y-3"
            >
              <FormattedContent text={evidence.message ?? evidence.highlight ?? 'This rule cites this event.'} />
              {evidence.highlight ? (
                <FormattedContent text={evidence.highlight} className="text-xs text-amber-200/70" dense />
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 space-y-3"
            >
              {hasContext ? (
                <div className="space-y-2">
                  {context?.userMessages?.length ? (
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-amber-300/70">User</p>
                      <div className="space-y-1 rounded-xl bg-black/40 p-3 text-xs text-amber-50">
                        {context.userMessages.map((line, idx) => (
                          <p key={`user-${idx}`}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {context?.assistantMessages?.length ? (
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-amber-300/70">Assistant</p>
                      <div className="space-y-1 rounded-xl bg-black/40 p-3 text-xs text-amber-50">
                        {context.assistantMessages.map((line, idx) => (
                          <p key={`assistant-${idx}`}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-amber-200/70">No chat transcript captured for this event yet.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {typeof evidence.eventIndex === 'number' ? (
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-lime-400/60 bg-black/40 text-[0.7rem] uppercase tracking-[0.3em]"
            onClick={(event) => {
              event.stopPropagation()
              void handleJump()
            }}
          >
            Jump to event
          </Button>
        </div>
      ) : null}
    </motion.div>
  )
}
