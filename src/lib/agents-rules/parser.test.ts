import { describe, expect, it } from 'vitest';
import { parseAgentRules } from './parser';

const MOCK_AGENT_RULES = `
# don't fetch or derive app state in useEffect

# core rules

1. Fetch on navigation in route loaders (SSR + streaming).
2. Do server work on the server via TanStack Start server functions.

# if your useEffect did X → use Y

* Fetch on mount/param change → route loader.
* Sync UI ↔ querystring → typed search params.

# idioms

* Loader: queryClient.ensureQueryData.
`;

describe('Agent Rule Parser (Dynamic)', () => {
  const rules = parseAgentRules(MOCK_AGENT_RULES);

  it('explodes arrow patterns into distinct rules', () => {
    // Should find a rule specific to "Fetch on mount"
    const fetchRule = rules.find((r) => r.heading.includes('Fetch on mount'));
    expect(fetchRule).toBeDefined();
    expect(fetchRule?.summary).toContain('route loader');
    expect(fetchRule?.keywords).toContain('mount');
    expect(fetchRule?.source).toBe('bullet');
  });

  it('explodes colon patterns into distinct rules', () => {
    // Should find a rule for "Loader"
    const loaderRule = rules.find((r) => r.heading.includes('Loader'));
    expect(loaderRule).toBeDefined();
    expect(loaderRule?.keywords).toContain('loader');
  });

  it('explodes numbered core rules', () => {
    // Should find the "Do server work" rule as its own entry
    const serverRule = rules.find((r) => r.summary.includes('Do server work'));
    expect(serverRule).toBeDefined();
    expect(serverRule?.source).toBe('bullet');
  });

  it('generates keywords for valid rules', () => {
    const rule = rules.find((r) => r.heading.includes('Fetch on mount'));
    // Should have derived keywords, excluding stop words like "on"
    expect(rule?.keywords.length).toBeGreaterThan(0);
    expect(rule?.keywords).not.toContain('on');
  });
});
