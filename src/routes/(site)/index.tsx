import { createFileRoute } from '@tanstack/react-router';
import GradientOrb from '~/components/gradient-orb';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import axios from 'redaxios';


export const Route = createFileRoute('/(site)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [getResponse, setGetResponse] = useState<string | null>(null);
  const [postResponse, setPostResponse] = useState<string | null>(null);

  const handleGet = async () => {
    try {
      const res = await axios.get('/api/test');
      setGetResponse(JSON.stringify(res.data, null, 2));
    } catch (error) {
      setGetResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handlePost = async () => {
    try {
      const res = await axios.post('/api/test', { test: 'data', number: 42 });
      setPostResponse(JSON.stringify(res.data, null, 2));
    } catch (error) {
      setPostResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };


  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Hero Section */}
      <main className="container relative z-0 mx-auto flex flex-col items-center px-4 pt-20 text-center md:pt-32">
        <GradientOrb className="-translate-x-1/2 absolute top-0 left-1/2 z-[-1] transform" />

        <h1 className="max-w-4xl font-medium text-4xl text-foreground md:text-6xl lg:text-7xl">
          Codex session viewer
        </h1>

        <p className="mt-6 text-lg text-muted-foreground md:text-xl">
          The perfect starting point for your next web application
        </p>

        <p className="mt-4 text-muted-foreground text-xs uppercase tracking-wider">
          Under heavy development
        </p>
        {/* attach a tool to connect this to other directories as a module? IDK what I'm doing Test Section */}
        {/* API Test Section */}
        <div className="mt-12 w-full max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold">API Test</h2>

          <div className="space-y-4">
            <div>
              <Button onClick={handleGet}>Test GET</Button>
              {getResponse && (
                <pre className="mt-2 rounded-md bg-muted p-4 text-left text-sm overflow-auto">
                  {getResponse}
                </pre>
              )}
            </div>

            <div>
              <Button onClick={handlePost}>Test POST</Button>
              {postResponse && (
                <pre className="mt-2 rounded-md bg-muted p-4 text-left text-sm overflow-auto">
                  {postResponse}
                </pre>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
