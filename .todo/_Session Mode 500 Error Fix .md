# You Asked:

api/chatbot/stream:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)

why do i get this error in the session mode but not the general chat mode? 

# Gemini Responded:

The error occurs because **Session Mode** attempts to load files from your local filesystem that are likely missing or inaccessible in your current runtime environment, whereas **General Mode** skips these file operations entirely.

The specific failure is almost certainly happening in `src/server/lib/chatbotData.ts` within the `loadSessionSnapshot` function.

### The Root Cause: `loadSessionSnapshot`

In `src/server/chatbot-api.server.ts`, the **Session Mode** handler calls `loadSessionSnapshot`:

```typescript
// src/server/chatbot-api.server.ts
async function handleSessionChatStream(options: SessionStreamOptions) {
  const snapshot = await loadSessionSnapshot(options.sessionId); // <--- FAILS HERE
  // ...
}
```

However, the **General Mode** handler completely skips this step:

```typescript
// src/server/chatbot-api.server.ts
async function handleGeneralChatStream(options: GeneralStreamOptions) {
  // Directly builds history without loading snapshot files
  const history = await listChatMessages(options.sessionId, 'general');
  // ...
}
```

### Why It Is Crashing (500 Error)

The implementation of `loadSessionSnapshot` in `src/server/lib/chatbotData.ts` contains hardcoded logic that is highly brittle:

```typescript
// src/server/lib/chatbotData.ts
export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  // ...
  const fs = await import('node:fs/promises');
  
  // 1. It relies on a relative path from the compiled file
  // 2. It tries to read a TEST FIXTURE file
  const url = new URL('../../../tests/fixtures/session-large.json', import.meta.url);
  
  // 3. This throws an error (ENOENT) if the file is not found
  const file = await fs.readFile(url, 'utf8'); 
  // ...
}
```

This code will cause a 500 error if:

1.  **Production Build:** You are running a built version of the app. Test fixtures (`tests/`) are usually excluded from production builds, so the file simply doesn't exist.
2.  **Path Resolution:** The `import.meta.url` location changes during compilation (e.g., by Vite or Next.js), causing the `../../../` relative path to point to the wrong location.

### Solution

To fix this, you should wrap the file read in a `try/catch` block and return a fallback (or empty) snapshot if the file is missing, or connect it to your real database logic.

Here is a quick patch for `src/server/lib/chatbotData.ts`:

```typescript
// path: src/server/lib/chatbotData.ts
export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  if (cachedSnapshot) {
    return { ...cachedSnapshot, sessionId };
  }
  
  try {
    const fs = await import('node:fs/promises');
    const url = new URL('../../../tests/fixtures/session-large.json', import.meta.url);
    const file = await fs.readFile(url, 'utf8');
    const parsed = JSON.parse(file);
    
    cachedSnapshot = {
      sessionId,
      meta: parsed.meta,
      events: parsed.events,
    };
    return cachedSnapshot;
  } catch (error) {
    console.warn(`[loadSessionSnapshot] Failed to load fixture: ${error.message}`);
    // Return a safe fallback to prevent 500 crash
    return {
      sessionId,
      meta: { timestamp: new Date().toISOString() },
      events: [],
    };
  }
}
```

---

# You Asked:

help me get rid of all the brittle hard-coded examples so it's production ready

# Gemini Responded:

This change removes the hardcoded dependency on the local `tests/fixtures` directory and the brittle "single-session" global caching variable.

In the new implementation:

1.  **Persistence Integration**: It now connects directly to your `sessionUploads` persistence layer (which you provided in `src/server/persistence/sessionUploads.ts`) to retrieve real session data by ID.
2.  **Dynamic Caching**: Instead of a single global variable that ignores the `sessionId`, it uses a `Map` to cache parsed snapshots by their ID, allowing multiple sessions to be active simultaneously.
3.  **Error Handling**: It throws explicit errors when a session is not found, rather than silently falling back to a test file or crashing.

Here is the production-ready `src/server/lib/chatbotData.ts`:

