1. Where this needs to live in the current app

The “add to chat” triggers are already centralized:

* Timeline → chatdock

  * `ViewerClient.handleAddTimelineEventToChat` in `src/features/viewer/viewer.page.tsx`
  * Called from `UploadTimelineSection` via `onAddTimelineEventToChat`
* Session explorer → chatdock

  * `ViewerClient.handleAddSessionToChat` in `src/features/viewer/viewer.page.tsx`
  * Prop drilled into `DiscoverySection → DiscoveryPanel → SessionList → SessionRepositoryAccordion → SessionRepoVirtualList → SessionCard` as `onAddSessionToChat` / `onAddToChat`
* Both paths end here:

  * `ViewerClient` builds a string prompt and calls `setCoachPrefill({ prompt })`
  * `ChatDockPanel` receives `prefill: CoachPrefillPayload` and `useChatDockController` injects that into the `draft` when mode is `session`

That means the hook trigger belongs in `viewer.page.tsx`, just before `setCoachPrefill`, and the hook evaluation logic belongs on the server alongside `aiRuntime`, behind a `createServerFn` call.

---

2. What “hookify” is doing (from hookify.md)

The uploaded `hookify.md` describes a Python plugin with three key pieces:

* Rule model

  * `Condition(field, operator, pattern)`

    * `field`: `"command" | "new_text" | "old_text" | "file_path" | "content" | "reason" | "transcript" | ...`
    * `operator`: `"regex_match" | "contains" | "equals" | ...`
    * `pattern`: string
  * `Rule` with:

    * `name`, `enabled`, `event` (`bash`, `file`, `stop`, `all`, …)
    * `pattern` (legacy simple pattern)
    * `conditions: Condition[]`
    * `action: "warn" | "block"`
    * `tool_matcher`
    * `message`: markdown body

* Rule loading

  * `load_rules(event?: str) -> List[Rule]`
  * Reads `.codex/hookify.*.local.md`, parses YAML frontmatter + body (`extract_frontmatter`), builds `Rule.from_dict(frontmatter, message)`

* Rule engine

  * `RuleEngine.evaluate_rules(rules, input_data)`:

    * `input_data` includes `hook_event_name`, `tool_name`, `tool_input`, etc.
    * Separates matched rules into `blocking_rules` and `warning_rules` using `_rule_matches` + `_check_condition` + `_extract_field`
    * If any block rules:

      * For `Stop` → `{"decision": "block", "reason": ..., "systemMessage": ...}`
      * For `PreToolUse` / `PostToolUse` → `{"hookSpecificOutput": { hookEventName, permissionDecision: "deny" }, "systemMessage": ...}`
      * Else → `{ systemMessage }`
    * If only warnings → `{ systemMessage }`
    * If none → `{}`

You already have the “hook discovery” analyzer ported as `HOOK_DISCOVERY_SYSTEM_PROMPT` + `generateSessionAnalysis(..., analysisType: 'hook-discovery')` in `src/server/lib/aiRuntime.ts`. The missing piece for this question is the runtime rule engine and wiring it to the viewer’s add-to-chat flows.

---

3. New server-side hook engine for Add-to-Chat

Implement a small TypeScript port of the hookify rule loader + engine in `src/server/lib/hookifyRuntime.ts`.

a) Define rule types and conditions

```ts
// src/server/lib/hookifyRuntime.ts
import fs from 'node:fs';
import path from 'node:path';
import glob from 'glob';
import matter from 'gray-matter';

export type HookEventName =
  | 'AddTimelineEventToChat'
  | 'AddSessionToChat'
  | 'ManualAddToChat';

export type ConditionOperator = 'regex_match' | 'contains' | 'equals';

export interface Condition {
  field: string;          // e.g. "content", "file_path", "event_type", etc.
  operator: ConditionOperator;
  pattern: string;
}

export interface Rule {
  name: string;
  enabled: boolean;
  event: string;          // "bash", "file", "all", "add_to_chat", ...
  pattern?: string | null;
  conditions: Condition[];
  action: 'warn' | 'block';
  tool_matcher?: string | null;
  message: string;
}
```

b) Load `.codex/hookify.*.local.md` rules (mirroring `load_rules`)

