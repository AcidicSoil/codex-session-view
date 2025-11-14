Project Structure:
├── AGENTS.md
├── AGENTS.md.bak
├── CHANGELOG.md
├── CLAUDE.md
├── CLAUDE.md.bak
├── LICENSE
├── README.md
├── codefetch
│   ├── routes.md
│   └── src.md
├── components-TODO.md
├── components.json
├── docs
│   ├── avoid-useEffect-summary.md
│   └── tanstack-rc1-upgrade-guide.md
├── package.json
├── pnpm-lock.yaml
├── public
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   ├── favicon.png
│   └── site.webmanifest
├── src
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── CLAUDE.md.bak
│   ├── components
│   │   ├── DefaultCatchBoundary.tsx
│   │   ├── Header.tsx
│   │   ├── NotFound.tsx
│   │   ├── PostError.tsx
│   │   ├── gradient-orb.tsx
│   │   ├── mode-toggle.tsx
│   │   ├── theme-init-script.tsx
│   │   ├── theme-provider.tsx
│   │   ├── ui
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── textarea.tsx
│   │   └── viewer
│   │       ├── ChatDock.tsx
│   │       ├── DiscoveryPanel.test.tsx
│   │       ├── DiscoveryPanel.tsx
│   │       ├── DropZone.tsx
│   │       ├── EventCard.tsx
│   │       ├── FileInputButton.tsx
│   │       ├── TimelineList.tsx
│   │       └── TimelineView.tsx
│   ├── db
│   │   └── schema
│   │       ├── AGENTS.md
│   │       ├── CLAUDE.md
│   │       └── CLAUDE.md.bak
│   ├── entry-client.tsx
│   ├── env
│   │   ├── client.ts
│   │   └── server.ts
│   ├── hooks
│   │   ├── useFileLoader.ts
│   │   └── useSessionStorage.ts
│   ├── lib
│   │   ├── session-parser
│   │   │   ├── index.ts
│   │   │   ├── schemas.ts
│   │   │   ├── streaming.ts
│   │   │   └── validators.ts
│   │   ├── theme.ts
│   │   ├── todos
│   │   │   └── queries.ts
│   │   ├── utils.ts
│   │   ├── viewer-types
│   │   │   ├── events.ts
│   │   │   ├── git.ts
│   │   │   ├── index.ts
│   │   │   ├── primitives.ts
│   │   │   └── session.ts
│   │   └── viewerDiscovery.ts
│   ├── routeTree.gen.ts
│   ├── router.tsx
│   ├── routes
│   │   ├── (site)
│   │   │   ├── docs.tsx
│   │   │   ├── index.tsx
│   │   │   ├── route.tsx
│   │   │   ├── viewer
│   │   │   │   └── index.tsx
│   │   │   └── viewer.tsx
│   │   ├── AGENTS.md
│   │   ├── CLAUDE.md
│   │   ├── CLAUDE.md.bak
│   │   ├── __root.tsx
│   │   └── api
│   │       └── test.ts
│   ├── server
│   │   └── function
│   │       ├── AGENTS.md
│   │       ├── CLAUDE.md
│   │       ├── CLAUDE.md.bak
│   │       └── todos.ts
│   ├── start.ts
│   ├── styles
│   │   ├── app.css
│   │   └── custom.css
│   ├── tanstack-start.d.ts
│   ├── types
│   │   └── browser-echo.d.ts
│   └── utils
│       ├── event-key.ts
│       ├── id-generator.ts
│       ├── line-reader.ts
│       └── seo.ts
├── tests
│   ├── DiscoveryPanel.test.tsx
│   ├── setup.ts
│   └── streaming.test.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts


src/CLAUDE.md
```
1 | 
2 | 
3 | <!-- Source: .ruler/tanstack-environment-server-client-only-rules.md -->
4 | 
5 | # ClientOnly
6 | 
7 | Client-only render to avoid SSR hydration issues. Import from `@tanstack/react-router`:
8 | 
9 | ```typescript
10 | import { ClientOnly } from '@tanstack/react-router';
11 | 
12 | <ClientOnly fallback={<span>—</span>}>
13 |   <ComponentThatUsesClientHooks />
14 | </ClientOnly>
15 | ```
16 | 
17 | Alternative: Custom implementation using mounted pattern if needed (see hydration errors below).
18 | 
19 | # Environment functions
20 | 
21 | From `@tanstack/react-start`:
22 | 
23 | ## createIsomorphicFn
24 | 
25 | Adapts to client/server:
26 | 
27 | ```typescript
28 | import { createIsomorphicFn } from '@tanstack/react-start';
29 | const getEnv = createIsomorphicFn()
30 |   .server(() => 'server')
31 |   .client(() => 'client');
32 | getEnv(); // 'server' on server, 'client' on client
33 | ```
34 | 
35 | Partial: `.server()` no-op on client, `.client()` no-op on server.
36 | 
37 | ## createServerOnlyFn / createClientOnlyFn
38 | 
39 | RC1: `serverOnly` → `createServerOnlyFn`, `clientOnly` → `createClientOnlyFn`
40 | 
41 | Strict environment execution (throws if called wrong env):
42 | 
43 | ```typescript
44 | import { createServerOnlyFn, createClientOnlyFn } from '@tanstack/react-start';
45 | const serverFn = createServerOnlyFn(() => 'bar'); // throws on client
46 | const clientFn = createClientOnlyFn(() => 'bar'); // throws on server
47 | ```
48 | 
49 | Tree-shaken: client code removed from server bundle, server code removed from client bundle.
50 | 
51 | # Hydration errors
52 | 
53 | Mismatch: Server HTML differs from client render. Common causes: Intl (locale/timezone), Date.now(), random IDs, responsive logic, feature flags, user prefs.
54 | 
55 | Strategies:
56 | 1. Make server and client match: deterministic locale/timezone on server (cookie or Accept-Language header), compute once and hydrate as initial state.
57 | 2. Let client tell environment: set cookie with client timezone on first visit, SSR uses UTC until then.
58 | 3. Make it client-only: wrap unstable UI in `<ClientOnly>` to avoid SSR mismatches.
59 | 4. Disable/limit SSR: use selective SSR (`ssr: 'data-only'` or `false`) when server HTML cannot be stable.
60 | 5. Last resort: React's `suppressHydrationWarning` for small known-different nodes (use sparingly).
61 | 
62 | Checklist: Deterministic inputs (locale, timezone, feature flags). Prefer cookies for client context. Use `<ClientOnly>` for dynamic UI. Use selective SSR when server HTML unstable. Avoid blind suppression.
63 | 
64 | # TanStack Start basics
65 | 
66 | Depends: @tanstack/react-router, Vite. Router: getRouter() (was createRouter() in beta). routeTree.gen.ts auto-generated on first dev run. Optional: server handler via @tanstack/react-start/server; client hydrate via StartClient from @tanstack/react-start/client. RC1: Import StartClient from @tanstack/react-start/client (not @tanstack/react-start). StartClient no longer requires router prop. Root route head: utf-8, viewport, title; component wraps Outlet in RootDocument. Routes: createFileRoute() code-split + lazy-load; loader runs server/client. Navigation: Link (typed), useNavigate (imperative), useRouter (instance).
67 | 
68 | # Server functions
69 | 
70 | createServerFn({ method }) + zod .inputValidator + .handler(ctx). After mutations: router.invalidate(); queryClient.invalidateQueries(['entity', id]).
71 | 
72 | # Typed Links
73 | 
74 | Link to="/posts/$postId" with params; activeProps for styling.
75 | 
76 | 
77 | 
78 | <!-- Source: .ruler/tanstack-query-rules.md -->
79 | 
80 | # TanStack Query Rules
81 | 
82 | Server state via TanStack Query + server functions. Type-safe fetching and mutations.
83 | 
84 | ## Query Pattern
85 | 
86 | Define in `lib/{resource}/queries.ts` using `queryOptions`:
87 | 
88 | ```typescript
89 | export const todosQueryOptions = () =>
90 |   queryOptions({
91 |     queryKey: ['todos'],
92 |     queryFn: async ({ signal }) => await getTodos({ signal }),
93 |     staleTime: 1000 * 60 * 5,
94 |     gcTime: 1000 * 60 * 10,
95 |   });
96 | ```
97 | 
98 | Use: `const { data, isLoading } = useQuery(todosQueryOptions())`. Prefer `useSuspenseQuery` with Suspense.
99 | 
100 | ## Server Functions in Queries
101 | 
102 | Call server functions directly in `queryFn`. No `useServerFn` hook. TanStack Start proxies. Pass `signal` for cancellation.
103 | 
104 | ## Mutation Pattern
105 | 
106 | ```typescript
107 | const mutation = useMutation({
108 |   mutationFn: async (text: string) => await createTodo({ data: { text } }),
109 |   onSuccess: () => {
110 |     queryClient.invalidateQueries({ queryKey: todosQueryOptions().queryKey });
111 |     toast.success('Success');
112 |   },
113 |   onError: (error) => toast.error(error.message || 'Failed'),
114 | });
115 | ```
116 | 
117 | Call via `mutation.mutate(data)` or `mutateAsync` for promises.
118 | 
119 | ## Query Invalidation
120 | 
121 | After mutations: `queryClient.invalidateQueries({ queryKey: ... })`. Use specific keys, not broad.
122 | 
123 | ## Mutation States
124 | 
125 | Access: `isPending`, `isError`, `isSuccess`, `error`, `data`. Disable UI during `isPending`.
126 | 
127 | ## Error Handling
128 | 
129 | Handle in `onError`. Toast messages. Access: `error.message || 'Default'`.
130 | 
131 | ## Query Keys
132 | 
133 | Hierarchical: `['todos']`, `['todo', id]`, `['todos', 'completed']`. Include all affecting variables.
134 | 
135 | ## Stale Time vs GC Time
136 | 
137 | `staleTime`: freshness duration (no refetch). Default 0. Set for stable data.
138 | `gcTime`: unused cache duration (was `cacheTime`). Default 5min. Memory management.
139 | 
140 | ## Infinite Queries
141 | 
142 | `useInfiniteQuery` for pagination. Required: `initialPageParam`, `getNextPageParam`, `fetchNextPage`. Access `data.pages`. Check `hasNextPage` before fetching.
143 | 
144 | ## Optimistic Updates
145 | 
146 | `onMutate` for optimistic updates. Rollback in `onError`. Update cache via `queryClient.setQueryData`.
147 | 
148 | ## Best Practices
149 | 
150 | 1. Queries in `lib/{resource}/queries.ts` with `queryOptions`
151 | 2. Call server functions directly (no `useServerFn` in callbacks)
152 | 3. Invalidate after mutations
153 | 4. Toast for feedback
154 | 5. Handle loading/error states
155 | 6. Use TypeScript types from query options
156 | 7. Set `staleTime`/`gcTime` appropriately
157 | 8. Prefer `useSuspenseQuery` with Suspense
```

src/entry-client.tsx
```
1 | import { StartClient } from "@tanstack/react-start/client"
2 | import { StrictMode, startTransition } from "react"
3 | import { hydrateRoot } from "react-dom/client"
4 | 
5 | startTransition(() => {
6 |     hydrateRoot(
7 |         document,
8 |         (
9 |             <StrictMode>
10 |                 <StartClient />
11 |             </StrictMode>
12 |         )
13 |     )
14 | })
```

src/router.tsx
```
1 | import { QueryClient } from '@tanstack/react-query';
2 | import { createRouter } from '@tanstack/react-router';
3 | import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
4 | import { routeTree } from './routeTree.gen';
5 | import { DefaultCatchBoundary } from './components/DefaultCatchBoundary';
6 | import { NotFound } from './components/NotFound';
7 | 
8 | export function getRouter() {
9 |   const queryClient = new QueryClient();
10 | 
11 |   const router = createRouter({
12 |     routeTree,
13 |     context: { queryClient },
14 |     defaultPreload: 'intent',
15 |     defaultErrorComponent: DefaultCatchBoundary,
16 |     defaultNotFoundComponent: () => <NotFound />,
17 |   });
18 |   setupRouterSsrQueryIntegration({
19 |     router,
20 |     queryClient,
21 |   });
22 | 
23 |   return router;
24 | }
25 | 
26 | declare module '@tanstack/react-router' {
27 |   interface Register {
28 |     router: ReturnType<typeof getRouter>;
29 |   }
30 | }
```

src/start.ts
```
1 | import { createStart } from '@tanstack/react-start';
2 | export const startInstance = createStart(async () => ({
3 |   functionMiddleware: [],
4 | }));
```

src/tanstack-start.d.ts
```
1 | /// <reference types="vite/client" />
2 | import '../.tanstack-start/server-routes/routeTree.gen'
```

src/.ruler/tanstack-environment-server-client-only-rules.md
```
1 | # ClientOnly
2 | 
3 | Client-only render to avoid SSR hydration issues. Import from `@tanstack/react-router`:
4 | 
5 | ```typescript
6 | import { ClientOnly } from '@tanstack/react-router';
7 | 
8 | <ClientOnly fallback={<span>—</span>}>
9 |   <ComponentThatUsesClientHooks />
10 | </ClientOnly>
11 | ```
12 | 
13 | Alternative: Custom implementation using mounted pattern if needed (see hydration errors below).
14 | 
15 | # Environment functions
16 | 
17 | From `@tanstack/react-start`:
18 | 
19 | ## createIsomorphicFn
20 | 
21 | Adapts to client/server:
22 | 
23 | ```typescript
24 | import { createIsomorphicFn } from '@tanstack/react-start';
25 | const getEnv = createIsomorphicFn()
26 |   .server(() => 'server')
27 |   .client(() => 'client');
28 | getEnv(); // 'server' on server, 'client' on client
29 | ```
30 | 
31 | Partial: `.server()` no-op on client, `.client()` no-op on server.
32 | 
33 | ## createServerOnlyFn / createClientOnlyFn
34 | 
35 | RC1: `serverOnly` → `createServerOnlyFn`, `clientOnly` → `createClientOnlyFn`
36 | 
37 | Strict environment execution (throws if called wrong env):
38 | 
39 | ```typescript
40 | import { createServerOnlyFn, createClientOnlyFn } from '@tanstack/react-start';
41 | const serverFn = createServerOnlyFn(() => 'bar'); // throws on client
42 | const clientFn = createClientOnlyFn(() => 'bar'); // throws on server
43 | ```
44 | 
45 | Tree-shaken: client code removed from server bundle, server code removed from client bundle.
46 | 
47 | # Hydration errors
48 | 
49 | Mismatch: Server HTML differs from client render. Common causes: Intl (locale/timezone), Date.now(), random IDs, responsive logic, feature flags, user prefs.
50 | 
51 | Strategies:
52 | 1. Make server and client match: deterministic locale/timezone on server (cookie or Accept-Language header), compute once and hydrate as initial state.
53 | 2. Let client tell environment: set cookie with client timezone on first visit, SSR uses UTC until then.
54 | 3. Make it client-only: wrap unstable UI in `<ClientOnly>` to avoid SSR mismatches.
55 | 4. Disable/limit SSR: use selective SSR (`ssr: 'data-only'` or `false`) when server HTML cannot be stable.
56 | 5. Last resort: React's `suppressHydrationWarning` for small known-different nodes (use sparingly).
57 | 
58 | Checklist: Deterministic inputs (locale, timezone, feature flags). Prefer cookies for client context. Use `<ClientOnly>` for dynamic UI. Use selective SSR when server HTML unstable. Avoid blind suppression.
59 | 
60 | # TanStack Start basics
61 | 
62 | Depends: @tanstack/react-router, Vite. Router: getRouter() (was createRouter() in beta). routeTree.gen.ts auto-generated on first dev run. Optional: server handler via @tanstack/react-start/server; client hydrate via StartClient from @tanstack/react-start/client. RC1: Import StartClient from @tanstack/react-start/client (not @tanstack/react-start). StartClient no longer requires router prop. Root route head: utf-8, viewport, title; component wraps Outlet in RootDocument. Routes: createFileRoute() code-split + lazy-load; loader runs server/client. Navigation: Link (typed), useNavigate (imperative), useRouter (instance).
63 | 
64 | # Server functions
65 | 
66 | createServerFn({ method }) + zod .inputValidator + .handler(ctx). After mutations: router.invalidate(); queryClient.invalidateQueries(['entity', id]).
67 | 
68 | # Typed Links
69 | 
70 | Link to="/posts/$postId" with params; activeProps for styling.
```

src/.ruler/tanstack-query-rules.md
```
1 | # TanStack Query Rules
2 | 
3 | Server state via TanStack Query + server functions. Type-safe fetching and mutations.
4 | 
5 | ## Query Pattern
6 | 
7 | Define in `lib/{resource}/queries.ts` using `queryOptions`:
8 | 
9 | ```typescript
10 | export const todosQueryOptions = () =>
11 |   queryOptions({
12 |     queryKey: ['todos'],
13 |     queryFn: async ({ signal }) => await getTodos({ signal }),
14 |     staleTime: 1000 * 60 * 5,
15 |     gcTime: 1000 * 60 * 10,
16 |   });
17 | ```
18 | 
19 | Use: `const { data, isLoading } = useQuery(todosQueryOptions())`. Prefer `useSuspenseQuery` with Suspense.
20 | 
21 | ## Server Functions in Queries
22 | 
23 | Call server functions directly in `queryFn`. No `useServerFn` hook. TanStack Start proxies. Pass `signal` for cancellation.
24 | 
25 | ## Mutation Pattern
26 | 
27 | ```typescript
28 | const mutation = useMutation({
29 |   mutationFn: async (text: string) => await createTodo({ data: { text } }),
30 |   onSuccess: () => {
31 |     queryClient.invalidateQueries({ queryKey: todosQueryOptions().queryKey });
32 |     toast.success('Success');
33 |   },
34 |   onError: (error) => toast.error(error.message || 'Failed'),
35 | });
36 | ```
37 | 
38 | Call via `mutation.mutate(data)` or `mutateAsync` for promises.
39 | 
40 | ## Query Invalidation
41 | 
42 | After mutations: `queryClient.invalidateQueries({ queryKey: ... })`. Use specific keys, not broad.
43 | 
44 | ## Mutation States
45 | 
46 | Access: `isPending`, `isError`, `isSuccess`, `error`, `data`. Disable UI during `isPending`.
47 | 
48 | ## Error Handling
49 | 
50 | Handle in `onError`. Toast messages. Access: `error.message || 'Default'`.
51 | 
52 | ## Query Keys
53 | 
54 | Hierarchical: `['todos']`, `['todo', id]`, `['todos', 'completed']`. Include all affecting variables.
55 | 
56 | ## Stale Time vs GC Time
57 | 
58 | `staleTime`: freshness duration (no refetch). Default 0. Set for stable data.
59 | `gcTime`: unused cache duration (was `cacheTime`). Default 5min. Memory management.
60 | 
61 | ## Infinite Queries
62 | 
63 | `useInfiniteQuery` for pagination. Required: `initialPageParam`, `getNextPageParam`, `fetchNextPage`. Access `data.pages`. Check `hasNextPage` before fetching.
64 | 
65 | ## Optimistic Updates
66 | 
67 | `onMutate` for optimistic updates. Rollback in `onError`. Update cache via `queryClient.setQueryData`.
68 | 
69 | ## Best Practices
70 | 
71 | 1. Queries in `lib/{resource}/queries.ts` with `queryOptions`
72 | 2. Call server functions directly (no `useServerFn` in callbacks)
73 | 3. Invalidate after mutations
74 | 4. Toast for feedback
75 | 5. Handle loading/error states
76 | 6. Use TypeScript types from query options
77 | 7. Set `staleTime`/`gcTime` appropriately
78 | 8. Prefer `useSuspenseQuery` with Suspense
```

src/components/DefaultCatchBoundary.tsx
```
1 | import { ErrorComponent, Link, rootRouteId, useMatch, useRouter } from '@tanstack/react-router';
2 | import type { ErrorComponentProps } from '@tanstack/react-router';
3 | 
4 | export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
5 |   const router = useRouter();
6 |   const isRoot = useMatch({
7 |     strict: false,
8 |     select: (state) => state.id === rootRouteId,
9 |   });
10 | 
11 |   console.error(error);
12 | 
13 |   return (
14 |     <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
15 |       <ErrorComponent error={error} />
16 |       <div className="flex gap-2 items-center flex-wrap">
17 |         <button
18 |           onClick={() => {
19 |             router.invalidate();
20 |           }}
21 |           className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
22 |         >
23 |           Try Again
24 |         </button>
25 |         {isRoot ? (
26 |           <Link
27 |             to="/"
28 |             className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
29 |           >
30 |             Home
31 |           </Link>
32 |         ) : (
33 |           <Link
34 |             to="/"
35 |             className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
36 |             onClick={(e) => {
37 |               e.preventDefault();
38 |               window.history.back();
39 |             }}
40 |           >
41 |             Go Back
42 |           </Link>
43 |         )}
44 |       </div>
45 |     </div>
46 |   );
47 | }
```

