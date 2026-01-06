Direct answer (1–4 bullets, evidence-cited)

Current analysisType contract is narrowly defined and internally consistent with the server handler, but it’s only “complete” if product goals are exactly these three analyses. analyzeInputSchema only permits ['summary', 'commits', 'hook-discovery'] and defaults to 'summary'. (src/server/chatbot-api/schema.ts: analysisType: z.enum(['summary', 'commits', 'hook-discovery']).default('summary'))

Defaults are coherent for the “happy path”: default mode: 'session' and analysisType: 'summary' routes to a built-in summary generator (no model call) and returns { summaryMarkdown }. (schema.ts defaults; src/server/chatbot-api/analyze.ts: if (input.analysisType === 'summary') ... return jsonResponse({ summaryMarkdown }))

There’s a contract/behavior mismatch around repo binding: handleAnalyzeChat requires a repo binding for all analysis types, but the log message says “cannot run Hook Discovery,” even though the early return blocks summary and commits too. If product goals include “summary without repo binding,” the current behavior is not aligned. (src/server/chatbot-api/analyze.ts: early if (!repoBinding) return ... 422 before branching on analysisType)

prompt is only honored for summary (promptSummary: input.prompt) and is ignored for commits and hook-discovery in this handler, which may be surprising for UI if it sends prompts for other analysis types. (src/server/chatbot-api/analyze.ts: promptSummary: input.prompt only in the summary branch; generateSessionAnalysis({ ..., analysisType: input.analysisType, ... }) does not include input.prompt)

Risks/unknowns (bullets)

Completeness relative to “current product goals” cannot be confirmed from these files alone: we need to see what the UI exposes (buttons/menus), what downstream expects, and whether other analysis types are planned but not yet wired.

Repo-binding gating may be an unintended product regression if summary/commits are meant to work on session data alone (snapshot + misalignments), since the required data is loaded after the repo-binding guard, but would not necessarily require repo metadata.

Extensibility risk: the handler treats “anything other than summary/commits” as the model-driven path; since the schema currently prevents any other value, this is fine today, but adding new analysis types later will silently route into the model path unless explicitly branched.

Next smallest concrete experiment (1 action)

Run: ck --regex "analysisType" src
(Broader than the suggested scope so you capture client/UI call sites and any other server modules that construct or depend on analysisType beyond src/server/chatbot-api.)

If evidence is insufficient, name the exact missing file/path pattern(s) to attach next.

Frontend / request initiators: src/routes/** and src/features/** files that call the analyze endpoint (look for fetch(, handleAnalyzeChat, /analyze, or AnalyzeInput usage).

API route wiring / validation location: the file that receives the HTTP request and applies analyzeInputSchema (often something like src/server/chatbot-api/*.server.ts, src/routes/**/api/**, or equivalent).

Downstream model-analysis implementation: src/server/lib/aiRuntime.ts (for generateSessionAnalysis) to see what analysisType values it expects and whether additional types already exist there.
