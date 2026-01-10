# **Architecting State Persistence for Agentic Workflows: A Comprehensive Guide to Tool-Call Storage in Modern TypeScript Applications**

## **1\. Introduction: The Agentic Shift and the Persistence Paradox**

The evolution of Large Language Model (LLM) applications has traversed a rapid trajectory from simple, stateless conversational interfaces to complex, stateful agents capable of executing multi-step workflows. In the initial phase of Generative AI adoption, the primary architectural challenge was managing context windows and token limits. However, as applications have matured into "Agentic Systems"—where models autonomously invoke external tools, query databases, and perform computations—the architectural bottleneck has shifted from context management to **state persistence** and **observability**.

The integration of "Tool Calling" (or Function Calling) transforms the nature of a chat transcript. A conversation is no longer a linear sequence of text exchanges between a user and an assistant. Instead, it is a non-linear, multi-modal graph of events comprising user intents, model reasoning (Chain of Thought), structured tool invocations, raw execution outputs, and synthesized responses. This shift creates a "Persistence Paradox": the data required for the LLM to function (hot, contextual state) is fundamentally different from the data required for engineering teams to debug, audit, and improve the system (cold, forensic state).

For developers utilizing the modern TypeScript stack—specifically **TanStack Start** (React \+ Node.js) and the **Vercel AI SDK**—this paradox presents unique implementation challenges. How does one persist a tool call that is streamed token-by-token? How do we ensure that the UI can "rehydrate" a complex interactive widget representing a tool result after a page reload? How do we maintain a tamper-evident audit trail for compliance in regulated industries while ensuring low-latency interactions for the user?

This report provides an exhaustive, expert-level analysis of the architecture and implementation strategies required to solve these challenges. We dissect the database schema requirements, the server-side execution patterns within TanStack Start, and the client-side state management techniques necessary to build production-grade, tool-enabled LLM applications.

## **2\. The Anatomy of an Agentic Interaction**

To design a robust persistence layer, one must first deconstruct the data lifecycle of a tool-enabled interaction. Unlike standard HTTP request/response cycles, an agentic interaction is asynchronous, multi-stage, and often non-deterministic.

### **2.1 The Four Stages of Tool Lifecycle**

Understanding the lifecycle is prerequisite to defining the data model. An agentic turn typically follows four distinct stages, each producing data artifacts that must be captured.

| Stage | Description | Data Artifacts | Criticality |
| :---- | :---- | :---- | :---- |
| **1\. Intent & Reasoning** | The model analyzes the user's prompt and determines that an external tool is required. It may generate "thought" text before the actual call. | reasoning\_text (String), thought\_process (JSON) | **High**: Critical for debugging "why" the agent acted. |
| **2\. Invocation (Call)** | The model emits a structured request to execute a specific function with specific arguments. | tool\_call\_id (String), tool\_name (String), arguments (JSON) | **Critical**: The exact parameters determine the action. |
| **3\. Execution (Result)** | The system executes the code. This occurs outside the LLM. It may succeed, fail, or require human approval. | result\_data (JSON/String), execution\_status (Enum), latency\_ms (Int) | **Critical**: The feedback loop for the model. |
| **4\. Synthesis** | The model receives the tool result and generates a final natural language response to the user. | final\_response (String), citations (Array) | **Medium**: Visible to user, but derived from previous steps. |

### **2.2 The "Message Part" Abstraction**

A significant architectural evolution in 2024/2025, driven by updates in the Vercel AI SDK (v5) and Anthropic’s API, is the move away from monolithic "content" fields toward a **"Message Part"** abstraction.1

In legacy systems, a message was modeled simply:

TypeScript

interface Message {  
  role: 'user' | 'assistant';  
  content: string; // "I checked the weather and it's sunny."  
}

In agentic systems, a message is a collection of parts:

TypeScript

interface Message {  
  role: 'assistant';  
  parts:  
}

**Architectural Implication:** Database schemas that rely on a single text column for message content are fundamentally incompatible with modern tool-calling architectures. The persistence layer must support high-fidelity storage of these parts to enable precise rendering of UI components (e.g., showing a loading spinner during tool-invocation and a data table during tool-result).1

## **3\. Database Architecture: Schema Design Strategies**