src/components/Header.tsx
```
1 | //import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui"
2 | import { Link } from '@tanstack/react-router';
3 | import { ModeToggle } from './mode-toggle';
4 | 
5 | export function Header() {
6 |   return (
7 |     <header className="sticky top-0 z-50 border-b bg-background/60 px-4 py-3 backdrop-blur">
8 |       <div className="container mx-auto flex items-center justify-between">
9 |         <Link to="/" className="font-bold text-2xl text-foreground">
10 |           CSV
11 |         </Link>
12 | 
13 |         <nav className="flex items-center gap-6">
14 |           <Link
15 |             to="/viewer"
16 |             className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
17 |           >
18 |             Viewer
19 |           </Link>
20 |           <Link
21 |             to="/docs"
22 |             className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
23 |           >
24 |             Docs
25 |           </Link>
26 |           <a
27 |             href="https://github.com/instructa/constructa-starter-min"
28 |             target="_blank"
29 |             rel="noopener noreferrer"
30 |             className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
31 |           >
32 |             GitHub
33 |             <svg
34 |               className="w-3 h-3"
35 |               fill="none"
36 |               stroke="currentColor"
37 |               viewBox="0 0 24 24"
38 |               xmlns="http://www.w3.org/2000/svg"
39 |             >
40 |               <path
41 |                 strokeLinecap="round"
42 |                 strokeLinejoin="round"
43 |                 strokeWidth={2}
44 |                 d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
45 |               />
46 |             </svg>
47 |           </a>
48 |           <ModeToggle />
49 |           {/* <UserButton />
50 | 
51 |                     <SignedOut>
52 |                         <Link to="/auth/$pathname" params={{ pathname: "sign-in" }}>
53 |                             <Button className="rounded-full bg-primary px-6 font-medium text-primary-foreground text-sm hover:bg-primary/90">
54 |                                 Sign In <span className="ml-1">↗</span>
55 |                             </Button>
56 |                         </Link>
57 |                     </SignedOut>
58 |                     <SignedIn>
59 |                         <Link to="/dashboard">
60 |                             <Button className="rounded-full bg-primary px-6 font-medium text-primary-foreground text-sm hover:bg-primary/90">
61 |                                 Dashboard <span className="ml-1">↗</span>
62 |                             </Button>
63 |                         </Link>
64 |                     </SignedIn> */}
65 |         </nav>
66 |       </div>
67 |     </header>
68 |   );
69 | }
```

src/components/NotFound.tsx
```
1 | import { Link } from '@tanstack/react-router';
2 | 
3 | export function NotFound({ children }: { children?: any }) {
4 |   return (
5 |     <div className="space-y-2 p-2">
6 |       <div className="text-gray-600 dark:text-gray-400">
7 |         {children || <p>The page you are looking for does not exist.</p>}
8 |       </div>
9 |       <p className="flex items-center gap-2 flex-wrap">
10 |         <button
11 |           onClick={() => window.history.back()}
12 |           className="bg-emerald-500 text-white px-2 py-1 rounded-sm uppercase font-black text-sm"
13 |         >
14 |           Go back
15 |         </button>
16 |         <Link
17 |           to="/"
18 |           className="bg-cyan-600 text-white px-2 py-1 rounded-sm uppercase font-black text-sm"
19 |         >
20 |           Start Over
21 |         </Link>
22 |       </p>
23 |     </div>
24 |   );
25 | }
```

src/components/PostError.tsx
```
1 | import { ErrorComponent, type ErrorComponentProps } from "@tanstack/react-router"
2 | 
3 | export function PostErrorComponent({ error }: ErrorComponentProps) {
4 |     return <ErrorComponent error={error} />
5 | }
```

src/components/gradient-orb.tsx
```
1 | import type { HTMLAttributes } from "react"
2 | import { cn } from "~/lib/utils"
3 | 
4 | interface GradientOrbProps extends HTMLAttributes<HTMLDivElement> {}
5 | 
6 | export default function GradientOrb({ className, ...props }: GradientOrbProps) {
7 |     return (
8 |         <div
9 |             className={cn(
10 |                 "pointer-events-none z-0 h-64 w-64 rounded-full bg-gradient-to-b from-pink-200 via-purple-200 to-amber-200 opacity-70 blur-3xl dark:from-pink-900/70 dark:via-purple-900/70 dark:to-amber-900/70",
11 |                 className
12 |             )}
13 |             {...props}
14 |         />
15 |     )
16 | }
```

src/components/mode-toggle.tsx
```
1 | import { ClientOnly } from '@tanstack/react-router';
2 | import { useTheme } from '~/components/theme-provider';
3 | 
4 | function ModeToggleInner() {
5 |   const { theme, setTheme } = useTheme();
6 |   const next = theme === 'light' ? 'dark' : 'light';
7 | 
8 |   return (
9 |     <button type="button" onClick={() => setTheme(next)}>
10 |       {theme === 'light' ? '☀️' : '🌙'}
11 |     </button>
12 |   );
13 | }
14 | export function ModeToggle() {
15 |   return (
16 |     <ClientOnly fallback={<button type="button">☀️</button>}>
17 |       <ModeToggleInner />
18 |     </ClientOnly>
19 |   );
20 | }
```

src/components/theme-init-script.tsx
```
1 | /**
2 |  * Decides the initial theme on first paint.
3 |  * Order of precedence:
4 |  *   1. localStorage("vite-ui-theme") – updated instantly on toggle
5 |  *   2. "vite-ui-theme" cookie – updated on the next server round-trip
6 |  *   3. OS preference via prefers-color-scheme
7 |  *
8 |  * Result: Adds either "light" or "dark" class to <html> and ensures a
9 |  *         <meta name="color-scheme" content="light dark"> tag exists.
10 |  */
11 | export function ThemeInitScript() {
12 |     const js = `(() => {
13 |     try {
14 |       const COOKIE = "vite-ui-theme";
15 |       // 1. Try localStorage first – instant client-side updates when the user toggles.
16 |       // 2. Fallback to the cookie (updated on the next server round-trip).
17 |       // This prevents a flicker where the cookie still contains the old value
18 |       // between the client update and the (async) server response.
19 |       let theme = null;
20 | 
21 |       try {
22 |         theme = localStorage.getItem(COOKIE);
23 |       } catch (_) {}
24 | 
25 |       if (!theme) {
26 |         const match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
27 |         theme = match ? decodeURIComponent(match[1]) : null;
28 |       }
29 | 
30 |       if (theme !== "light" && theme !== "dark") {
31 |         theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
32 |       }
33 | 
34 |       const root = document.documentElement;
35 |       root.classList.remove("light", "dark");
36 |       root.classList.add(theme);
37 | 
38 |       let meta = document.querySelector('meta[name="color-scheme"]');
39 |       if (!meta) {
40 |         meta = document.createElement("meta");
41 |         meta.setAttribute("name", "color-scheme");
42 |         document.head.appendChild(meta);
43 |       }
44 |       meta.setAttribute("content", "light dark");
45 |     } catch (_) { /* never block page load */ }
46 |   })();`
47 | 
48 |     // Children string executes while avoiding react/no-danger complaints.
49 |     return (
50 |         <script id="theme-init" suppressHydrationWarning>
51 |             {js}
52 |         </script>
53 |     )
54 | }
```

src/components/theme-provider.tsx
```
1 | import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
2 | import { type Theme, setTheme as setThemeServer } from '~/lib/theme';
3 | 
4 | const LS_KEY = 'vite-ui-theme';
5 | type Ctx = { theme: Theme; setTheme: (t: Theme) => void };
6 | 
7 | const ThemeCtx = createContext<Ctx | null>(null);
8 | 
9 | export function ThemeProvider({
10 |   initial,
11 |   children,
12 | }: {
13 |   initial: Theme;
14 |   children: React.ReactNode;
15 | }) {
16 |   // 1 Initialize with the server value to avoid hydration mismatch
17 |   const [theme, setThemeState] = useState<Theme>(initial);
18 | 
19 |   // 2 After mount, check localStorage and update if different
20 |   useEffect(() => {
21 |     const ls = localStorage.getItem(LS_KEY) as Theme | null;
22 |     if (ls && ls !== initial) {
23 |       setThemeState(ls);
24 |     }
25 |   }, [initial]);
26 | 
27 |   // 3 keep DOM and LS up to date
28 |   useLayoutEffect(() => {
29 |     const root = document.documentElement;
30 |     root.classList.remove('light', 'dark');
31 | 
32 |     const applied =
33 |       theme === 'system'
34 |         ? matchMedia('(prefers-color-scheme: dark)').matches
35 |           ? 'dark'
36 |           : 'light'
37 |         : theme;
38 | 
39 |     root.classList.add(applied);
40 |     localStorage.setItem(LS_KEY, theme);
41 |   }, [theme]);
42 | 
43 |   // 3 listen to cross-tab changes
44 |   useEffect(() => {
45 |     const handler = (e: StorageEvent) => {
46 |       if (e.key === LS_KEY && e.newValue) {
47 |         const t = e.newValue as Theme;
48 |         if (t !== theme) setThemeState(t);
49 |       }
50 |     };
51 |     window.addEventListener('storage', handler);
52 |     return () => window.removeEventListener('storage', handler);
53 |   }, [theme]);
54 | 
55 |   // 4 update both stores on toggle
56 |   const setTheme = (next: Theme) => {
57 |     setThemeState(next);
58 |     localStorage.setItem(LS_KEY, next);
59 |     setThemeServer({ data: next }); // persist cookie for future requests
60 |   };
61 | 
62 |   return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
63 | }
64 | 
65 | export const useTheme = () => {
66 |   const ctx = useContext(ThemeCtx);
67 |   if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
68 |   return ctx;
69 | };
```

src/env/client.ts
```
1 | import { createEnv } from '@t3-oss/env-core';
2 | import * as z from 'zod';
3 | 
4 | export const env = createEnv({
5 |   clientPrefix: 'VITE_',
6 |   client: {
7 |     VITE_BASE_URL: z.url().default('http://localhost:3000'),
8 |   },
9 |   runtimeEnv: import.meta.env,
10 | });
```

src/env/server.ts
```
1 | import { createEnv } from '@t3-oss/env-core';
2 | import * as z from 'zod';
3 | 
4 | export const env = createEnv({
5 |   server: {
6 |     MY_SECRET_VAR: z.url(),
7 |   },
8 |   runtimeEnv: process.env,
9 | });
```

src/hooks/useFileLoader.ts
```
1 | import { useCallback, useMemo, useReducer } from 'react';
2 | import { streamParseSession, type ParserError } from '~/lib/session-parser';
3 | import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser';
4 | 
5 | export type LoadPhase = 'idle' | 'parsing' | 'error' | 'success';
6 | 
7 | interface State {
8 |   phase: LoadPhase;
9 |   meta?: SessionMetaParsed;
10 |   events: ResponseItemParsed[];
11 |   ok: number;
12 |   fail: number;
13 |   lastError?: ParserError;
14 | }
15 | 
16 | type Action =
17 |   | { type: 'reset' }
18 |   | { type: 'start' }
19 |   | { type: 'meta'; meta: SessionMetaParsed }
20 |   | { type: 'event'; event: ResponseItemParsed }
21 |   | { type: 'fail'; error: ParserError }
22 |   | { type: 'done' };
23 | 
24 | const initialState: State = {
25 |   phase: 'idle',
26 |   events: [],
27 |   ok: 0,
28 |   fail: 0,
29 | };
30 | 
31 | function reducer(state: State, action: Action): State {
32 |   switch (action.type) {
33 |     case 'reset':
34 |       return { ...initialState };
35 |     case 'start':
36 |       return { ...initialState, phase: 'parsing' };
37 |     case 'meta':
38 |       return { ...state, meta: action.meta };
39 |     case 'event':
40 |       return {
41 |         ...state,
42 |         ok: state.ok + 1,
43 |         events: [...state.events, action.event],
44 |       };
45 |     case 'fail':
46 |       return {
47 |         ...state,
48 |         fail: state.fail + 1,
49 |         lastError: action.error,
50 |       };
51 |     case 'done':
52 |       return {
53 |         ...state,
54 |         phase: state.fail > 0 ? 'error' : 'success',
55 |       };
56 |     default:
57 |       return state;
58 |   }
59 | }
60 | 
61 | export function useFileLoader() {
62 |   const [state, dispatch] = useReducer(reducer, initialState);
63 | 
64 |   const start = useCallback(
65 |     async (file: File) => {
66 |       dispatch({ type: 'start' });
67 |       try {
68 |         for await (const item of streamParseSession(file)) {
69 |           if (item.kind === 'meta') {
70 |             dispatch({ type: 'meta', meta: item.meta });
71 |           } else if (item.kind === 'event') {
72 |             dispatch({ type: 'event', event: item.event });
73 |           } else if (item.kind === 'error') {
74 |             dispatch({ type: 'fail', error: item.error });
75 |           }
76 |         }
77 |         dispatch({ type: 'done' });
78 |       } catch (error) {
79 |         dispatch({
80 |           type: 'fail',
81 |           error: {
82 |             line: -1,
83 |             reason: 'invalid_schema',
84 |             message: error instanceof Error ? error.message : 'Unknown error',
85 |             raw: '',
86 |           },
87 |         });
88 |         dispatch({ type: 'done' });
89 |       }
90 |     },
91 |     [dispatch]
92 |   );
93 | 
94 |   const reset = useCallback(() => dispatch({ type: 'reset' }), []);
95 | 
96 |   const progress = useMemo(() => {
97 |     const total = state.ok + state.fail;
98 |     return { ok: state.ok, fail: state.fail, total };
99 |   }, [state.ok, state.fail]);
100 | 
101 |   return { state, progress, start, reset };
102 | }
103 | 
104 | export type FileLoaderHook = ReturnType<typeof useFileLoader>;
```

src/hooks/useSessionStorage.ts
```
1 | import * as React from 'react';
2 | 
3 | export function useSessionStorage<T>(key: string, initialValue: T) {
4 |   const state = React.useState<T>(() => {
5 |     const stored = sessionStorage.getItem(key);
6 |     return stored ? JSON.parse(stored) : initialValue;
7 |   });
8 | 
9 |   React.useEffect(() => {
10 |     sessionStorage.setItem(key, JSON.stringify(state[0]));
11 |   }, [state[0]]);
12 | 
13 |   return state;
14 | }
```

src/lib/theme.ts
```
1 | import { createServerFn } from "@tanstack/react-start"
2 | import { getCookie, setCookie } from "@tanstack/react-start/server"
3 | 
4 | export type Theme = "light" | "dark" | "system"
5 | const COOKIE = "vite-ui-theme"
6 | 
7 | /** Read the theme for *this* request */
8 | export const getTheme = createServerFn().handler(async () => {
9 |     const raw = getCookie(COOKIE)
10 |     return raw === "light" || raw === "dark" || raw === "system" ? (raw as Theme) : "system"
11 | })
12 | 
13 | /** Persist a new theme (POST from the client) */
14 | export const setTheme = createServerFn({ method: "POST" })
15 |     .inputValidator((data: unknown): Theme => {
16 |         if (data !== "light" && data !== "dark" && data !== "system") {
17 |             throw new Error("theme must be light | dark | system")
18 |         }
19 |         return data
20 |     })
21 |     .handler(async ({ data }) => {
22 |         setCookie(COOKIE, data, { path: "/", maxAge: 60 * 60 * 24 * 365 })
23 |     })
```

src/lib/utils.ts
```
1 | import { type ClassValue, clsx } from "clsx"
2 | import { twMerge } from "tailwind-merge"
3 | 
4 | export function cn(...inputs: ClassValue[]) {
5 |     return twMerge(clsx(inputs))
6 | }
```

src/lib/viewerDiscovery.ts
```
1 | export interface DiscoveredSessionAsset {
2 |   path: string;
3 |   url: string;
4 |   sortKey?: number;
5 |   tags?: readonly string[];
6 | }
7 | export interface ProjectDiscoverySnapshot {
8 |   projectFiles: string[];
9 |   sessionAssets: DiscoveredSessionAsset[];
10 | }
11 | function isIgnoredPath(path: string) {
12 |   return (
13 |     /\/(?:__tests__|__mocks__)\//.test(path) || /\.(?:test|spec|stories)\.[a-z0-9]+$/i.test(path)
14 |   );
15 | }
16 | function normalizePaths(raw: string[]) {
17 |   return Array.from(
18 |     new Set(
19 |       raw
20 |         .filter((p) => /\.[a-z0-9]+$/i.test(p))
21 |         .filter((p) => !p.endsWith('.map'))
22 |         .filter((p) => !p.endsWith('.d.ts'))
23 |         .filter((p) => !isIgnoredPath(p))
24 |         .map((p) => p.replace(/^\//, ''))
25 |     )
26 |   ).sort();
27 | }
28 | function extractSortKeyFromPath(path: string) {
29 |   const dateMatch = path.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
30 |   if (dateMatch) {
31 |     const year = Number(dateMatch[1]);
32 |     const month = Number(dateMatch[2]);
33 |     const day = Number(dateMatch[3]);
34 |     if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
35 |       return Date.UTC(year, month - 1, day);
36 |     }
37 |   }
38 |   const epochMatch = path.match(/(1\d{9}|2\d{9})/);
39 |   if (epochMatch) {
40 |     return Number(epochMatch[1]) * 1000;
41 |   }
42 |   return 0;
43 | }
44 | /**
45 |  * Build-time discovery of project files and session assets.
46 |  * Runs inside route loaders (rule: fetch on navigation vs. useEffect).
47 |  */
48 | export function discoverProjectAssets(): ProjectDiscoverySnapshot {
49 |   const codeGlobs = import.meta.glob([
50 |     '/src/**/*',
51 |     '/scripts/**/*',
52 |     '/public/**/*',
53 |     '/package.json',
54 |     '/tsconfig.json',
55 |     '!/src/**/__tests__/**',
56 |     '!/src/**/__mocks__/**',
57 |     '!/src/**/*.test.{ts,tsx,js,jsx}',
58 |     '!/src/**/*.spec.{ts,tsx,js,jsx}',
59 |     '!/src/**/*.stories.{ts,tsx,js,jsx}',
60 |   ]);
61 |   const docAssets = import.meta.glob(['/README*', '/AGENTS.md'], {
62 |     eager: true,
63 |     query: '?url',
64 |     import: 'default',
65 |   }) as Record<string, string>;
66 |   const projectFiles = normalizePaths([...Object.keys(codeGlobs), ...Object.keys(docAssets)]);
67 |   const sessionMatches = import.meta.glob(
68 |     [
69 |       '/.codex/sessions/**/*.{jsonl,ndjson,json}',
70 |       '/sessions/**/*.{jsonl,ndjson,json}',
71 |       '/artifacts/sessions/**/*.{jsonl,ndjson,json}',
72 |     ],
73 |     {
74 |       eager: true,
75 |       query: '?url',
76 |       import: 'default',
77 |     }
78 |   ) as Record<string, string>;
79 |   const sessionAssets: DiscoveredSessionAsset[] = Object.entries(sessionMatches)
80 |     .map(([path, url]) => ({
81 |       path: path.replace(/^\//, ''),
82 |       url,
83 |       sortKey: extractSortKeyFromPath(path),
84 |     }))
85 |     .sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0) || a.path.localeCompare(b.path));
86 |   return { projectFiles, sessionAssets };
87 | }
```

src/routes/CLAUDE.md
```
1 | 
2 | 
3 | <!-- Source: .ruler/tanstack-server-routes.md -->
4 | 
5 | # Server Routes — TanStack Start
6 | 
7 | Server HTTP endpoints for requests, forms, auth. Location: ./src/routes. Export Route to create API route. ServerRoute and Route can coexist in same file.
8 | 
9 | Routing mirrors TanStack Router: dynamic $id, splat $, escaped [.], nested dirs/dotted filenames map to paths. One handler per resolved path (duplicates error). Examples: users.ts → /users; users/$id.ts → /users/$id; api/file/$.ts → /api/file/$; my-script[.]js.ts → /my-script.js.
10 | 
11 | Middleware: pathless layout routes add group middleware; break-out routes skip parents.
12 | 
13 | RC1 server entry signature: export default { fetch(req: Request): Promise<Response> { ... } }
14 | 
15 | Define handlers: use createFileRoute() from @tanstack/react-router with server: { handlers: { ... } }. Methods per HTTP verb, with optional middleware builder. createServerFileRoute removed in RC1; use createFileRoute with server property.
16 | 
17 | Handler receives { request, params, context }; return Response or Promise<Response>. Helpers from @tanstack/react-start allowed.
18 | 
19 | Bodies: request.json(), request.text(), request.formData() for POST/PUT/PATCH/DELETE.
20 | 
21 | JSON/status/headers: return JSON manually or via json(); set status via Response init or setResponseStatus(); set headers via Response init or setHeaders().
22 | 
23 | Params: /users/$id → params.id; /users/$id/posts/$postId → params.id + params.postId; /file/$ → params._splat.
24 | 
25 | Unique path rule: one file per resolved path; users.ts vs users.index.ts vs users/index.ts conflicts.
26 | 
27 | RC1 structure:
28 | ```typescript
29 | import { createFileRoute } from '@tanstack/react-router'
30 | 
31 | export const Route = createFileRoute('/api/example')({
32 |   server: {
33 |     handlers: {
34 |       GET: ({ request }) => new Response('Hello'),
35 |       POST: ({ request }) => new Response('Created', { status: 201 })
36 |     }
37 |   }
38 | })
39 | ```
```