```ts
function projectRoot() {
  // adjust if repo root detection is different in your app
  return process.cwd();
}

export function loadHookifyRules(event?: string): Rule[] {
  const root = projectRoot();
  const pattern = path.join(root, '.codex', 'hookify.*.local.md');
  const files = glob.sync(pattern);
  const rules: Rule[] = [];

  for (const filePath of files) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data: frontmatter, content: body } = matter(raw);

      if (!frontmatter || typeof frontmatter !== 'object') {
        // mirror Python “missing frontmatter” warning semantics
        continue;
      }

      const conditions: Condition[] = Array.isArray(frontmatter.conditions)
        ? frontmatter.conditions.map((c: any) => ({
            field: String(c.field ?? ''),
            operator: (c.operator ?? 'regex_match') as ConditionOperator,
            pattern: String(c.pattern ?? ''),
          }))
        : [];

      const simplePattern = frontmatter.pattern as string | undefined;

      // Legacy “pattern + event” → derive a single condition
      if (!conditions.length && simplePattern) {
        const hookEvent = (frontmatter.event as string | undefined) ?? 'all';
        const field =
          hookEvent === 'bash'
            ? 'command'
            : hookEvent === 'file'
            ? 'new_text'
            : 'content';

        conditions.push({
          field,
          operator: 'regex_match',
          pattern: simplePattern,
        });
      }

      if (!conditions.length) continue; // match Python behavior: invalid rule

      rules.push({
        name: String(frontmatter.name ?? 'unnamed'),
        enabled: Boolean(
          frontmatter.enabled === undefined ? true : frontmatter.enabled,
        ),
        event: String(frontmatter.event ?? 'all'),
        pattern: simplePattern ?? null,
        conditions,
        action: (frontmatter.action ?? 'warn') as 'warn' | 'block',
        tool_matcher: frontmatter.tool_matcher as string | undefined,
        message: String(body.trim()),
      });
    } catch {
      // swallow invalid files like Python version does
      continue;
    }
  }

  return rules.filter((r) => r.enabled);
}
```

c) Rule engine for generic hook input

The Python engine works over `tool_name` + `tool_input` + `input_data`. For add-to-chat, treat:

* `tool_name`: `"AddToChat"`
* `tool_input`: object with `content`, `file_path`, `event_type`, etc.
* `input_data`: outer envelope with `hook_event_name`, `source`, `sessionId`, etc.

```ts
export interface AddToChatHookInput {
  hook_event_name: HookEventName;
  source: 'timeline' | 'session' | 'manual';
  sessionId: string;

  // normalized “tool_input” fields for conditions
  content: string;             // prompt snippet or serialized event
  file_path?: string;          // session file path if present
  event_type?: string;         // timeline event type
  raw?: unknown;               // full event/asset if a rule ever wants it via transcript-like field
}

export interface HookifyDecision {
  blocked: boolean;
  systemMessage?: string;
}
```

Minimal engine:

```ts
export function evaluateAddToChatRules(
  input: AddToChatHookInput,
  rules: Rule[],
): HookifyDecision {
  const hookEvent = input.hook_event_name;

  const applicable = rules.filter((rule) => {
    if (rule.event === 'all') return true;
    if (rule.event === 'add_to_chat') return true;
    if (rule.event === hookEvent) return true;
    return false;
  });

  const blocking: Rule[] = [];
  const warnings: Rule[] = [];

  for (const rule of applicable) {
    if (!rule.conditions.length) continue;
    if (!ruleMatches(rule, input)) continue;
    if (rule.action === 'block') blocking.push(rule);
    else warnings.push(rule);
  }

  if (blocking.length) {
    const message = blocking
      .map((r) => `**[${r.name}]**\n${r.message}`)
      .join('\n\n');
    return { blocked: true, systemMessage: message };
  }

  if (warnings.length) {
    const message = warnings
      .map((r) => `**[${r.name}]**\n${r.message}`)
      .join('\n\n');
    return { blocked: false, systemMessage: message };
  }

  return { blocked: false };
}

function ruleMatches(rule: Rule, input: AddToChatHookInput): boolean {
  return rule.conditions.every((condition) =>
    checkCondition(condition, input),
  );
}

function checkCondition(condition: Condition, input: AddToChatHookInput): boolean {
  const value = extractField(condition.field, input);
  if (value == null) return false;

  switch (condition.operator) {
    case 'equals':
      return value === condition.pattern;
    case 'contains':
      return value.includes(condition.pattern);
    case 'regex_match':
    default:
      try {
        const re = new RegExp(condition.pattern, 'i');
        return re.test(value);
      } catch {
        return false;
      }
  }
}

function extractField(field: string, input: AddToChatHookInput): string | null {
  switch (field) {
    case 'content':
      return input.content;
    case 'file_path':
      return input.file_path ?? '';
    case 'event_type':
      return input.event_type ?? '';
    case 'source':
      return input.source;
    case 'session_id':
      return input.sessionId;
    case 'hook_event_name':
      return input.hook_event_name;
    default:
      return null;
  }
}
```

