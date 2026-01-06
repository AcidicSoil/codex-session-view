Direct answer (1–4 bullets, evidence-cited)

SSR wiring is structurally correct for TanStack Router: the file route binds validateSearch, loader, head, and component in the canonical way (createFileRoute(VIEWER_ROUTE_ID)({ … })). Evidence: src/routes/(site)/viewer/route.tsx sets loader: viewerLoader, head: viewerHead, component: ViewerPage, and validateSearch via parseViewerSearch(search).

Streaming (incremental) behavior is not explicitly enabled by this loader: viewerLoader awaits the entire discovery flow before returning, so SSR will not be able to flush route HTML until these awaited calls finish. Evidence: in src/features/viewer/viewer.loader.ts, it does const snapshot = await runSessionDiscovery() then sessionCoach = await fetchChatbotState(...) (inside a try/catch) then const ruleSheet = await fetchRuleInventory(...), and only then return { ... }.

The loader is designed to run in both server + client contexts, but it imports server paths; whether that’s safe depends on how ~/server/function/* and ~/server/persistence/* are implemented (e.g., createServerFn wrappers). Evidence: viewer.loader.ts computes environment = typeof window === 'undefined' ? 'server' : 'client', but it imports runSessionDiscovery / fetchChatbotState / fetchRuleInventory / loadUiSettings from ~/server/....

Head adequacy for SSR can’t be verified from the provided snippet: the route references viewerHead, but the actual head tags / title / meta are in src/features/viewer/viewer.head.ts (not included). Evidence: route.tsx imports viewerHead and assigns head: viewerHead.

Risks/unknowns (bullets)

First-byte latency risk: runSessionDiscovery() runs before any other work and is awaited; if it touches filesystem or git, SSR will be blocked on it.

Client execution risk (bundling/runtime): if ~/server/function/* isn’t a client-safe server-action wrapper, the loader could fail on client navigation or inflate bundles.

No explicit parallelization: chatbot state and rule inventory could likely be fetched concurrently; right now they are serialized behind discovery.

Head + hydration fidelity unknown: without viewerHead and ViewerPage, it’s unclear whether critical SEO/meta, preload hints, or suspense boundaries exist to support streaming/hydration gracefully.

Next smallest concrete experiment (1 action)

Run: ck --regex "export (const|function) viewerHead|viewerHead\\b" src/features/viewer and inspect src/features/viewer/viewer.head.ts to confirm SSR-safe head output (title/meta/link tags) and whether it depends on loader data.

If evidence is insufficient, exact missing file/path pattern(s) to attach next

src/features/viewer/viewer.head.ts

src/features/viewer/viewer.page.tsx (or src/features/viewer/viewer.page.*)

Any SSR entry/root router files that define streaming/dehydration behavior (common patterns):

src/routes/__root*.tsx

`src/ent