src/routes/__root.tsx
```
1 | import type { QueryClient } from "@tanstack/react-query"
2 | import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
3 | import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router"
4 | import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
5 | import type * as React from "react"
6 | import { Toaster } from "sonner"
7 | import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary"
8 | import { NotFound } from "~/components/NotFound"
9 | import { ThemeInitScript } from "~/components/theme-init-script"
10 | import { ThemeProvider } from "~/components/theme-provider"
11 | import { getTheme } from "~/lib/theme"
12 | import type { Theme } from "~/lib/theme"
13 | import { seo } from "~/utils/seo"
14 | import appCss from "../styles/app.css?url"
15 | import customCss from "../styles/custom.css?url"
16 | 
17 | export const Route = createRootRouteWithContext<{
18 |     queryClient: QueryClient
19 | }>()({
20 |     loader: () => getTheme(),
21 |     head: () => ({
22 |         meta: [
23 |             {
24 |                 charSet: "utf-8"
25 |             },
26 |             {
27 |                 name: "viewport",
28 |                 content: "width=device-width, initial-scale=1"
29 |             },
30 |             ...seo({
31 |                 title: "Instructa Start",
32 |                 description: "Instructa App Starter"
33 |             })
34 |         ],
35 |         links: [
36 |             {
37 |                 rel: "stylesheet",
38 |                 href: appCss
39 |             },
40 |             {
41 |                 rel: "stylesheet",
42 |                 href: customCss
43 |             },
44 |             {
45 |                 rel: "apple-touch-icon",
46 |                 sizes: "180x180",
47 |                 href: "/apple-touch-icon.png"
48 |             },
49 |             {
50 |                 rel: "icon",
51 |                 type: "image/png",
52 |                 sizes: "32x32",
53 |                 href: "/favicon-32x32.png"
54 |             },
55 |             {
56 |                 rel: "icon",
57 |                 type: "image/png",
58 |                 sizes: "16x16",
59 |                 href: "/favicon-16x16.png"
60 |             },
61 |             { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
62 |             { rel: "icon", href: "/favicon.ico" }
63 |         ]
64 |     }),
65 |     errorComponent: (props) => {
66 |         return (
67 |             <RootDocument>
68 |                 <DefaultCatchBoundary {...props} />
69 |             </RootDocument>
70 |         )
71 |     },
72 |     notFoundComponent: () => <NotFound />,
73 |     component: RootComponent
74 | })
75 | 
76 | function RootComponent() {
77 |     return (
78 |         <RootDocument>
79 |             <Outlet />
80 |             {import.meta.env.DEV ? (
81 |                 <>
82 |                     <ReactQueryDevtools buttonPosition="bottom-right" />
83 |                     <TanStackRouterDevtools />
84 |                 </>
85 |             ) : null}
86 |         </RootDocument>
87 |     )
88 | }
89 | 
90 | function RootDocument({ children }: { children: React.ReactNode }) {
91 |     const initial = Route.useLoaderData() as Theme
92 |     return (
93 |         <html lang="en" className={initial === "system" ? "" : initial}>
94 |             <head>
95 |                 <ThemeInitScript />
96 |                 <HeadContent />
97 |             </head>
98 |             <body className="">
99 |                 <ThemeProvider initial={initial}>
100 |                     <div className="flex min-h-svh flex-col">{children}</div>
101 |                     <Toaster />
102 |                 </ThemeProvider>
103 |                 <Scripts />
104 |             </body>
105 |         </html>
106 |     )
107 | }
```

src/styles/app.css
```
1 | @import "tailwindcss";
2 | @import "tw-animate-css";
3 | 
4 | @custom-variant dark (&:is(.dark *));
5 | :root {
6 |     --background: oklch(1.0 0 0);
7 |     --foreground: oklch(0.19 0.01 248.51);
8 |     --card: oklch(0.98 0.0 197.14);
9 |     --card-foreground: oklch(0.19 0.01 248.51);
10 |     --popover: oklch(1.0 0 0);
11 |     --popover-foreground: oklch(0.19 0.01 248.51);
12 |     --primary: oklch(0.67 0.16 245.0);
13 |     --primary-foreground: oklch(1.0 0 0);
14 |     --secondary: oklch(0.19 0.01 248.51);
15 |     --secondary-foreground: oklch(1.0 0 0);
16 |     --muted: oklch(0.92 0.0 286.37);
17 |     --muted-foreground: oklch(0.19 0.01 248.51);
18 |     --accent: oklch(0.94 0.02 250.85);
19 |     --accent-foreground: oklch(0.67 0.16 245.0);
20 |     --destructive: oklch(0.62 0.24 25.77);
21 |     --destructive-foreground: oklch(1.0 0 0);
22 |     --border: oklch(0.93 0.01 231.66);
23 |     --input: oklch(0.98 0.0 228.78);
24 |     --ring: oklch(0.68 0.16 243.35);
25 |     --chart-1: oklch(0.67 0.16 245.0);
26 |     --chart-2: oklch(0.69 0.16 160.35);
27 |     --chart-3: oklch(0.82 0.16 82.53);
28 |     --chart-4: oklch(0.71 0.18 151.71);
29 |     --chart-5: oklch(0.59 0.22 10.58);
30 |     --sidebar: oklch(0.98 0.0 197.14);
31 |     --sidebar-foreground: oklch(0.19 0.01 248.51);
32 |     --sidebar-primary: oklch(0.67 0.16 245.0);
33 |     --sidebar-primary-foreground: oklch(1.0 0 0);
34 |     --sidebar-accent: oklch(0.94 0.02 250.85);
35 |     --sidebar-accent-foreground: oklch(0.67 0.16 245.0);
36 |     --sidebar-border: oklch(0.93 0.01 238.52);
37 |     --sidebar-ring: oklch(0.68 0.16 243.35);
38 |     --font-sans: Open Sans, sans-serif;
39 |     --font-serif: Georgia, serif;
40 |     --font-mono: Menlo, monospace;
41 |     --radius: 1.3rem;
42 |     --shadow-2xs: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0);
43 |     --shadow-xs: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0);
44 |     --shadow-sm: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 1px 2px -1px
45 |         hsl(202.82 89.12% 53.14% / 0.0);
46 |     --shadow: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 1px 2px -1px
47 |         hsl(202.82 89.12% 53.14% / 0.0);
48 |     --shadow-md: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 2px 4px -1px
49 |         hsl(202.82 89.12% 53.14% / 0.0);
50 |     --shadow-lg: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 4px 6px -1px
51 |         hsl(202.82 89.12% 53.14% / 0.0);
52 |     --shadow-xl: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 8px 10px -1px
53 |         hsl(202.82 89.12% 53.14% / 0.0);
54 |     --shadow-2xl: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0);
55 | }
56 | 
57 | .dark {
58 |     --background: oklch(0 0 0);
59 |     --foreground: oklch(0.93 0.0 228.79);
60 |     --card: oklch(0.21 0.01 274.53);
61 |     --card-foreground: oklch(0.89 0 0);
62 |     --popover: oklch(0 0 0);
63 |     --popover-foreground: oklch(0.93 0.0 228.79);
64 |     --primary: oklch(0.67 0.16 245.01);
65 |     --primary-foreground: oklch(1.0 0 0);
66 |     --secondary: oklch(0.96 0.0 219.53);
67 |     --secondary-foreground: oklch(0.19 0.01 248.51);
68 |     --muted: oklch(0.21 0 0);
69 |     --muted-foreground: oklch(0.56 0.01 247.97);
70 |     --accent: oklch(0.19 0.03 242.55);
71 |     --accent-foreground: oklch(0.67 0.16 245.01);
72 |     --destructive: oklch(0.62 0.24 25.77);
73 |     --destructive-foreground: oklch(1.0 0 0);
74 |     --border: oklch(0.27 0.0 248.0);
75 |     --input: oklch(0.3 0.03 244.82);
76 |     --ring: oklch(0.68 0.16 243.35);
77 |     --chart-1: oklch(0.67 0.16 245.0);
78 |     --chart-2: oklch(0.69 0.16 160.35);
79 |     --chart-3: oklch(0.82 0.16 82.53);
80 |     --chart-4: oklch(0.71 0.18 151.71);
81 |     --chart-5: oklch(0.59 0.22 10.58);
82 |     --sidebar: oklch(0.21 0.01 274.53);
83 |     --sidebar-foreground: oklch(0.89 0 0);
84 |     --sidebar-primary: oklch(0.68 0.16 243.35);
85 |     --sidebar-primary-foreground: oklch(1.0 0 0);
86 |     --sidebar-accent: oklch(0.19 0.03 242.55);
87 |     --sidebar-accent-foreground: oklch(0.67 0.16 245.01);
88 |     --sidebar-border: oklch(0.38 0.02 240.59);
89 |     --sidebar-ring: oklch(0.68 0.16 243.35);
90 |     --font-sans: Open Sans, sans-serif;
91 |     --font-serif: Georgia, serif;
92 |     --font-mono: Menlo, monospace;
93 |     --radius: 1.3rem;
94 |     --shadow-2xs: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0);
95 |     --shadow-xs: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0);
96 |     --shadow-sm: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 1px 2px -1px
97 |         hsl(202.82 89.12% 53.14% / 0.0);
98 |     --shadow: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 1px 2px -1px
99 |         hsl(202.82 89.12% 53.14% / 0.0);
100 |     --shadow-md: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 2px 4px -1px
101 |         hsl(202.82 89.12% 53.14% / 0.0);
102 |     --shadow-lg: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 4px 6px -1px
103 |         hsl(202.82 89.12% 53.14% / 0.0);
104 |     --shadow-xl: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0), 0px 8px 10px -1px
105 |         hsl(202.82 89.12% 53.14% / 0.0);
106 |     --shadow-2xl: 0px 2px 0px 0px hsl(202.82 89.12% 53.14% / 0.0);
107 | }
108 | 
109 | @theme inline {
110 |     --color-background: var(--background);
111 |     --color-foreground: var(--foreground);
112 |     --color-card: var(--card);
113 |     --color-card-foreground: var(--card-foreground);
114 |     --color-popover: var(--popover);
115 |     --color-popover-foreground: var(--popover-foreground);
116 |     --color-primary: var(--primary);
117 |     --color-primary-foreground: var(--primary-foreground);
118 |     --color-secondary: var(--secondary);
119 |     --color-secondary-foreground: var(--secondary-foreground);
120 |     --color-muted: var(--muted);
121 |     --color-muted-foreground: var(--muted-foreground);
122 |     --color-accent: var(--accent);
123 |     --color-accent-foreground: var(--accent-foreground);
124 |     --color-destructive: var(--destructive);
125 |     --color-destructive-foreground: var(--destructive-foreground);
126 |     --color-border: var(--border);
127 |     --color-input: var(--input);
128 |     --color-ring: var(--ring);
129 |     --color-chart-1: var(--chart-1);
130 |     --color-chart-2: var(--chart-2);
131 |     --color-chart-3: var(--chart-3);
132 |     --color-chart-4: var(--chart-4);
133 |     --color-chart-5: var(--chart-5);
134 |     --color-sidebar: var(--sidebar);
135 |     --color-sidebar-foreground: var(--sidebar-foreground);
136 |     --color-sidebar-primary: var(--sidebar-primary);
137 |     --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
138 |     --color-sidebar-accent: var(--sidebar-accent);
139 |     --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
140 |     --color-sidebar-border: var(--sidebar-border);
141 |     --color-sidebar-ring: var(--sidebar-ring);
142 | 
143 |     --font-sans: var(--font-sans);
144 |     --font-mono: var(--font-mono);
145 |     --font-serif: var(--font-serif);
146 | 
147 |     --radius-sm: calc(var(--radius) - 4px);
148 |     --radius-md: calc(var(--radius) - 2px);
149 |     --radius-lg: var(--radius);
150 |     --radius-xl: calc(var(--radius) + 4px);
151 | 
152 |     --shadow-2xs: var(--shadow-2xs);
153 |     --shadow-xs: var(--shadow-xs);
154 |     --shadow-sm: var(--shadow-sm);
155 |     --shadow: var(--shadow);
156 |     --shadow-md: var(--shadow-md);
157 |     --shadow-lg: var(--shadow-lg);
158 |     --shadow-xl: var(--shadow-xl);
159 |     --shadow-2xl: var(--shadow-2xl);
160 | }
161 | @layer base {
162 |     * {
163 |         @apply border-border outline-ring/50;
164 |     }
165 |     body {
166 |         @apply bg-background text-foreground;
167 |     }
168 | }
```

src/styles/custom.css
```
1 | :root {
2 |   --radius: 0.65rem;
3 |   --background: oklch(1 0 0);
4 |   --foreground: oklch(0.141 0.005 285.823);
5 |   --card: oklch(1 0 0);
6 |   --card-foreground: oklch(0.141 0.005 285.823);
7 |   --popover: oklch(1 0 0);
8 |   --popover-foreground: oklch(0.141 0.005 285.823);
9 |   --primary: oklch(0.648 0.2 131.684);
10 |   --primary-foreground: oklch(0.986 0.031 120.757);
11 |   --secondary: oklch(0.967 0.001 286.375);
12 |   --secondary-foreground: oklch(0.21 0.006 285.885);
13 |   --muted: oklch(0.967 0.001 286.375);
14 |   --muted-foreground: oklch(0.552 0.016 285.938);
15 |   --accent: oklch(0.967 0.001 286.375);
16 |   --accent-foreground: oklch(0.21 0.006 285.885);
17 |   --destructive: oklch(0.577 0.245 27.325);
18 |   --border: oklch(0.92 0.004 286.32);
19 |   --input: oklch(0.92 0.004 286.32);
20 |   --ring: oklch(0.841 0.238 128.85);
21 |   --chart-1: oklch(0.871 0.15 154.449);
22 |   --chart-2: oklch(0.723 0.219 149.579);
23 |   --chart-3: oklch(0.627 0.194 149.214);
24 |   --chart-4: oklch(0.527 0.154 150.069);
25 |   --chart-5: oklch(0.448 0.119 151.328);
26 |   --sidebar: oklch(0.985 0 0);
27 |   --sidebar-foreground: oklch(0.141 0.005 285.823);
28 |   --sidebar-primary: oklch(0.648 0.2 131.684);
29 |   --sidebar-primary-foreground: oklch(0.986 0.031 120.757);
30 |   --sidebar-accent: oklch(0.967 0.001 286.375);
31 |   --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
32 |   --sidebar-border: oklch(0.92 0.004 286.32);
33 |   --sidebar-ring: oklch(0.841 0.238 128.85);
34 | }
35 | 
36 | .dark {
37 |   --background: oklch(0.141 0.005 285.823);
38 |   --foreground: oklch(0.985 0 0);
39 |   --card: oklch(0.21 0.006 285.885);
40 |   --card-foreground: oklch(0.985 0 0);
41 |   --popover: oklch(0.21 0.006 285.885);
42 |   --popover-foreground: oklch(0.985 0 0);
43 |   --primary: oklch(0.648 0.2 131.684);
44 |   --primary-foreground: oklch(0.986 0.031 120.757);
45 |   --secondary: oklch(0.274 0.006 286.033);
46 |   --secondary-foreground: oklch(0.985 0 0);
47 |   --muted: oklch(0.274 0.006 286.033);
48 |   --muted-foreground: oklch(0.705 0.015 286.067);
49 |   --accent: oklch(0.274 0.006 286.033);
50 |   --accent-foreground: oklch(0.985 0 0);
51 |   --destructive: oklch(0.704 0.191 22.216);
52 |   --border: oklch(1 0 0 / 10%);
53 |   --input: oklch(1 0 0 / 15%);
54 |   --ring: oklch(0.405 0.101 131.063);
55 |   --chart-1: oklch(0.871 0.15 154.449);
56 |   --chart-2: oklch(0.723 0.219 149.579);
57 |   --chart-3: oklch(0.627 0.194 149.214);
58 |   --chart-4: oklch(0.527 0.154 150.069);
59 |   --chart-5: oklch(0.448 0.119 151.328);
60 |   --sidebar: oklch(0.21 0.006 285.885);
61 |   --sidebar-foreground: oklch(0.985 0 0);
62 |   --sidebar-primary: oklch(0.768 0.233 130.85);
63 |   --sidebar-primary-foreground: oklch(0.986 0.031 120.757);
64 |   --sidebar-accent: oklch(0.274 0.006 286.033);
65 |   --sidebar-accent-foreground: oklch(0.985 0 0);
66 |   --sidebar-border: oklch(1 0 0 / 10%);
67 |   --sidebar-ring: oklch(0.405 0.101 131.063);
68 | }
```

src/types/browser-echo.d.ts
```
1 | declare module 'virtual:browser-echo';
```

src/utils/event-key.ts
```
1 | import type { ResponseItem } from '../types';
2 | 
3 | export function eventKey(item: ResponseItem, absoluteIndex: number): string {
4 |   const anyItem = item as any;
5 |   if (anyItem?.id) return String(anyItem.id);
6 |   if (typeof anyItem?.index === 'number') return `idx-${anyItem.index}`;
7 |   return `idx-${absoluteIndex}`;
8 | }
```

src/utils/id-generator.ts
```
1 | import { randomUUID } from 'node:crypto';
2 | 
3 | const prefixes = {
4 |     files: 'file',
5 |     user: 'user',
6 | } as const;
7 | 
8 | export const generateId = (prefix: keyof typeof prefixes | string) => {
9 |     const resolvedPrefix = (prefix in prefixes) ? prefixes[prefix as keyof typeof prefixes] : prefix;
10 |     return `${resolvedPrefix}_${randomUUID()}`;
11 | }
```

src/utils/line-reader.ts
```
1 | export function splitLinesTransform(): TransformStream<string, string> {
2 |   let carry = '';
3 |   return new TransformStream<string, string>({
4 |     transform(chunk, controller) {
5 |       const text = carry + chunk;
6 |       const parts = text.split(/\n/);
7 |       carry = parts.pop() ?? '';
8 |       for (const line of parts) {
9 |         controller.enqueue(line.endsWith('\r') ? line.slice(0, -1) : line);
10 |       }
11 |     },
12 |     flush(controller) {
13 |       if (carry.length > 0) {
14 |         controller.enqueue(carry.endsWith('\r') ? carry.slice(0, -1) : carry);
15 |       }
16 |     },
17 |   });
18 | }
19 | 
20 | async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
21 |   if (typeof (blob as any).arrayBuffer === 'function') {
22 |     return blob.arrayBuffer();
23 |   }
24 |   if (typeof FileReader !== 'undefined') {
25 |     return new Promise<ArrayBuffer>((resolve, reject) => {
26 |       const reader = new FileReader();
27 |       reader.onerror = () => reject(reader.error);
28 |       reader.onload = () => resolve(reader.result as ArrayBuffer);
29 |       reader.readAsArrayBuffer(blob);
30 |     });
31 |   }
32 |   if (typeof (blob as any).text === 'function') {
33 |     const text = await blob.text();
34 |     return new TextEncoder().encode(text).buffer;
35 |   }
36 |   return new ArrayBuffer(0);
37 | }
38 | 
39 | function getBlobStream(blob: Blob): ReadableStream<Uint8Array> {
40 |   if (typeof (blob as any).stream === 'function') {
41 |     return (blob as any).stream();
42 |   }
43 |   return new ReadableStream<Uint8Array>({
44 |     async start(controller) {
45 |       try {
46 |         const buffer = await readBlobAsArrayBuffer(blob);
47 |         controller.enqueue(new Uint8Array(buffer));
48 |         controller.close();
49 |       } catch (error) {
50 |         controller.error(error);
51 |       }
52 |     },
53 |   });
54 | }
55 | 
56 | export async function* streamTextLines(blob: Blob, encoding = 'utf-8'): AsyncGenerator<string> {
57 |   const hasDecoderStream = typeof (globalThis as any).TextDecoderStream === 'function';
58 | 
59 |   if (hasDecoderStream) {
60 |     const decoded = getBlobStream(blob)
61 |       // @ts-ignore TextDecoderStream exists in modern runtimes; fallback below otherwise.
62 |       .pipeThrough(new TextDecoderStream(encoding))
63 |       .pipeThrough(splitLinesTransform());
64 | 
65 |     for await (const line of decoded as any as AsyncIterable<string>) {
66 |       yield line;
67 |     }
68 |     return;
69 |   }
70 | 
71 |   const reader = getBlobStream(blob).getReader();
72 |   const decoder = new TextDecoder(encoding);
73 |   let carry = '';
74 |   try {
75 |     for (;;) {
76 |       const { value, done } = await reader.read();
77 |       if (done) break;
78 |       const chunk = decoder.decode(value, { stream: true });
79 |       const text = carry + chunk;
80 |       const parts = text.split(/\n/);
81 |       carry = parts.pop() ?? '';
82 |       for (const line of parts) {
83 |         yield line.endsWith('\r') ? line.slice(0, -1) : line;
84 |       }
85 |     }
86 |     const last = decoder.decode();
87 |     if (last) {
88 |       const text = carry + last;
89 |       const parts = text.split(/\n/);
90 |       carry = parts.pop() ?? '';
91 |       for (const line of parts) {
92 |         yield line.endsWith('\r') ? line.slice(0, -1) : line;
93 |       }
94 |     }
95 |     if (carry.length) {
96 |       yield carry.endsWith('\r') ? carry.slice(0, -1) : carry;
97 |     }
98 |   } finally {
99 |     reader.releaseLock();
100 |   }
101 | }
```

src/utils/seo.ts
```
1 | export const seo = ({
2 |     title,
3 |     description,
4 |     keywords,
5 |     image
6 | }: {
7 |     title: string
8 |     description?: string
9 |     image?: string
10 |     keywords?: string
11 | }) => {
12 |     const tags = [
13 |       { title },
14 |       { name: 'description', content: description },
15 |       { name: 'keywords', content: keywords },
16 |       { name: 'twitter:title', content: title },
17 |       { name: 'twitter:description', content: description },
18 |       { name: 'twitter:creator', content: '@d1rt7d4t4' },
19 |       { name: 'twitter:site', content: '@d1rt7d4t4' },
20 |       { name: 'og:type', content: 'website' },
21 |       { name: 'og:title', content: title },
22 |       { name: 'og:description', content: description },
23 |       ...(image
24 |         ? [
25 |             { name: 'twitter:image', content: image },
26 |             { name: 'twitter:card', content: 'summary_large_image' },
27 |             { name: 'og:image', content: image },
28 |           ]
29 |         : []),
30 |     ];
31 | 
32 |     return tags
33 | }
```

src/db/schema/CLAUDE.md
```
1 | 
2 | 
3 | <!-- Source: .ruler/db.schema.md -->
4 | 
5 | - Schema files have always this naming pattern `<name>.schema.ts`
```

