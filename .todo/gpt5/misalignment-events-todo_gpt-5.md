Focus on the misalignment pipeline end-to-end and fix it in three places: detection, persistence, and UI rendering.

Below is a concrete plan mapped to your bullets, with file-level changes.

---

### 1. Misalignment events don’t render until page refresh

Cause:
`ChatDockPanel` initializes `misalignments` from `ViewerChatState` once and never refreshes them after each streamed turn.
Detection/persistence *does* run on every turn in `handleSessionChatStream`, but the client never re-pulls the updated state.

Relevant code:

* `ChatDockPanel.tsx`

  * Local state: `const [misalignments, setMisalignments] = useState<MisalignmentRecord[]>(() => initialState.misalignments ?? [])`
  * `handleSend` only updates `messages`, never refetches misalignments.
* `chatbot-api.server.ts` → `handleSessionChatStream`

  * Calls `detectMisalignments` and `ingestMisalignmentCandidates`
  * Then rebuilds context with `refreshedMisalignments`, but that only affects the model, not the client UI.

Fix:

1. After the streaming loop in `handleSend`, refetch the chatbot state and overwrite `messages` + `misalignments`.

In `FeatureEnabledChatDock.handleSend` (inside `ChatDockPanel.tsx`), extend the `try` block:

```ts
    try {
      const stream = await requestChatStream({
        sessionId,
        mode: activeState.mode,
        prompt: trimmed,
        clientMessageId,
        metadata: pendingMetadata,
        modelId: resolvedModelId,
      });
      setPendingMetadata(undefined);
      if (!stream) {
        throw new Error('Stream unavailable');
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        updateAssistantMessage(assistantMessageId, buffer, setMessages);
      }
      updateAssistantMessage(assistantMessageId, buffer, setMessages, false);

      // NEW: refresh state from the server after the turn completes
      const refreshed = await fetchChatbotState({
        data: { sessionId, mode: activeState.mode },
      });

      setMessages(refreshed.messages ?? []);
      if (activeState.mode === 'session') {
        setMisalignments(refreshed.misalignments ?? []);
      }
      stateCacheRef.current.set(activeState.mode, refreshed);
      setActiveState(refreshed);
    } catch (error) {
      ...
```

This immediately syncs misalignments for the current session after each turn, removing the “refresh to see events” issue.

---

### 2. “All AGENTS rules render as misalignment events” / misc rules show up as violations

Cause:
Every parsed `AgentRule` is treated as a detection rule, including parent “heading” rules meant as context, not violations.

* `parseAgentRules` returns `AgentRule` with `source: 'bullet' | 'heading'`.
* `detectMisalignments` currently casts `agentRules` → `MisalignmentRule[]` and uses *all* of them:

```ts
if (agentRules && Array.isArray(agentRules)) {
  rules = agentRules as unknown as MisalignmentRule[];
}
```

No filtering on `source` or severity.

Fix: restrict detection to “bullet” rules and drop the generic “heading” rules from detection.

1. Extend `MisalignmentRule` to include `source`:

```ts
export interface MisalignmentRule {
  id: string;
  severity: MisalignmentSeverity;
  patterns?: string[];
  keywords?: string[];
  description?: string;
  heading?: string;
  summary?: string;
  source?: 'bullet' | 'heading';
}
```

2. When building `rules` inside `detectMisalignments`, filter to bullet rules and optionally exclude ultra-weak rules:

```ts
  let rules: MisalignmentRule[] = [];

  if (agentRules && Array.isArray(agentRules)) {
    const raw = agentRules as unknown as MisalignmentRule[];
    rules = raw.filter((rule) => {
      const src = (rule as any).source as MisalignmentRule['source'] | undefined;
      // keep only granular bullet rules, and ignore totally informational ones
      return (src === 'bullet') && rule.severity !== 'info';
    });
  } else if (snapshot.rules || snapshot.misalignmentRules) {
    rules = (snapshot.rules || snapshot.misalignmentRules) as MisalignmentRule[];
  }
```

This immediately stops “misc” heading-level AGENT sections from showing up as violations and keeps only bullet-level rules with real severity.

---

### 3. Duplicate misalignment events instead of “one rule + tally”

Cause:
`detectMisalignments` manufactures temporary IDs based on array index (`temp-misalignment-${idx}`) and ignores the `existing` misalignments. If rule ordering changes between runs (files added, parse order changes), the same rule gets a different index → different ID → `ingestMisalignmentCandidates` treats it as a new record.

Code today (bottom of `misalignment-detector.ts`):