The foundation of any robust system is its data model. For a TypeScript/Node.js stack, **PostgreSQL** coupled with an ORM like **Prisma** or Drizzle is the industry standard. However, the rigidity of relational schemas clashes with the flexibility of LLM outputs. We must analyze the trade-offs between normalized structures and flexible JSON storage.

### **3.1 The Great Debate: JSONB vs. Relational Normalization**

There are two competing schools of thought regarding how to store tool calls in Postgres.1

#### **Strategy A: The JSON Blob (The "NoSQL in SQL" Approach)**

This strategy involves storing the entire conversation or individual messages as unstructured JSONB blobs.

* **Mechanism:** A messages column of type JSONB stores the exact payload received from OpenAI/Anthropic.  
* **Advantages:** Zero impedance mismatch. What the LLM sends is exactly what you store. Schema migrations are rarely needed when the AI provider adds new fields (e.g., audio outputs).  
* **Disadvantages:** Query opacity. Answering questions like "How often does the 'Refund' tool fail?" requires complex, slow JSON path queries. Data integrity is enforced only at the application level, leading to potential corruption if the application logic changes.1

#### **Strategy B: The Normalized "Parts" Schema (The Recommended Approach)**

This strategy elevates tool calls to first-class citizens in the database.

* **Mechanism:** Dedicated tables for Message, MessagePart, and ToolCall.  
* **Advantages:** Strong type safety. Enforced referential integrity (a Result cannot exist without a Call). Highly efficient indexing for analytics and debugging.  
* **Disadvantages:** Higher complexity in write logic (handling transactions). Requires schema migrations for new features.5

### **3.2 Recommended Prisma Schema**

Based on the analysis of Vercel AI SDK requirements and audit needs, the following Prisma schema represents the optimal balance for production applications.2

Code snippet

// schema.prisma

model Conversation {  
  id        String    @id @default(cuid())  
  userId    String  
  title     String?  
  createdAt DateTime  @default(now())  
  updatedAt DateTime  @updatedAt  
    
  // Cascade delete ensures cleanup of all messages if conversation is deleted  
  messages  Message

  @@index(\[userId\])  
}

model Message {  
  id             String        @id @default(cuid())  
  conversationId String  
  role           String        // 'user', 'assistant', 'system', 'data'  
  createdAt      DateTime      @default(now())  
    
  // Relation to parent  
  conversation   Conversation  @relation(fields: \[conversationId\], references: \[id\], onDelete: Cascade)  
    
  // One-to-Many relation to parts  
  parts          MessagePart

  // Optional: Metadata for storing token usage or cost per message  
  usage          Json?         

  @@index(\[conversationId\])  
}

model MessagePart {  
  id              String         @id @default(cuid())  
  messageId       String  
  type            String         // 'text', 'reasoning', 'tool-invocation'  
  position        Int            // Critical for maintaining rendering order  
    
  // Text content (nullable, used if type='text' or 'reasoning')  
  text            String?        @db.Text  
    
  // Relation to tool invocation details (nullable, used if type='tool-invocation')  
  toolInvocation  ToolInvocation?  
    
  message         Message        @relation(fields: \[messageId\], references: \[id\], onDelete: Cascade)

  @@unique(\[messageId, position\]) // Ensure order integrity  
}

model ToolInvocation {  
  id             String      @id @default(cuid())  
  partId         String      @unique  
    
  // The ID assigned by the LLM Provider (e.g., call\_89123...)  
  // This is vital for mapping the result back to the call in the LLM context.  
  providerCallId String  
  toolName       String  
    
  // Arguments are stored as JSONB because they vary per tool  
  args           Json  
    
  // Execution state: 'pending', 'success', 'failed', 'requires\_action'  
  state          String        
    
  // The result returned by the tool execution  
  result         Json?  
    
  // Error message if state \== 'failed'  
  error          String?

  part           MessagePart @relation(fields: \[partId\], references: \[id\], onDelete: Cascade)

  // Timestamps for audit (latency calculation)  
  createdAt      DateTime    @default(now())  
  updatedAt      DateTime    @updatedAt

  @@index(\[providerCallId\])  
  @@index(\[toolName\])  
}

### **3.3 Deep Dive: Critical Schema Decisions**

