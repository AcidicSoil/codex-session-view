import { useState } from 'react';
import { Loader2, Wand2, FileCode2, Anchor } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '~/components/kibo-ui/code-block';
import type { ChatMode } from '~/lib/sessions/model';
import { requestChatAnalysis } from '~/features/chatbot/chatbot.runtime';

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
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Session Intelligence</DialogTitle>
          <DialogDescription>
            Generate summaries, commit suggestions, and Hookify-ready insights for this session.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AnalysisTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b">
            <TabsList>
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
          <div className="flex-1 overflow-hidden p-6 pt-4 bg-muted/10">
            <TabsContent
              value="summary"
              className="h-full m-0 data-[state=active]:flex flex-col gap-4"
            >
              {!results.summary ? (
                <EmptyState
                  description="Generate a structured summary of the session goals and progress."
                  buttonLabel="Generate Summary"
                  isLoading={isLoading}
                  onClick={() => handleAnalyze('summary')}
                />
              ) : (
                <ScrollArea className="flex-1 rounded-md border bg-card p-6">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm dark:prose-invert max-w-none"
                  >
                    {results.summary.content as string}
                  </ReactMarkdown>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent
              value="commits"
              className="h-full m-0 data-[state=active]:flex flex-col gap-4"
            >
              {!results.commits ? (
                <EmptyState
                  description="Extract Conventional Commit messages from session events."
                  buttonLabel="Suggest Commits"
                  isLoading={isLoading}
                  onClick={() => handleAnalyze('commits')}
                />
              ) : (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground mb-2">
                    Copy these messages to your git client:
                  </div>
                  {(results.commits.content as string[]).map((message) => (
                    <div key={message} className="flex gap-2">
                      <CodeBlock code={message} language="text" className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
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
              )}
            </TabsContent>

            <TabsContent
              value="hooks"
              className="h-full m-0 data-[state=active]:flex flex-col gap-4"
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
                <div className="flex flex-col h-full gap-4">
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
                  <ScrollArea className="flex-1 rounded-md border bg-card p-6">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm dark:prose-invert max-w-none"
                    >
                      {results.hooks.content as string}
                    </ReactMarkdown>
                  </ScrollArea>
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