```ts
const records: MisalignmentRecord[] = result.misalignments.map((m, idx) => {
  const evidenceItem: MisalignmentEvidence = { message: m.text };

  return {
    id: `temp-misalignment-${idx}`,
    sessionId,
    ruleId: m.ruleId,
    ...
  };
});
```

Fix step 1: make IDs deterministic per `(sessionId, ruleId)` so a given rule in a given session always maps to the same record, regardless of ordering.

Replace the ID construction:

```ts
const stableId = `mis-${sessionId}-${m.ruleId}`;

return {
  id: stableId,
  sessionId,
  ...
};
```

Now `upsertMisalignment` will consistently update the same record.

Fix step 2: treat repeated violations as extra evidence entries, not new records.

Instead of `result.misalignments.map`, accumulate by `ruleId`:

```ts
  const byRule = new Map<string, MisalignmentRecord>();

  result.misalignments.forEach((m) => {
    const stableId = `mis-${sessionId}-${m.ruleId}`;
    const evidenceItem: MisalignmentEvidence = { message: m.text };

    const existing = byRule.get(m.ruleId);
    if (existing) {
      existing.evidence.push(evidenceItem);
      existing.updatedAt = new Date().toISOString();
      return;
    }

    byRule.set(m.ruleId, {
      id: stableId,
      sessionId,
      ruleId: m.ruleId,
      title: m.ruleTitle || m.ruleId,
      summary: m.ruleSummary || '',
      severity: m.severity,
      status: 'open' as MisalignmentStatus,
      evidence: [evidenceItem],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  const records = Array.from(byRule.values());
```

Now each rule produces exactly one record per session; multiple hits show up as multiple `evidence` rows.

That gives you a natural “tally” (just `record.evidence.length`) without schema changes.

---

### 4. “Misc agent rules” rendered as violations

The change in section 2 (filter to `source === 'bullet'` and exclude low-signal severities) already addresses this:

* Parent “Performance rules”, “Core rules”, etc. become *context only* (still included into `agent-rules` context section by `createAgentRulesSection` but not misalignment candidates).
* Only concrete bullet items (with keywords derived from bullet text) are used for misalignment detection.

If you need a stricter filter, add one more guard when building `rules`:

```ts
return (
  src === 'bullet' &&
  rule.severity !== 'info' &&
  (rule.keywords?.length ?? 0) > 0
);
```

---

### 5. Open / Acknowledge / Dismiss “don’t do anything”

Current behavior:

* UI: `MisalignmentList` switches the selected button variant and calls `onUpdate`.
* `onUpdate` calls `mutateMisalignmentStatus`, which updates the TanStack DB collection:

```ts
const updated = await mutateMisalignmentStatus({
  data: { sessionId, misalignmentId: record.id, status },
});
setMisalignments((current) =>
  current.map((item) => (item.id === record.id ? (updated ?? item) : item)),
);
```

* Context builder (`createMisalignmentSection`) still includes *all* misalignments, regardless of status; status only appears inside `[SEVERITY | STATUS]`.

So status is persisted but doesn’t change what you see or what the model gets; visually it just flips a button.

Make status meaningful in two ways:

1. Hide `dismissed` events from the visible list in `MisalignmentList`:

```ts
function MisalignmentList({ items, onUpdate }: { ... }) {
  const visible = items.filter((item) => item.status !== 'dismissed');

  if (!visible.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        No misalignments recorded for this session.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {visible.map((item) => (
        ...
      ))}
    </div>
  );
}
```

2. Feed only “open” (and optionally “acknowledged”) misalignments into the model context.

In `createMisalignmentSection` inside `context-builder.ts`:

```ts
function createMisalignmentSection(list: MisalignmentRecord[] | undefined): PromptSection | null {
  if (!list || list.length === 0) {
    return null;
  }

  const active = list.filter((item) => item.status !== 'dismissed');
  if (active.length === 0) return null;

  const content = active
    .map((item, index) => {
      ...
    })
    .join('\n\n');

  return {
    id: 'misalignments',
    heading: 'Detected misalignments',
    content,
  };
}
```

Now:

* Dismiss → removes event from UI and from AI context.
* Acknowledge → keeps in context but marked `[SEVERITY | acknowledged]`.
* Open/Reopen → keeps it prominent.

This makes the buttons do real work, not just visual toggles.

---

### 6. Misalignment events should only render when the *session* actually violates a rule