1\. The providerCallId Index:  
When an LLM generates a tool call, it assigns a specific ID. When your system feeds the result back to the LLM, you must reference this ID. If this link is broken, the LLM will hallucinate or throw a context error. Indexing this field allows for O(1) lookups during the streaming process, which is critical when handling parallel tool calls.7  
2\. JSONB for args and result:  
While normalization is powerful, normalizing the arguments of every tool is an anti-pattern. Tool definitions change frequently. Storing arguments as JSONB allows the schema to be resilient to changes in tool signatures (e.g., adding a new optional parameter to get\_weather) without requiring a database migration.3 Furthermore, Postgres allows GIN indexing on JSONB columns, enabling queries like SELECT \* FROM ToolInvocation WHERE args-\>\>'location' \= 'Paris' if necessary.  
3\. Separation of MessagePart:  
Separating parts allows the UI to render "optimistic" updates. When the tool-invocation part exists but the state is pending, the UI renders a loading spinner. When state flips to success, the UI updates to show the result. This separation mirrors the Vercel AI SDK's internal data structures, minimizing the transformation logic required at the application layer.9

## **4\. Server-Side Execution: TanStack Start & Node.js**

**TanStack Start** introduces a paradigm shift by utilizing **Server Functions** to replace traditional API routes. This allows for type-safe Remote Procedure Calls (RPC) between the client and server. However, LLM interactions are inherently streaming, which complicates the RPC model.

### **4.1 The Streaming Challenge in Server Functions**

Standard RPC calls expect a single return value (Promise). LLM responses are continuous streams of data. To support the "thinking" process and progressive tool rendering, the server function must return a ReadableStream.

Implementation Nuance:  
Research indicates that TanStack Start server functions can sometimes struggle with streaming responses in specific environments (like Cloudflare Workers) if the response headers are not explicitly set to prevent buffering.10 The server function must bypass the default JSON serialization and return a raw Response object.

### **4.2 The "Stream-Data" Protocol**

The Vercel AI SDK uses a specific protocol over the stream to differentiate between text tokens, tool call metadata, and debug information. Your server function acts as a proxy that initiates the stream and, crucially, **intercepts** the completion event to trigger persistence.

Code Example: The Intercepting Server Function  
The following implementation demonstrates how to wrap the streaming logic to ensure data is saved to Prisma without blocking the response to the user.

TypeScript

// app/server/chat.ts  
import { createServerFn } from '@tanstack/start';  
import { streamText, convertToCoreMessages } from 'ai';  
import { openai } from '@ai-sdk/openai';  
import { prisma } from '@/lib/prisma';  
import { getRequestHeaders } from '@tanstack/start/server';

