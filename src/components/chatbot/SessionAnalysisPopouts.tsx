import { useState } from 'react';
import { Loader2, Wand2, FileCode2, Anchor, ArrowUpRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { toast } from 'sonner';
import { CodeBlock } from '~/components/kibo-ui/code-block';
import type { ChatMode } from '~/lib/sessions/model';
import { requestChatAnalysis } from '~/features/chatbot/chatbot.runtime';
import { FormattedContent } from '~/components/ui/formatted-content';
import { CoachScrollRegion } from '~/components/chatbot/CoachScrollRegion';

type AnalysisTab = 'summary' | 'commits' | 'hooks';
type AnalysisResult = {
  type: 'summary' | 'commits' | 'hook-discovery';
  content: string | string[];
};

interface SessionAnalysisPopoutsProps {
  sessionId: string;
  mode: ChatMode;
}

export function SessionAnalysisPopouts({ sessionId, mode }: SessionAnalysisPopoutsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('summary');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Partial<Record<AnalysisTab, AnalysisResult>>>({});
  if (mode !== 'session') {
    return null;
  }

  const handleAnalyze = async (type: AnalysisResult['type']) => {
    setIsLoading(true);
    const tabKey: AnalysisTab = type === 'hook-discovery' ? 'hooks' : type;
    try {
      const response =
        type === 'commits'
          ? await requestChatAnalysis<{ commitMessages: string[] }>({
              sessionId,
              mode,
              analysisType: 'commits',
            })
          : await requestChatAnalysis<{ summaryMarkdown: string }>({
              sessionId,
              mode,
              analysisType: type,
            });

      setResults((prev) => ({
        ...prev,
        [tabKey]: {
          type,
          content:
            type === 'commits'
              ? (response.commitMessages as string[])
              : (response.summaryMarkdown as string),
        },
      }));
    } catch (error) {
      toast.error('Analysis failed', {
        description:
          error instanceof Error ? error.message : 'Could not generate analysis. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wand2 className="h-4 w-4" />
          AI Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[85vh] max-h-[95vh] min-h-[70vh] max-w-5xl flex-col gap-0 border border-white/10 bg-[#06080f] p-0">
        <DialogHeader className="coach-sticky-header px-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Wand2 className="h-5 w-5 text-lime-300" />
            Session Intelligence
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Generate summaries, commit suggestions, and Hookify-ready insights for this session.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AnalysisTab)}
          className="flex flex-1 min-h-0 flex-col"
        >
          <div className="coach-sticky-header px-6 py-3 border-b border-white/10">
            <TabsList className="bg-white/5">
              <TabsTrigger value="summary" className="gap-2">
                <Wand2 className="h-4 w-4" /> Summary
              </TabsTrigger>
              <TabsTrigger value="commits" className="gap-2">
                <FileCode2 className="h-4 w-4" /> Commits
              </TabsTrigger>
              <TabsTrigger value="hooks" className="gap-2">
                <Anchor className="h-4 w-4" /> Hook Discovery
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-black/40 to-black/80 p-6 pt-4">
            <TabsContent
              value="summary"
              className="m-0 flex flex-1 min-h-0 flex-col gap-4 data-[state=active]:flex"
            >
              {!results.summary ? (
                <EmptyState
                  description="Generate a structured summary of the session goals and progress."
                  buttonLabel="Generate Summary"
                  isLoading={isLoading}
                  onClick={() => handleAnalyze('summary')}
                />
              ) : (
                <div className="flex flex-1 min-h-0">
                  <CoachScrollRegion
                    label="AI analysis summary"
                    order={11}
                    className="h-full"
                    outerClassName="flex-1 min-h-[18rem]"
                    contentClassName="h-full"
                    data-testid="coach-scroll-analysis-summary"
                  >
                    <div className="rounded-2xl border border-white/15 bg-card/90 p-6 text-white">
                      <FormattedContent text={results.summary.content as string} />
                    </div>
                  </CoachScrollRegion>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="commits"
              className="m-0 flex flex-1 min-h-0 flex-col gap-4 data-[state=active]:flex"
            >
              {!results.commits ? (
                <EmptyState
                  description="Extract Conventional Commit messages from session events."
                  buttonLabel="Suggest Commits"
                  isLoading={isLoading}
                  onClick={() => handleAnalyze('commits')}
                />
              ) : (
                <div className="flex flex-1 min-h-0">
                  <CoachScrollRegion
                    label="AI analysis commit suggestions"
                    order={12}
                    className="h-full"
                    outerClassName="flex-1 min-h-[16rem]"
                    contentClassName="h-full"
                    data-testid="coach-scroll-analysis-commits"
                  >
                    <div className="space-y-3 rounded-2xl border border-white/15 bg-card/90 p-5 text-white">
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <span>Copy these messages to your git client:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const commitMessages = Array.isArray(results.commits?.content)
                              ? (results.commits?.content as string[])
                              : []
                            const joined = commitMessages.join('\n')
                            if (navigator?.clipboard && joined) {
                              void navigator.clipboard.writeText(joined)
                            }
                          }}
                        >
                          Copy all <ArrowUpRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                      {(results.commits.content as string[]).map((message) => (
                        <div key={message} className="flex gap-2">
                          <CodeBlock code={message} language="text" className="flex-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Copy commit"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                void navigator.clipboard.writeText(message);
                              }
                            }}
                          >
                            <span className="sr-only">Copy commit</span>
                            <FileCode2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CoachScrollRegion>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="hooks"
              className="m-0 flex flex-1 min-h-0 flex-col gap-4 data-[state=active]:flex"
            >
              {!results.hooks ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="max-w-md text-center space-y-2">
                    <h3 className="font-semibold">Discover New Hooks</h3>
                    <p className="text-muted-foreground">
                      Analyze the conversation history to find repeated corrections, frustrated
                      requests, or dangerous patterns that can become Hookify rules.
                    </p>
                  </div>
                  <Button onClick={() => handleAnalyze('hook-discovery')} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Run Conversation Analyzer
                  </Button>
                </div>
              ) : (
                <div className="flex flex-1 min-h-0 flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Suggested Hookify Rules</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAnalyze('hook-discovery')}
                      disabled={isLoading}
                    >
                      <Wand2 className="mr-2 h-3 w-3" /> Re-run
                    </Button>
                  </div>
                  <div className="flex flex-1 min-h-0">
                    <CoachScrollRegion
                      label="Hook discovery results"
                      order={13}
                      className="h-full"
                      outerClassName="flex-1 min-h-[18rem]"
                      contentClassName="h-full"
                      data-testid="coach-scroll-analysis-hooks"
                    >
                      <div className="rounded-2xl border border-white/15 bg-card/90 p-6 text-white">
                        <FormattedContent text={results.hooks.content as string} />
                      </div>
                    </CoachScrollRegion>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface EmptyStateProps {
  description: string;
  buttonLabel: string;
  isLoading: boolean;
  onClick: () => void;
}

function EmptyState({ description, buttonLabel, isLoading, onClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">{description}</p>
      <Button onClick={onClick} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {buttonLabel}
      </Button>
    </div>
  );
}
