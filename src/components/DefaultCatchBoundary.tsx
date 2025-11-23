import { ErrorComponent, Link, rootRouteId, useRouter, useRouterState } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { logError } from '~/lib/logger';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useRouterState({
    select: (state) => {
      const lastMatch = state.matches[state.matches.length - 1];
      return lastMatch?.routeId === rootRouteId;
    },
  });
  const lastLoggedFingerprint = useRef<string | null>(null);

  const fingerprint = error ? `${error.name}:${error.message}:${error.stack ?? ''}` : null;
  if (fingerprint && lastLoggedFingerprint.current !== fingerprint) {
    lastLoggedFingerprint.current = fingerprint;
    logError('catch-boundary', 'Route error captured', error);
  }

  useEffect(() => {
    // Allow a future distinct error to be logged again after hydration.
    return () => {
      lastLoggedFingerprint.current = null;
    };
  }, [error]);

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <ErrorComponent error={error} />
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => {
            router.invalidate();
          }}
          className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            to="/"
            className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
          >
            Home
          </Link>
        ) : (
          <Link
            to="/"
            className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  );
}
