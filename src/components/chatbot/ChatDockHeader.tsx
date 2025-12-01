import { CardHeader, CardTitle } from '~/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Button } from '~/components/ui/button';
import { SessionAnalysisPopouts } from '~/components/chatbot/SessionAnalysisPopouts';
import type { ChatMode } from '~/lib/sessions/model';
import type { ViewerChatState } from '~/features/viewer/viewer.loader';

interface ChatDockHeaderProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  isStreaming: boolean;
  isResetting: boolean;
  sessionId: string;
  streamError: string | null;
  availableModels: NonNullable<ViewerChatState['modelOptions']>;
  selectValue: string | undefined;
  onModelChange: (modelId: string) => void;
  selectedModel?: ViewerChatState['modelOptions'][number];
  onReset: () => void;
  contextDescription: string;
}

export function ChatDockHeader({
  mode,
  onModeChange,
  isStreaming,
  isResetting,
  sessionId,
  streamError,
  availableModels,
  selectValue,
  onModelChange,
  selectedModel,
  onReset,
  contextDescription,
}: ChatDockHeaderProps) {
  return (
    <CardHeader className="space-y-3 border-b pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value) => value && onModeChange(value as ChatMode)}
              disabled={isStreaming || isResetting}
            >
              <ToggleGroupItem value="session">Session</ToggleGroupItem>
              <ToggleGroupItem value="general">General</ToggleGroupItem>
            </ToggleGroup>
            <CardTitle className="text-base font-semibold">
              {mode === 'session' ? 'Session Coach' : 'General Chat'}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === 'session'
              ? contextDescription
              : 'Exploratory mode that bypasses AGENTS remediation context.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectValue}
            onValueChange={onModelChange}
            disabled={isStreaming || availableModels.length === 0}
          >
            <SelectTrigger size="sm" className="min-w-[170px]">
              <SelectValue placeholder="Select model">
                {selectedModel ? `${selectedModel.label}` : 'Select model'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span>{model.label}</span>
                    <span className="text-xs text-muted-foreground">{model.provider}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === 'session' ? <SessionAnalysisPopouts sessionId={sessionId} mode={mode} /> : null}
          <Button size="sm" variant="outline" onClick={onReset} disabled={isStreaming || isResetting}>
            {isResetting ? 'Resetting…' : 'New chat'}
          </Button>
        </div>
      </div>
      {selectedModel ? (
        <p className="text-[11px] text-muted-foreground">{selectedModel.description}</p>
      ) : null}
      {streamError ? <p className="text-xs text-destructive">{streamError}</p> : null}
    </CardHeader>
  );
}