export const sendMessage \= createServerFn({ method: 'POST' })  
 .validator((data: { messages: any, conversationId: string }) \=\> data)  
 .handler(async ({ data }) \=\> {  
    const { messages, conversationId } \= data;

    // 1\. Persistence (User Message): Save immediately before processing  
    // This ensures we have a record even if the LLM crashes.  
    const lastMessage \= messages\[messages.length \- 1\];  
    await prisma.message.create({  
      data: {  
        conversationId,  
        role: 'user',  
        parts: {  
          create: \[{ type: 'text', text: lastMessage.content, position: 0 }\]  
        }  
      }  
    });

    // 2\. Stream Initialization  
    const result \= streamText({  
      model: openai('gpt-4o'), // Use a model capable of strong tool calling  
      messages: convertToCoreMessages(messages),  
      tools: {  
        // Define tools here. Note: In a real app, these might be imported.  
        calculateMortgage: {  
          description: 'Calculates monthly mortgage payments',  
          parameters: z.object({ principal: z.number(), rate: z.number() }),  
          execute: async ({ principal, rate }) \=\> {  
            // Tool Logic  
            return { monthlyPayment: (principal \* rate) / 12 };  
          }  
        }  
      },  
      // 3\. CRITICAL: The onFinish Hook  
      // This hook fires when the stream completes (or pauses for tool execution).  
      // It provides the aggregated response, including all tool calls generated.  
      onFinish: async ({ response }) \=\> {  
        await prisma.$transaction(async (tx) \=\> {  
          // Create the Assistant Message container  
          const assistantMsg \= await tx.message.create({  
            data: {  
              conversationId,  
              role: 'assistant',  
            }  
          });

          // Iterate and persist parts  
          for (const \[index, msg\] of response.messages.entries()) {  
            if (msg.role\!== 'assistant') continue;

            // Handle Text Content  
            if (msg.content && typeof msg.content \=== 'string') {  
              await tx.messagePart.create({  
                data: {  
                  messageId: assistantMsg.id,  
                  type: 'text',  
                  position: index,  
                  text: msg.content  
                }  
              });  
            }

            // Handle Tool Calls (Vercel SDK structure)  
            // Note: The SDK structure for tool calls is specific; we map it here.  
            // Depending on SDK version, toolCalls might be a property of the message.  
            if (msg.toolCalls) {  
               for (const toolCall of msg.toolCalls) {  
                 await tx.messagePart.create({  
                   data: {  
                     messageId: assistantMsg.id,  
                     type: 'tool-invocation',  
                     position: index, // Maintain relative order  
                     toolInvocation: {  
                       create: {  
                         providerCallId: toolCall.toolCallId,  
                         toolName: toolCall.toolName,  
                         args: toolCall.args,  
                         state: 'call', // Initial state  
                         // If the tool executed automatically (server-side),   
                         // we might already have the result here in some flows.  
                       }  
                     }  
                   }  
                 });  
               }  
            }  
          }  
        });  
      },  
    });

    // 4\. Return the Stream  
    // Utilize toTextStreamResponse() to format headers correctly for TanStack Start  
    return result.toTextStreamResponse();   
  });

### **4.3 Handling Asynchronous Tool Execution (The "Round Trip")**

The code above handles the *request* to call a tool. However, in many architectures, the tool execution happens in a second step (especially if human-in-the-loop is required).

The Re-entry Pattern:  
If the tool requires client-side confirmation (e.g., "Transfer $500"), the flow is:

1. **LLM:** Emits tool-invocation.  
2. **Server:** Saves ToolInvocation with state: 'pending'.  
3. **UI:** Renders a "Confirm" button.  
4. **User:** Clicks Confirm.  
5. **Client:** Calls a *separate* Server Function executeTool({ toolCallId }).  
6. **Server:** Executes logic, updates DB ToolInvocation to state: 'result', and appends the result to the conversation history.  
7. **Server:** Re-triggers streamText with the new history (including the result) so the LLM can acknowledge the action.

**Best Practice:** Always treat the tool execution as a separate transactional boundary from the tool request if human interaction is involved. This prevents "hanging" database transactions.12

## **5\. Client-Side Integration: Rehydration and Optimistic UI**

The user experience relies on the frontend's ability to interpret the stored data. A common failure mode is "UI Amnesia," where a rich interactive component (like a stock chart) degrades into a plain JSON dump after the user refreshes the page.

### **5.1 The initialMessages Transformation Strategy**

The useChat hook (from Vercel AI SDK React) drives the UI. It accepts initialMessages. The crucial architectural step is transforming your Prisma relational data into the specific shape useChat expects to recognize tool calls.

The Transformer Pattern:  
Do not pass raw Prisma objects to the client. Use a transformation utility in your TanStack Start loader.

TypeScript

// app/utils/transformers.ts  
import { Message as UiMessage } from 'ai';

export function dbToUiMessage(dbMsg: any): UiMessage {  
  // Extract tool invocations from the parts  
  const toolInvocations \= dbMsg.parts  
   .filter(p \=\> p.type \=== 'tool-invocation')  
   .map(p \=\> ({  
       state: p.toolInvocation.state \=== 'success'? 'result' : 'call',  
       toolCallId: p.toolInvocation.providerCallId,  
       toolName: p.toolInvocation.toolName,  
       args: p.toolInvocation.args,  
       result: p.toolInvocation.result,  
    }));

  const textContent \= dbMsg.parts  
   .filter(p \=\> p.type \=== 'text')  
   .map(p \=\> p.text)  
   .join('');

  return {  
    id: dbMsg.id,  
    role: dbMsg.role,  
    content: textContent,  
    // Vercel SDK detects this property to render tool UIs  
    toolInvocations: toolInvocations.length \> 0? toolInvocations : undefined,  
    createdAt: new Date(dbMsg.createdAt)  
  };  
}

