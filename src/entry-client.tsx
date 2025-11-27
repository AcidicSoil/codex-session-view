
import { StartClient } from '@tanstack/react-start/client';
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { logError, logInfo } from '~/lib/logger';

if (typeof window !== 'undefined') {
  const globalKey = '__codex_global_log_handlers__';
  const win = window as typeof window & { [globalKey]?: boolean };
  if (!win[globalKey]) {
    win[globalKey] = true;
    window.addEventListener(
      'error',
      (event) => {
        if (event instanceof ErrorEvent) {
          logError('runtime', `Unhandled window error: ${event.message}`, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
          });
          return;
        }

        const target = event.target as (EventTarget & { tagName?: string | undefined }) | null;
        if (target && target !== window && typeof (target as HTMLElement).tagName === 'string') {
          const element = target as HTMLElement;
          const src = element.getAttribute('src') ?? element.getAttribute('href') ?? null;
          logError('runtime', 'Resource load error captured', {
            tagName: element.tagName,
            src,
            outerHTML: element.outerHTML?.slice(0, 500),
          });
          return;
        }

        logError('runtime', 'Unknown window error event', { type: event.type });
      },
      { capture: true },
    );
    window.addEventListener('unhandledrejection', (event) => {
      logError('runtime', 'Unhandled promise rejection', { reason: event.reason });
    });
    logInfo('runtime', 'Global runtime error listeners attached');
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  void import('virtual:browser-echo');
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>
  );
});