src/components/ui/badge.tsx
```
1 | import { cva, type VariantProps } from 'class-variance-authority';
2 | import type { HTMLAttributes } from 'react';
3 | import { cn } from '~/lib/utils';
4 | 
5 | const badgeVariants = cva(
6 |   'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
7 |   {
8 |     variants: {
9 |       variant: {
10 |         default: 'border-transparent bg-primary text-primary-foreground',
11 |         secondary: 'border-transparent bg-secondary text-secondary-foreground',
12 |         outline: 'border-border text-foreground',
13 |       },
14 |     },
15 |     defaultVariants: {
16 |       variant: 'default',
17 |     },
18 |   }
19 | );
20 | 
21 | export interface BadgeProps
22 |   extends HTMLAttributes<HTMLDivElement>,
23 |     VariantProps<typeof badgeVariants> {}
24 | 
25 | export function Badge({ className, variant, ...props }: BadgeProps) {
26 |   return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
27 | }
```

src/components/ui/button.tsx
```
1 | import * as React from "react"
2 | import { Slot } from "@radix-ui/react-slot"
3 | import { cva, type VariantProps } from "class-variance-authority"
4 | 
5 | import { cn } from "~/lib/utils"
6 | 
7 | const buttonVariants = cva(
8 |   "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
9 |   {
10 |     variants: {
11 |       variant: {
12 |         default:
13 |           "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
14 |         destructive:
15 |           "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
16 |         outline:
17 |           "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
18 |         secondary:
19 |           "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
20 |         ghost:
21 |           "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
22 |         link: "text-primary underline-offset-4 hover:underline",
23 |       },
24 |       size: {
25 |         default: "h-9 px-4 py-2 has-[>svg]:px-3",
26 |         sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
27 |         lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
28 |         icon: "size-9",
29 |       },
30 |     },
31 |     defaultVariants: {
32 |       variant: "default",
33 |       size: "default",
34 |     },
35 |   }
36 | )
37 | 
38 | function Button({
39 |   className,
40 |   variant,
41 |   size,
42 |   asChild = false,
43 |   ...props
44 | }: React.ComponentProps<"button"> &
45 |   VariantProps<typeof buttonVariants> & {
46 |     asChild?: boolean
47 |   }) {
48 |   const Comp = asChild ? Slot : "button"
49 | 
50 |   return (
51 |     <Comp
52 |       data-slot="button"
53 |       className={cn(buttonVariants({ variant, size, className }))}
54 |       {...props}
55 |     />
56 |   )
57 | }
58 | 
59 | export { Button, buttonVariants }
```

src/components/ui/card.tsx
```
1 | import * as React from "react"
2 | 
3 | import { cn } from "~/lib/utils"
4 | 
5 | function Card({ className, ...props }: React.ComponentProps<"div">) {
6 |   return (
7 |     <div
8 |       data-slot="card"
9 |       className={cn(
10 |         "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
11 |         className
12 |       )}
13 |       {...props}
14 |     />
15 |   )
16 | }
17 | 
18 | function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
19 |   return (
20 |     <div
21 |       data-slot="card-header"
22 |       className={cn(
23 |         "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
24 |         className
25 |       )}
26 |       {...props}
27 |     />
28 |   )
29 | }
30 | 
31 | function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
32 |   return (
33 |     <div
34 |       data-slot="card-title"
35 |       className={cn("leading-none font-semibold", className)}
36 |       {...props}
37 |     />
38 |   )
39 | }
40 | 
41 | function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
42 |   return (
43 |     <div
44 |       data-slot="card-description"
45 |       className={cn("text-muted-foreground text-sm", className)}
46 |       {...props}
47 |     />
48 |   )
49 | }
50 | 
51 | function CardAction({ className, ...props }: React.ComponentProps<"div">) {
52 |   return (
53 |     <div
54 |       data-slot="card-action"
55 |       className={cn(
56 |         "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
57 |         className
58 |       )}
59 |       {...props}
60 |     />
61 |   )
62 | }
63 | 
64 | function CardContent({ className, ...props }: React.ComponentProps<"div">) {
65 |   return (
66 |     <div
67 |       data-slot="card-content"
68 |       className={cn("px-6", className)}
69 |       {...props}
70 |     />
71 |   )
72 | }
73 | 
74 | function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
75 |   return (
76 |     <div
77 |       data-slot="card-footer"
78 |       className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
79 |       {...props}
80 |     />
81 |   )
82 | }
83 | 
84 | export {
85 |   Card,
86 |   CardHeader,
87 |   CardFooter,
88 |   CardTitle,
89 |   CardAction,
90 |   CardDescription,
91 |   CardContent,
92 | }
```

src/components/ui/dropdown-menu.tsx
```
1 | import * as React from "react"
2 | import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
3 | import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
4 | 
5 | import { cn } from "~/lib/utils"
6 | 
7 | function DropdownMenu({
8 |   ...props
9 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
10 |   return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
11 | }
12 | 
13 | function DropdownMenuPortal({
14 |   ...props
15 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
16 |   return (
17 |     <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
18 |   )
19 | }
20 | 
21 | function DropdownMenuTrigger({
22 |   ...props
23 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
24 |   return (
25 |     <DropdownMenuPrimitive.Trigger
26 |       data-slot="dropdown-menu-trigger"
27 |       {...props}
28 |     />
29 |   )
30 | }
31 | 
32 | function DropdownMenuContent({
33 |   className,
34 |   sideOffset = 4,
35 |   ...props
36 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
37 |   return (
38 |     <DropdownMenuPrimitive.Portal>
39 |       <DropdownMenuPrimitive.Content
40 |         data-slot="dropdown-menu-content"
41 |         sideOffset={sideOffset}
42 |         className={cn(
43 |           "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
44 |           className
45 |         )}
46 |         {...props}
47 |       />
48 |     </DropdownMenuPrimitive.Portal>
49 |   )
50 | }
51 | 
52 | function DropdownMenuGroup({
53 |   ...props
54 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
55 |   return (
56 |     <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
57 |   )
58 | }
59 | 
60 | function DropdownMenuItem({
61 |   className,
62 |   inset,
63 |   variant = "default",
64 |   ...props
65 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
66 |   inset?: boolean
67 |   variant?: "default" | "destructive"
68 | }) {
69 |   return (
70 |     <DropdownMenuPrimitive.Item
71 |       data-slot="dropdown-menu-item"
72 |       data-inset={inset}
73 |       data-variant={variant}
74 |       className={cn(
75 |         "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
76 |         className
77 |       )}
78 |       {...props}
79 |     />
80 |   )
81 | }
82 | 
83 | function DropdownMenuCheckboxItem({
84 |   className,
85 |   children,
86 |   checked,
87 |   ...props
88 | }: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
89 |   return (
90 |     <DropdownMenuPrimitive.CheckboxItem
91 |       data-slot="dropdown-menu-checkbox-item"
92 |       className={cn(
93 |         "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
94 |         className
95 |       )}
96 |       checked={checked}
97 |       {...props}
98 |     >
99 |       <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
100 |         <DropdownMenuPrimitive.ItemIndicator>
101 |           <CheckIcon className="size-4" />
102 |         </DropdownMenuPrimitive.ItemIndicator>
103 |       </span>
104 |       {children}
105 |     </DropdownMenuPrimitive.CheckboxItem>
106 |   )
107 | }
108 | 
109 | function DropdownMenuRadioGroup({
110 |   ...props
111 | }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
112 |   return (
113 |     <DropdownMenuPrimitive.RadioGroup
114 |       data-slot="dropdown-menu-radio-group"
115 |       {...props}
116 |     />
117 |   )
118 | }
119 | 
120 | function DropdownMenuRadioItem({
121 |   className,
122 |   children,
123 |   ...props
124 | }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
125 |   return (
126 |     <DropdownMenuPrimitive.RadioItem
127 |       data-slot="dropdown-menu-radio-item"
128 |       className={cn(
129 |         "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
130 |         className
131 |       )}
132 |       {...props}
133 |     >
134 |       <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
135 |         <DropdownMenuPrimitive.ItemIndicator>
136 |           <CircleIcon className="size-2 fill-current" />
137 |         </DropdownMenuPrimitive.ItemIndicator>
138 |       </span>
139 |       {children}
140 |     </DropdownMenuPrimitive.RadioItem>
141 |   )
142 | }
143 | 
144 | function DropdownMenuLabel({
145 |   className,
146 |   inset,
147 |   ...props
148 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
149 |   inset?: boolean
150 | }) {
151 |   return (
152 |     <DropdownMenuPrimitive.Label
153 |       data-slot="dropdown-menu-label"
154 |       data-inset={inset}
155 |       className={cn(
156 |         "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
157 |         className
158 |       )}
159 |       {...props}
160 |     />
161 |   )
162 | }
163 | 
164 | function DropdownMenuSeparator({
165 |   className,
166 |   ...props
167 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
168 |   return (
169 |     <DropdownMenuPrimitive.Separator
170 |       data-slot="dropdown-menu-separator"
171 |       className={cn("bg-border -mx-1 my-1 h-px", className)}
172 |       {...props}
173 |     />
174 |   )
175 | }
176 | 
177 | function DropdownMenuShortcut({
178 |   className,
179 |   ...props
180 | }: React.ComponentProps<"span">) {
181 |   return (
182 |     <span
183 |       data-slot="dropdown-menu-shortcut"
184 |       className={cn(
185 |         "text-muted-foreground ml-auto text-xs tracking-widest",
186 |         className
187 |       )}
188 |       {...props}
189 |     />
190 |   )
191 | }
192 | 
193 | function DropdownMenuSub({
194 |   ...props
195 | }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
196 |   return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
197 | }
198 | 
199 | function DropdownMenuSubTrigger({
200 |   className,
201 |   inset,
202 |   children,
203 |   ...props
204 | }: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
205 |   inset?: boolean
206 | }) {
207 |   return (
208 |     <DropdownMenuPrimitive.SubTrigger
209 |       data-slot="dropdown-menu-sub-trigger"
210 |       data-inset={inset}
211 |       className={cn(
212 |         "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8",
213 |         className
214 |       )}
215 |       {...props}
216 |     >
217 |       {children}
218 |       <ChevronRightIcon className="ml-auto size-4" />
219 |     </DropdownMenuPrimitive.SubTrigger>
220 |   )
221 | }
222 | 
223 | function DropdownMenuSubContent({
224 |   className,
225 |   ...props
226 | }: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
227 |   return (
228 |     <DropdownMenuPrimitive.SubContent
229 |       data-slot="dropdown-menu-sub-content"
230 |       className={cn(
231 |         "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
232 |         className
233 |       )}
234 |       {...props}
235 |     />
236 |   )
237 | }
238 | 
239 | export {
240 |   DropdownMenu,
241 |   DropdownMenuPortal,
242 |   DropdownMenuTrigger,
243 |   DropdownMenuContent,
244 |   DropdownMenuGroup,
245 |   DropdownMenuLabel,
246 |   DropdownMenuItem,
247 |   DropdownMenuCheckboxItem,
248 |   DropdownMenuRadioGroup,
249 |   DropdownMenuRadioItem,
250 |   DropdownMenuSeparator,
251 |   DropdownMenuShortcut,
252 |   DropdownMenuSub,
253 |   DropdownMenuSubTrigger,
254 |   DropdownMenuSubContent,
255 | }
```

src/components/ui/textarea.tsx
```
1 | import * as React from 'react';
2 | import { cn } from '~/lib/utils';
3 | 
4 | const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
5 |   ({ className, ...props }, ref) => {
6 |     return (
7 |       <textarea
8 |         className={cn(
9 |           'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
10 |           className
11 |         )}
12 |         ref={ref}
13 |         {...props}
14 |       />
15 |     );
16 |   }
17 | );
18 | Textarea.displayName = 'Textarea';
19 | 
20 | export { Textarea };
```

src/components/viewer/ChatDock.tsx
```
1 | import { useCallback, useId, useState } from 'react';
2 | import { Button } from '~/components/ui/button';
3 | import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
4 | import { Textarea } from '~/components/ui/textarea';
5 | 
6 | interface ChatMessage {
7 |   id: string;
8 |   role: 'user' | 'assistant';
9 |   content: string;
10 | }
11 | 
12 | const makeId = () => {
13 |   if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
14 |     return crypto.randomUUID();
15 |   }
16 |   return Math.random().toString(36).slice(2);
17 | };
18 | 
19 | export function ChatDock() {
20 |   const [messages, setMessages] = useState<ChatMessage[]>([]);
21 |   const [draft, setDraft] = useState('');
22 |   const textareaId = useId();
23 | 
24 |   const send = useCallback(() => {
25 |     if (!draft.trim()) return;
26 |     setMessages((prev) => [
27 |       ...prev,
28 |       { id: makeId(), role: 'user', content: draft.trim() },
29 |       {
30 |         id: makeId(),
31 |         role: 'assistant',
32 |         content:
33 |           'Chat dock placeholder response. Wire up analyzer or sandbox to provide real answers.',
34 |       },
35 |     ]);
36 |     setDraft('');
37 |   }, [draft]);
38 | 
39 |   return (
40 |     <Card className="flex h-full flex-col gap-4">
41 |       <CardHeader className="border-b pb-4">
42 |         <CardTitle className="text-base font-semibold">Chat dock</CardTitle>
43 |       </CardHeader>
44 |       <CardContent className="flex flex-1 flex-col gap-4 p-4">
45 |         <div className="flex-1 space-y-3 overflow-auto rounded-md border bg-muted/30 p-3 text-sm">
46 |           {messages.length === 0 ? (
47 |             <p className="text-muted-foreground">
48 |               Send prompts to annotate the session as you review the timeline.
49 |             </p>
50 |           ) : (
51 |             messages.map((msg) => (
52 |               <div key={msg.id} className="space-y-1">
53 |                 <p className="text-xs uppercase tracking-wide text-muted-foreground">{msg.role}</p>
54 |                 <p className="rounded-md bg-background/70 p-2">{msg.content}</p>
55 |               </div>
56 |             ))
57 |           )}
58 |         </div>
59 |         <div className="space-y-2">
60 |           <label htmlFor={textareaId} className="text-xs font-medium text-muted-foreground">
61 |             Prompt
62 |           </label>
63 |           <Textarea
64 |             id={textareaId}
65 |             value={draft}
66 |             rows={3}
67 |             onChange={(event) => setDraft(event.target.value)}
68 |             placeholder="Summarize this session’s status…"
69 |           />
70 |           <div className="flex justify-end">
71 |             <Button onClick={send} disabled={!draft.trim()}>
72 |               Send
73 |             </Button>
74 |           </div>
75 |         </div>
76 |       </CardContent>
77 |     </Card>
78 |   );
79 | }
```

src/components/viewer/DiscoveryPanel.test.tsx
```
1 | import { fireEvent, render, screen } from '@testing-library/react';
2 | import { describe, expect, it, vi } from 'vitest';
3 | import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
4 | import { DiscoveryPanel } from './DiscoveryPanel';
5 | 
6 | const sampleSessions: DiscoveredSessionAsset[] = [
7 |   { path: 'sessions/alpha.jsonl', url: '/sessions/alpha.jsonl', sortKey: Date.UTC(2024, 0, 2) },
8 |   { path: 'sessions/beta.jsonl', url: '/sessions/beta.jsonl', sortKey: Date.UTC(2024, 0, 3) },
9 | ];
10 | 
11 | describe('DiscoveryPanel', () => {
12 |   it('renders counts and session rows', () => {
13 |     render(
14 |       <DiscoveryPanel
15 |         projectFiles={['src/App.tsx', 'README.md']}
16 |         sessionAssets={sampleSessions}
17 |         query=""
18 |         onQueryChange={() => {}}
19 |       />
20 |     );
21 | 
22 |     expect(screen.getByText(/project files/i)).toHaveTextContent('2 project files');
23 |     expect(screen.getByText(/session assets/i)).toHaveTextContent('2 session assets');
24 |     expect(screen.getByText('sessions/alpha.jsonl')).toBeInTheDocument();
25 |     expect(screen.getByText('sessions/beta.jsonl')).toBeInTheDocument();
26 |   });
27 | 
28 |   it('invokes search handler when typing', () => {
29 |     const onQueryChange = vi.fn();
30 |     render(
31 |       <DiscoveryPanel
32 |         projectFiles={[]}
33 |         sessionAssets={sampleSessions}
34 |         query=""
35 |         onQueryChange={onQueryChange}
36 |       />
37 |     );
38 | 
39 |     const input = screen.getByPlaceholderText('Filter by file name…');
40 |     fireEvent.change(input, { target: { value: 'beta' } });
41 | 
42 |     expect(onQueryChange).toHaveBeenCalledWith('beta');
43 |   });
44 | 
45 |   it('shows empty state when no results match', () => {
46 |     render(
47 |       <DiscoveryPanel
48 |         projectFiles={[]}
49 |         sessionAssets={sampleSessions}
50 |         query="zzz"
51 |         onQueryChange={() => {}}
52 |       />
53 |     );
54 | 
55 |     expect(screen.getByText('No session logs match that filter.')).toBeInTheDocument();
56 |   });
57 | });
```

src/components/viewer/DiscoveryPanel.tsx
```
1 | import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
2 | interface DiscoveryPanelProps {
3 |   projectFiles: string[];
4 |   sessionAssets: DiscoveredSessionAsset[];
5 |   query: string;
6 |   onQueryChange: (next: string) => void;
7 | }
8 | export function DiscoveryPanel({
9 |   projectFiles,
10 |   sessionAssets,
11 |   query,
12 |   onQueryChange,
13 | }: DiscoveryPanelProps) {
14 |   const normalizedQuery = query.trim().toLowerCase();
15 |   const filteredSessions = normalizedQuery
16 |     ? sessionAssets.filter((asset) => asset.path.toLowerCase().includes(normalizedQuery))
17 |     : sessionAssets;
18 |   return (
19 |     <div className="space-y-6">
20 |       <header className="space-y-2">
21 |         <p className="text-sm text-muted-foreground">
22 |           Use the search box to filter down session logs by path.
23 |         </p>
24 |         <div className="flex flex-wrap items-center gap-4 text-sm">
25 |           <span>
26 |             <strong>{projectFiles.length.toLocaleString()}</strong> project files
27 |           </span>
28 |           <span>
29 |             <strong>{sessionAssets.length.toLocaleString()}</strong> session assets
30 |           </span>
31 |         </div>
32 |       </header>
33 | 
34 |       <label className="flex flex-col gap-1 text-sm font-medium">
35 |         Sessions search
36 |         <input
37 |           type="search"
38 |           value={query}
39 |           onChange={(event) => onQueryChange(event.target.value)}
40 |           placeholder="Filter by file name…"
41 |           className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
42 |         />
43 |       </label>
44 | 
45 |       <section className="space-y-3">
46 |         <h2 className="text-base font-semibold">Session files</h2>
47 |         {filteredSessions.length === 0 ? (
48 |           <p className="text-sm text-muted-foreground">No session logs match that filter.</p>
49 |         ) : (
50 |           <ul className="divide-y divide-border rounded-md border border-border">
51 |             {filteredSessions.map((asset) => (
52 |               <li key={asset.path} className="flex items-center justify-between gap-4 px-4 py-3">
53 |                 <div className="min-w-0">
54 |                   <p className="truncate text-sm font-medium">{asset.path}</p>
55 |                   <p className="truncate text-xs text-muted-foreground">{asset.url}</p>
56 |                 </div>
57 |                 <div className="text-xs text-muted-foreground">
58 |                   {asset.sortKey ? new Date(asset.sortKey).toLocaleString() : '—'}
59 |                 </div>
60 |               </li>
61 |             ))}
62 |           </ul>
63 |         )}
64 |       </section>
65 |     </div>
66 |   );
67 | }
```

src/components/viewer/DropZone.tsx
```
1 | import { useId, useMemo, useState } from 'react';
2 | import { Card, CardContent } from '~/components/ui/card';
3 | import { cn } from '~/lib/utils';
4 | 
5 | function pickFirst(files: FileList | null, acceptExts: string[]) {
6 |   if (!files || files.length === 0) return null;
7 |   const lowerExts = acceptExts.map((ext) => ext.toLowerCase());
8 |   for (const file of Array.from(files)) {
9 |     const name = file.name.toLowerCase();
10 |     if (lowerExts.length === 0 || lowerExts.some((ext) => name.endsWith(ext))) {
11 |       return file;
12 |     }
13 |   }
14 |   return null;
15 | }
16 | 
17 | export interface DropZoneProps {
18 |   onFile: (file: File) => void;
19 |   acceptExtensions?: string[];
20 |   className?: string;
21 | }
22 | 
23 | export function DropZone({
24 |   onFile,
25 |   className,
26 |   acceptExtensions = ['.jsonl', '.ndjson', '.txt'],
27 | }: DropZoneProps) {
28 |   const [isHovering, setIsHovering] = useState(false);
29 |   const inputId = useId();
30 |   const acceptAttr = useMemo(
31 |     () => [...acceptExtensions, 'application/x-ndjson'].join(','),
32 |     [acceptExtensions]
33 |   );
34 | 
35 |   const handleDrop = (event: React.DragEvent<HTMLElement>) => {
36 |     event.preventDefault();
37 |     setIsHovering(false);
38 |     const file = pickFirst(event.dataTransfer?.files ?? null, acceptExtensions);
39 |     if (file) onFile(file);
40 |   };
41 | 
42 |   const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
43 |     const file = pickFirst(event.target.files, acceptExtensions);
44 |     if (file) onFile(file);
45 |     event.target.value = '';
46 |   };
47 | 
48 |   return (
49 |     <Card className={cn('overflow-hidden border-dashed', className)}>
50 |       <CardContent className="p-0">
51 |         <label
52 |           htmlFor={inputId}
53 |           onDragOver={(event) => {
54 |             event.preventDefault();
55 |             setIsHovering(true);
56 |           }}
57 |           onDragEnter={(event) => {
58 |             event.preventDefault();
59 |             setIsHovering(true);
60 |           }}
61 |           onDragLeave={() => setIsHovering(false)}
62 |           onDrop={handleDrop}
63 |           className={cn(
64 |             'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
65 |             isHovering ? 'border-primary bg-primary/5' : 'border-border bg-card'
66 |           )}
67 |         >
68 |           <input
69 |             id={inputId}
70 |             type="file"
71 |             accept={acceptAttr}
72 |             className="sr-only"
73 |             onChange={handleChange}
74 |           />
75 |           <span className="text-sm font-medium text-foreground">Drop a .jsonl/.ndjson file</span>
76 |           <span className="text-xs text-muted-foreground">or click to choose from disk</span>
77 |         </label>
78 |       </CardContent>
79 |     </Card>
80 |   );
81 | }
```