```typescript
// path: src/server/lib/chatbotData.ts
import { parseAgentRules, type AgentRule } from '~/lib/agents-rules/parser';
import type { SessionSnapshot } from '~/lib/sessions/model';
import { getSessionUploadContent } from '~/server/persistence/sessionUploads';
import { logWarn } from '~/lib/logger';

// In-memory cache for parsed sessions to prevent expensive re-parsing on every chat turn.
// Keys are sessionIds.
const snapshotCache = new Map<string, { snapshot: SessionSnapshot; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedRules: AgentRule[] | null = null;

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  // 1. Check in-memory cache
  const cached = snapshotCache.get(sessionId);
  if (cached) {
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.snapshot;
    }
    // Expired
    snapshotCache.delete(sessionId);
  }

  // 2. Load raw content from the persistence layer (uploaded files)
  const content = await getSessionUploadContent(sessionId);
  
  if (!content) {
    // Explicitly throw so the API handles this as a 404/400 rather than crashing or returning mock data
    throw new Error(`Session snapshot not found for ID: ${sessionId}`);
  }

  // 3. Parse and validate the session data
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;

    const snapshot: SessionSnapshot = {
      sessionId,
      meta: parsed.meta || {},
      // Ensure events array exists to prevent runtime crashes in context-builder
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };

    // Update cache
    snapshotCache.set(sessionId, { snapshot, timestamp: Date.now() });

    return snapshot;
  } catch (error) {
    const message = `Failed to parse session content for ID: ${sessionId}`;
    logWarn('chatbot-data', message, error instanceof Error ? error : undefined);
    throw new Error(message);
  }
}

export async function loadAgentRules() {
  if (cachedRules) {
    return cachedRules;
  }

  const fs = await import('node:fs/promises');
  const { default: fg } = await import('fast-glob');

  // Define patterns to find instruction files across the project
  const patterns = [
    '**/.ruler/*.md', // Standard ruler definition files
    '**/.cursor/rules/*.md', // Cursor-specific rule definitions
    '**/AGENTS.md', // Nested agent instruction files
    'docs/agents/**/*.md', // Dedicated documentation folder for agents
  ];

  // Scan the project root, excluding noise
  const files = await fg(patterns, {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/tests/fixtures/**'],
    absolute: true,
  });

  if (process.env.NODE_ENV === 'development') {
    // console.log(`[Chatbot] Found ${files.length} agent rule files.`);
  }

  const nestedRules = await Promise.all(
    files.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return parseAgentRules(content);
      } catch (error) {
        console.warn(`[Chatbot] Failed to parse agent rules from ${filePath}:`, error);
        return [];
      }
    })
  );

  cachedRules = nestedRules.flat();
  return cachedRules;
}
```

---

# You Asked:

now I get this 
contentScript.bundle.js:1 ===> FROM THE PRINT MODULE: Using the 'printLine' function from the Print Module
logger.ts:36 [codex:file-loader] Hydrated snapshot from storage Object
installHook.js:1 [codex:file-loader] Hydrated snapshot from storage Object
installHook.js:1 Please ensure that the container has a non-static position, like 'relative', 'fixed', or 'absolute' to ensure scroll offset is calculated correctly.
overrideMethod @ installHook.js:1
_serverFn/eyJmaWxlIjoiL0BpZC9zcmMvc2VydmVyL2Z1bmN0aW9uL2NoYXRib3RTdGF0ZS50cz90c3ItZGlyZWN0aXZlLXVzZS1zZXJ2ZXI9IiwiZXhwb3J0IjoiZmV0Y2hDaGF0Ym90U3RhdGVfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9?createServerFn:1  Failed to load resource: the server responded with a status of 500 ()
_serverFn/eyJmaWxlIjoiL0BpZC9zcmMvc2VydmVyL2Z1bmN0aW9uL2NoYXRib3RTdGF0ZS50cz90c3ItZGlyZWN0aXZlLXVzZS1zZXJ2ZXI9IiwiZXhwb3J0IjoiZmV0Y2hDaGF0Ym90U3RhdGVfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9?createServerFn:1  Failed to load resource: the server responded with a status of 500 ()
_serverFn/eyJmaWxlIjoiL0BpZC9zcmMvc2VydmVyL2Z1bmN0aW9uL2NoYXRib3RTdGF0ZS50cz90c3ItZGlyZWN0aXZlLXVzZS1zZXJ2ZXI9IiwiZXhwb3J0IjoiZmV0Y2hDaGF0Ym90U3RhdGVfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9?createServerFn:1  Failed to load resource: the server responded with a status of 500 ()

# Gemini Responded:

The 500 error occurs because `loadSessionSnapshot` throws an error when it cannot find the session ID (which is expected behavior for a "Not Found" case), but the `fetchChatbotState` server handler does not catch this error. Instead of returning a clean response or a fallback state, it crashes the entire request.

This commonly happens when the server restarts (clearing in-memory session caches) but the client still tries to fetch an old or default `sessionId`.

Here is the fixed `src/server/function/chatbotState.ts`. I have added a `try/catch` block around the snapshot loading to return a graceful empty state instead of crashing.