d) High-level builder for ChatDock prefill

Return a `CoachPrefillPayload` that merges existing prompts with hook messages:

```ts
import type { CoachPrefillPayload } from '~/components/chatbot/hooks/useChatDockController';

export function buildHookifiedPrefill(
  basePrompt: string,
  hook: HookifyDecision,
): CoachPrefillPayload | null {
  if (hook.blocked) {
    // Equivalent of “permissionDecision: deny” – caller should just not open chat
    return null;
  }
  if (!hook.systemMessage) {
    return { prompt: basePrompt };
  }

  const prompt = [
    'Hookify alignment notes (do not ignore):',
    hook.systemMessage,
    '',
    basePrompt,
  ].join('\n\n');

  return { prompt };
}
```

---

4. Server function: `hookifyAddToChat`

Implement a thin server function, mirroring `chatbotState.ts` / `misalignments.ts` patterns:

```ts
// src/server/function/hookifyAddToChat.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  loadHookifyRules,
  evaluateAddToChatRules,
  buildHookifiedPrefill,
  type HookEventName,
} from '~/server/lib/hookifyRuntime';
import { logInfo, logWarn } from '~/lib/logger';

const inputSchema = z.object({
  sessionId: z.string().min(1),
  hookEventName: z.custom<HookEventName>(),
  source: z.union([
    z.literal('timeline'),
    z.literal('session'),
    z.literal('manual'),
  ]),
  content: z.string().min(1),
  filePath: z.string().optional(),
  eventType: z.string().optional(),
});

export const hookifyAddToChat = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const rules = loadHookifyRules('add_to_chat');

    if (!rules.length) {
      logInfo('hookify.add-to-chat', 'No hookify rules loaded; returning base prompt only');
      return {
        blocked: false,
        prefill: { prompt: data.content },
      };
    }

    const decision = evaluateAddToChatRules(
      {
        hook_event_name: data.hookEventName,
        source: data.source,
        sessionId: data.sessionId,
        content: data.content,
        file_path: data.filePath,
        event_type: data.eventType,
      },
      rules,
    );

    if (decision.blocked) {
      logWarn('hookify.add-to-chat', 'Add-to-chat blocked by hookify rules', {
        sessionId: data.sessionId,
        hookEventName: data.hookEventName,
      });
      return {
        blocked: true,
        prefill: null,
        systemMessage: decision.systemMessage ?? '',
      };
    }

    const prefill = buildHookifiedPrefill(data.content, decision);
    return {
      blocked: false,
      prefill,
      systemMessage: decision.systemMessage ?? '',
    };
  });
```

This keeps the hook logic server-side and returns a `prefill` already shaped for `ChatDockPanel`.

---

5. Wire the trigger into “Add to chat” buttons

Modify `src/features/viewer/viewer.page.tsx` to call the server function instead of hard-coding the prompt.

a) Replace `SessionCoachPrefill` with `CoachPrefillPayload` to avoid duplication:

```ts
// at top
import type { CoachPrefillPayload } from '~/components/chatbot/hooks/useChatDockController';
import { hookifyAddToChat } from '~/server/function/hookifyAddToChat';
```

Update state:

```ts
const [coachPrefill, setCoachPrefill] = useState<CoachPrefillPayload | null>(null);
```

b) Timeline → chatdock hook

Current code:

