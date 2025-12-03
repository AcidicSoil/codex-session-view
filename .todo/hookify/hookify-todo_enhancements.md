# hookify-todo_enhancements

## scanning the session repo/directory

- test and verify that agents.md/provider-instruction files for that repo/directory are ingested.
- current problem is that when users add sessions to chat, the hookify engine will still be using rules from another directory entirely not related to their session or their specific agents.md or instruction files. So I need you to find out where we can address and solve this issue to parse the correct directory or repo that is uploaded in the session, when the user adds sessions to chat or any other rule/hookify/validating functionality.

---

## senior review response

Root cause and fix points are all server-side.

---

### 1. Why Hookify is using the wrong AGENT rules

End-to-end path when a user clicks “Add to chat” on a session:

1. Session explorer groups sessions into repos and passes `onAddSessionToChat(asset)` down from `DiscoverySection` into the list components.
2. The viewer page builds the prefill prompt from the `DiscoveredSessionAsset` (repo label, path, etc.) and calls the `hookifyAddToChat` server fn, passing:

   - `sessionId` (from `viewer.loader.ts`, usually a query param or the fallback `'demo-session'`)
   - `source: 'session'`
   - `content` (the prompt)
   - `filePath` (the session asset path – e.g. `uploads/...`) – this is present in the input schema.
3. `hookifyAddToChat` ignores `filePath` and just does:

   ````ts
   const { loadAgentRules } = await import('~/server/lib/chatbotData')
   const agentRules = await loadAgentRules()
   const evaluation = evaluateAddToChatContent({ sessionId, source, content, agentRules })
   ``` :contentReference[oaicite:5]{index=5}

   ````

4. `loadAgentRules` in `src/server/lib/chatbotData.ts` scans the *viewer app workspace*:

   ````ts
   const patterns = [
     '**/.ruler/*.md',
     '**/.cursor/rules/*.md',
     '**/AGENTS.md',
     'docs/agents/**/*.md',
   ]

   const files = await fg(patterns, {
     cwd: process.cwd(),
     ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/tests/fixtures/**'],
     absolute: true,
   })
   ``` :contentReference[oaicite:6]{index=6}

   That `cwd: process.cwd()` is the root of the Session Viewer repo, not the repo that produced the currently opened session. So Hookify always sees the same global `.ruler` / `.cursor/rules` / `docs/agents/**` set, regardless of which session or repo the user picked.

   ````

5. The same global `loadAgentRules()` is also used by:

   - `fetchChatbotState` (Session Coach initial state)
   - `chatbot-api.server` for `/api/chatbot/stream` and `/api/chatbot/analyze`

   So every misalignment / validation path is bound to the viewer’s own rules, not the user repo.

That is the direct reason your Hook Gate banners show rules from another directory.

---

### 2. Exact places you need to change

You need to introduce **repo- or session-scoped rule loading** and then **thread that scope into all AGENT consumers**.

#### 2.1. Scope `loadAgentRules` by directory

File: `src/server/lib/chatbotData.ts`

Change `loadAgentRules` to accept a root directory (and cache per root):

```ts
// today
export async function loadAgentRules() {
  if (cachedRules) return cachedRules;
  ...
  const files = await fg(patterns, { cwd: process.cwd(), ... });
  ...
  cachedRules = nestedRules.flat();
  return cachedRules;
}
```

Refactor to something like:

```ts
const rulesCache = new Map<string, AgentRule[]>(); // key = rootDir

export async function loadAgentRules(rootDir: string = process.cwd()): Promise<AgentRule[]> {
  const cached = rulesCache.get(rootDir);
  if (cached) return cached;

  const fs = await import('node:fs/promises');
  const { default: fg } = await import('fast-glob');

  const patterns = [
    '**/.ruler/*.md',
    '**/.cursor/rules/**/*.md',
    '**/AGENTS.md',
    'docs/agents/**/*.md',
  ];

  const files = await fg(patterns, {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/tests/fixtures/**'],
    absolute: true,
  });

  const nestedRules = await Promise.all(
    files.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return parseAgentRules(content);
      } catch {
        return [];
      }
    }),
  );

  const flattened = nestedRules.flat();
  rulesCache.set(rootDir, flattened);
  return flattened;
}
```

