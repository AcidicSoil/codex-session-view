# Hook-Gate_rule-inspector 12/03/25

---

You already have most of what you need. Here is the final component stack I would standardize on for the Hook Gate / rule inspector, incorporating your extra registries and local components.

---

## 1. Gate summary + “decision bar”

**Goal:** Replace the tall “Action blocked” block with a concise, always-visible decision banner plus a richer side panel when needed.

Use:

* `HookGateNotice` as the primary gate summary component

  * It already encodes severity, rule list, evidence preview, and “Jump to event” hooks in a strong neon-lime aesthetic.
  * Make this sit at the top of the inspector or pinned above the chat as a single source of truth for “blocked vs advisory”.

* `MisalignmentBanner` as the global “there are issues in this session” strip above the inspector and above ChatDock.

  * Trigger: any open misalignment records.
  * Action: opens the rule inspector sheet (see section 4).

* **shadcn**:

  * `Card / CardHeader / CardContent / CardFooter` to wrap `HookGateNotice` when you embed it inside other layouts.
  * `Badge` for severity labels (“CRITICAL / HIGH / MEDIUM”) when you need small inline indicators outside the main banner.

This gives you a clear hierarchy: tiny `Badge` inline → `MisalignmentBanner` for session-level → `HookGateNotice` for the current blocked action.

---

## 2. Rule details view (per rule)

**Goal:** Turn those huge markdown dumps into readable, skimmable rule cards.

Primary shell:

* `Card` with:

  * `CardHeader` → rule title, ID, severity `Badge`.
  * `CardContent` → tabs for different slices of the rule.
* `Tabs / TabsList / TabsTrigger / TabsContent` for `Summary | Rules | Evidence | Events | Remediation`.

Inside rule content:

* `Accordion / AccordionItem / AccordionTrigger / AccordionContent` for the long AGENTS/HOOKIFY markdown sections:

  * Items like “Hydration + Suspense core rules”, “Ephemeral UI/session rules”, “Hydration-safe idioms”.

* `ScrollArea` around the whole details block so the header, tabs, and controls stay fixed while the body scrolls.

* `HighlightedText` to emphasize offending phrases in the rule body and evidence (“useSyncExternalStore during hydration”, “startTransition”).

* `CodeBlock` from your kibo registry for any code snippets or “bad vs good” examples in the rule text. It’s already used in `SessionAnalysisPopouts`.

Visual polish from registries:

* `BorderBeam` around the active rule card only, to subtly highlight the rule responsible for the current block.
* `ShimmerButton` for high-intent actions like “Mark as remediated” or “Open in editor” so those stand out from normal buttons.

This combination makes dense rule text readable and introduces clear affordances without more bespoke components.

---

## 3. Evidence + event timeline

**Goal:** Make it trivial to move from a rule to the exact events and evidence that triggered it.

Timeline shell:

* `ResizablePanelGroup / ResizablePanel / ResizableHandle` for a 3-panel inspector:

  * Left: event list
  * Middle: rule details
  * Right: evidence preview / code / files.

Event list:

* `Data Table` (shadcn `Table` pattern) for events:

  * Columns: index, time, source (chat / tool / file), action, status, rule(s).
  * Sortable by time and severity.

* `TracingBeam` wrapped around the event list `ScrollArea` to show scroll position and add a subtle “neon track” feel, matching your existing aesthetic.

Evidence cards:

* Reuse the evidence list pattern inside `ChatDockMessages` → `EvidenceList` as a standalone component for the inspector, since it already understands severity and rule IDs.

* Present each evidence entry in a `Card` inside a `ScrollArea`:

  * Top row: rule ID, path, severity `Badge`.
  * Body: snippet text rendered with `HighlightedText` and `CodeBlock`.

Scroll/section context:

* `StickyScrollReveal` for a vertical stack of “Evidence sections” grouped by rule or by time window, with the sidebar summarizing the currently focused section.

This setup makes it easy to jump from “HookGateNotice → specific rule → specific event → precise evidence snippet”.

---

## 4. Global “Rule Inspector” surface