```ts
const handleAddTimelineEventToChat = (event: TimelineEvent, index: number) => {
  logInfo('viewer.chatdock', 'Timeline event add-to-chat requested', { ... });

  const snippet = JSON.stringify(event, null, 2);
  const prompt = `Analyze this timeline event #${index + 1} (${event.type}):\n\n\`\`\`json\n${snippet}\n\`\`\`\n\nWhat are the implications of this event?`;

  setCoachPrefill({ prompt });
  handleNavChange('chat');
};
```

Replace with hookified version:

```ts
const handleAddTimelineEventToChat = (event: TimelineEvent, index: number) => {
  logInfo('viewer.chatdock', 'Timeline event add-to-chat requested', {
    eventType: event.type,
    index,
  });

  const snippet = JSON.stringify(event, null, 2);
  const basePrompt = `Analyze this timeline event #${index + 1} (${event.type}):\n\n\`\`\`json\n${snippet}\n\`\`\`\n\nWhat are the implications of this event?`;

  void hookifyAddToChat({
    data: {
      sessionId: loaderData?.sessionId ?? 'demo-session',
      hookEventName: 'AddTimelineEventToChat',
      source: 'timeline',
      content: basePrompt,
      eventType: event.type,
    },
  })
    .then((result) => {
      if (!result || result.blocked) {
        // Optional: show a toast using result.systemMessage and do nothing
        return;
      }
      if (!result.prefill) return;
      setCoachPrefill(result.prefill);
      handleNavChange('chat');
    })
    .catch(() => {
      // Fallback: use base prompt unhooked if hookify fails
      setCoachPrefill({ prompt: basePrompt });
      handleNavChange('chat');
    });
};
```

c) Session explorer → chatdock hook

Current code:

```ts
const handleAddSessionToChat = (asset: DiscoveredSessionAsset) => {
  logInfo('viewer.chatdock', 'Session add-to-chat requested', { ... });

  const prompt = `I am looking at session file: ${asset.path}\nRepo: ${asset.repoLabel ?? asset.repoName ?? 'unknown'}\n\nPlease analyze this session context.`;

  setCoachPrefill({ prompt });
  handleNavChange('chat');
};
```

Replace with:

```ts
const handleAddSessionToChat = (asset: DiscoveredSessionAsset) => {
  logInfo('viewer.chatdock', 'Session add-to-chat requested', {
    path: asset.path,
    repo: asset.repoLabel ?? asset.repoName,
  });

  const prompt = `I am looking at session file: ${asset.path}\nRepo: ${asset.repoLabel ?? asset.repoName ?? 'unknown'}\n\nPlease analyze this session context.`;

  void hookifyAddToChat({
    data: {
      sessionId: loaderData?.sessionId ?? 'demo-session',
      hookEventName: 'AddSessionToChat',
      source: 'session',
      content: prompt,
      filePath: asset.path,
    },
  })
    .then((result) => {
      if (!result || result.blocked) {
        return;
      }
      if (!result.prefill) return;
      setCoachPrefill(result.prefill);
      handleNavChange('chat');
    })
    .catch(() => {
      setCoachPrefill({ prompt });
      handleNavChange('chat');
    });
};
```

d) Manual adds into ChatDock

Any future code paths that “manually” push objects into `ChatDockPanel` by calling `setCoachPrefill({ prompt })` should instead call the same `hookifyAddToChat` server function with:

```ts
hookEventName: 'ManualAddToChat',
source: 'manual',
content: basePrompt,
```

and then feed `result.prefill` to `setCoachPrefill`. This keeps the trigger surface unified: one hook engine that runs on every add-to-chat action regardless of origin.

---

6. Behavior summary

After these changes:

* Every click on “Add to chat” (timeline or session explorer) produces a normalized `AddToChatHookInput`.
* The server-side `hookifyRuntime` loads `.codex/hookify.*.local.md` rules and runs them through a TS port of the Python `RuleEngine`.
* If any `action: block` rules match for the add-to-chat event, the object never reaches ChatDock; you can display the combined hook messages to the user.
* If only `warn` rules match, their combined markdown is injected above the existing base prompt as “Hookify alignment notes”, giving the ChatDock LLM explicit, codified guidance every time a new object is added.
* If no rules match or rule loading fails, behavior falls back to the existing hard-coded prompts.

---

Yes. Treat AGENT rules as the canonical hook rule set and run them as a pre-filter on every “add to chat” action.

You already have everything you need:

* `AgentRule` model and parser (`src/lib/agents-rules/parser.ts`)
* Rule loading (`loadAgentRules` in `src/server/lib/chatbotData.ts`)
* A generic regex/keyword rule engine (`MisalignmentDetector` and `detectMisalignments` in `src/features/chatbot/misalignment-detector.ts`)
* Severity ranking helpers (`src/features/chatbot/severity.ts`)
* ChatDock prefill + metadata (`CoachPrefillPayload` + `ChatRemediationMetadata`)

You do not need a second hook DSL. Just wrap those pieces into a dedicated “hookify add-to-chat” server function and call it from the existing “Add to chat” buttons.

Below is the concrete integration.

---

1. Map AGENT rules → hookify behavior

AGENT rules are already parsed from AGENTS.md and friends:

```ts
// src/server/lib/chatbotData.ts
export async function loadAgentRules() { ... } // returns AgentRule[]
```

`AgentRule` fields:

```ts
// src/lib/agents-rules/parser.ts
export interface AgentRule {
  id: string;
  heading: string;
  level: number;
  summary: string;
  body: string;
  bullets: string[];
  severity: MisalignmentSeverity;     // info | low | medium | high | critical
  keywords: string[];                 // derived from bullet/heading
  source?: string;                    // 'bullet' | 'heading'
}
```

`MisalignmentDetector` is already designed to accept these rules as triggers:

```ts
// src/features/chatbot/misalignment-detector.ts
export interface MisalignmentRule {
  id: string;
  severity: MisalignmentSeverity;
  patterns?: string[];
  keywords?: string[];  // AgentRule.keywords fits here
  description?: string;
  heading?: string;
  summary?: string;
  source?: 'bullet' | 'heading';
}
```

The helper `detectMisalignments({ snapshot, agentRules })` simply casts `agentRules` into `MisalignmentRule[]` and uses `keywords` (and patterns, if present) to find violations.

So the mapping is straightforward:

* “Hookify rule” ≈ AgentRule treated as MisalignmentRule (keywords/patterns)
* “Hook evaluation” ≈ `detectMisalignments` run on the add-to-chat payload
* “Warn/block” ≈ severity‐based policy over the resulting misalignments

---

2. Server function: agent-driven hookify for Add-to-Chat

Create a new server fn that:

* Takes the base prompt you were going to send to ChatDock
* Runs it through `detectMisalignments` using `loadAgentRules()`
* Uses severity to decide whether to block or just annotate
* Returns a `CoachPrefillPayload` for `ChatDockPanel`

`src/server/function/hookifyAddToChat.ts`:

```ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { loadAgentRules } from '~/server/lib/chatbotData';
import { detectMisalignments } from '~/features/chatbot/misalignment-detector';
import { selectPrimaryMisalignment } from '~/features/chatbot/severity';