**Impact:** By populating toolInvocations, you enable the SDK's ToolInvocation handling. The UI can then iterate over messages and conditionally render components:

TypeScript

// app/components/ChatList.tsx  
{message.toolInvocations?.map(toolCall \=\> (  
  \<div key={toolCall.toolCallId}\>  
    {toolCall.toolName \=== 'calculateMortgage' && (  
      \<MortgageCalculator   
        args={toolCall.args}   
        result={toolCall.result}   
        status={toolCall.state}   
      /\>  
    )}  
  \</div\>  
))}

This ensures that the "Stock Chart" or "Calculator" persists across sessions, maintaining the application's interactive nature.9

## **6\. Audit Trails, Observability, and Compliance**

While the Prisma schema handles the *application state* (what the user sees), it is often insufficient for *forensic auditing* (what actually happened). In regulated environments (Finance, Healthcare), deleting a message from the UI must not delete the evidence that a tool was called.

### **6.1 Application State vs. Forensic Audit**

A common mistake is using the same table for both chat history and audit logs.

* **Chat History (Mutable):** Optimized for reading thread state. Users may edit or delete messages.  
* **Audit Log (Immutable):** Optimized for writing. Must never be deleted. Must capture metadata like latency, token costs, and raw API payloads.

### **6.2 The OpenLLMetry Architecture**

Instead of cluttering the Prisma schema with latency metrics, the recommended architecture utilizes OpenTelemetry (OTel).  
OpenLLMetry is an open-source SDK that extends OTel for LLM applications. It patches the OpenAI and LangChain libraries to automatically emit "Spans" for every tool call.15  
**Integration Flow:**

1. **Instrumentation:** Initialize OpenLLMetry in the Node.js server entry point.  
2. **Trace Context:** When streamText is called, OpenLLMetry starts a trace.  
3. **Span Generation:** When a tool is invoked, a child span is created containing the arguments (sanitized for PII).  
4. **Export:** These traces are sent asynchronously to an Observability Backend (e.g., LangFuse, Arize Phoenix, or a self-hosted ClickHouse instance).

### **6.3 Case Study: LangFuse Architecture**

LangFuse (an open-source observability platform) demonstrates this split architecture effectively.17

* **Postgres:** Stores Projects, API Keys, and Users.  
* **ClickHouse (OLAP):** Stores Traces, Observations (Tool Calls), and Scores.

Why this matters:  
Analyzing tool usage (e.g., "What is the P99 latency of the search\_knowledge\_base tool?") requires aggregating millions of rows. Postgres struggles with this at scale. Columnar stores like ClickHouse excel at it. By offloading audit logs to an OTel-compatible backend, you keep your production Postgres database lean and fast for user interactions.18

### **6.4 Designing for PII and Security**

Tool arguments often contain PII (e.g., email addresses).

* **Best Practice:** Implement a **Redaction Middleware** in the OpenLLMetry exporter or within the onFinish handler before saving to Prisma.  
* **Pattern:** Use Zod schemas to validate tool arguments. If validation fails, the system should log the *attempt* but flag it as a security violation in the audit log, preventing the execution.19

## **7\. Security Considerations for Tool Storage**

Allowing an LLM to execute code and storing the results creates specific security vectors that must be mitigated in the storage layer.

### **7.1 Injection Attacks via Tool Arguments**

Malicious users may attempt to manipulate the LLM into generating tool calls that execute SQL injection or unauthorized actions.

* **Mitigation:** Never execute raw SQL generated by an LLM (even if the tool is query\_database). Use strict, parameterized tool definitions.  
* **Storage Implication:** Store the *parsed and validated* arguments in the database, not just the raw string from the LLM. This proves that the system only acted on valid data.

### **7.2 Access Control Lists (ACLs)**

Not all users should have access to all tools.

* **Schema Addition:** Add a permissions field to the ToolDefinition (if stored in DB) or enforce checks in the Server Function.  
* **Audit Requirement:** The audit log must capture *who* invoked the tool. Ensure the userId is propagated through the streamText context into the OTel trace attributes.16

## **8\. Summary of Recommendations**

