import { useCallback, useId, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Textarea } from '~/components/ui/textarea';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export function ChatDock() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const textareaId = useId();

  const send = useCallback(() => {
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content: draft.trim() },
      {
        id: makeId(),
        role: 'assistant',
        content:
          'Chat dock placeholder response. Wire up analyzer or sandbox to provide real answers.',
      },
    ]);
    setDraft('');
  }, [draft]);

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base font-semibold">Chat dock</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex-1 space-y-3 overflow-auto rounded-md border bg-muted/30 p-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground">
              Send prompts to annotate the session as you review the timeline.
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{msg.role}</p>
                <p className="rounded-md bg-background/70 p-2">{msg.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor={textareaId} className="text-xs font-medium text-muted-foreground">
            Prompt
          </label>
          <Textarea
            id={textareaId}
            value={draft}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Summarize this session’s status…"
          />
          <div className="flex justify-end">
            <Button onClick={send} disabled={!draft.trim()}>
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