Right now detection runs against the snapshot returned by `loadSessionSnapshot`, which is hard-wired to the fixture `tests/fixtures/session-large.json` and reused for all sessions:

```ts
let cachedSnapshot: SessionSnapshot | null = null;

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  if (cachedSnapshot) {
    return { ...cachedSnapshot, sessionId };
  }
  // always reads session-large.json
}
```

So every session shares the same underlying event log → every session sees violations from the fixture, not from the uploaded session.

To tie misalignments to the *actual* session:

* Replace the fixture loader with a real per-session loader wired to your session storage (the upload/import pipeline) and stop caching a global snapshot across sessions. At minimum, make the cache keyed by `sessionId`.

Minimal change to stop cross-session contamination:

```ts
let cachedSnapshotById = new Map<string, SessionSnapshot>();

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  const cached = cachedSnapshotById.get(sessionId);
  if (cached) return cached;

  // TODO: load real session by sessionId
  const fs = await import('node:fs/promises');
  const url = new URL('../../../tests/fixtures/session-large.json', import.meta.url);
  const file = await fs.readFile(url, 'utf8');
  const parsed = JSON.parse(file) as {
    meta: SessionSnapshot['meta'];
    events: SessionSnapshot['events'];
  };

  const snapshot: SessionSnapshot = {
    sessionId,
    meta: parsed.meta,
    events: parsed.events,
  };

  cachedSnapshotById.set(sessionId, snapshot);
  return snapshot;
}
```

Then, when you wire in real session loading, `detectMisalignments` will run against that session’s events only.

Combined with the filtering in section 2 and stable IDs in section 3, you get:

* Only rules that *actually match session messages* become misalignments.
* One record per `(sessionId, ruleId)`, with evidence showing each hit.

---

### 7. Chatbot output is unstructured and clumped together

Cause:
Assistant messages are streamed as raw markdown text and rendered as plain text; markdown syntax (`###`, lists, tables) is visible instead of formatted, and whitespace collapses.

Code in `ChatDockPanel.tsx`:

```tsx
function MessageBubble({ message, showEvidence, isActiveStream }: { ... }) {
  const isUser = message.role === 'user';
  const text = message.content || (message.pending ? '…' : '');
  return (
    <div className={`flex flex-col ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
      ...
      <div className={`mt-1 max-w-full rounded-2xl border ...`}>
        {isActiveStream && !isUser ? (
          <TextGenerateEffect text={text || '…'} className="text-sm" once={false} />
        ) : (
          text
        )}
      </div>
      ...
    </div>
  );
}
```

Fix: render assistant messages as markdown (with GFM) and keep streaming working by feeding the partial text into the markdown renderer.

1. Add `react-markdown` + `remark-gfm` to the project.

2. Import them in `ChatDockPanel.tsx`:

```ts
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
```

3. Update `MessageBubble`:

```tsx
function MessageBubble({
  message,
  showEvidence,
  isActiveStream,
}: {
  message: LocalMessage;
  showEvidence: boolean;
  isActiveStream: boolean;
}) {
  const isUser = message.role === 'user';
  const text = message.content || (message.pending ? '…' : '');

  const bubbleClasses =
    'mt-1 max-w-full rounded-2xl border border-border/50 px-3 py-2 text-sm shadow-sm ' +
    (isUser ? 'bg-primary/10 text-primary-foreground' : 'bg-background/70 text-foreground');

  return (
    <div className={`flex flex-col ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {message.role}
      </span>
      <div className={bubbleClasses}>
        {isUser ? (
          text
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            className="prose prose-invert max-w-none text-sm whitespace-pre-wrap"
          >
            {text || '…'}
          </ReactMarkdown>
        )}
      </div>
      {showEvidence && message.evidence && message.evidence.length > 0 ? (
        <EvidenceList evidence={message.evidence} />
      ) : null}
    </div>
  );
}
```

You can drop the `TextGenerateEffect` for assistant messages entirely; the gain in readability (real headings, lists, tables) outweighs the animation.

Now the assistant responses like the one in your screenshot (with `### Violation Detected`, lists, and a summary table) will render as a properly formatted markdown card instead of a clumped wall of text.

---

Implement the above in this order:

1. Fix detection (filter bullet rules, stable IDs, aggregate evidence).
2. Fix loader to be per-session instead of global fixture.
3. Wire client refresh after each turn (`handleSend` → `fetchChatbotState`).
4. Make status affect visibility/context (`dismissed` filtered out).
5. Switch assistant message rendering to markdown.

That set of changes directly addresses every bullet in your checklist using the existing repo structure.