To achieve a production-grade architecture for persisting tool calls in a TypeScript/TanStack Start environment:

1. **Schema Normalization:** Abandon the "JSON Blob" for conversation history. Use a normalized Message and MessagePart schema in Prisma to support the multi-modal nature of agentic interactions.  
2. **Streaming Interception:** Utilize TanStack Start's createServerFn to wrap the Vercel AI SDK's streamText. Intercept the onFinish event to perform "double-writes"—saving the settled state to Postgres while the stream closes.  
3. **Separate Audit from Context:** Do not rely on your chat history table for compliance. Implement **OpenLLMetry** to pipe immutable, granular traces of every tool execution to a specialized observability backend (LangFuse/ClickHouse).  
4. **Rehydration Transformer:** Implement a strong transformation layer in your data loaders to convert relational DB records into the initialMessages format, ensuring high-fidelity UI restoration of tool widgets.  
5. **Handling "Dangling" States:** Architect for failure. If a stream is interrupted, ensure your system can identify pending tool calls on the next load and either resume them or mark them as failed to prevent UI locking.

By following these patterns, developers can bridge the gap between the ephemeral, streaming nature of modern AI and the rigid, persistent requirements of enterprise data systems.

---

**Citations Table**

| Source ID | Relevance |
| :---- | :---- |
| 3 | Prisma schema design for tool calling. |
| 1 | The "Message Part" abstraction and JSONB vs. Relational debate. |
| 1 | Vercel AI SDK persistence hooks (onFinish). |
| 11 | TanStack Start server function mechanics and streaming. |
| 23 | Audit logging requirements and forensic data structures. |
| 17 | Architecture case study (LangFuse) regarding Postgres vs. ClickHouse. |
| 9 | Client-side rehydration and UI component mapping. |

#### **Works cited**

