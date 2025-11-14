You are a senior developer. You produce optimized, maintainable code that follows best practices. 

Your task is to review the current codebase and fix the current issues.

Current Issue:
<issue>
{{MESSAGE}}
</issue>

Rules:
- Keep your suggestions concise and focused. Avoid unnecessary explanations or fluff. 
- Your output should be a series of specific, actionable changes.

When approaching this task:
1. Carefully review the provided code.
2. Identify the area thats raising this issue or error and provide a fix.
3. Consider best practices for the specific programming language used.

For each suggested change, provide:
1. A short description of the change (one line maximum).
2. The modified code block.

Use the following format for your output:

[Short Description]
```[language]:[path/to/file]
[code block]
```

Begin fixing the codebase provide your solutions.

My current codebase:
<current_codebase>
Project Structure:
├── AGENTS.md
├── CHANGELOG.md
├── CLAUDE.md
├── CLAUDE.md.bak
├── LICENSE
├── README.md
├── artifacts
│   └── collect_AGENTS_md_rsync.log
├── codefetch
│   ├── instructa-starter-min.md
│   └── routes.md
├── codefetch.config.mjs
├── components.json
├── docs
│   ├── avoid-useEffect-summary.md
│   ├── migration-plan.md
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
├── scripts
│   └── agents.md.sh
├── src
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── CLAUDE.md.bak
│   ├── entry-client.tsx
│   ├── routeTree.gen.ts
│   ├── router.tsx
│   ├── start.ts
│   ├── tanstack-start.d.ts
├── tests
│   └── setup.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts


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

src/routes/viewer.tsx
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
17 | export const Route = createFileRoute("/viewer")({
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
86 |                     This is the first slice of the migration: project files and session logs are fetched in the route loader so hydration never
87 |                     flashes loading spinners. Drop in a session to stream its timeline, then iterate with the chat dock.
88 |                 </p>
89 |             </section>
90 | 
91 |             <DiscoveryPanel
92 |                 projectFiles={data.projectFiles}
93 |                 sessionAssets={data.sessionAssets}
94 |                 query={search.query}
95 |                 onQueryChange={handleQueryChange}
96 |             />
97 | 
98 |             <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
99 |                 <div className="flex flex-col gap-6">
100 |                     <div className="grid gap-4 md:grid-cols-[2fr,auto]">
101 |                         <DropZone onFile={handleFile} className="md:col-span-1" />
102 |                         <div className="flex flex-col gap-4 rounded-xl border bg-card/70 p-5">
103 |                             <div className="space-y-2">
104 |                                 <p className="text-sm font-semibold">Session controls</p>
105 |                                 <p className="text-xs text-muted-foreground">Upload a .jsonl/.ndjson session log to hydrate the timeline.</p>
106 |                             </div>
107 |                             <FileInputButton onFile={handleFile} disabled={loader.state.phase === "parsing"} />
108 |                             <dl className="space-y-2 text-sm">
109 |                                 <div className="flex items-center justify-between">
110 |                                     <dt className="text-muted-foreground">Status</dt>
111 |                                     <dd>{progressLabel}</dd>
112 |                                 </div>
113 |                                 {meta?.timestamp ? (
114 |                                     <div className="flex items-center justify-between">
115 |                                         <dt className="text-muted-foreground">Timestamp</dt>
116 |                                         <dd>{new Date(meta.timestamp).toLocaleString()}</dd>
117 |                                     </div>
118 |                                 ) : null}
119 |                                 {meta?.git?.repo ? (
120 |                                     <div className="flex items-center justify-between">
121 |                                         <dt className="text-muted-foreground">Repo</dt>
122 |                                         <dd>{meta.git.repo}</dd>
123 |                                     </div>
124 |                                 ) : null}
125 |                             </dl>
126 |                         </div>
127 |                     </div>
128 | 
129 |                     <div className="rounded-2xl border p-4">
130 |                         <div className="mb-4 flex items-center justify-between">
131 |                             <div>
132 |                                 <p className="text-sm font-semibold">Timeline</p>
133 |                                 <p className="text-xs text-muted-foreground">Virtualized list of parsed events.</p>
134 |                             </div>
135 |                         </div>
136 |                         {timelineContent}
137 |                     </div>
138 |                 </div>
139 | 
140 |                 <ChatDock />
141 |             </section>
142 |         </main>
143 |     )
144 | }
```

src/routes/(marketing)/docs.tsx
```
1 | import { createFileRoute } from '@tanstack/react-router'
2 | export const Route = createFileRoute('/(marketing)/docs')({
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

src/routes/(marketing)/index.tsx
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
16 | export const Route = createFileRoute('/(marketing)/')({
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

src/routes/(marketing)/route.tsx
```
1 | import { Outlet, createFileRoute } from '@tanstack/react-router';
2 | import { Suspense } from 'react';
3 | import { Header } from '~/components/Header';
4 | 
5 | export const Route = createFileRoute('/(marketing)')({
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

</current_codebase>