**Goal:** A single place you open from anywhere (chat, logs, viewer) to explore rules, bindings, and hook gates.

Use a sheet-based inspector:

* `Sheet / SheetContent / SheetHeader / SheetFooter` for a right-hand “Rule Inspector” that slides over the app.
* `Tabs` at the top of the sheet:

  * `Gate` (current block, `HookGateNotice`)
  * `Rules` (detail view from section 2)
  * `Events` (timeline from section 3)
  * `Inventory` (cross-session overview from section 5).

Inside the sheet header:

* `FloatingNavbar` from Aceternity for quick high-level modes: `Current Gate | Session | Project`, using its pill-style active tab to reinforce which context is active.

Triggering:

* `MisalignmentBanner`’s “Review issues” button opens this sheet.
* ChatDock “AI Analysis → Hook Discovery” can also deep-link here after generating new rule suggestions.

This gives you a single, consistent inspector instead of one-off blocks like in the screenshot.

---

## 5. Rule inventory + repo bindings

**Goal:** Visualize “what rules exist across which sessions/repos” and tie that back into Hookify.

You already have strong building blocks:

* `SessionRepoSelector` for binding a session to a repo/asset. It uses shadcn `Select`, `Button`, and toast patterns.

* `SessionRuleSheet` for listing rules per repo/session in a table. It already groups rules, renders a table, and shows severity with color-coded text.

Evolve this into an “Inventory” tab in the inspector:

* Wrap `SessionRuleSheet` in a `Card` and drop it directly into the `Inventory` tab of the Rule Inspector sheet.
* Add a top `InputGroup` with `Input` for text search and `Select` for severity filter, feeding into your existing memoized `rows`.
* Use `HighlightedText` inside the rule heading/summary cells to highlight search matches.

This turns your existing inventory table into a first-class surface without rewriting it.

---

## 6. Discovery and navigation utilities

**Goal:** Quickly jump to rules, events, or files without scanning lists.

Use:

* `CommandDialog` as a command palette:

  * Groups: `Rules`, `Events`, `Files`, `Sessions`.
  * Items call into your inspector: selecting a rule opens the inspector sheet on the correct tab and scrolls to that rule.

* `NavbarMenu` from Aceternity as a high-information overview panel on a dedicated “Governance / Hookify” page:

  * Items: `Hook Gates`, `Rule Inventory`, `Session Bindings`, `Analytics`.
  * The animated headline/description gives non-expert users an explanation of each area.

* `AnimatedTabs` for more marketing/overview pages where you want animated transitions between “Examples”, “Playbook”, and “Changelog” for the rule system.

---

## 7. Aesthetic scaffolding and atmospherics

Use your registry-driven primitives to keep the experience visually coherent with the rest of the app:

* `WavyBackground` behind the main Hookify/Rules page contents to subtly differentiate it from the more utilitarian CSV viewer.
* `GradientOrb` as a low-opacity background element in the summary header of that page.
* `TracingBeam` for any tall-scrolling body of events or rules, not just the timeline.

These should be applied sparingly and consistently so the system feels intentional, not like a collage of different libraries.

---

## 8. Final list of concrete component candidates

Treat these as the “toolbox” for all Hookify / rule-inspector work:

**Core shadcn / ui primitives**

* Layout: `Card`, `Tabs`, `ScrollArea`, `ResizablePanelGroup`, `Sheet`, `Dialog`, `Separator`.
* Inputs / filters: `Input`, `InputGroup`, `Select`, `Switch`, `ToggleGroup`, `Textarea`, `FileTrigger`.
* Navigation / discovery: `CommandDialog`, `DropdownMenu`, `Popover`.
* Status / emphasis: `Badge`, `Alert` (from shadcn directory), `Loader`, `Toast` (sonner already integrated).

**Existing registry-based / custom components**

* Hookify surfaces: `HookGateNotice`, `MisalignmentBanner`, `SessionRepoSelector`, `SessionRuleSheet`, `ChatDockMessages` (and `EvidenceList`), `ChatDockPanel`.
* Aceternity: `FloatingNavbar`, `NavbarMenu`, `AnimatedTabs`, `StickyScrollReveal`, `TracingBeam`, `TextGenerateEffect`, `WavyBackground`.
* MagicUI-style: `BorderBeam`, `ShimmerButton`, `AnimatedList`.
* Utility: `HighlightedText`, `GradientOrb`.