This is the central switch that lets you point Hookify at “the repo for this session” instead of the viewer workspace.

#### 2.2. Use the session’s repo when calling Hookify

File: `src/server/function/hookifyAddToChat.ts`

The server fn currently ignores `filePath`. Use it to resolve a repo root, then call the new `loadAgentRules(rootDir)`:

```ts
export const hookifyAddToChat = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadAgentRules } = await import('~/server/lib/chatbotData');
    const { resolveRepoRootForFilePath } = await import('~/server/lib/sessionRepoRoots'); // new helper

    const rootDir = await resolveRepoRootForFilePath(data.filePath);
    const agentRules = await loadAgentRules(rootDir);

    const evaluation = evaluateAddToChatContent({
      sessionId: data.sessionId,
      source: data.source,
      content: data.content,
      agentRules,
    });
    ...
  });
```

You need a `resolveRepoRootForFilePath` helper that maps from the display `filePath` back to the underlying upload record and its on-disk location:

- Upload metadata is stored in `sessionUploads` (`src/server/persistence/sessionUploads.ts`). Each record keeps `originalName`, `sourcePath` (absolute path), `repoLabel`, and `repoMeta`.
- Session assets used in the viewer are derived from these records via `uploadRecordToAsset`, which sets `asset.path` to `uploads/${record.originalName}`.

So `resolveRepoRootForFilePath` can:

1. Strip the `uploads/` prefix off `data.filePath` to recover `originalName`.
2. Look up the corresponding `SessionUploadRecord` by `originalName`.
3. Use `record.sourcePath` (if present) to derive a repo root:

   - For bundled sessions in the workspace, repo root will be somewhere under `process.cwd()` (walk up until `.git` or until directory stops changing).
   - For `~/.codex/sessions/...` style external logs, either walk up from `sourcePath` to a repo root if present, or fall back to the directory that actually contains the session + its `AGENTS.md` / `.ruler` files.

Only here do you decide “which directory’s rules apply to this Add-to-chat action.”

#### 2.3. Apply the same scoping to Session Coach and analysis

Anywhere else that calls `loadAgentRules()` directly must be switched to the new scoped form, or they will continue to use the viewer’s global rules:

1. `src/server/function/chatbotState.ts` – Session Coach initial state.

   ```ts
   const { loadAgentRules, loadSessionSnapshot } = await import('~/server/lib/chatbotData');
   ...
   const agentRules = data.mode === 'session' ? await loadAgentRules(rootDir) : [];
   ```

   Here `rootDir` must be derived from the same session/asset that the viewer is showing for this `sessionId` (same logic as Hookify, or a shared helper keyed by `sessionId` instead of `filePath`).

2. `src/server/chatbot-api.server.ts` – `/api/chatbot/stream` and `/api/chatbot/analyze`.

   Replace the bare `loadAgentRules()` call with `loadAgentRules(rootDir)` in both the streaming and analysis paths so that misalignment detection and hook discovery use the correct repo instructions.

If you only change `hookifyAddToChat`, the gate overlay will become repo-aware, but Session Coach misalignment lists and analyses will still be driven by the viewer’s own AGENTS docs.

---

### 3. Secondary issue: snapshot source

`loadSessionSnapshot` also always uses the fixture `tests/fixtures/session-large.json` and simply rebadges it with the current `sessionId`.

That means any misalignment detection inside `evaluateAddToChatContent` is currently running against a fixed demo transcript instead of the actual loaded timeline. To make Hookify truly per-session, you eventually need to swap this to build a real `SessionSnapshot` from the active timeline or from the uploaded session content, keyed by `sessionId`.

---

Concrete answer:

- The bug is in `loadAgentRules` using `cwd: process.cwd()` and in its call sites using it without any session/repo context.
- You solve it by:

  - Making `loadAgentRules` accept a root directory and cache by that root.
  - In `hookifyAddToChat`, resolving the correct repo root for the clicked session via the upload metadata and calling `loadAgentRules(rootDir)`.
  - Mirroring that change in `chatbotState` and `chatbot-api.server` so all hookify / misalignment paths read AGENT rules from the same repo as the session that is currently in chat.
