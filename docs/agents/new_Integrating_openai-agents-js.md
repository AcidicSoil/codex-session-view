## You asked:

package.json

File

src.md

File

README.md

File

How can I wire in and utilize the openai-agents-js framework with my existing providers for my app ? `https://github.com/AcidicSoil/codex-session-view` `https://github.com/openai/openai-agents-js/tree/main/examples/model-providers` `https://github.com/openai/openai-agents-js/tree/main/examples` I want to utilize the new tanstack ai framework as well so keep that in mind.

---

## ChatGPT Replied:

Looked for available tools

Thought for 6s

Called tool

Called tool

Thought for 1m 3s

Use AI SDK as the shared provider layer, put TanStack AI on the UI + app-chat path, and embed OpenAI Agents as a server-side orchestration layer that reuses the same providers through the Agents AI SDK adapter. This matches your dependency set and architecture direction in this repo.

package

README

[OpenAI GitHub](https://openai.github.io/openai-agents-js/extensions/ai-sdk?utm_source=chatgpt.com) [TanStack](https://tanstack.com/ai/latest/docs/getting-started/overview?utm_source=chatgpt.com)

Target architecture
-------------------

1.  **Providers (single source of truth)**
    

*   Keep your existing Vercel AI SDK providers:
    
    *   `@ai-sdk/openai-compatible` (LM Studio style endpoints),
        
    *   `@ai-sdk/google`,
        
    *   `ai-sdk-provider-codex-cli`,
        
    *   `ai-sdk-provider-gemini-cli`,
        
    *   plus anything else you already mount.
        
        package
        
*   The OpenAI Agents SDK can consume these via `@openai/agents-extensions` `aisdk()` adapter. This adapter supports AI SDK v5 provider v2 modules. [OpenAI GitHub](https://openai.github.io/openai-agents-js/extensions/ai-sdk?utm_source=chatgpt.com)
    

2.  **Interactive app chat**
    

*   Use **TanStack AI** for ChatDock-style experiences:
    
    *   `@tanstack/ai` core,
        
    *   `@tanstack/ai-react` hooks,
        
    *   `@tanstack/ai-openai` or custom adapters as needed.
        
        package
        
        [TanStack+1](https://tanstack.com/ai?utm_source=chatgpt.com)
        
*   Keep provider-specific code out of components and route through unified chat engines/tools, aligning with your local AI rules.
    
    src
    

3.  **Agentic/multi-step workflows**
    

*   Use **openai-agents-js** on the server for:
    
    *   multi-agent handoffs,
        
    *   guardrails,
        
    *   resumable runs,
        
    *   tracing,
        
    *   voice/realtime if you add it later. [GitHub+1](https://github.com/openai/openai-agents-js?utm_source=chatgpt.com)
        
*   Expose these workflows to TanStack AI as **server tools**.
    

This gives one provider layer, two execution surfaces:

*   TanStack AI = “chat UI + tool-first app logic”
    
*   OpenAI Agents = “orchestration engine invoked by tools”
    

Concrete wiring steps
---------------------

### 1) Add Agents packages

    pnpm add @openai/agents @openai/agents-extensions
    

### 2) Create a model factory that wraps your existing AI SDK providers

Create `src/ai/providers/agentsModels.server.ts`:

    import { aisdk } from "@openai/agents-extensions";
    
    // Example imports — adjust to your actual provider entrypoints:
    import { openaiCompatible } from "@ai-sdk/openai-compatible";
    import { google } from "@ai-sdk/google";
    // import { codexCli } from "ai-sdk-provider-codex-cli";
    // import { geminiCli } from "ai-sdk-provider-gemini-cli";
    
    const lmstudio = openaiCompatible({
      baseURL: process.env.AI_LMSTUDIO_BASE_URL!,
      // headers/auth if required by your local setup
    });
    
    export function getAgentsModel(modelId: string) {
      // Route by prefix or env config used by your app
      if (modelId.startsWith("lmstudio:")) {
        const name = modelId.replace("lmstudio:", "");
        return aisdk(lmstudio(name));
      }
    
      if (modelId.startsWith("google:")) {
        const name = modelId.replace("google:", "");
        return aisdk(google(name));
      }
    
      // Add codex-cli, gemini-cli, etc. similarly
    
      // Default fallback
      return aisdk(lmstudio("local-default"));
    }
    

This reuses your existing provider strategy referenced in README and scripts.

README

package

[OpenAI GitHub](https://openai.github.io/openai-agents-js/extensions/ai-sdk?utm_source=chatgpt.com)

### 3) Build an Agents-backed server function for complex analyses

Create `src/server/agents/runSessionCoach.server.ts`:

    import { Agent, run } from "@openai/agents";
    import { z } from "zod";
    import { getAgentsModel } from "~/ai/providers/agentsModels.server";
    
    export const SessionSummarySchema = z.object({
      goals: z.array(z.string()),
      mainChanges: z.array(z.string()),
      issues: z.array(z.string()),
      followUps: z.array(z.string()),
    });
    
    export async function runSessionSummaryAgent(input: {
      modelId: string;
      sessionJson: unknown;
    }) {
      const model = getAgentsModel(input.modelId);
    
      const agent = new Agent({
        name: "Session Coach - Summary",
        instructions:
          "Analyze the session JSON and produce a structured summary.",
        model,
        outputType: SessionSummarySchema, // Agents supports schema-validated outputs
      });
    
      const result = await run(agent, JSON.stringify(input.sessionJson));
      return result.finalOutput;
    }
    

Agents supports structured outputs, tool-calling, guardrails, and tracing out of the box. [GitHub+1](https://github.com/openai/openai-agents-js?utm_source=chatgpt.com)

### 4) Expose that as a TanStack AI server tool

Create `src/ai/tools/sessionCoach.server.ts`:

    import { toolDefinition } from "@tanstack/ai";
    import { z } from "zod";
    import { runSessionSummaryAgent } from "~/server/agents/runSessionCoach.server";
    
    export const sessionSummaryTool = toolDefinition({
      name: "session_summary",
      description: "Generate a structured summary of a Codex session JSON.",
      inputSchema: z.object({
        modelId: z.string(),
        sessionJson: z.unknown(),
      }),
      outputSchema: z.object({
        goals: z.array(z.string()),
        mainChanges: z.array(z.string()),
        issues: z.array(z.string()),
        followUps: z.array(z.string()),
      }),
    }).server(async ({ input }) => {
      return await runSessionSummaryAgent(input);
    });
    

This follows your local rule set: tools hold side effects and business logic; UI stays provider-agnostic.

src

[TanStack+1](https://tanstack.com/ai/latest/docs/getting-started/overview?utm_source=chatgpt.com)

### 5) Wire TanStack AI chat route to include this tool

In your server chat handler (e.g., `/api/chatbot/stream` equivalent), use TanStack AI’s `chat` with tools:

    import { chat } from "@tanstack/ai";
    import { openai } from "@tanstack/ai-openai";
    import { sessionSummaryTool } from "~/ai/tools/sessionCoach.server";
    
    const adapter = openai({
      apiKey: process.env.OPENAI_API_KEY,
      // Or point at an OpenAI-compatible baseURL if your adapter supports it
    });
    
    export function streamChat(messages: any[], model = "gpt-5") {
      return chat({
        adapter,
        model,
        messages,
        tools: [sessionSummaryTool],
        agentLoopStrategy: "maxIterations(3)", // use the exact API from your current TanStack AI version
      });
    }
    

TanStack AI provides type-safe tools, automatic execution, and streaming across providers. [TanStack+2TanStack+2](https://tanstack.com/ai?utm_source=chatgpt.com)

### 6) Keep your existing ChatDock UX unchanged

*   Replace any direct provider calls inside ChatDock-related code with TanStack AI `useChat` + your server transport.
    
*   Use the tool results to fill the existing Summary/Commits panels described in your README.
    
    README
    
    src
    

Provider-unification outcome
----------------------------

After this wiring:

*   **One configuration surface** for models:
    
    *   Your existing environment-driven model IDs (`AI_SESSION_DEFAULT_MODEL`, etc.).
        
        README
        
*   **Two execution engines consuming the same providers**:
    
    *   TanStack AI for interactive chat.
        
    *   OpenAI Agents for multi-agent/guardrail-heavy tasks invoked by tools, using AI SDK adapter. [OpenAI GitHub+1](https://openai.github.io/openai-agents-js/extensions/ai-sdk?utm_source=chatgpt.com)
        

Practical placement in this repo
--------------------------------

Add folders:

    src/ai/
      providers/
        agentsModels.server.ts
      tools/
        sessionCoach.server.ts
    
    src/server/
      agents/
        runSessionCoach.server.ts
    

Keep this boundary:

*   Components import only TanStack AI hooks/types.
    
*   Providers and Agents stay server-only.
    
*   No secrets in client bundles.
    
    src
    

Version reality check
---------------------

*   Your `@tanstack/ai*` packages are at `^0.0.1`, labeled alpha in upstream docs. Expect API churn.
    
    package
    
    [TanStack+1](https://tanstack.com/ai?utm_source=chatgpt.com)
    
*   The Agents AI SDK adapter is beta. Expect edge cases with smaller providers. [OpenAI GitHub](https://openai.github.io/openai-agents-js/extensions/ai-sdk?utm_source=chatgpt.com)

---

