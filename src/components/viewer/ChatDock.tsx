import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Textarea } from '~/components/ui/textarea';
import { motion, AnimatePresence } from 'motion/react';
import { TextGenerateEffect } from '~/components/aceternity/text-generate-effect';

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
  const [departingPrompt, setDepartingPrompt] = useState<string | null>(null);
  const textareaId = useId();

  const send = useCallback(() => {
    if (!draft.trim()) return;
    const trimmed = draft.trim();
    setDepartingPrompt(trimmed);
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content: trimmed },
      {
        id: makeId(),
        role: 'assistant',
        content:
          'Chat dock placeholder response. Wire up analyzer or sandbox to provide real answers.',
      },
    ]);
    setDraft('');
  }, [draft]);

  useEffect(() => {
    if (!departingPrompt) return;
    const timeout = setTimeout(() => setDepartingPrompt(null), 600);
    return () => clearTimeout(timeout);
  }, [departingPrompt]);

  const messageCountLabel = useMemo(() => `${messages.length} message${messages.length === 1 ? '' : 's'}`, [messages.length]);

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="border-b pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Chat dock</CardTitle>
          <TextGenerateEffect text={`Annotate sessions · ${messageCountLabel}`} className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex-1 space-y-3 overflow-auto rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground">
              Send prompts to annotate the session as you review the timeline.
            </p>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-1"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{msg.role}</p>
                <div className="rounded-xl border border-border/50 bg-background/80 p-3">
                  <TextGenerateEffect text={msg.content} className="text-sm text-foreground" />
                </div>
              </motion.div>
            ))
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor={textareaId} className="text-xs font-medium text-muted-foreground">
            Prompt
          </label>
          <div className="relative">
            <Textarea
              id={textareaId}
              value={draft}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Summarize this session’s status…"
              className="pr-10"
            />
            <AnimatePresence>
              {departingPrompt ? (
                <motion.div
                  initial={{ opacity: 0.9, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -32, scale: 0.9 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-x-3 top-3 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary"
                >
                  {departingPrompt}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
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
