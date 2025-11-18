import * as React from 'react';

/**
 * SSR-safe sessionStorage hook. Reads after hydration and persists on value changes
 * without touching browser APIs during render.
 */
export function useSessionStorage<T>(key: string, initialValue: T) {
  const isBrowser = typeof window !== 'undefined';
  const [value, setValue] = React.useState<T>(initialValue);

  React.useEffect(() => {
    if (!isBrowser) return;
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored != null) {
        setValue(JSON.parse(stored));
      }
    } catch {}
  }, [isBrowser, key]);

  React.useEffect(() => {
    if (!isBrowser) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [isBrowser, key, value]);

  return [value, setValue] as const;
}