src/components/viewer/EventCard.tsx
```
1 | import { Card } from "~/components/ui/card"
2 | import { Badge } from "~/components/ui/badge"
3 | import type { ResponseItem } from "~/types"
4 | import { cn } from "~/lib/utils"
5 | 
6 | function formatTimestamp(value?: string | number) {
7 |     if (!value) return null
8 |     const date = new Date(value)
9 |     if (Number.isNaN(date.getTime())) return String(value)
10 |     return date.toLocaleString()
11 | }
12 | 
13 | function renderSummary(event: ResponseItem) {
14 |     switch (event.type) {
15 |         case "Message": {
16 |             const text = Array.isArray(event.content) ? event.content.map((part) => part.text).join("\n") : event.content
17 |             return text
18 |         }
19 |         case "Reasoning":
20 |             return event.content
21 |         case "FunctionCall":
22 |             return JSON.stringify({ name: event.name, args: event.args }, null, 2)
23 |         case "LocalShellCall":
24 |             return event.stdout || event.stderr || event.command
25 |         case "FileChange":
26 |             return event.path
27 |         case "WebSearchCall":
28 |             return event.query
29 |         default:
30 |             return JSON.stringify(event, null, 2)
31 |     }
32 | }
33 | 
34 | function typeAccent(type: ResponseItem["type"]) {
35 |     switch (type) {
36 |         case "Message":
37 |             return "bg-muted text-foreground"
38 |         case "LocalShellCall":
39 |             return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
40 |         case "FunctionCall":
41 |             return "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200"
42 |         case "FileChange":
43 |             return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
44 |         default:
45 |             return "bg-secondary text-secondary-foreground"
46 |     }
47 | }
48 | 
49 | interface EventCardProps {
50 |     item: ResponseItem
51 |     index: number
52 | }
53 | 
54 | export function EventCard({ item, index }: EventCardProps) {
55 |     const summary = renderSummary(item)
56 |     const at = formatTimestamp(item.at)
57 |     return (
58 |         <Card className="gap-3 rounded-lg border px-4 py-3">
59 |             <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
60 |                 <Badge variant="outline" className={cn("px-2 py-0.5 text-[11px] uppercase tracking-wide", typeAccent(item.type))}>
61 |                     {item.type}
62 |                 </Badge>
63 |                 <span>#{index + 1}</span>
64 |                 {item.type === "Message" && typeof (item as any).role === "string" ? <span>{(item as any).role}</span> : null}
65 |                 {at ? <span>{at}</span> : null}
66 |             </div>
67 |             <div className="space-y-2">
68 |                 {item.type === "Message" ? (
69 |                     <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-sm leading-relaxed">
70 |                         {summary}
71 |                     </pre>
72 |                 ) : (
73 |                     summary && (
74 |                         <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
75 |                             {summary}
76 |                         </pre>
77 |                     )
78 |                 )}
79 |                 {!summary && <p className="text-sm text-muted-foreground">No additional details</p>}
80 |             </div>
81 |         </Card>
82 |     )
83 | }
```

src/components/viewer/FileInputButton.tsx
```
1 | import { useRef } from 'react';
2 | import { Button } from '~/components/ui/button';
3 | 
4 | interface FileInputButtonProps {
5 |   onFile: (file: File) => void;
6 |   accept?: string;
7 |   label?: string;
8 |   disabled?: boolean;
9 |   className?: string;
10 | }
11 | 
12 | export function FileInputButton({
13 |   onFile,
14 |   accept = '.jsonl,.ndjson,.txt',
15 |   label = 'Choose session file',
16 |   disabled,
17 |   className,
18 | }: FileInputButtonProps) {
19 |   const inputRef = useRef<HTMLInputElement | null>(null);
20 | 
21 |   const trigger = () => inputRef.current?.click();
22 | 
23 |   const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
24 |     const file = event.target.files?.[0];
25 |     if (file) onFile(file);
26 |     event.target.value = '';
27 |   };
28 | 
29 |   return (
30 |     <>
31 |       <input
32 |         ref={inputRef}
33 |         type="file"
34 |         accept={accept}
35 |         onChange={handleChange}
36 |         className="hidden"
37 |         aria-hidden
38 |       />
39 |       <Button type="button" onClick={trigger} disabled={disabled} className={className}>
40 |         {label}
41 |       </Button>
42 |     </>
43 |   );
44 | }
```

src/components/viewer/TimelineList.tsx
```
1 | import { memo, useMemo } from "react"
2 | import type { ResponseItem } from "~/types"
3 | import { eventKey } from "~/utils/event-key"
4 | import { EventCard } from "./EventCard"
5 | import { TimelineView } from "./TimelineView"
6 | 
7 | interface TimelineListProps {
8 |     events: readonly ResponseItem[]
9 |     height?: number
10 | }
11 | 
12 | export const TimelineList = memo(function TimelineList({ events, height = 720 }: TimelineListProps) {
13 |     const items = useMemo(() => events.map((ev, index) => ({ ev, index, key: eventKey(ev, index) })), [events])
14 | 
15 |     return (
16 |         <TimelineView
17 |             items={items}
18 |             height={height}
19 |             estimateItemHeight={140}
20 |             keyForIndex={(item) => item.key}
21 |             renderItem={(item) => (
22 |                 <div className="px-1 pb-4">
23 |                     <EventCard item={item.ev} index={item.index} />
24 |                 </div>
25 |             )}
26 |         />
27 |     )
28 | })
```

src/components/viewer/TimelineView.tsx
```
1 | import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
2 | 
3 | export interface TimelineViewProps<T> {
4 |   items: readonly T[];
5 |   height?: number;
6 |   estimateItemHeight?: number;
7 |   overscanPx?: number;
8 |   renderItem: (item: T, index: number) => React.ReactNode;
9 |   keyForIndex?: (item: T, index: number) => React.Key;
10 |   className?: string;
11 |   scrollToIndex?: number | null;
12 | }
13 | 
14 | function useRafThrottle(fn: () => void) {
15 |   const ticking = useRef(false);
16 |   return useCallback(() => {
17 |     if (ticking.current) return;
18 |     ticking.current = true;
19 |     const schedule =
20 |       typeof window !== 'undefined'
21 |         ? window.requestAnimationFrame
22 |         : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16);
23 |     schedule(() => {
24 |       ticking.current = false;
25 |       fn();
26 |     });
27 |   }, [fn]);
28 | }
29 | 
30 | function lowerBound(prefix: ReadonlyArray<number>, target: number) {
31 |   let lo = 0;
32 |   let hi = prefix.length - 1;
33 |   let ans = prefix.length;
34 |   while (lo <= hi) {
35 |     const mid = (lo + hi) >> 1;
36 |     if ((prefix[mid] ?? 0) >= target) {
37 |       ans = mid;
38 |       hi = mid - 1;
39 |     } else {
40 |       lo = mid + 1;
41 |     }
42 |   }
43 |   return ans;
44 | }
45 | 
46 | export function TimelineView<T>({
47 |   items,
48 |   height = 600,
49 |   estimateItemHeight = 80,
50 |   overscanPx = 400,
51 |   renderItem,
52 |   keyForIndex,
53 |   className,
54 |   scrollToIndex = null,
55 | }: TimelineViewProps<T>) {
56 |   const containerRef = useRef<HTMLDivElement | null>(null);
57 |   const [scrollTop, setScrollTop] = useState(0);
58 |   const [measured, setMeasured] = useState<Map<number, number>>(new Map());
59 | 
60 |   const onScroll = useRafThrottle(() => {
61 |     const el = containerRef.current;
62 |     if (el) setScrollTop(el.scrollTop);
63 |   });
64 | 
65 |   const { offsets, totalHeight } = useMemo(() => {
66 |     const n = items.length;
67 |     const heights = new Array<number>(n);
68 |     for (let i = 0; i < n; i++) {
69 |       heights[i] = measured.get(i) ?? estimateItemHeight;
70 |     }
71 |     const off = new Array<number>(n);
72 |     let acc = 0;
73 |     for (let i = 0; i < n; i++) {
74 |       off[i] = acc;
75 |       acc += heights[i] ?? estimateItemHeight;
76 |     }
77 |     return { offsets: off, totalHeight: acc };
78 |   }, [items.length, measured, estimateItemHeight]);
79 | 
80 |   const start = useMemo(() => {
81 |     const target = Math.max(0, scrollTop - overscanPx);
82 |     const idx = lowerBound(offsets, target);
83 |     return Math.max(0, Math.min(idx, items.length - 1));
84 |   }, [offsets, scrollTop, overscanPx, items.length]);
85 | 
86 |   const end = useMemo(() => {
87 |     const target = Math.min(totalHeight, scrollTop + height + overscanPx);
88 |     const idx = lowerBound(offsets, target);
89 |     return Math.max(start, Math.min(items.length - 1, idx));
90 |   }, [offsets, totalHeight, scrollTop, height, overscanPx, items.length, start]);
91 | 
92 |   const handleMeasured = useCallback(
93 |     (index: number, h: number) => {
94 |       const prev = measured.get(index) ?? 0;
95 |       if (Math.abs(prev - h) > 1) {
96 |         setMeasured((map) => {
97 |           const next = new Map(map);
98 |           next.set(index, h);
99 |           return next;
100 |         });
101 |       }
102 |     },
103 |     [measured]
104 |   );
105 | 
106 |   const visible: number[] = [];
107 |   for (let i = start; i <= end; i++) visible.push(i);
108 | 
109 |   if (scrollToIndex != null) {
110 |     const el = containerRef.current;
111 |     if (el && scrollToIndex >= 0 && scrollToIndex < items.length) {
112 |       const top = offsets[scrollToIndex] ?? 0;
113 |       if (Math.abs(el.scrollTop - top) > 4) {
114 |         el.scrollTop = top;
115 |       }
116 |     }
117 |   }
118 | 
119 |   return (
120 |     <div
121 |       ref={containerRef}
122 |       onScroll={onScroll}
123 |       style={{ height, overflowY: 'auto', position: 'relative' }}
124 |       className={className}
125 |     >
126 |       <div style={{ height: totalHeight, position: 'relative' }}>
127 |         {visible.map((index) => {
128 |           const item = items[index];
129 |           if (item === undefined) return null;
130 |           const top = offsets[index] ?? 0;
131 |           const key = keyForIndex ? keyForIndex(item, index) : index;
132 |           return (
133 |             <Row key={key} top={top} onMeasured={(h) => handleMeasured(index, h)}>
134 |               {renderItem(item, index)}
135 |             </Row>
136 |           );
137 |         })}
138 |       </div>
139 |     </div>
140 |   );
141 | }
142 | 
143 | function Row({
144 |   top,
145 |   onMeasured,
146 |   children,
147 | }: {
148 |   top: number;
149 |   onMeasured: (h: number) => void;
150 |   children: React.ReactNode;
151 | }) {
152 |   const ref = useRef<HTMLDivElement | null>(null);
153 |   useLayoutEffect(() => {
154 |     const el = ref.current;
155 |     if (!el) return;
156 |     onMeasured(el.getBoundingClientRect().height);
157 |   });
158 |   return (
159 |     <div ref={ref} style={{ position: 'absolute', top, left: 0, right: 0 }}>
160 |       {children}
161 |     </div>
162 |   );
163 | }
```

src/.cursor/rules/ruler_cursor_instructions.mdc
```
1 | ---
2 | alwaysApply: true
3 | ---
4 | <!-- Source: .ruler/tanstack-environment-server-client-only-rules.md -->
5 | 
6 | # ClientOnly
7 | 
8 | Client-only render to avoid SSR hydration issues. Import from `@tanstack/react-router`:
9 | 
10 | ```typescript
11 | import { ClientOnly } from '@tanstack/react-router';
12 | 
13 | <ClientOnly fallback={<span>—</span>}>
14 |   <ComponentThatUsesClientHooks />
15 | </ClientOnly>
16 | ```
17 | 
18 | Alternative: Custom implementation using mounted pattern if needed (see hydration errors below).
19 | 
20 | # Environment functions
21 | 
22 | From `@tanstack/react-start`:
23 | 
24 | ## createIsomorphicFn
25 | 
26 | Adapts to client/server:
27 | 
28 | ```typescript
29 | import { createIsomorphicFn } from '@tanstack/react-start';
30 | const getEnv = createIsomorphicFn()
31 |   .server(() => 'server')
32 |   .client(() => 'client');
33 | getEnv(); // 'server' on server, 'client' on client
34 | ```
35 | 
36 | Partial: `.server()` no-op on client, `.client()` no-op on server.
37 | 
38 | ## createServerOnlyFn / createClientOnlyFn
39 | 
40 | RC1: `serverOnly` → `createServerOnlyFn`, `clientOnly` → `createClientOnlyFn`
41 | 
42 | Strict environment execution (throws if called wrong env):
43 | 
44 | ```typescript
45 | import { createServerOnlyFn, createClientOnlyFn } from '@tanstack/react-start';
46 | const serverFn = createServerOnlyFn(() => 'bar'); // throws on client
47 | const clientFn = createClientOnlyFn(() => 'bar'); // throws on server
48 | ```
49 | 
50 | Tree-shaken: client code removed from server bundle, server code removed from client bundle.
51 | 
52 | # Hydration errors
53 | 
54 | Mismatch: Server HTML differs from client render. Common causes: Intl (locale/timezone), Date.now(), random IDs, responsive logic, feature flags, user prefs.
55 | 
56 | Strategies:
57 | 1. Make server and client match: deterministic locale/timezone on server (cookie or Accept-Language header), compute once and hydrate as initial state.
58 | 2. Let client tell environment: set cookie with client timezone on first visit, SSR uses UTC until then.
59 | 3. Make it client-only: wrap unstable UI in `<ClientOnly>` to avoid SSR mismatches.
60 | 4. Disable/limit SSR: use selective SSR (`ssr: 'data-only'` or `false`) when server HTML cannot be stable.
61 | 5. Last resort: React's `suppressHydrationWarning` for small known-different nodes (use sparingly).
62 | 
63 | Checklist: Deterministic inputs (locale, timezone, feature flags). Prefer cookies for client context. Use `<ClientOnly>` for dynamic UI. Use selective SSR when server HTML unstable. Avoid blind suppression.
64 | 
65 | # TanStack Start basics
66 | 
67 | Depends: @tanstack/react-router, Vite. Router: getRouter() (was createRouter() in beta). routeTree.gen.ts auto-generated on first dev run. Optional: server handler via @tanstack/react-start/server; client hydrate via StartClient from @tanstack/react-start/client. RC1: Import StartClient from @tanstack/react-start/client (not @tanstack/react-start). StartClient no longer requires router prop. Root route head: utf-8, viewport, title; component wraps Outlet in RootDocument. Routes: createFileRoute() code-split + lazy-load; loader runs server/client. Navigation: Link (typed), useNavigate (imperative), useRouter (instance).
68 | 
69 | # Server functions
70 | 
71 | createServerFn({ method }) + zod .inputValidator + .handler(ctx). After mutations: router.invalidate(); queryClient.invalidateQueries(['entity', id]).
72 | 
73 | # Typed Links
74 | 
75 | Link to="/posts/$postId" with params; activeProps for styling.
76 | 
77 | 
78 | 
79 | <!-- Source: .ruler/tanstack-query-rules.md -->
80 | 
81 | # TanStack Query Rules
82 | 
83 | Server state via TanStack Query + server functions. Type-safe fetching and mutations.
84 | 
85 | ## Query Pattern
86 | 
87 | Define in `lib/{resource}/queries.ts` using `queryOptions`:
88 | 
89 | ```typescript
90 | export const todosQueryOptions = () =>
91 |   queryOptions({
92 |     queryKey: ['todos'],
93 |     queryFn: async ({ signal }) => await getTodos({ signal }),
94 |     staleTime: 1000 * 60 * 5,
95 |     gcTime: 1000 * 60 * 10,
96 |   });
97 | ```
98 | 
99 | Use: `const { data, isLoading } = useQuery(todosQueryOptions())`. Prefer `useSuspenseQuery` with Suspense.
100 | 
101 | ## Server Functions in Queries
102 | 
103 | Call server functions directly in `queryFn`. No `useServerFn` hook. TanStack Start proxies. Pass `signal` for cancellation.
104 | 
105 | ## Mutation Pattern
106 | 
107 | ```typescript
108 | const mutation = useMutation({
109 |   mutationFn: async (text: string) => await createTodo({ data: { text } }),
110 |   onSuccess: () => {
111 |     queryClient.invalidateQueries({ queryKey: todosQueryOptions().queryKey });
112 |     toast.success('Success');
113 |   },
114 |   onError: (error) => toast.error(error.message || 'Failed'),
115 | });
116 | ```
117 | 
118 | Call via `mutation.mutate(data)` or `mutateAsync` for promises.
119 | 
120 | ## Query Invalidation
121 | 
122 | After mutations: `queryClient.invalidateQueries({ queryKey: ... })`. Use specific keys, not broad.
123 | 
124 | ## Mutation States
125 | 
126 | Access: `isPending`, `isError`, `isSuccess`, `error`, `data`. Disable UI during `isPending`.
127 | 
128 | ## Error Handling
129 | 
130 | Handle in `onError`. Toast messages. Access: `error.message || 'Default'`.
131 | 
132 | ## Query Keys
133 | 
134 | Hierarchical: `['todos']`, `['todo', id]`, `['todos', 'completed']`. Include all affecting variables.
135 | 
136 | ## Stale Time vs GC Time
137 | 
138 | `staleTime`: freshness duration (no refetch). Default 0. Set for stable data.
139 | `gcTime`: unused cache duration (was `cacheTime`). Default 5min. Memory management.
140 | 
141 | ## Infinite Queries
142 | 
143 | `useInfiniteQuery` for pagination. Required: `initialPageParam`, `getNextPageParam`, `fetchNextPage`. Access `data.pages`. Check `hasNextPage` before fetching.
144 | 
145 | ## Optimistic Updates
146 | 
147 | `onMutate` for optimistic updates. Rollback in `onError`. Update cache via `queryClient.setQueryData`.
148 | 
149 | ## Best Practices
150 | 
151 | 1. Queries in `lib/{resource}/queries.ts` with `queryOptions`
152 | 2. Call server functions directly (no `useServerFn` in callbacks)
153 | 3. Invalidate after mutations
154 | 4. Toast for feedback
155 | 5. Handle loading/error states
156 | 6. Use TypeScript types from query options
157 | 7. Set `staleTime`/`gcTime` appropriately
158 | 8. Prefer `useSuspenseQuery` with Suspense
```

src/lib/todos/queries.ts
```
1 | import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
2 | import { getTodos, createTodo, toggleTodo, deleteTodo } from '~/server/function/todos';
3 | import { toast } from 'sonner';
4 | 
5 | export type Todo = { id: string; text: string; completed: boolean };
6 | 
7 | export const todosQueries = {
8 |   list: () =>
9 |     queryOptions({
10 |       queryKey: ['todos'],
11 |       queryFn: async ({ signal }) => await getTodos({ signal }),
12 |       staleTime: 1000 * 60 * 5,
13 |     }),
14 | };
15 | 
16 | export function useCreateTodoMutation() {
17 |   const queryClient = useQueryClient();
18 |   return useMutation({
19 |     mutationFn: async (text: string) => await createTodo({ data: { text } }),
20 |     onSuccess: () => {
21 |       queryClient.invalidateQueries({ queryKey: todosQueries.list().queryKey });
22 |       toast.success('Todo created successfully!');
23 |     },
24 |     onError: (error) => {
25 |       toast.error(error.message || 'Failed to create todo');
26 |     },
27 |   });
28 | }
29 | 
30 | export function useToggleTodoMutation() {
31 |   const queryClient = useQueryClient();
32 |   return useMutation({
33 |     mutationFn: async (id: string) => await toggleTodo({ data: { id } }),
34 |     onSuccess: () => {
35 |       queryClient.invalidateQueries({ queryKey: todosQueries.list().queryKey });
36 |     },
37 |     onError: (error) => {
38 |       toast.error(error.message || 'Failed to toggle todo');
39 |     },
40 |   });
41 | }
42 | 
43 | export function useDeleteTodoMutation() {
44 |   const queryClient = useQueryClient();
45 |   return useMutation({
46 |     mutationFn: async (id: string) => await deleteTodo({ data: { id } }),
47 |     onSuccess: () => {
48 |       queryClient.invalidateQueries({ queryKey: todosQueries.list().queryKey });
49 |       toast.success('Todo deleted successfully!');
50 |     },
51 |     onError: (error) => {
52 |       toast.error(error.message || 'Failed to delete todo');
53 |     },
54 |   });
55 | }
```

