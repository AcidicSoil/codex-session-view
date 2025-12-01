import { ScrollArea } from '~/components/ui/scroll-area';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { MisalignmentRecord } from '~/lib/sessions/model';
import type { LocalMessage } from '~/components/chatbot/hooks/useChatDockController';
import { cn } from '~/lib/utils';
import { getSeverityVisuals } from '~/features/chatbot/severity';

interface ChatDockMessagesProps {
  messages: LocalMessage[];
  showEvidence: boolean;
  activeStreamId: string | null;
}

export function ChatDockMessages({ messages, showEvidence, activeStreamId }: ChatDockMessagesProps) {
  return (
    <ScrollArea className="flex-1 rounded-2xl border border-border/60 p-3">
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Send a prompt to start the conversation.</p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              showEvidence={showEvidence}
              isActiveStream={activeStreamId === message.id}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}

interface MessageBubbleProps {
  message: LocalMessage;
  showEvidence: boolean;
  isActiveStream: boolean;
}

function MessageBubble({ message, showEvidence, isActiveStream }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const text = message.content || (isActiveStream ? '…' : '');
  const bubbleClasses = cn(
    'mt-1 max-w-full rounded-2xl border border-border/50 px-3 py-2 text-sm shadow-sm',
    isUser ? 'bg-primary/10 text-primary-foreground' : 'bg-background/70 text-foreground'
  );

  return (
    <div className={`flex flex-col ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {message.role}
      </span>
      <div className={bubbleClasses}>
        {isUser ? (
          text
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-sm whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || '…'}</ReactMarkdown>
          </div>
        )}
      </div>
      {showEvidence && message.evidence && message.evidence.length > 0 ? (
        <EvidenceList evidence={message.evidence} />
      ) : null}
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: NonNullable<LocalMessage['evidence']> }) {
  return (
    <div className="mt-2 w-full space-y-2 rounded-2xl border border-border/60 bg-muted/10 p-2 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Evidence
      </p>
      <ul className="space-y-2">
        {evidence.map((entry, index) => {
          const visuals = entry.severity ? getSeverityVisuals(entry.severity) : null;
          return (
            <li
              key={`${entry.ruleId ?? 'rule'}-${index}`}
              className={cn('rounded-xl border bg-background/80 p-2 shadow-sm', visuals?.borderClass)}
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {entry.ruleId ? <span className="font-semibold">Rule {entry.ruleId}</span> : null}
                {entry.path ? <span>{entry.path}</span> : null}
                {entry.severity ? (
                  <Badge variant="outline" className={cn('border-none px-2 py-0.5', visuals?.textClass)}>
                    {entry.severity}
                  </Badge>
                ) : null}
              </div>
              {entry.snippet ? <p className="mt-1 text-sm text-foreground">{entry.snippet}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface MisalignmentListProps {
  items: MisalignmentRecord[];
  onUpdate: (record: MisalignmentRecord, status: MisalignmentRecord['status']) => void;
}

export function MisalignmentList({ items, onUpdate }: MisalignmentListProps) {
  const visibleItems = items.filter((item) => item.status !== 'dismissed');
  if (!visibleItems.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        No misalignments recorded for this session.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border/60 bg-background/80 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.summary}</span>
            </div>
            <Badge variant="outline" className="uppercase tracking-wide">
              {item.severity}
            </Badge>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="xs"
              variant={item.status === 'open' ? 'secondary' : 'outline'}
              onClick={() => onUpdate(item, 'open')}
            >
              {item.status === 'open' ? 'Open' : 'Reopen'}
            </Button>
            <Button
              size="xs"
              variant={item.status === 'acknowledged' ? 'default' : 'outline'}
              onClick={() => onUpdate(item, 'acknowledged')}
            >
              Acknowledge
            </Button>
            <Button
              size="xs"
              variant={item.status === 'dismissed' ? 'destructive' : 'outline'}
              onClick={() => onUpdate(item, 'dismissed')}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