import type { ChatRemediationMetadata } from '~/lib/chatbot/types';
import type { CoachPrefillPayload } from '~/components/chatbot/hooks/useChatDockController';
import { logInfo } from '~/lib/logger';

const inputSchema = z.object({
  sessionId: z.string().min(1),
  source: z.union([
    z.literal('timeline'),
    z.literal('session'),
    z.literal('manual'),
  ]),
  content: z.string().min(1), // base prompt text that would go to ChatDock
});

export const hookifyAddToChat = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const agentRules = await loadAgentRules();

    // No AGENT rules → no hook behavior
    if (!agentRules.length) {
      const prefill: CoachPrefillPayload = { prompt: data.content };
      return { blocked: false, prefill };
    }

    // Use the existing rule engine as our “hookify engine”
    const { misalignments } = detectMisalignments({
      snapshot: { sessionId: data.sessionId, text: data.content },
      agentRules,
    });

    if (!misalignments.length) {
      const prefill: CoachPrefillPayload = { prompt: data.content };
      return { blocked: false, prefill };
    }

    const primary = selectPrimaryMisalignment(misalignments);
    if (!primary) {
      const prefill: CoachPrefillPayload = { prompt: data.content };
      return { blocked: false, prefill };
    }

    // Policy: critical rules block, everything else warns
    const topSeverity = primary.severity;
    const shouldBlock = topSeverity === 'critical';

    const headerLines = [
      `AGENT hook check (${data.source}) found ${misalignments.length} relevant rule(s).`,
      `Primary: [${primary.severity.toUpperCase()}] ${primary.title}.`,
    ];

    const summaryLines = misalignments.slice(0, 5).map((m, index) => {
      return `${index + 1}. [${m.severity.toUpperCase()}] ${m.title} – ${m.summary}`;
    });

    const systemNotes = [
      ...headerLines,
      '',
      ...summaryLines,
      '',
      'Use these AGENT rules as hard constraints when answering.',
    ].join('\n');

    const metadata: ChatRemediationMetadata = {
      misalignmentId: primary.id,
      ruleId: primary.ruleId,
      severity: primary.severity,
      eventRange: primary.eventRange
        ? {
            startIndex: primary.eventRange.startIndex,
            endIndex: primary.eventRange.endIndex,
          }
        : undefined,
    };

    const prefill: CoachPrefillPayload = {
      prompt: [
        'AGENT alignment notes (treat as constraints):',
        systemNotes,
        '',
        data.content,
      ].join('\n\n'),
      metadata,
    };

    logInfo('hookify.add-to-chat', 'Prepared AGENT-based hookify prefill', {
      sessionId: data.sessionId,
      source: data.source,
      severity: topSeverity,
      misalignmentCount: misalignments.length,
      blocked: shouldBlock,
    });

    return {
      blocked: shouldBlock,
      prefill: shouldBlock ? null : prefill,
    };
  });
