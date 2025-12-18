import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Slider } from '~/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Button } from '~/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { ChatAiSettings } from '~/lib/chatbot/aiSettings';
import { DEFAULT_CHAT_AI_SETTINGS } from '~/lib/chatbot/aiSettings';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings';
import { SessionRepoSelector } from './SessionRepoSelector';

interface ChatDockCollateralProps {
  // Session Context
  sessionId: string;
  assets: DiscoveredSessionAsset[];
  repoContext?: SessionRepoBindingRecord | null;
  onRepoContextChange?: (context: SessionRepoBindingRecord | null) => Promise<void> | void;

  // AI Settings
  aiSettings: ChatAiSettings;
  onAiSettingsChange: (settings: ChatAiSettings) => void;
  onAiSettingsReset: () => void;
  keepLoaded: boolean;
  onKeepLoadedChange: (value: boolean) => void;
  
  // State
  isBusy?: boolean;
}

export function ChatDockCollateral({
  sessionId,
  assets,
  repoContext,
  onRepoContextChange,
  aiSettings,
  onAiSettingsChange,
  onAiSettingsReset,
  keepLoaded,
  onKeepLoadedChange,
  isBusy,
}: ChatDockCollateralProps) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-4 lg:max-w-sm">
      <SessionRepoSelector
        sessionId={sessionId}
        assets={assets}
        repoContext={repoContext}
        onRepoContextChange={onRepoContextChange}
      />

      <Card className="border-white/10 bg-background/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              AI Configuration
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onAiSettingsReset}
              title="Reset to defaults"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Keep model loaded</Label>
                <p className="text-xs text-muted-foreground">
                  Prevent model unloading between messages
                </p>
              </div>
              <Switch
                checked={keepLoaded}
                onCheckedChange={onKeepLoadedChange}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Temperature</Label>
                <span className="text-xs font-mono">{aiSettings.temperature}</span>
              </div>
              <Slider
                value={[aiSettings.temperature ?? DEFAULT_CHAT_AI_SETTINGS.temperature!]}
                min={0}
                max={2}
                step={0.1}
                onValueChange={([value]) =>
                  onAiSettingsChange({ ...aiSettings, temperature: value })
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Max Tokens</Label>
                <span className="text-xs font-mono">{aiSettings.maxTokens}</span>
              </div>
              <Select
                value={String(aiSettings.maxTokens ?? DEFAULT_CHAT_AI_SETTINGS.maxTokens)}
                onValueChange={(value) =>
                  onAiSettingsChange({ ...aiSettings, maxTokens: Number(value) })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="2000">2000</SelectItem>
                  <SelectItem value="4000">4000</SelectItem>
                  <SelectItem value="8000">8000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