Building the Rule Inspector, gate UI, and inventory views out of this set will be more elegant, more navigable, and far easier to extend than the current tall monolithic blocks shown in your screenshots.

---

Implement the second design, extended with these concrete changes.

---

## 1. “Jump to event” must auto-load the session

Treat “jump to event” as a smart action:

1. Check if the session is loaded.
2. If not, load it.
3. Then focus the event and open the inspector.

Example state + handler (Zustand/React style):

```ts
// session-store.ts
type SessionState = {
  loadedSessionIds: Set<string>;
  loadSession: (sessionId: string) => Promise<void>;
  focusEvent: (sessionId: string, eventId: string) => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  loadedSessionIds: new Set(),
  async loadSession(sessionId) {
    if (get().loadedSessionIds.has(sessionId)) return;
    // fetch events / rules / messages
    const data = await fetch(`/api/sessions/${sessionId}`).then(r => r.json());
    set(state => ({
      ...state,
      loadedSessionIds: new Set(state.loadedSessionIds).add(sessionId),
      // merge data into your event/message stores here
    }));
  },
  focusEvent(sessionId, eventId) {
    // set selected event + open Rule Inspector in Events tab
  },
}));
```

Use it in the button:

```tsx
// EvidenceCard.tsx (fragment)
const JumpToEventButton: React.FC<{
  sessionId: string;
  eventId: string;
}> = ({ sessionId, eventId }) => {
  const loadSession = useSessionStore(s => s.loadSession);
  const focusEvent = useSessionStore(s => s.focusEvent);

  const handleClick = async () => {
    await loadSession(sessionId);
    focusEvent(sessionId, eventId);
    openRuleInspector({ tab: "events", eventId }); // global inspector controller
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="rounded-full border-lime-400 text-xs tracking-[0.2em]"
    >
      JUMP TO EVENT
    </Button>
  );
};
```

This guarantees “jump to event” always works, regardless of whether the user hit “add to chat” first.

---

## 2. Prettify evidence content with a single formatting component

Stop rendering raw strings directly. Route all text through a dedicated formatter.

Create a reusable component:

```tsx
// FormattedContent.tsx
import { cn } from "@/lib/utils";

type FormattedContentProps = {
  text: string;
  className?: string;
};

export function FormattedContent({ text, className }: FormattedContentProps) {
  // simple heuristics: preserve blank lines and bullets
  const paragraphs = text.split(/\n{2,}/g);

  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-amber-50/90",
        "prose prose-invert max-w-none prose-p:my-0 prose-code:text-[0.8em]",
        className
      )}
    >
      {paragraphs.map((block, i) => {
        const lines = block.split(/\n/g);

        const looksLikeList = lines.every(
          l => l.trim().startsWith("- ") || l.trim().startsWith("* ")
        );

        if (looksLikeList) {
          return (
            <ul key={i} className="list-disc list-inside space-y-1">
              {lines.map((line, j) => (
                <li key={j}>{line.replace(/^[-*]\s*/, "")}</li>
              ))}
            </ul>
          );
        }

        // basic bold support: **text**
        const withBold = block.split(/(\*\*[^*]+\*\*)/g).map((frag, j) => {
          if (/^\*\*[^*]+\*\*$/.test(frag)) {
            return (
              <strong key={j} className="font-semibold text-lime-300">
                {frag.slice(2, -2)}
              </strong>
            );
          }
          return <span key={j}>{frag}</span>;
        });

        return <p key={i}>{withBold}</p>;
      })}
    </div>
  );
}
```

Then in every evidence / rule / note component:

```tsx
<EvidenceCard>
  <FormattedContent text={evidence.body} />
</EvidenceCard>
```

You now have consistent spacing, line-height, and minimal structure across all text surfaces.

---

## 3. Flip + expand evidence cards

Behavior:

* Card has front and back.
* Click anywhere on the card body to expand and flip.
* Both sides show “Jump to event”.
* Back side shows user/assistant messages and any extra metadata.
* Content is scrollable when expanded.

Implementation using Framer Motion:

```tsx
// EvidenceCard.tsx
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormattedContent } from "./FormattedContent";

type EvidenceCardProps = {
  evidenceId: string;
  eventId: string;
  sessionId: string;
  title: string;
  body: string;
  userMessages: string[];
  assistantMessages: string[];
};

export function EvidenceCard(props: EvidenceCardProps) {
  const {
    evidenceId,
    eventId,
    sessionId,
    title,
    body,
    userMessages,
    assistantMessages,
  } = props;

  const [flipped, setFlipped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(true);
    setFlipped(f => !f);
  };

  return (
    <motion.div
      layout
      onClick={handleToggle}
      className={[
        "relative cursor-pointer rounded-2xl border border-lime-400/40",
        "bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950",
        "shadow-[0_0_0_1px_rgba(190,242,100,0.15),0_18px_40px_rgba(0,0,0,0.9)]",
        expanded ? "p-5" : "p-4",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-amber-300/80">
          Evidence #{evidenceId}
        </div>
        <JumpToEventButton sessionId={sessionId} eventId={eventId} />
      </div>

      <div className="relative h-full">
        <AnimatePresence initial={false} mode="popLayout">
          {!flipped ? (
            <motion.div
              key="front"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              <div className="text-sm font-semibold text-amber-50">
                {title}
              </div>
              <div className={expanded ? "max-h-60 overflow-y-auto pr-1" : ""}>
                <FormattedContent text={body} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  Event context
                </div>
                <JumpToEventButton sessionId={sessionId} eventId={eventId} />
              </div>

              <div className="max-h-60 overflow-y-auto pr-1 space-y-4">
                <MessageBlock label="User" messages={userMessages} />
                <MessageBlock label="Assistant" messages={assistantMessages} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const MessageBlock = ({
  label,
  messages,
}: {
  label: string;
  messages: string[];
}) => {
  if (!messages.length) return null;
  return (
    <div className="space-y-1">
      <div className="text-[0.65rem] uppercase tracking-[0.21em] text-amber-300/70">
        {label} messages
      </div>
      <div className="space-y-1 rounded-xl bg-black/30 p-3 border border-amber-500/15">
        {messages.map((m, i) => (
          <p key={i} className="text-xs leading-relaxed text-amber-50/90">
            {m}
          </p>
        ))}
      </div>
    </div>
  );
};
```

Click once: expands and flips from compact summary to rich context. Click again: flips sides while keeping the expanded footprint. Scroll zones prevent the card from stretching the whole column.

---

## 4. Config persistence and bookmarks

Single principle: all UI state that matters across refresh or login goes through one “settings + bookmarks” layer, not scattered localStorage calls.

### 4.1 Settings (filters, sessions, inspector)

Shape:

```ts
type RuleInspectorSettings = {
  open: boolean;
  activeTab: "gate" | "rules" | "events" | "inventory";
  selectedRuleId?: string;
  selectedEventId?: string;
};

type UiSettings = {
  filters: {
    severity: ("high" | "medium" | "low")[];
    tags: string[];
    showLegacy: boolean;
  };
  lastSessionId?: string;
  ruleInspector: RuleInspectorSettings;
};
```

Store + persistence:

```ts
// settings-store.ts
type SettingsState = {
  settings: UiSettings;
  setSettings: (updater: (prev: UiSettings) => UiSettings) => void;
  hydrateFromServer: (initial: UiSettings | null) => void;
};

const DEFAULT_SETTINGS: UiSettings = {
  filters: { severity: ["high", "medium"], tags: [], showLegacy: false },
  lastSessionId: undefined,
  ruleInspector: { open: false, activeTab: "gate" },
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings(updater) {
    set(prev => {
      const next = updater(prev.settings);
      if (prev.settings.userId) {
        void fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
      } else {
        window.localStorage.setItem("ui-settings", JSON.stringify(next));
      }
      return { ...prev, settings: next };
    });
  },
  hydrateFromServer(initial) {
    if (initial) {
      set({ settings: initial });
    } else {
      const fromLocal =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ui-settings")
          : null;
      set({
        settings: fromLocal ? JSON.parse(fromLocal) : DEFAULT_SETTINGS,
      });
    }
  },
}));
```

