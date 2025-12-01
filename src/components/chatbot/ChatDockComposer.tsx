import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { PlaceholdersAndVanishInput } from '~/components/chatbot/PlaceholdersAndVanishInput';
import type { KeyboardEvent } from 'react';

interface ChatDockComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  placeholder: string;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  vanishText: string | null;
  onVanishComplete: () => void;
  placeholderPills: string[];
}

export function ChatDockComposer({
  draft,
  onDraftChange,
  onSend,
  isStreaming,
  placeholder,
  onTextareaKeyDown,
  vanishText,
  onVanishComplete,
  placeholderPills,
}: ChatDockComposerProps) {
  return (
    <PlaceholdersAndVanishInput
      vanishText={vanishText}
      onVanishComplete={onVanishComplete}
      placeholderPills={placeholderPills}
      className="w-full"
    >
      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onTextareaKeyDown}
          placeholder={placeholder}
          disabled={isStreaming}
          rows={3}
        />
        <div className="flex items-center justify-between gap-3">
          <Button onClick={onSend} disabled={!draft.trim() || isStreaming}>
            {isStreaming ? 'Streaming…' : 'Send'}
          </Button>
          <p className="text-xs text-muted-foreground">Enter sends • Shift+Enter for newline</p>
        </div>
      </div>
    </PlaceholdersAndVanishInput>
  );
}