```

This is the critical bridge: AGENT rules are now the rule set for your hookify decision at the “add to chat” boundary.

---

3. Wire it into the existing “Add to chat” buttons

You already have the two trigger points:

* Timeline → `handleAddTimelineEventToChat`
* Session explorer → `handleAddSessionToChat`

Update `src/features/viewer/viewer.page.tsx`.

Imports:

```ts
import { hookifyAddToChat } from '~/server/function/hookifyAddToChat';
import type { CoachPrefillPayload } from '~/components/chatbot/hooks/useChatDockController';
```

State stays compatible:

```ts
const [coachPrefill, setCoachPrefill] = useState<CoachPrefillPayload | null>(null);
```

a) Timeline “Add to chat”

Replace the existing implementation:

```ts
const handleAddTimelineEventToChat = (event: TimelineEvent, index: number) => {
  logInfo('viewer.chatdock', 'Timeline event add-to-chat requested', {
    eventType: event.type,
    index,
  });

  const snippet = JSON.stringify(event, null, 2);
  const basePrompt = `Analyze this timeline event #${index + 1} (${event.type}):\n\n\`\`\`json\n${snippet}\n\`\`\`\n\nWhat are the implications of this event?`;

  void hookifyAddToChat({
    data: {
      sessionId: loaderData?.sessionId ?? 'demo-session',
      source: 'timeline',
      content: basePrompt,
    },
  })
    .then((result) => {
      if (!result || result.blocked || !result.prefill) return;
      setCoachPrefill(result.prefill);
      handleNavChange('chat');
    })
    .catch(() => {
      // Fallback: behave like today if hookify fails
      setCoachPrefill({ prompt: basePrompt });
      handleNavChange('chat');
    });
};
```

b) Session explorer “Add to chat”

Replace the existing implementation:

```ts
const handleAddSessionToChat = (asset: DiscoveredSessionAsset) => {
  logInfo('viewer.chatdock', 'Session add-to-chat requested', {
    path: asset.path,
    repo: asset.repoLabel ?? asset.repoName,
  });

  const basePrompt = `I am looking at session file: ${asset.path}\nRepo: ${
    asset.repoLabel ?? asset.repoName ?? 'unknown'
  }\n\nPlease analyze this session context.`;

  void hookifyAddToChat({
    data: {
      sessionId: loaderData?.sessionId ?? 'demo-session',
      source: 'session',
      content: basePrompt,
    },
  })
    .then((result) => {
      if (!result || result.blocked || !result.prefill) return;
      setCoachPrefill(result.prefill);
      handleNavChange('chat');
    })
    .catch(() => {
      setCoachPrefill({ prompt: basePrompt });
      handleNavChange('chat');
    });
};
```

c) Any future manual “Add to chat” entry point

Same pattern, just change `source`:

```ts
void hookifyAddToChat({
  data: {
    sessionId,
    source: 'manual',
    content: basePrompt,
  },
});
```

This ensures every add-to-chat action goes through the same AGENT/hookify gate.

---

4. What this buys you

* Single source of truth: AGENT rules are the only rule definition format. No separate hookify DSL required.
* Automatic alignment: whenever AGENTS.md changes, hook behavior changes with it.
* Reuse of existing infrastructure: `loadAgentRules`, `MisalignmentDetector`, `MisalignmentRecord`, `ChatRemediationMetadata`, severity ranking.
* Full integration with ChatDock: the prefill carries both the annotated prompt and metadata, so the session coach system prompt (`buildSessionCoachSystemPrompt`) can focus on the flagged rule when answering.

If you want stronger blocking semantics later, adjust only the severity policy in `hookifyAddToChat` (for example, block on `high`+ and just annotate on `medium` / `low`). The rest of the integration stays the same.