1. Guidance on persisting messages · vercel ai · Discussion \#4845 \- GitHub, accessed December 18, 2025, [https://github.com/vercel/ai/discussions/4845](https://github.com/vercel/ai/discussions/4845)  
2. Migrate Your Data to AI SDK 5.0, accessed December 18, 2025, [https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0-data)  
3. Building a LLM Agent to Directly Interact with a Database | by Ayush Gupta | Medium, accessed December 18, 2025, [https://medium.com/@ayush4002gupta/building-an-llm-agent-to-directly-interact-with-a-database-0c0dd96b8196](https://medium.com/@ayush4002gupta/building-an-llm-agent-to-directly-interact-with-a-database-0c0dd96b8196)  
4. Postgres Auditing in 150 lines of SQL \- Supabase, accessed December 18, 2025, [https://supabase.com/blog/postgres-audit](https://supabase.com/blog/postgres-audit)  
5. bug: Prisma migration failure (P3009) when deploying Langfuse Helm chart with Amazon RDS PostgreSQL \#8463 \- GitHub, accessed December 18, 2025, [https://github.com/langfuse/langfuse/issues/8463](https://github.com/langfuse/langfuse/issues/8463)  
6. Building a Stock Broker AI Agent with Next.js, AI SDK, and OpenAI \- Stackademic, accessed December 18, 2025, [https://blog.stackademic.com/building-a-stock-broker-ai-agent-with-next-js-ai-sdk-and-openai-b2ea83a662d4](https://blog.stackademic.com/building-a-stock-broker-ai-agent-with-next-js-ai-sdk-and-openai-b2ea83a662d4)  
7. ToolMessage | LangChain.js, accessed December 18, 2025, [https://v03.api.js.langchain.com/classes/\_langchain\_core.messages\_tool.ToolMessage.html](https://v03.api.js.langchain.com/classes/_langchain_core.messages_tool.ToolMessage.html)  
8. AI SDK: Prevent LLM from Returning Tool Output as Markdown While Keeping It as a UI Component \- Stack Overflow, accessed December 18, 2025, [https://stackoverflow.com/questions/79481180/ai-sdk-prevent-llm-from-returning-tool-output-as-markdown-while-keeping-it-as-a](https://stackoverflow.com/questions/79481180/ai-sdk-prevent-llm-from-returning-tool-output-as-markdown-while-keeping-it-as-a)  
9. Migrating from RSC to UI \- AI SDK, accessed December 18, 2025, [https://ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui](https://ai-sdk.dev/docs/ai-sdk-rsc/migrating-to-ui)  
10. Streaming server functions return empty response body with @cloudflare/vite-plugin · Issue \#6045 · TanStack/router \- GitHub, accessed December 18, 2025, [https://github.com/TanStack/router/issues/6045](https://github.com/TanStack/router/issues/6045)  
11. Server Functions | TanStack Start React Docs, accessed December 18, 2025, [https://tanstack.com/start/latest/docs/framework/react/guide/server-functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)  
12. Building a Fullstack AI Agent with LangGraph.js and Next.js: MCP & HITL | by Ali Ibrahim, accessed December 18, 2025, [https://techwithibrahim.medium.com/building-a-fullstack-ai-agent-with-langgraph-js-and-next-js-mcp-hitl-15b2d1a59a9a?source=rss------artificial\_intelligence-5](https://techwithibrahim.medium.com/building-a-fullstack-ai-agent-with-langgraph-js-and-next-js-mcp-hitl-15b2d1a59a9a?source=rss------artificial_intelligence-5)  
13. llms-full.txt \- assistant-ui, accessed December 18, 2025, [https://www.assistant-ui.com/llms-full.txt](https://www.assistant-ui.com/llms-full.txt)  
14. How to Use Vercel AI SDK: A Beginner's Guide \- Apidog, accessed December 18, 2025, [https://apidog.com/blog/vercel-ai-sdk/](https://apidog.com/blog/vercel-ai-sdk/)  
15. OpenLLMetry | LlamaIndex Documentation, accessed December 18, 2025, [https://developers.llamaindex.ai/typescript/framework/integration/open-llm-metry/](https://developers.llamaindex.ai/typescript/framework/integration/open-llm-metry/)  
16. Use Python instrumentation for LLM observability, accessed December 18, 2025, [https://docs.observeinc.com/docs/use-python-instrumentation-for-llm-observability](https://docs.observeinc.com/docs/use-python-instrumentation-for-llm-observability)  
17. In depth understanding of data traversal · langfuse · Discussion \#8593 \- GitHub, accessed December 18, 2025, [https://github.com/orgs/langfuse/discussions/8593](https://github.com/orgs/langfuse/discussions/8593)  
18. Postgres Database (self-hosted) \- Langfuse, accessed December 18, 2025, [https://langfuse.com/self-hosting/deployment/infrastructure/postgres](https://langfuse.com/self-hosting/deployment/infrastructure/postgres)  
19. Using AI to Generate Database Query Is Cool. But What About Access Control? | ZenStack, accessed December 18, 2025, [https://zenstack.dev/blog/llm-acl](https://zenstack.dev/blog/llm-acl)  
20. RAG for SQL Server, MySQL, Postgres – Best Practices for Secure AI \+ Database Integration, accessed December 18, 2025, [https://blog.dreamfactory.com/rag-for-sql-server-mysql-postgres-best-practices-for-secure-ai-database-integration](https://blog.dreamfactory.com/rag-for-sql-server-mysql-postgres-best-practices-for-secure-ai-database-integration)  
21. AI Integration \- Design Structure Matrix \- Earna AI Documentation, accessed December 18, 2025, [https://docs.earna.sh/console/core-features/ai-integration](https://docs.earna.sh/console/core-features/ai-integration)  
22. TanStack Start · Cloudflare Workers docs, accessed December 18, 2025, [https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)  
23. How Can Audit Logging and Forensics Make AI Agents Truly Accountable? \- Reddit, accessed December 18, 2025, [https://www.reddit.com/r/AI\_associates/comments/1nsmzxy/how\_can\_audit\_logging\_and\_forensics\_make\_ai/](https://www.reddit.com/r/AI_associates/comments/1nsmzxy/how_can_audit_logging_and_forensics_make_ai/)  
24. LLM observability tools: Monitoring, debugging, and improving AI systems \- Medium, accessed December 18, 2025, [https://medium.com/online-inference/llm-observability-tools-monitoring-debugging-and-improving-ai-systems-5af769796266](https://medium.com/online-inference/llm-observability-tools-monitoring-debugging-and-improving-ai-systems-5af769796266)