src/routes/(site)/docs.tsx
```
1 | import { createFileRoute } from '@tanstack/react-router'
2 | export const Route = createFileRoute('/(site)/docs')({
3 |     component: DocsPage
4 | })
5 | 
6 | function DocsPage() {
7 |     return (
8 |         <div className="container mx-auto px-4 py-8">
9 |             <h1 className="mb-6 font-bold text-4xl">Documentation</h1>
10 |             <div className="prose dark:prose-invert max-w-none">
11 |                 <p className="mb-4 text-lg text-muted-foreground">
12 |                     Welcome to the documentation for the TanStack Starter project.
13 |                 </p>
14 | 
15 |                 <h2 className="mt-8 mb-4 font-semibold text-2xl">Getting Started</h2>
16 |                 <p>
17 |                     This starter template provides a modern foundation for building web applications
18 |                     with TanStack Router, React Query, and other powerful tools.
19 |                 </p>
20 | 
21 |                 <h2 className="mt-8 mb-4 font-semibold text-2xl">Features</h2>
22 |                 <ul className="list-inside list-disc space-y-2">
23 |                     <li>Type-safe routing with TanStack Router</li>
24 |                     <li>Server-side rendering (SSR) support</li>
25 |                     <li>Dark mode with theme persistence</li>
26 |                     <li>Tailwind CSS for styling</li>
27 |                     <li>TypeScript for type safety</li>
28 |                 </ul>
29 | 
30 |                 <h2 className="mt-8 mb-4 font-semibold text-2xl">Project Structure</h2>
31 |                 <pre className="overflow-x-auto rounded-lg bg-muted p-4">
32 |                     {`src/
33 | ├── components/     # Reusable UI components
34 | ├── routes/         # Route definitions
35 | ├── styles/         # Global styles
36 | ├── lib/           # Utility functions
37 | └── utils/         # Helper utilities`}
38 |                 </pre>
39 |             </div>
40 |         </div>
41 |     )
42 | }
```

src/routes/(site)/index.tsx
```
1 | import { createFileRoute } from '@tanstack/react-router';
2 | import GradientOrb from '~/components/gradient-orb';
3 | import { useState } from 'react';
4 | import { useSuspenseQuery } from '@tanstack/react-query';
5 | import {
6 |   todosQueries,
7 |   useCreateTodoMutation,
8 |   useToggleTodoMutation,
9 |   useDeleteTodoMutation,
10 |   type Todo,
11 | } from '~/lib/todos/queries';
12 | import { Button } from '~/components/ui/button';
13 | import axios from 'redaxios';
14 | import { toast } from 'sonner';
15 | 
16 | export const Route = createFileRoute('/(site)/')({
17 |   loader: async (opts) => {
18 |     await opts.context.queryClient.ensureQueryData(todosQueries.list());
19 |   },
20 |   component: RouteComponent,
21 | });
22 | 
23 | function RouteComponent() {
24 |   const [getResponse, setGetResponse] = useState<string | null>(null);
25 |   const [postResponse, setPostResponse] = useState<string | null>(null);
26 | 
27 |   // Query for todos using TanStack Query (suspense)
28 |   const todosQuery = useSuspenseQuery(todosQueries.list());
29 |   const { data: todos = [], refetch: refetchTodos } = todosQuery;
30 | 
31 |   // Mutations
32 |   const createTodoMutation = useCreateTodoMutation();
33 |   const toggleTodoMutation = useToggleTodoMutation();
34 |   const deleteTodoMutation = useDeleteTodoMutation();
35 | 
36 |   // Todo input state
37 |   const [newTodoText, setNewTodoText] = useState('');
38 | 
39 |   const handleGet = async () => {
40 |     try {
41 |       const res = await axios.get('/api/test');
42 |       setGetResponse(JSON.stringify(res.data, null, 2));
43 |     } catch (error) {
44 |       setGetResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
45 |     }
46 |   };
47 | 
48 |   const handlePost = async () => {
49 |     try {
50 |       const res = await axios.post('/api/test', { test: 'data', number: 42 });
51 |       setPostResponse(JSON.stringify(res.data, null, 2));
52 |     } catch (error) {
53 |       setPostResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
54 |     }
55 |   };
56 | 
57 |   const handleCreateTodo = () => {
58 |     if (!newTodoText.trim()) {
59 |       toast.error('Todo text cannot be empty');
60 |       return;
61 |     }
62 |     createTodoMutation.mutate(newTodoText.trim());
63 |     setNewTodoText('');
64 |   };
65 | 
66 |   const handleToggleTodo = (id: string) => {
67 |     toggleTodoMutation.mutate(id);
68 |   };
69 | 
70 |   const handleDeleteTodo = (id: string) => {
71 |     deleteTodoMutation.mutate(id);
72 |   };
73 | 
74 |   return (
75 |     <div className="relative min-h-screen overflow-hidden bg-background">
76 |       {/* Hero Section */}
77 |       <main className="container relative z-0 mx-auto flex flex-col items-center px-4 pt-20 text-center md:pt-32">
78 |         <GradientOrb className="-translate-x-1/2 absolute top-0 left-1/2 z-[-1] transform" />
79 | 
80 |         <h1 className="max-w-4xl font-medium text-4xl text-foreground md:text-6xl lg:text-7xl">
81 |           TanStack Start React boilerplate with Tailwind 4 & shadcn
82 |         </h1>
83 | 
84 |         <p className="mt-6 text-lg text-muted-foreground md:text-xl">
85 |           The perfect starting point for your next web application
86 |         </p>
87 | 
88 |         <p className="mt-4 text-muted-foreground text-xs uppercase tracking-wider">
89 |           Under heavy development
90 |         </p>
91 | 
92 |         {/* API Test Section */}
93 |         <div className="mt-12 w-full max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6">
94 |           <h2 className="text-2xl font-semibold">API Test</h2>
95 | 
96 |           <div className="space-y-4">
97 |             <div>
98 |               <Button onClick={handleGet}>Test GET</Button>
99 |               {getResponse && (
100 |                 <pre className="mt-2 rounded-md bg-muted p-4 text-left text-sm overflow-auto">
101 |                   {getResponse}
102 |                 </pre>
103 |               )}
104 |             </div>
105 | 
106 |             <div>
107 |               <Button onClick={handlePost}>Test POST</Button>
108 |               {postResponse && (
109 |                 <pre className="mt-2 rounded-md bg-muted p-4 text-left text-sm overflow-auto">
110 |                   {postResponse}
111 |                 </pre>
112 |               )}
113 |             </div>
114 |           </div>
115 |         </div>
116 | 
117 |         {/* Todo List Section */}
118 |         <div className="mt-12 w-full max-w-2xl space-y-6 rounded-lg border border-border bg-card p-6">
119 |           <div className="flex items-center justify-between mb-4">
120 |             <h2 className="text-2xl font-semibold">Todos (Server Functions + TanStack Query)</h2>
121 |             <Button onClick={() => refetchTodos()} size="sm">
122 |               Refresh
123 |             </Button>
124 |           </div>
125 | 
126 |           <div className="flex gap-2 mb-4">
127 |             <input
128 |               type="text"
129 |               value={newTodoText}
130 |               onChange={(e) => setNewTodoText(e.target.value)}
131 |               onKeyDown={(e) => e.key === 'Enter' && handleCreateTodo()}
132 |               placeholder="Add todo..."
133 |               className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
134 |               disabled={createTodoMutation.isPending}
135 |             />
136 |             <Button
137 |               onClick={handleCreateTodo}
138 |               disabled={createTodoMutation.isPending || !newTodoText.trim()}
139 |             >
140 |               {createTodoMutation.isPending ? 'Adding...' : 'Add'}
141 |             </Button>
142 |           </div>
143 | 
144 |           <div className="space-y-2">
145 |             {todos.length === 0 ? (
146 |               <p className="text-muted-foreground text-sm">No todos yet. Add one above!</p>
147 |             ) : (
148 |               todos.map((todo) => (
149 |                 <div
150 |                   key={todo.id}
151 |                   className="flex items-center gap-2 rounded-md border border-border p-3"
152 |                 >
153 |                   <input
154 |                     type="checkbox"
155 |                     checked={todo.completed}
156 |                     onChange={() => handleToggleTodo(todo.id)}
157 |                     disabled={
158 |                       toggleTodoMutation.isPending ||
159 |                       deleteTodoMutation.isPending ||
160 |                       createTodoMutation.isPending
161 |                     }
162 |                     className="rounded"
163 |                   />
164 |                   <span
165 |                     className={`flex-1 text-sm ${
166 |                       todo.completed ? 'line-through text-muted-foreground' : ''
167 |                     }`}
168 |                   >
169 |                     {todo.text}
170 |                   </span>
171 |                   <Button
172 |                     onClick={() => handleDeleteTodo(todo.id)}
173 |                     disabled={
174 |                       toggleTodoMutation.isPending ||
175 |                       deleteTodoMutation.isPending ||
176 |                       createTodoMutation.isPending
177 |                     }
178 |                     variant="destructive"
179 |                     size="sm"
180 |                   >
181 |                     Delete
182 |                   </Button>
183 |                 </div>
184 |               ))
185 |             )}
186 |           </div>
187 |         </div>
188 |       </main>
189 |     </div>
190 |   );
191 | }
```

src/routes/(site)/route.tsx
```
1 | import { Outlet, createFileRoute } from '@tanstack/react-router';
2 | import { Suspense } from 'react';
3 | import { Header } from '~/components/Header';
4 | 
5 | export const Route = createFileRoute('/(site)')({
6 |   component: RouteComponent,
7 | });
8 | 
9 | function RouteComponent() {
10 |   return (
11 |     <div>
12 |       <Header />
13 |       <Suspense fallback={<div>Loading...</div>}>
14 |         <Outlet />
15 |       </Suspense>
16 |     </div>
17 |   );
18 | }
```

src/routes/(site)/viewer.tsx
```
1 | import { createFileRoute } from "@tanstack/react-router"
2 | import { useCallback, useMemo } from "react"
3 | import { DiscoveryPanel } from "~/components/viewer/DiscoveryPanel"
4 | import { DropZone } from "~/components/viewer/DropZone"
5 | import { FileInputButton } from "~/components/viewer/FileInputButton"
6 | import { TimelineList } from "~/components/viewer/TimelineList"
7 | import { ChatDock } from "~/components/viewer/ChatDock"
8 | import { useFileLoader } from "~/hooks/useFileLoader"
9 | import { discoverProjectAssets } from "~/lib/viewerDiscovery"
10 | import { seo } from "~/utils/seo"
11 | import { z } from "zod"
12 | 
13 | const searchSchema = z.object({
14 |     query: z.string().optional()
15 | })
16 | 
17 | export const Route = createFileRoute("/(site)/viewer")({
18 |     validateSearch: (search) => {
19 |         const result = searchSchema.safeParse(search)
20 |         if (!result.success) {
21 |             return { query: "" }
22 |         }
23 |         return {
24 |             query: result.data.query?.trim() ?? ""
25 |         }
26 |     },
27 |     loader: () => discoverProjectAssets(),
28 |     head: () => ({
29 |         meta: seo({
30 |             title: "Codex Session Viewer · Discovery",
31 |             description: "Explore workspace files and session logs detected at build time."
32 |         })
33 |     }),
34 |     component: ViewerRouteComponent
35 | })
36 | 
37 | function ViewerRouteComponent() {
38 |     const data = Route.useLoaderData()
39 |     const search = Route.useSearch()
40 |     const navigate = Route.useNavigate()
41 |     const loader = useFileLoader()
42 | 
43 |     const handleQueryChange = (next: string) => {
44 |         navigate({
45 |             search: (prev) => ({
46 |                 ...prev,
47 |                 query: next
48 |             })
49 |         })
50 |     }
51 | 
52 |     const handleFile = useCallback(
53 |         (file: File) => {
54 |             loader.start(file)
55 |         },
56 |         [loader]
57 |     )
58 | 
59 |     const meta = loader.state.meta
60 |     const hasEvents = loader.state.events.length > 0
61 |     const progressLabel =
62 |         loader.state.phase === "parsing"
63 |             ? `Parsing… (${loader.progress.ok.toLocaleString()} ok / ${loader.progress.fail.toLocaleString()} errors)`
64 |             : loader.state.phase === "success"
65 |               ? `Loaded ${loader.state.events.length.toLocaleString()} events`
66 |               : loader.state.phase === "error" && loader.progress.fail > 0
67 |                 ? `Finished with ${loader.progress.fail.toLocaleString()} errors`
68 |                 : "Idle"
69 | 
70 |     const timelineContent = useMemo(() => {
71 |         if (loader.state.phase === "parsing") {
72 |             return <p className="text-sm text-muted-foreground">Streaming events… large sessions may take a moment.</p>
73 |         }
74 |         if (!hasEvents) {
75 |             return <p className="text-sm text-muted-foreground">Load a session to populate the timeline.</p>
76 |         }
77 |         return <TimelineList events={loader.state.events} />
78 |     }, [loader.state.phase, loader.state.events, hasEvents])
79 | 
80 |     return (
81 |         <main className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
82 |             <section className="space-y-3">
83 |                 <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Codex Session Viewer</p>
84 |                 <h1 className="text-3xl font-bold tracking-tight">Workspace Discovery</h1>
85 |                 <p className="text-muted-foreground">
86 |                     Drop in a session to stream its timeline, then iterate with the chat dock.
87 |                 </p>
88 |             </section>
89 | 
90 |             <DiscoveryPanel
91 |                 projectFiles={data.projectFiles}
92 |                 sessionAssets={data.sessionAssets}
93 |                 query={search.query}
94 |                 onQueryChange={handleQueryChange}
95 |             />
96 | 
97 |             <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
98 |                 <div className="flex flex-col gap-6">
99 |                     <div className="grid gap-4 md:grid-cols-[2fr,auto]">
100 |                         <DropZone onFile={handleFile} className="md:col-span-1" />
101 |                         <div className="flex flex-col gap-4 rounded-xl border bg-card/70 p-5">
102 |                             <div className="space-y-2">
103 |                                 <p className="text-sm font-semibold">Session controls</p>
104 |                                 <p className="text-xs text-muted-foreground">Upload a .jsonl/.ndjson session log.</p>
105 |                             </div>
106 |                             <FileInputButton onFile={handleFile} disabled={loader.state.phase === "parsing"} />
107 |                             <dl className="space-y-2 text-sm">
108 |                                 <div className="flex items-center justify-between">
109 |                                     <dt className="text-muted-foreground">Status</dt>
110 |                                     <dd>{progressLabel}</dd>
111 |                                 </div>
112 |                                 {meta?.timestamp ? (
113 |                                     <div className="flex items-center justify-between">
114 |                                         <dt className="text-muted-foreground">Timestamp</dt>
115 |                                         <dd>{new Date(meta.timestamp).toLocaleString()}</dd>
116 |                                     </div>
117 |                                 ) : null}
118 |                                 {meta?.git?.repo ? (
119 |                                     <div className="flex items-center justify-between">
120 |                                         <dt className="text-muted-foreground">Repo</dt>
121 |                                         <dd>{meta.git.repo}</dd>
122 |                                     </div>
123 |                                 ) : null}
124 |                             </dl>
125 |                         </div>
126 |                     </div>
127 | 
128 |                     <div className="rounded-2xl border p-4">
129 |                         <div className="mb-4 flex items-center justify-between">
130 |                             <div>
131 |                                 <p className="text-sm font-semibold">Timeline</p>
132 |                                 <p className="text-xs text-muted-foreground">Virtualized list of parsed events.</p>
133 |                             </div>
134 |                         </div>
135 |                         {timelineContent}
136 |                     </div>
137 |                 </div>
138 | 
139 |                 <ChatDock />
140 |             </section>
141 |         </main>
142 |     )
143 | }
```

src/routes/.ruler/tanstack-server-routes.md
```
1 | # Server Routes — TanStack Start
2 | 
3 | Server HTTP endpoints for requests, forms, auth. Location: ./src/routes. Export Route to create API route. ServerRoute and Route can coexist in same file.
4 | 
5 | Routing mirrors TanStack Router: dynamic $id, splat $, escaped [.], nested dirs/dotted filenames map to paths. One handler per resolved path (duplicates error). Examples: users.ts → /users; users/$id.ts → /users/$id; api/file/$.ts → /api/file/$; my-script[.]js.ts → /my-script.js.
6 | 
7 | Middleware: pathless layout routes add group middleware; break-out routes skip parents.
8 | 
9 | RC1 server entry signature: export default { fetch(req: Request): Promise<Response> { ... } }
10 | 
11 | Define handlers: use createFileRoute() from @tanstack/react-router with server: { handlers: { ... } }. Methods per HTTP verb, with optional middleware builder. createServerFileRoute removed in RC1; use createFileRoute with server property.
12 | 
13 | Handler receives { request, params, context }; return Response or Promise<Response>. Helpers from @tanstack/react-start allowed.
14 | 
15 | Bodies: request.json(), request.text(), request.formData() for POST/PUT/PATCH/DELETE.
16 | 
17 | JSON/status/headers: return JSON manually or via json(); set status via Response init or setResponseStatus(); set headers via Response init or setHeaders().
18 | 
19 | Params: /users/$id → params.id; /users/$id/posts/$postId → params.id + params.postId; /file/$ → params._splat.
20 | 
21 | Unique path rule: one file per resolved path; users.ts vs users.index.ts vs users/index.ts conflicts.
22 | 
23 | RC1 structure:
24 | ```typescript
25 | import { createFileRoute } from '@tanstack/react-router'
26 | 
27 | export const Route = createFileRoute('/api/example')({
28 |   server: {
29 |     handlers: {
30 |       GET: ({ request }) => new Response('Hello'),
31 |       POST: ({ request }) => new Response('Created', { status: 201 })
32 |     }
33 |   }
34 | })
35 | ```
```

src/routes/api/test.ts
```
1 | import { createFileRoute } from '@tanstack/react-router';
2 | import { json } from '@tanstack/react-start';
3 | 
4 | export const Route = createFileRoute('/api/test')({
5 |   server: {
6 |     handlers: {
7 |       GET: async ({ request }) => {
8 |         return json({
9 |           message: 'Hello from GET!',
10 |           method: 'GET',
11 |           timestamp: new Date().toISOString(),
12 |           url: request.url,
13 |         });
14 |       },
15 |       POST: async ({ request }) => {
16 |         const body = await request.json().catch(() => ({}));
17 | 
18 |         return json(
19 |           {
20 |             message: 'Hello from POST!',
21 |             method: 'POST',
22 |             received: body,
23 |             timestamp: new Date().toISOString(),
24 |           },
25 |           {
26 |             status: 201,
27 |           }
28 |         );
29 |       },
30 |     },
31 |   },
32 | });
```

src/lib/session-parser/index.ts
```
1 | export * from './schemas';
2 | export * from './validators';
3 | export * from './streaming';
```

src/lib/session-parser/schemas.ts
```
1 | import { z } from 'zod';
2 | export const GitInfoSchema = z
3 |   .object({
4 |     repo: z.string().optional(),
5 |     branch: z.string().optional(),
6 |     commit: z.string().optional(),
7 |     remote: z.string().optional(),
8 |     dirty: z.boolean().optional(),
9 |   })
10 |   .passthrough();
11 | export const SessionMetaSchema = z
12 |   .object({
13 |     id: z.string().min(1).optional(),
14 |     timestamp: z.string().min(1, 'timestamp required'),
15 |     instructions: z.string().optional(),
16 |     git: GitInfoSchema.optional(),
17 |     version: z.union([z.number(), z.string()]).optional(),
18 |   })
19 |   .passthrough();
20 | const BaseEvent = z
21 |   .object({
22 |     id: z.string().optional(),
23 |     at: z.string().optional(),
24 |     index: z.number().int().optional(),
25 |   })
26 |   .passthrough();
27 | const MessagePartSchema = z
28 |   .object({
29 |     type: z.literal('text'),
30 |     text: z.string(),
31 |   })
32 |   .passthrough();
33 | const MessageEventSchema = BaseEvent.extend({
34 |   type: z.literal('Message'),
35 |   role: z.string(),
36 |   content: z.union([z.string(), z.array(MessagePartSchema)]),
37 |   model: z.string().optional(),
38 | });
39 | const ReasoningEventSchema = BaseEvent.extend({
40 |   type: z.literal('Reasoning'),
41 |   content: z.string(),
42 | });
43 | const FunctionCallEventSchema = BaseEvent.extend({
44 |   type: z.literal('FunctionCall'),
45 |   name: z.string(),
46 |   args: z.unknown().optional(),
47 |   result: z.unknown().optional(),
48 |   durationMs: z.number().optional(),
49 | });
50 | const LocalShellCallEventSchema = BaseEvent.extend({
51 |   type: z.literal('LocalShellCall'),
52 |   command: z.string(),
53 |   cwd: z.string().optional(),
54 |   exitCode: z.number().int().optional(),
55 |   stdout: z.string().optional(),
56 |   stderr: z.string().optional(),
57 |   durationMs: z.number().optional(),
58 | });
59 | const WebSearchCallEventSchema = BaseEvent.extend({
60 |   type: z.literal('WebSearchCall'),
61 |   query: z.string(),
62 |   provider: z.string().optional(),
63 |   results: z
64 |     .array(
65 |       z
66 |         .object({
67 |           title: z.string().optional(),
68 |           url: z.string().optional(),
69 |           snippet: z.string().optional(),
70 |         })
71 |         .passthrough()
72 |     )
73 |     .optional(),
74 | });
75 | const CustomToolCallEventSchema = BaseEvent.extend({
76 |   type: z.literal('CustomToolCall'),
77 |   toolName: z.string(),
78 |   input: z.unknown().optional(),
79 |   output: z.unknown().optional(),
80 | });
81 | const FileChangeEventSchema = BaseEvent.extend({
82 |   type: z.literal('FileChange'),
83 |   path: z.string(),
84 |   diff: z.string().optional(),
85 | });
86 | const OtherEventSchema = BaseEvent.extend({
87 |   type: z.literal('Other'),
88 |   data: z.unknown().optional(),
89 | });
90 | export const ResponseItemSchema = z.discriminatedUnion('type', [
91 |   MessageEventSchema,
92 |   ReasoningEventSchema,
93 |   FunctionCallEventSchema,
94 |   LocalShellCallEventSchema,
95 |   WebSearchCallEventSchema,
96 |   CustomToolCallEventSchema,
97 |   FileChangeEventSchema,
98 |   OtherEventSchema,
99 | ]);
100 | export type SessionMetaParsed = z.infer<typeof SessionMetaSchema>;
101 | export type ResponseItemParsed = z.infer<typeof ResponseItemSchema>;
```

src/lib/session-parser/streaming.ts
```
1 | import { streamTextLines } from '~/utils/line-reader';
2 | import {
3 |   parseResponseItemLine,
4 |   parseSessionMetaLine,
5 |   type ParseFailureReason,
6 |   type SafeResult,
7 | } from './validators';
8 | import type { ResponseItemParsed, SessionMetaParsed } from './schemas';
9 | 
10 | export interface ParserError {
11 |   readonly line: number;
12 |   readonly reason: ParseFailureReason;
13 |   readonly message: string;
14 |   readonly raw: string;
15 | }
16 | 
17 | export interface ParserStats {
18 |   readonly totalLines: number;
19 |   readonly parsedEvents: number;
20 |   readonly failedLines: number;
21 |   readonly durationMs: number;
22 | }
23 | 
24 | export interface ParserOptions {
25 |   readonly maxErrors?: number;
26 | }
27 | 
28 | export type ParserEvent =
29 |   | { kind: 'meta'; line: 1; meta: SessionMetaParsed; version: string | number }
30 |   | { kind: 'event'; line: number; event: ResponseItemParsed }
31 |   | { kind: 'error'; error: ParserError }
32 |   | { kind: 'done'; stats: ParserStats };
33 | 
34 | function pickVersion(meta: SessionMetaParsed | undefined) {
35 |   const v = meta?.version;
36 |   if (v === undefined || v === null || v === '') return 1;
37 |   return v;
38 | }
39 | 
40 | export async function* streamParseSession(
41 |   blob: Blob,
42 |   opts: ParserOptions = {}
43 | ): AsyncGenerator<ParserEvent> {
44 |   const started = performance.now?.() ?? Date.now();
45 |   let total = 0;
46 |   let parsed = 0;
47 |   let failed = 0;
48 |   const maxErrors = opts.maxErrors ?? Number.POSITIVE_INFINITY;
49 | 
50 |   let meta: SessionMetaParsed | undefined;
51 |   let version: string | number = 1;
52 | 
53 |   const pendingCalls = new Map<string, ResponseItemParsed>();
54 | 
55 |   let lineNo = 0;
56 |   for await (const line of streamTextLines(blob)) {
57 |     lineNo++;
58 |     total++;
59 | 
60 |     if (!line || line.trim().length === 0) continue;
61 |     const trimmed = line.trim();
62 |     if (trimmed === '[' || trimmed === ']' || trimmed === '],') continue;
63 | 
64 |     if (!meta) {
65 |       const mres = parseSessionMetaLine(line);
66 |       if (mres.success) {
67 |         meta = mres.data;
68 |         version = pickVersion(meta);
69 |         yield { kind: 'meta', line: 1 as 1, meta, version };
70 |         continue;
71 |       }
72 |       const evTry = parseResponseItemLine(line);
73 |       if (evTry.success) {
74 |         meta = { timestamp: new Date().toISOString() } as SessionMetaParsed;
75 |         version = pickVersion(meta);
76 |         yield { kind: 'meta', line: 1 as 1, meta, version };
77 |         parsed++;
78 |         yield { kind: 'event', line: lineNo, event: evTry.data };
79 |         continue;
80 |       }
81 |       try {
82 |         const obj = JSON.parse(line) as any;
83 |         if (obj && typeof obj === 'object' && obj.record_type === 'state') continue;
84 |       } catch {}
85 |       failed++;
86 |       yield {
87 |         kind: 'error',
88 |         error: {
89 |           line: lineNo,
90 |           reason: mres.reason,
91 |           message: mres.error.message,
92 |           raw: line,
93 |         },
94 |       };
95 |       if (failed >= maxErrors) break;
96 |       continue;
97 |     }
98 | 
99 |     try {
100 |       if (line.trim().startsWith('{')) {
101 |         const obj = JSON.parse(line) as any;
102 |         const rt = obj?.record_type ?? obj?.recordType ?? obj?.kind;
103 |         if (
104 |           obj &&
105 |           typeof obj === 'object' &&
106 |           typeof rt === 'string' &&
107 |           String(rt).toLowerCase() === 'state'
108 |         ) {
109 |           continue;
110 |         }
111 |       }
112 |     } catch {}
113 | 
114 |     const res = parseLineByVersion(version, line);
115 |     if (!res.success) {
116 |       failed++;
117 |       yield {
118 |         kind: 'error',
119 |         error: {
120 |           line: lineNo,
121 |           reason: res.reason,
122 |           message: res.error.message,
123 |           raw: line,
124 |         },
125 |       };
126 |       if (failed >= maxErrors) break;
127 |     } else {
128 |       const ev = res.data;
129 |       if (ev.type === 'FunctionCall') {
130 |         const callId = (ev as any).call_id as string | undefined;
131 |         if (callId) {
132 |           if (ev.result === undefined) {
133 |             pendingCalls.set(callId, ev);
134 |             parsed++;
135 |             yield { kind: 'event', line: lineNo, event: ev };
136 |           } else if ((ev as any).args === undefined && pendingCalls.has(callId)) {
137 |             const prev = pendingCalls.get(callId)!;
138 |             if (prev.type === 'LocalShellCall' && ev.result && typeof ev.result === 'object') {
139 |               const r = ev.result as any;
140 |               if (typeof r.stdout === 'string') (prev as any).stdout = r.stdout;
141 |               if (typeof r.stderr === 'string') (prev as any).stderr = r.stderr;
142 |               if (typeof r.exitCode === 'number') (prev as any).exitCode = r.exitCode;
143 |               else if (typeof r.exit_code === 'number') (prev as any).exitCode = r.exit_code;
144 |               if (typeof r.durationMs === 'number') (prev as any).durationMs = r.durationMs;
145 |               else if (typeof r.duration_ms === 'number') (prev as any).durationMs = r.duration_ms;
146 |               delete (prev as any).result;
147 |             } else {
148 |               (prev as any).result = ev.result;
149 |               if (ev.durationMs !== undefined) (prev as any).durationMs = ev.durationMs;
150 |             }
151 |             pendingCalls.delete(callId);
152 |           } else {
153 |             parsed++;
154 |             yield { kind: 'event', line: lineNo, event: ev };
155 |           }
156 |         } else {
157 |           parsed++;
158 |           yield { kind: 'event', line: lineNo, event: ev };
159 |         }
160 |       } else if (ev.type === 'LocalShellCall') {
161 |         const callId = (ev as any).call_id as string | undefined;
162 |         const hasOutput =
163 |           ev.stdout !== undefined ||
164 |           ev.stderr !== undefined ||
165 |           ev.exitCode !== undefined ||
166 |           ev.durationMs !== undefined;
167 |         if (callId) {
168 |           if (!hasOutput) {
169 |             pendingCalls.set(callId, ev);
170 |             parsed++;
171 |             yield { kind: 'event', line: lineNo, event: ev };
172 |           } else if (pendingCalls.has(callId)) {
173 |             const prev = pendingCalls.get(callId)!;
174 |             Object.assign(prev, ev);
175 |             pendingCalls.delete(callId);
176 |           } else {
177 |             parsed++;
178 |             yield { kind: 'event', line: lineNo, event: ev };
179 |           }
180 |         } else {
181 |           parsed++;
182 |           yield { kind: 'event', line: lineNo, event: ev };
183 |         }
184 |       } else {
185 |         parsed++;
186 |         yield { kind: 'event', line: lineNo, event: ev };
187 |       }
188 |     }
189 |   }
190 | 
191 |   const ended = performance.now?.() ?? Date.now();
192 |   yield {
193 |     kind: 'done',
194 |     stats: {
195 |       totalLines: total,
196 |       parsedEvents: parsed,
197 |       failedLines: failed,
198 |       durationMs: Math.max(0, ended - started),
199 |     },
200 |   };
201 | }
202 | 
203 | function parseLineByVersion(
204 |   version: string | number,
205 |   line: string
206 | ): SafeResult<ResponseItemParsed> {
207 |   void version;
208 |   return parseResponseItemLine(line);
209 | }
210 | 
211 | export async function parseSessionToArrays(blob: Blob, opts: ParserOptions = {}) {
212 |   const errors: ParserError[] = [];
213 |   const events: ResponseItemParsed[] = [];
214 |   let meta: SessionMetaParsed | undefined;
215 |   let stats: ParserStats | undefined;
216 | 
217 |   for await (const item of streamParseSession(blob, opts)) {
218 |     if (item.kind === 'meta') meta = item.meta;
219 |     else if (item.kind === 'event') events.push(item.event);
220 |     else if (item.kind === 'error') errors.push(item.error);
221 |     else if (item.kind === 'done') stats = item.stats;
222 |   }
223 | 
224 |   return { meta, events, errors, stats };
225 | }
```

src/lib/session-parser/validators.ts
```
1 | import { z, type ZodError } from 'zod';
2 | import {
3 |   ResponseItemSchema,
4 |   SessionMetaSchema,
5 |   type ResponseItemParsed,
6 |   type SessionMetaParsed,
7 | } from './schemas';
8 | import type { MessagePart } from '~/lib/viewer-types/events';
9 | 
10 | export type ParseFailureReason = 'invalid_json' | 'invalid_schema';
11 | 
12 | export type SafeResult<T> =
13 |   | { success: true; data: T }
14 |   | { success: false; error: ZodError | SyntaxError; reason: ParseFailureReason };
15 | 
16 | function tryParseJson(
17 |   line: string
18 | ): { success: true; data: unknown } | { success: false; error: SyntaxError } {
19 |   let s = line;
20 |   s = s.replace(/^\uFEFF/, '');
21 |   s = s.replace(/^$$\}'?,?\s*/, '');
22 |   const t = s.trim();
23 |   if (t === '[' || t === ']' || t === '],') {
24 |     return { success: true, data: { __csv_token__: t } };
25 |   }
26 |   try {
27 |     return { success: true, data: JSON.parse(s) };
28 |   } catch (e) {
29 |     if (/[,\s]$/.test(s)) {
30 |       try {
31 |         return { success: true, data: JSON.parse(s.replace(/[\s,]+$/, '')) };
32 |       } catch {}
33 |     }
34 |     return { success: false, error: e as SyntaxError };
35 |   }
36 | }
37 | 
38 | function isRecord(v: unknown): v is Record<string, unknown> {
39 |   return v !== null && typeof v === 'object' && !Array.isArray(v);
40 | }
41 | 
42 | export function parseSessionMetaLine(line: string): SafeResult<SessionMetaParsed> {
43 |   const j = tryParseJson(line);
44 |   if (!j.success) return { success: false, error: j.error, reason: 'invalid_json' };
45 |   let payload: unknown = j.data;
46 |   if (isRecord(payload)) {
47 |     const rt = (payload as any).record_type || (payload as any).recordType;
48 |     if (typeof rt === 'string' && rt.toLowerCase() === 'meta') {
49 |       const inner = (payload as any).record || (payload as any).data || (payload as any).payload;
50 |       if (inner && typeof inner === 'object') payload = inner;
51 |     }
52 |     const t = (payload as any).type;
53 |     if (typeof t === 'string' && t.toLowerCase() === 'session_meta') {
54 |       const inner = (payload as any).payload || (payload as any).data || (payload as any).record;
55 |       if (inner && typeof inner === 'object') payload = inner;
56 |     }
57 |   }
58 |   const res = SessionMetaSchema.safeParse(payload);
59 |   if (!res.success) return { success: false, error: res.error, reason: 'invalid_schema' };
60 |   return { success: true, data: res.data };
61 | }
62 | 
63 | export function parseResponseItemLine(line: string): SafeResult<ResponseItemParsed> {
64 |   const j = tryParseJson(line);
65 |   if (!j.success) return { success: false, error: j.error, reason: 'invalid_json' };
66 | 
67 |   let payload: unknown = j.data;
68 |   if (isRecord(payload)) {
69 |     const rt = (payload as any).record_type || (payload as any).recordType;
70 |     if (typeof rt === 'string') {
71 |       const rtl = rt.toLowerCase();
72 |       if (rtl === 'event' || rtl === 'trace' || rtl === 'log') {
73 |         const inner =
74 |           (payload as any).record ||
75 |           (payload as any).event ||
76 |           (payload as any).payload ||
77 |           (payload as any).data ||
78 |           (payload as any).item;
79 |         if (inner && typeof inner === 'object') payload = inner;
80 |       } else if (rtl === 'state') {
81 |         const fallback = { type: 'Other', data: payload };
82 |         const alt = ResponseItemSchema.safeParse(fallback);
83 |         if (alt.success) return { success: true, data: alt.data };
84 |       }
85 |     }
86 |     const t = (payload as any).type;
87 |     if (typeof t === 'string') {
88 |       const tl = t.toLowerCase();
89 |       if (tl === 'response_item' || tl === 'event_msg') {
90 |         const inner =
91 |           (payload as any).payload ||
92 |           (payload as any).data ||
93 |           (payload as any).record ||
94 |           (payload as any).event ||
95 |           (payload as any).item;
96 |         if (inner && typeof inner === 'object') {
97 |           if (typeof (payload as any).timestamp === 'string' && !(inner as any).at) {
98 |             (inner as any).at = (payload as any).timestamp;
99 |           }
100 |           payload = inner;
101 |         }
102 |       }
103 |     }
104 |   }
105 | 
106 |   if (isRecord(payload)) {
107 |     const normalized = normalizeForeignEventShape(payload);
108 |     if (normalized) {
109 |       const normRes = ResponseItemSchema.safeParse(normalized);
110 |       if (normRes.success) return { success: true, data: normRes.data };
111 |     }
112 |   }
113 | 
114 |   const res = ResponseItemSchema.safeParse(payload);
115 |   if (res.success) return { success: true, data: res.data };
116 | 
117 |   if (isRecord(payload)) {
118 |     const base = payload;
119 |     const t = typeof (base as any).type === 'string' ? (base as any).type : undefined;
120 |     const known = [
121 |       'Message',
122 |       'Reasoning',
123 |       'FunctionCall',
124 |       'LocalShellCall',
125 |       'WebSearchCall',
126 |       'CustomToolCall',
127 |       'FileChange',
128 |       'Other',
129 |     ];
130 |     if (!t || !known.includes(t)) {
131 |       const fallback = {
132 |         type: 'Other',
133 |         id: typeof base.id === 'string' ? base.id : undefined,
134 |         at: typeof base.at === 'string' ? base.at : undefined,
135 |         index: typeof base.index === 'number' ? base.index : undefined,
136 |         data: base,
137 |       };
138 |       const alt = ResponseItemSchema.safeParse(fallback);
139 |       if (alt.success) return { success: true, data: alt.data };
140 |     }
141 |   }
142 | 
143 |   return { success: false, error: res.error, reason: 'invalid_schema' };
144 | }
145 | 
146 | function asString(v: unknown): string | undefined {
147 |   if (typeof v === 'string') return v;
148 |   if (v == null) return undefined;
149 |   try {
150 |     return JSON.stringify(v);
151 |   } catch {
152 |     return String(v);
153 |   }
154 | }
155 | 
156 | function toCamel<T extends Record<string, any>>(obj: T): T {
157 |   const out: Record<string, any> = {};
158 |   for (const [k, v] of Object.entries(obj)) {
159 |     const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
160 |     out[ck] = v;
161 |   }
162 |   return out as T;
163 | }
164 | 
165 | function flattenContent(content: unknown): string | undefined;
166 | function flattenContent(content: unknown, preserveArray: false): string | undefined;
167 | function flattenContent(content: unknown, preserveArray: true): string | MessagePart[] | undefined;
168 | function flattenContent(
169 |   content: unknown,
170 |   preserveArray = false
171 | ): string | MessagePart[] | undefined {
172 |   if (typeof content === 'string') return content;
173 |   if (Array.isArray(content)) {
174 |     const parts: MessagePart[] = [];
175 |     for (const b of content) {
176 |       if (b && typeof b === 'object' && 'text' in (b as any)) {
177 |         parts.push({ type: 'text', text: String((b as any).text) });
178 |       } else {
179 |         const text = asString(b);
180 |         if (text != null) parts.push({ type: 'text', text });
181 |       }
182 |     }
183 |     return preserveArray ? parts : parts.map((p) => p.text).join('\n');
184 |   }
185 |   return asString(content);
186 | }
187 | 
188 | function extractReasoningContent(src: Record<string, any>): string | null {
189 |   let content = flattenContent(src.content);
190 |   if (typeof content === 'string' && content.trim() !== '') return content;
191 |   const summary = flattenContent(src.summary);
192 |   if (typeof summary === 'string' && summary.trim() !== '') return summary;
193 |   if ('encryptedContent' in src) return '[encrypted]';
194 |   return null;
195 | }
196 | 
197 | function tryParseJsonText(s?: string): unknown {
198 |   if (!s) return undefined;
199 |   try {
200 |     return JSON.parse(s);
201 |   } catch {
202 |     return s;
203 |   }
204 | }
205 | 
206 | function extractMessageFromResponse(resp: any): string | undefined {
207 |   if (!resp || typeof resp !== 'object') return undefined;
208 |   if (Array.isArray(resp.output_text) && resp.output_text.length) {
209 |     return resp.output_text
210 |       .map((x: any) => (typeof x === 'string' ? x : (asString(x) ?? '')))
211 |       .join('\n');
212 |   }
213 |   if (Array.isArray(resp.output)) {
214 |     const parts: string[] = [];
215 |     for (const seg of resp.output) {
216 |       if (Array.isArray(seg?.content)) {
217 |         for (const item of seg.content) {
218 |           if (item && typeof item === 'object') {
219 |             if ('text' in item && typeof item.text === 'string') parts.push(item.text);
220 |             else if ('type' in item && item.type === 'tool_output') {
221 |               const text = asString(item.output_text ?? item.output);
222 |               if (text) parts.push(text);
223 |             }
224 |           }
225 |         }
226 |       }
227 |     }
228 |     if (parts.length) return parts.join('\n');
229 |   }
230 |   if (typeof resp.text === 'string') return resp.text;
231 |   if (Array.isArray(resp.text)) {
232 |     return resp.text.map((x: any) => (typeof x === 'string' ? x : (asString(x) ?? ''))).join('\n');
233 |   }
234 |   return undefined;
235 | }
236 | 
237 | function normalizeForeignEventShape(payload: Record<string, any>) {
238 |   const next = toCamel(payload);
239 |   const type =
240 |     typeof next.type === 'string'
241 |       ? next.type
242 |       : typeof next.eventType === 'string'
243 |         ? next.eventType
244 |         : undefined;
245 |   if (!type) return null;
246 |   const normalized: Record<string, any> = { ...next, type };
247 | 
248 |   if (type === 'message' || type === 'chat_message') {
249 |     normalized.type = 'Message';
250 |     normalized.role = next.role ?? next.author ?? 'assistant';
251 |     if (typeof next.content === 'string') normalized.content = next.content;
252 |     else if (Array.isArray(next.content)) normalized.content = flattenContent(next.content, true);
253 |     else normalized.content = flattenContent(next.body, true) ?? flattenContent(next.payload);
254 |     if (!normalized.content) normalized.content = extractMessageFromResponse(next.response);
255 |     if (!normalized.content && typeof next.response_text === 'string')
256 |       normalized.content = next.response_text;
257 |     normalized.model = next.model ?? next.engine;
258 |   } else if (type === 'reasoning' || type === 'thought') {
259 |     normalized.type = 'Reasoning';
260 |     const content = extractReasoningContent(next);
261 |     if (content) normalized.content = content;
262 |   } else if (type === 'tool_call' || type === 'function_call') {
263 |     normalized.type = 'FunctionCall';
264 |     normalized.name = next.toolName ?? next.functionName ?? next.name ?? 'call';
265 |     normalized.args = next.args ?? tryParseJsonText(next.arguments);
266 |     normalized.result = next.result ?? next.output ?? tryParseJsonText(next.response);
267 |     normalized.durationMs = next.durationMs ?? next.latencyMs ?? next.duration;
268 |   } else if (type === 'shell' || type === 'command') {
269 |     normalized.type = 'LocalShellCall';
270 |     normalized.command = next.command ?? next.cmd ?? '';
271 |     normalized.cwd = next.cwd ?? next.directory;
272 |     normalized.stdout = next.stdout ?? next.output ?? extractMessageFromResponse(next.response);
273 |     normalized.stderr = next.stderr;
274 |     normalized.exitCode = next.exitCode ?? next.code;
275 |     normalized.durationMs = next.durationMs ?? next.runtimeMs;
276 |   } else if (type === 'file_change' || type === 'diff') {
277 |     normalized.type = 'FileChange';
278 |     normalized.path = next.path ?? next.file ?? next.filePath ?? 'unknown';
279 |     normalized.diff = next.diff ?? next.patch ?? next.content;
280 |   } else if (type === 'web_search') {
281 |     normalized.type = 'WebSearchCall';
282 |     normalized.query = next.query ?? next.prompt ?? '';
283 |     normalized.provider = next.provider ?? next.engine;
284 |     normalized.results = Array.isArray(next.results) ? next.results : undefined;
285 |   } else if (type === 'custom_tool') {
286 |     normalized.type = 'CustomToolCall';
287 |     normalized.toolName = next.toolName ?? next.name ?? 'tool';
288 |     normalized.input = next.input ?? next.payload;
289 |     normalized.output = next.output ?? next.result;
290 |   } else {
291 |     return null;
292 |   }
293 | 
294 |   return normalized;
295 | }
```

src/lib/viewer-types/events.ts
```
1 | import type { FilePath, ISO8601String, Id } from "./primitives"
2 | 
3 | /** Base event fields shared by all timeline items. */
4 | export interface BaseEvent {
5 |     readonly id?: Id<"event"> | string
6 |     readonly at?: ISO8601String | string
7 |     readonly index?: number
8 | }
9 | 
10 | /** Structured segments that make up a message. */
11 | export interface MessagePart {
12 |     readonly type: "text"
13 |     readonly text: string
14 | }
15 | 
16 | /** Message emitted by user/assistant/system. */
17 | export interface MessageEvent extends BaseEvent {
18 |     readonly type: "Message"
19 |     readonly role: "user" | "assistant" | "system" | string
20 |     readonly content: string | ReadonlyArray<MessagePart>
21 |     readonly model?: string
22 | }
23 | 
24 | /** Model reasoning trace (if available). */
25 | export interface ReasoningEvent extends BaseEvent {
26 |     readonly type: "Reasoning"
27 |     readonly content: string
28 | }
29 | 
30 | /** Generic function/tool call with structured arguments. */
31 | export interface FunctionCallEvent extends BaseEvent {
32 |     readonly type: "FunctionCall"
33 |     readonly name: string
34 |     readonly args?: unknown
35 |     readonly result?: unknown
36 |     readonly durationMs?: number
37 | }
38 | 
39 | /** Local shell command execution event. */
40 | export interface LocalShellCallEvent extends BaseEvent {
41 |     readonly type: "LocalShellCall"
42 |     readonly command: string
43 |     readonly cwd?: FilePath | string
44 |     readonly exitCode?: number
45 |     readonly stdout?: string
46 |     readonly stderr?: string
47 |     readonly durationMs?: number
48 | }
49 | 
50 | /** Web search action event. */
51 | export interface WebSearchCallEvent extends BaseEvent {
52 |     readonly type: "WebSearchCall"
53 |     readonly query: string
54 |     readonly provider?: string
55 |     readonly results?: ReadonlyArray<{ title?: string; url?: string; snippet?: string }>
56 |     readonly raw?: unknown
57 | }
58 | 
59 | /** Custom/plugin tool call envelope for unknown tool types. */
60 | export interface CustomToolCallEvent extends BaseEvent {
61 |     readonly type: "CustomToolCall"
62 |     readonly toolName: string
63 |     readonly input?: unknown
64 |     readonly output?: unknown
65 | }
66 | 
67 | /** File change event referencing modified paths. */
68 | export interface FileChangeEvent extends BaseEvent {
69 |     readonly type: "FileChange"
70 |     readonly path: FilePath | string
71 |     readonly diff?: string
72 | }
73 | 
74 | /** Fallback for unrecognized records. Preserves the raw payload. */
75 | export interface OtherEvent extends BaseEvent {
76 |     readonly type: "Other"
77 |     readonly data?: unknown
78 | }
79 | 
80 | /** Discriminated union of all supported event variants. */
81 | export type ResponseItem =
82 |     | MessageEvent
83 |     | ReasoningEvent
84 |     | FunctionCallEvent
85 |     | LocalShellCallEvent
86 |     | WebSearchCallEvent
87 |     | CustomToolCallEvent
88 |     | FileChangeEvent
89 |     | OtherEvent
90 | 
```

src/lib/viewer-types/git.ts
```
1 | /** Minimal git info attached to session metadata. */
2 | export interface GitInfo {
3 |     readonly repo?: string
4 |     readonly branch?: string
5 |     readonly commit?: string
6 |     readonly remote?: string
7 |     readonly dirty?: boolean
8 | }
9 | 
```

src/lib/viewer-types/index.ts
```
1 | export * from "./primitives"
2 | export * from "./git"
3 | export * from "./events"
4 | export * from "./session"
5 | 
```

src/lib/viewer-types/primitives.ts
```
1 | /** Primitive and branded types used across the viewer domain. */
2 | 
3 | /** ISO-8601 timestamp string, e.g., 2025-09-08T17:12:03.123Z */
4 | export type ISO8601String = string & { readonly __brand: "iso8601" }
5 | 
6 | /** Opaque ID string branding to avoid mixing different id kinds. */
7 | export type Id<T extends string> = string & { readonly __brand: T }
8 | 
9 | /** File system path (posix-like). */
10 | export type FilePath = string & { readonly __brand: "filepath" }
11 | 
```

src/lib/viewer-types/session.ts
```
1 | import type { ResponseItem } from "./events"
2 | import type { FilePath, ISO8601String, Id } from "./primitives"
3 | import type { GitInfo } from "./git"
4 | 
5 | /** Session-level metadata parsed from line 1 of the JSONL file. */
6 | export interface SessionMeta {
7 |     readonly id: Id<"session"> | string
8 |     readonly timestamp: ISO8601String | string
9 |     readonly instructions?: string
10 |     readonly git?: GitInfo
11 |     /** Optional schema versioning to mitigate drift. */
12 |     readonly version?: number | string
13 | }
14 | 
15 | /** A single file change captured during the session. */
16 | export interface FileChange {
17 |     readonly path: FilePath | string
18 |     readonly diff?: string
19 |     readonly patches?: readonly string[]
20 | }
21 | 
22 | /** Artifact generated during the session (e.g., export, compiled asset). */
23 | export interface Artifact {
24 |     readonly name: string
25 |     readonly path?: FilePath | string
26 |     readonly contentType?: string
27 |     readonly bytes?: Uint8Array
28 | }
29 | 
30 | /** Parsed session bundle returned by the parser. */
31 | export interface ParsedSession {
32 |     readonly meta: SessionMeta
33 |     readonly events: readonly ResponseItem[]
34 |     readonly fileChanges: readonly FileChange[]
35 |     readonly artifacts: readonly Artifact[]
36 | }
37 | 
38 | export interface SessionPreviewSummary {
39 |     readonly path: FilePath | string
40 |     readonly byteLength: number
41 |     readonly meta?: SessionMeta
42 |     readonly repoName?: string
43 |     readonly firstUserMessage?: string
44 |     readonly firstTimestamp?: ISO8601String | string
45 |     readonly lastTimestamp?: ISO8601String | string
46 |     readonly agents: readonly string[]
47 |     readonly errors: readonly string[]
48 |     readonly tools: readonly string[]
49 | }
50 | 
```

src/server/function/CLAUDE.md
```
1 | 
2 | 
3 | <!-- Source: .ruler/tanstack-server-fn.md -->
4 | 
5 | # TanStack Server Functions
6 | 
7 | Server-only logic callable anywhere (loaders, hooks, components, routes, client). File top level. No stable public URL. Access request context, headers/cookies, env secrets. Return primitives/JSON/Response, throw redirect/notFound. Framework-agnostic HTTP, no serial bottlenecks.
8 | 
9 | How it works: Server bundle executes. Client strips and proxies via fetch. RPC but isomorphic. Middleware supported.
10 | 
11 | Import: import { createServerFn } from '@tanstack/react-start'
12 | 
13 | Define: createServerFn({ method: 'GET'|'POST' }).handler(...). Callable from server/client/other server functions. RC1: response modes removed; return Response object for custom behavior.
14 | 
15 | Params: single param may be primitive, Array, Object, FormData, ReadableStream, Promise. Typical { data, signal? }.
16 | 
17 | Validation: .inputValidator enforces runtime input, drives types. Works with Zod. Transformed output → ctx.data. Identity validator for typed I/O without checks. Use .inputValidator() not deprecated .validator().
18 | 
19 | JSON/FormData: supports JSON. FormData requires encType="multipart/form-data".
20 | 
21 | Context (from @tanstack/react-start/server, h3): RC1 renames: getWebRequest→getRequest, getHeaders→getRequestHeaders, getHeader→getRequestHeader, setHeaders→setResponseHeaders, setHeader→setResponseHeader, parseCookies→getCookies. Available: getRequest, getRequestHeaders|getRequestHeader, setResponseHeader, setResponseStatus, getCookies, sessions, multipart, custom context.
22 | 
23 | Returns: primitives/JSON, redirect/notFound, or Response. Return Response directly for custom.
24 | 
25 | Errors: thrown errors → 500 JSON; catch as needed.
26 | 
27 | Cancellation: AbortSignal supported. Server notified on disconnect.
28 | 
29 | Integration: route lifecycles auto-handle redirect/notFound. Components use useServerFn. Elsewhere handle manually.
30 | 
31 | Redirects: use redirect from @tanstack/react-router with to|href, status, headers, path/search/hash/params. SSR: 302. Client auto-handles. Don't use sendRedirect.
32 | 
33 | Not Found: use notFound() for router 404 in lifecycles.
34 | 
35 | No-JS: execute via HTML form with serverFn.url. Pass args via inputs. Use encType for multipart. Cannot read return value; redirect or reload via loader.
36 | 
37 | Static functions: use staticFunctionMiddleware from @tanstack/start-static-server-functions. Must be final middleware. Caches build-time as static JSON (key: function ID+params hash). Used in prerender/hydration. Client fetches static JSON. Default cache: fs+fetch. Override: createServerFnStaticCache + setServerFnStaticCache.
38 | 
39 | Example:
40 | ```typescript
41 | import { createServerFn } from '@tanstack/react-start'
42 | import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
43 | 
44 | const myServerFn = createServerFn({ method: 'GET' })
45 |   .middleware([staticFunctionMiddleware])
46 |   .handler(async () => 'Hello, world!')
47 | ```
48 | 
49 | Compilation: injects use server if missing. Client extracts to server bundle, proxies. Server runs as-is. Dead-code elimination.
50 | 
51 | Notes: inspired by tRPC. Always invoke normalizeInput(schema, preprocess?) inside handler. Don't rely on .validator(). When writing preprocess, unwrap wrappers ({ data: ... }, SuperJSON $values, stringified arrays) so validation runs on real payload.
```

src/server/function/todos.ts
```
1 | import { createServerFn } from '@tanstack/react-start';
2 | import { z } from 'zod';
3 | 
4 | // Simple in-memory store for demo (in production, use a database)
5 | const todos: Array<{ id: string; text: string; completed: boolean }> = [];
6 | 
7 | const todoSchema = z.object({
8 |   text: z.string().min(1, 'Todo text is required'),
9 | });
10 | 
11 | export const getTodos = createServerFn({ method: 'GET' }).handler(async () => {
12 |   return todos;
13 | });
14 | 
15 | export const createTodo = createServerFn({ method: 'POST' })
16 |   .inputValidator((data: unknown) => {
17 |     return todoSchema.parse(data);
18 |   })
19 |   .handler(async ({ data }) => {
20 |     const newTodo = {
21 |       id: crypto.randomUUID(),
22 |       text: data.text,
23 |       completed: false,
24 |     };
25 |     todos.push(newTodo);
26 |     return newTodo;
27 |   });
28 | 
29 | export const toggleTodo = createServerFn({ method: 'POST' })
30 |   .inputValidator((data: unknown) => {
31 |     return z.object({ id: z.string() }).parse(data);
32 |   })
33 |   .handler(async ({ data }) => {
34 |     const todo = todos.find((t) => t.id === data.id);
35 |     if (todo) {
36 |       todo.completed = !todo.completed;
37 |       return todo;
38 |     }
39 |     throw new Error('Todo not found');
40 |   });
41 | 
42 | export const deleteTodo = createServerFn({ method: 'POST' })
43 |   .inputValidator((data: unknown) => {
44 |     return z.object({ id: z.string() }).parse(data);
45 |   })
46 |   .handler(async ({ data }) => {
47 |     const index = todos.findIndex((t) => t.id === data.id);
48 |     if (index !== -1) {
49 |       todos.splice(index, 1);
50 |       return { success: true };
51 |     }
52 |     throw new Error('Todo not found');
53 |   });
```

src/db/schema/.ruler/db.schema.md
```
1 | - Schema files have always this naming pattern `<name>.schema.ts`
2 | 
```

src/routes/(site)/viewer/index.tsx
```
```

src/server/function/.ruler/tanstack-server-fn.md
```
1 | # TanStack Server Functions
2 | 
3 | Server-only logic callable anywhere (loaders, hooks, components, routes, client). File top level. No stable public URL. Access request context, headers/cookies, env secrets. Return primitives/JSON/Response, throw redirect/notFound. Framework-agnostic HTTP, no serial bottlenecks.
4 | 
5 | How it works: Server bundle executes. Client strips and proxies via fetch. RPC but isomorphic. Middleware supported.
6 | 
7 | Import: import { createServerFn } from '@tanstack/react-start'
8 | 
9 | Define: createServerFn({ method: 'GET'|'POST' }).handler(...). Callable from server/client/other server functions. RC1: response modes removed; return Response object for custom behavior.
10 | 
11 | Params: single param may be primitive, Array, Object, FormData, ReadableStream, Promise. Typical { data, signal? }.
12 | 
13 | Validation: .inputValidator enforces runtime input, drives types. Works with Zod. Transformed output → ctx.data. Identity validator for typed I/O without checks. Use .inputValidator() not deprecated .validator().
14 | 
15 | JSON/FormData: supports JSON. FormData requires encType="multipart/form-data".
16 | 
17 | Context (from @tanstack/react-start/server, h3): RC1 renames: getWebRequest→getRequest, getHeaders→getRequestHeaders, getHeader→getRequestHeader, setHeaders→setResponseHeaders, setHeader→setResponseHeader, parseCookies→getCookies. Available: getRequest, getRequestHeaders|getRequestHeader, setResponseHeader, setResponseStatus, getCookies, sessions, multipart, custom context.
18 | 
19 | Returns: primitives/JSON, redirect/notFound, or Response. Return Response directly for custom.
20 | 
21 | Errors: thrown errors → 500 JSON; catch as needed.
22 | 
23 | Cancellation: AbortSignal supported. Server notified on disconnect.
24 | 
25 | Integration: route lifecycles auto-handle redirect/notFound. Components use useServerFn. Elsewhere handle manually.
26 | 
27 | Redirects: use redirect from @tanstack/react-router with to|href, status, headers, path/search/hash/params. SSR: 302. Client auto-handles. Don't use sendRedirect.
28 | 
29 | Not Found: use notFound() for router 404 in lifecycles.
30 | 
31 | No-JS: execute via HTML form with serverFn.url. Pass args via inputs. Use encType for multipart. Cannot read return value; redirect or reload via loader.
32 | 
33 | Static functions: use staticFunctionMiddleware from @tanstack/start-static-server-functions. Must be final middleware. Caches build-time as static JSON (key: function ID+params hash). Used in prerender/hydration. Client fetches static JSON. Default cache: fs+fetch. Override: createServerFnStaticCache + setServerFnStaticCache.
34 | 
35 | Example:
36 | ```typescript
37 | import { createServerFn } from '@tanstack/react-start'
38 | import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
39 | 
40 | const myServerFn = createServerFn({ method: 'GET' })
41 |   .middleware([staticFunctionMiddleware])
42 |   .handler(async () => 'Hello, world!')
43 | ```
44 | 
45 | Compilation: injects use server if missing. Client extracts to server bundle, proxies. Server runs as-is. Dead-code elimination.
46 | 
47 | Notes: inspired by tRPC. Always invoke normalizeInput(schema, preprocess?) inside handler. Don't rely on .validator(). When writing preprocess, unwrap wrappers ({ data: ... }, SuperJSON $values, stringified arrays) so validation runs on real payload.
```

src/routes/.cursor/rules/ruler_cursor_instructions.mdc
```
1 | ---
2 | alwaysApply: true
3 | ---
4 | <!-- Source: .ruler/tanstack-server-routes.md -->
5 | 
6 | # Server Routes — TanStack Start
7 | 
8 | Server HTTP endpoints for requests, forms, auth. Location: ./src/routes. Export Route to create API route. ServerRoute and Route can coexist in same file.
9 | 
10 | Routing mirrors TanStack Router: dynamic $id, splat $, escaped [.], nested dirs/dotted filenames map to paths. One handler per resolved path (duplicates error). Examples: users.ts → /users; users/$id.ts → /users/$id; api/file/$.ts → /api/file/$; my-script[.]js.ts → /my-script.js.
11 | 
12 | Middleware: pathless layout routes add group middleware; break-out routes skip parents.
13 | 
14 | RC1 server entry signature: export default { fetch(req: Request): Promise<Response> { ... } }
15 | 
16 | Define handlers: use createFileRoute() from @tanstack/react-router with server: { handlers: { ... } }. Methods per HTTP verb, with optional middleware builder. createServerFileRoute removed in RC1; use createFileRoute with server property.
17 | 
18 | Handler receives { request, params, context }; return Response or Promise<Response>. Helpers from @tanstack/react-start allowed.
19 | 
20 | Bodies: request.json(), request.text(), request.formData() for POST/PUT/PATCH/DELETE.
21 | 
22 | JSON/status/headers: return JSON manually or via json(); set status via Response init or setResponseStatus(); set headers via Response init or setHeaders().
23 | 
24 | Params: /users/$id → params.id; /users/$id/posts/$postId → params.id + params.postId; /file/$ → params._splat.
25 | 
26 | Unique path rule: one file per resolved path; users.ts vs users.index.ts vs users/index.ts conflicts.
27 | 
28 | RC1 structure:
29 | ```typescript
30 | import { createFileRoute } from '@tanstack/react-router'
31 | 
32 | export const Route = createFileRoute('/api/example')({
33 |   server: {
34 |     handlers: {
35 |       GET: ({ request }) => new Response('Hello'),
36 |       POST: ({ request }) => new Response('Created', { status: 201 })
37 |     }
38 |   }
39 | })
40 | ```
```

src/db/schema/.cursor/rules/ruler_cursor_instructions.mdc
```
1 | ---
2 | alwaysApply: true
3 | ---
4 | <!-- Source: .ruler/db.schema.md -->
5 | 
6 | - Schema files have always this naming pattern `<name>.schema.ts`
```

src/server/function/.cursor/rules/ruler_cursor_instructions.mdc
```
1 | ---
2 | alwaysApply: true
3 | ---
4 | <!-- Source: .ruler/tanstack-server-fn.md -->
5 | 
6 | # TanStack Server Functions
7 | 
8 | Server-only logic callable anywhere (loaders, hooks, components, routes, client). File top level. No stable public URL. Access request context, headers/cookies, env secrets. Return primitives/JSON/Response, throw redirect/notFound. Framework-agnostic HTTP, no serial bottlenecks.
9 | 
10 | How it works: Server bundle executes. Client strips and proxies via fetch. RPC but isomorphic. Middleware supported.
11 | 
12 | Import: import { createServerFn } from '@tanstack/react-start'
13 | 
14 | Define: createServerFn({ method: 'GET'|'POST' }).handler(...). Callable from server/client/other server functions. RC1: response modes removed; return Response object for custom behavior.
15 | 
16 | Params: single param may be primitive, Array, Object, FormData, ReadableStream, Promise. Typical { data, signal? }.
17 | 
18 | Validation: .inputValidator enforces runtime input, drives types. Works with Zod. Transformed output → ctx.data. Identity validator for typed I/O without checks. Use .inputValidator() not deprecated .validator().
19 | 
20 | JSON/FormData: supports JSON. FormData requires encType="multipart/form-data".
21 | 
22 | Context (from @tanstack/react-start/server, h3): RC1 renames: getWebRequest→getRequest, getHeaders→getRequestHeaders, getHeader→getRequestHeader, setHeaders→setResponseHeaders, setHeader→setResponseHeader, parseCookies→getCookies. Available: getRequest, getRequestHeaders|getRequestHeader, setResponseHeader, setResponseStatus, getCookies, sessions, multipart, custom context.
23 | 
24 | Returns: primitives/JSON, redirect/notFound, or Response. Return Response directly for custom.
25 | 
26 | Errors: thrown errors → 500 JSON; catch as needed.
27 | 
28 | Cancellation: AbortSignal supported. Server notified on disconnect.
29 | 
30 | Integration: route lifecycles auto-handle redirect/notFound. Components use useServerFn. Elsewhere handle manually.
31 | 
32 | Redirects: use redirect from @tanstack/react-router with to|href, status, headers, path/search/hash/params. SSR: 302. Client auto-handles. Don't use sendRedirect.
33 | 
34 | Not Found: use notFound() for router 404 in lifecycles.
35 | 
36 | No-JS: execute via HTML form with serverFn.url. Pass args via inputs. Use encType for multipart. Cannot read return value; redirect or reload via loader.
37 | 
38 | Static functions: use staticFunctionMiddleware from @tanstack/start-static-server-functions. Must be final middleware. Caches build-time as static JSON (key: function ID+params hash). Used in prerender/hydration. Client fetches static JSON. Default cache: fs+fetch. Override: createServerFnStaticCache + setServerFnStaticCache.
39 | 
40 | Example:
41 | ```typescript
42 | import { createServerFn } from '@tanstack/react-start'
43 | import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
44 | 
45 | const myServerFn = createServerFn({ method: 'GET' })
46 |   .middleware([staticFunctionMiddleware])
47 |   .handler(async () => 'Hello, world!')
48 | ```
49 | 
50 | Compilation: injects use server if missing. Client extracts to server bundle, proxies. Server runs as-is. Dead-code elimination.
51 | 
52 | Notes: inspired by tRPC. Always invoke normalizeInput(schema, preprocess?) inside handler. Don't rely on .validator(). When writing preprocess, unwrap wrappers ({ data: ... }, SuperJSON $values, stringified arrays) so validation runs on real payload.
```
