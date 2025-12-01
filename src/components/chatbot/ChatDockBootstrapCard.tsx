import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ChatDockBootstrapCardProps {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  onRetry: () => void;
}

export function ChatDockBootstrapCard({ status, error, onRetry }: ChatDockBootstrapCardProps) {
  const isLoading = status === 'loading' || status === 'idle';

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base font-semibold">Chat dock</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Preparing Session Coach…' : 'Unable to load Session Coach state.'}
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading chat history…
          </div>
        ) : (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