Behavior:

* Logged-in user: POST to `/api/settings` on every meaningful change.
* Guest: write to localStorage.
* “Reset” for authed user: keep server copy; “hard reset” endpoint to revert to defaults if needed.

### 4.2 Bookmarks

Schema (DB):

* `bookmarks`: `id`, `user_id`, `entity_type` (`session|event|chat|rule`), `entity_id`, `label`, `meta jsonb`, `created_at`.

Minimal API:

* `POST /api/bookmarks`
* `DELETE /api/bookmarks/:id`
* `GET /api/bookmarks`

Frontend hook:

```ts
type BookmarkType = "session" | "event" | "chat" | "rule";

type Bookmark = {
  id: string;
  type: BookmarkType;
  entityId: string;
  label: string;
};

type BookmarkState = {
  bookmarks: Bookmark[];
  toggleBookmark: (b: Omit<Bookmark, "id">) => Promise<void>;
};

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  async toggleBookmark({ type, entityId, label }) {
    const existing = get().bookmarks.find(
      b => b.type === type && b.entityId === entityId
    );
    if (existing) {
      set({ bookmarks: get().bookmarks.filter(b => b.id !== existing.id) });
      await fetch(`/api/bookmarks/${existing.id}`, { method: "DELETE" });
    } else {
      const created = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, entityId, label }),
      }).then(r => r.json());
      set({ bookmarks: [...get().bookmarks, created] });
    }
  },
}));
```

Attach a small icon button on each session/event/chat card that calls `toggleBookmark`.

---

## 5. Make “Review rules” actually review rules

Rewire “Review rules” to open the Rule Inspector instead of closing the gate.

Global inspector controller:

```ts
// rule-inspector-store.ts
type InspectorOpenArgs =
  | { tab?: "gate"; ruleId?: string }
  | { tab: "rules"; ruleId?: string }
  | { tab: "events"; eventId?: string }
  | { tab: "inventory" };

type InspectorState = {
  open: boolean;
  activeTab: "gate" | "rules" | "events" | "inventory";
  ruleId?: string;
  eventId?: string;
  openInspector: (args: InspectorOpenArgs) => void;
  closeInspector: () => void;
};

export const useRuleInspectorStore = create<InspectorState>((set) => ({
  open: false,
  activeTab: "gate",
  openInspector(args) {
    set({
      open: true,
      activeTab: args.tab ?? "gate",
      ruleId: "ruleId" in args ? args.ruleId : undefined,
      eventId: "eventId" in args ? args.eventId : undefined,
    });
  },
  closeInspector() {
    set({ open: false });
  },
}));
```

Wire the button:

```tsx
// inside HookGateNotice footer
import { useRuleInspectorStore } from "@/stores/rule-inspector-store";

const ReviewRulesButton = ({ primaryRuleId }: { primaryRuleId?: string }) => {
  const openInspector = useRuleInspectorStore(s => s.openInspector);
  const handleClick = () => {
    openInspector({ tab: "rules", ruleId: primaryRuleId });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="rounded-full border-lime-400 bg-black/40 px-4 text-xs tracking-[0.2em]"
    >
      REVIEW RULES
    </Button>
  );
};
```

Rule Inspector surface:

* Implement as a `Sheet` or dedicated route.
* `openInspector` controls visibility and initial tab.
* Hook Gate UI (`HookGateNotice`) remains visible; you are adding a layer, not replacing it.

This turns “Review rules” into the entry point for a full rules browser instead of a dead-end button.

---



---

You now have:

* “Jump to event” that always loads and focuses the correct context.
* Text formatting that stops evidence and rules from looking like unstructured blobs.
* Cards that flip and expand to show richer context without losing layout discipline.
* Real persistence for UI config and bookmarks.
* A functioning “Review rules” path that opens the large-scale Rule Inspector instead of hiding the gate.
