// path: src/features/chatbot/SessionAnalysisPopouts.tsx
import { useState } from 'react';
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
import { useToast } from '~/hooks/use-toast';
import { CodeBlock } from '~/components/kibo-ui/code-block';
import { Loader2, Wand2, FileCode2, Anchor } from 'lucide-react';
import { Markdown } from '~/components/markdown';

interface SessionAnalysisPopoutsProps {
  sessionId: string;
}

interface AnalysisResult {
  type: 'summary' | 'commits' | 'hook-discovery';
  content: string | string[];
}

export function SessionAnalysisPopouts({ sessionId }: SessionAnalysisPopoutsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'commits' | 'hooks'>('summary');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, AnalysisResult>>({});
  const { toast } = useToast();

  const handleAnalyze = async (type: 'summary' | 'commits' | 'hook-discovery') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chatbot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          mode: 'session',
          analysisType: type,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed');
      }

      const data = await response.json();

      const tabKey = type === 'hook-discovery' ? 'hooks' : type;

      setResults((prev) => ({
        ...prev,
        [tabKey]: {
          type,
          content:
            type === 'commits'
              ? (data.commitMessages as string[])
              : (data.summaryMarkdown as string),
        },
      }));
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: 'Could not generate analysis. Please try again.',
        variant: 'destructive',
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
            Generate insights, summaries, and code artifacts from this session.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
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
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <p className="text-muted-foreground">
                    Generate a structured summary of the session goals and progress.
                  </p>
                  <Button onClick={() => handleAnalyze('summary')} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Generate Summary
                  </Button>
                </div>
              ) : (
                <ScrollArea className="flex-1 rounded-md border bg-card p-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown content={results.summary.content as string} />
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent
              value="commits"
              className="h-full m-0 data-[state=active]:flex flex-col gap-4"
            >
              {!results.commits ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <p className="text-muted-foreground">
                    Extract Conventional Commit messages from session events.
                  </p>
                  <Button onClick={() => handleAnalyze('commits')} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Suggest Commits
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="text-sm text-muted-foreground mb-2">
                    Copy these messages to your git client:
                  </div>
                  {(results.commits.content as string[]).map((msg, i) => (
                    <div key={i} className="flex gap-2">
                      <CodeBlock code={msg} language="text" className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigator.clipboard.writeText(msg)}
                      >
                        <span className="sr-only">Copy</span>
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
                      requests, or dangerous patterns that can be automated into Hookify rules.
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
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Markdown content={results.hooks.content as string} />
                    </div>
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
