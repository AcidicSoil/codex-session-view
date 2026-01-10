# You Asked:

How can I build a Research Agent with Deep Agents into my app? 

`https://www.youtube.com/watch?v=5tn6O0uXYEg`

# Gemini Responded:

To build a Research Agent using the **Deep Agents** harness (referenced in the video) into your TypeScript application, you should use the TypeScript implementation of the library (`deepagents`) rather than the Python version shown in the video.

The **Deep Agents** harness provides the critical "Deep Research" architecture out-of-the-box: **Planning** (via a To-Do list), **Context Offloading** (via a virtual file system), and **Sub-agent Delegation**.

Here is how to integrate this into your `codex-session-view` app structure.

### 1\. Install Dependencies

You need the `deepagents` harness and LangChain dependencies (which the harness is built on). You will also likely need a search provider like Tavily.

```bash
pnpm add deepagents @langchain/openai @langchain/core tavily-ai
```

### 2\. Create the Research Agent

Create a new file `src/server/ai/researchAgent.server.ts`. This agent will function differently from your existing `@openai/agents` because it uses the LangGraph runtime to manage the recursive research loops and file system state.

**Note:** You must instantiate a LangChain-compatible model (e.g., `ChatOpenAI`) for this agent, even if you use Vercel AI SDK elsewhere.

```typescript
import { createDeepAgent } from 'deepagents'
import { ChatOpenAI } from '@langchain/openai'
import { TavilySearchResults } from '@langchain/community/tools/tavily_search'

// 1. Define Tools (e.g., Search)
const searchTool = new TavilySearchResults({
  maxResults: 3,
  // Ensure TAVILY_API_KEY is in your .env
})

// 2. Define the Research Prompt
// The Deep Agents harness injects default instructions for using the File System and To-Do list.
// You only need to provide the high-level goal.
const RESEARCH_PROMPT = `
You are a Deep Research Agent. Your goal is to conduct extensive research on a topic and produce a comprehensive report.

Follow this workflow:
1. PLAN: Use 'write_todos' to break the research into granular tasks.
2. EXECUTE: Use 'tavily_search_results_json' to gather information. 
   - Use 'write_file' to save raw findings to the file system (e.g., "notes/topic_X.txt") to avoid cluttering context.
3. REFLECT: Update your todo list status as you progress.
4. SYNTHESIZE: Read your notes files and write a final report to "final_report.md".
`

export async function runDeepResearchAgent(query: string) {
  // 3. Initialize the Model
  const model = new ChatOpenAI({
    modelName: 'gpt-4-turbo', // or 'claude-3-5-sonnet'
    temperature: 0,
  })

  // 4. Create the Agent
  // This automatically adds the "Harness" tools: write_todos, read_file, write_file, task (for sub-agents)
  const agent = await createDeepAgent({
    model,
    tools: [searchTool],
    instructions: RESEARCH_PROMPT,
  })

  // 5. Invoke the Agent
  // Deep Agents uses LangGraph, so we invoke it with a message.
  const result = await agent.invoke({
    messages: [{ role: 'user', content: query }],
  })

  return result
}
```

### 3\. Key Differences from Your Current Stack

  * **Runtime:** Unlike your existing `sessionAnalysisAgent.server.ts` which uses `@openai/agents`, `deepagents` runs on **LangGraph**.
  * **State:** It maintains an internal "File System" state. If you want to show the generated files (reports) in your UI, you will need to extract them from the agent's final state or write a custom middleware to sync the virtual filesystem with your app's database.
  * **Sub-Agents:** The `task` tool allows this agent to spawn sub-agents automatically. You can define specialized sub-agents (e.g., a "Code Analyzer") and pass them into `createDeepAgent` via the `subagents` property if needed.

### 4\. Integration

You can expose this agent via a new API route (e.g., `src/routes/api/research.ts`) that calls `runDeepResearchAgent` and streams the steps or returns the final report.

... [Building a Typescript deep research agent](https://www.youtube.com/watch?v=mUNeBCtJKk0) ...

The selected video is the TypeScript-specific tutorial for the Deep Agents library, which directly matches your application's tech stack and the implementation steps above.

http://googleusercontent.com/youtube_content/0

http://googleusercontent.com/youtube_content/1


---