```typescript
// path: src/server/function/chatbotState.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { featureFlags } from '~/config/features'
import { listChatMessages, resetChatThread } from '~/server/persistence/chatMessages'
import { listMisalignments } from '~/server/persistence/misalignments'
import { getChatModelOptions, getDefaultModelForMode } from '~/lib/ai/client'
import { ensureLmStudioModelsRegistered } from '~/server/lib/lmStudioModels'
import { logWarn } from '~/lib/logger'
import type { SessionSnapshot } from '~/lib/sessions/model'

const inputSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
  reset: z.boolean().optional(),
})

export const fetchChatbotState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Ensure dependencies are ready (non-blocking if possible)
    await ensureLmStudioModelsRegistered().catch(() => {})
    const { loadAgentRules, loadSessionSnapshot } = await import('~/server/lib/chatbotData')

    // 2. Handle reset request
    if (data.reset) {
      await resetChatThread(data.sessionId, data.mode)
    }

    // 3. Load Snapshot Safely (Fix for 500 Error)
    let snapshot: SessionSnapshot
    try {
      snapshot = await loadSessionSnapshot(data.sessionId)
    } catch (error) {
      logWarn('fetchChatbotState', `Could not load snapshot for ${data.sessionId}. Returning empty state.`, error)
      // Return a valid empty snapshot so the UI can still load the chat interface
      snapshot = {
        sessionId: data.sessionId,
        events: [],
        meta: { timestamp: new Date().toISOString() },
      }
    }

    // 4. Load remaining context data
    // (If mode is 'general', we skip heavy session rules/misalignments)
    const agentRules = data.mode === 'session' ? await loadAgentRules() : []
    const messages = await listChatMessages(data.sessionId, data.mode)
    const misalignments = data.mode === 'session' ? await listMisalignments(data.sessionId) : []

    // 5. Build context preview
    const contextPreview =
      data.mode === 'session'
        ? buildChatContext({ snapshot, misalignments, history: messages, agentRules })
        : null
    const contextSections = contextPreview?.sections ?? []

    // 6. Return Data
    return {
      sessionId: data.sessionId,
      mode: data.mode,
      featureEnabled: featureFlags.sessionCoach.enabled(),
      snapshot,
      misalignments,
      messages,
      contextSections: contextSections.map((section) => ({ id: section.id, heading: section.heading })),
      modelOptions: getChatModelOptions(data.mode),
      initialModelId: getDefaultModelForMode(data.mode),
    }
  })
```

---

# You Asked:

Chat dock
Unable to load Session Coach state.
Session snapshot not found for ID: demo-session

# Gemini Responded:

The error `"Session snapshot not found for ID: demo-session"` appears because `src/features/viewer/viewer.page.tsx` defaults to using `demo-session` when no session is loaded, but my previous update to the data layer made it strictly require an existing file.

To fix this and make the system robust for production (handling new or missing sessions gracefully), we should update `src/server/lib/chatbotData.ts` to return an **empty session** instead of throwing an error when a file is missing. This effectively allows "demo-session" (or any new session ID) to start as a blank slate.

Here is the corrected file:

```typescript
// path: src/server/lib/chatbotData.ts
import { parseAgentRules, type AgentRule } from '~/lib/agents-rules/parser';
import type { SessionSnapshot } from '~/lib/sessions/model';
import { getSessionUploadContent } from '~/server/persistence/sessionUploads';
import { logWarn } from '~/lib/logger';

// In-memory cache for parsed sessions to prevent expensive re-parsing on every chat turn.
// Keys are sessionIds.
const snapshotCache = new Map<string, { snapshot: SessionSnapshot; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedRules: AgentRule[] | null = null;

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  // 1. Check in-memory cache
  const cached = snapshotCache.get(sessionId);
  if (cached) {
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.snapshot;
    }
    // Expired
    snapshotCache.delete(sessionId);
  }

  // 2. Load raw content from the persistence layer (uploaded files)
  const content = await getSessionUploadContent(sessionId);
  
  // 3. Handle missing content gracefully (Fix for "Session snapshot not found" error)
  if (!content) {
    // Return a valid empty snapshot so the UI can still load the chat interface
    // This allows IDs like 'demo-session' to work as fresh sessions
    const emptySnapshot: SessionSnapshot = {
      sessionId,
      meta: { timestamp: new Date().toISOString() },
      events: [],
    };
    // Cache the empty state so we don't hit the DB repeatedly for a known missing file
    snapshotCache.set(sessionId, { snapshot: emptySnapshot, timestamp: Date.now() });
    return emptySnapshot;
  }

  // 4. Parse and validate the session data
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;

    const snapshot: SessionSnapshot = {
      sessionId,
      meta: parsed.meta || {},
      // Ensure events array exists to prevent runtime crashes in context-builder
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };

    // Update cache
    snapshotCache.set(sessionId, { snapshot, timestamp: Date.now() });

    return snapshot;
  } catch (error) {
    const message = `Failed to parse session content for ID: ${sessionId}`;
    logWarn('chatbot-data', message, error instanceof Error ? error : undefined);
    
    // Return empty fallback on parse error to prevent app crash
    return {
      sessionId,
      meta: { timestamp: new Date().toISOString() },
      events: [],
    };
  }
}

export async function loadAgentRules() {
  if (cachedRules) {
    return cachedRules;
  }

  const fs = await import('node:fs/promises');
  const { default: fg } = await import('fast-glob');

  // Define patterns to find instruction files across the project
  const patterns = [
    '**/.ruler/*.md', // Standard ruler definition files
    '**/.cursor/rules/*.md', // Cursor-specific rule definitions
    '**/AGENTS.md', // Nested agent instruction files
    'docs/agents/**/*.md', // Dedicated documentation folder for agents
  ];

  // Scan the project root, excluding noise
  const files = await fg(patterns, {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/tests/fixtures/**'],
    absolute: true,
  });

  const nestedRules = await Promise.all(
    files.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        return parseAgentRules(content);
      } catch (error) {
        console.warn(`[Chatbot] Failed to parse agent rules from ${filePath}:`, error);
        return [];
      }
    })
  );

  cachedRules = nestedRules.flat();
  return cachedRules;
}
```

---

