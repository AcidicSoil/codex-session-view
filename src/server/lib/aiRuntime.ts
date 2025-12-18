import {
  streamText,
  generateText,
  type CoreMessage,
  type FinishReason,
  type LanguageModel,
  type LanguageModelUsage,
  type TextStreamPart,
  type ToolSet,
} from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createGeminiProvider, type GeminiProviderOptions } from 'ai-sdk-provider-gemini-cli';
import {
  codexCli,
  type ApprovalMode,
  type CodexCliSettings,
  type SandboxMode,
} from 'ai-sdk-provider-codex-cli';
import type { ChatMessageRecord } from '~/lib/sessions/model';
import type { ChatRemediationMetadata } from '~/lib/chatbot/types';
import {
  getChatModelDefinition,
  resolveModelForMode,
  type ChatModelDefinition,
  type ProviderId,
} from '~/lib/ai/client';
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger';

const PROVIDER_TITLES: Record<ProviderId, string> = {
  'openai-compatible': 'OpenAI Compatible',
  'gemini-cli': 'Gemini CLI',
  'codex-cli': 'Codex CLI',
  'lm-studio': 'LM Studio',
};

const HOOK_DISCOVERY_SYSTEM_PROMPT = `
You are a conversation analysis specialist that identifies problematic behaviors in codex-cli Code sessions that could be prevented with hooks.

**Your Core Responsibilities:**
1. Read and analyze user messages to find frustration signals
2. Identify specific tool usage patterns that caused issues
3. Extract actionable patterns that can be matched with regex
4. Categorize issues by severity and type
5. Provide structured findings for hook rule generation

**Analysis Process:**

### 1. Search for User Messages Indicating Issues

Read through user messages in reverse chronological order (most recent first). Look for:

**Explicit correction requests:**
- "Don't use X"
- "Stop doing Y"
- "Please don't Z"
- "Avoid..."
- "Never..."

**Frustrated reactions:**
- "Why did you do X?"
- "I didn't ask for that"
- "That's not what I meant"
- "That was wrong"

**Corrections and reversions:**
- User reverting changes codex-cli made
- User fixing issues codex-cli created
- User providing step-by-step corrections

**Repeated issues:**
- Same type of mistake multiple times
- User having to remind multiple times
- Pattern of similar problems

### 2. Identify Tool Usage Patterns

For each issue, determine:
- **Which tool**: Bash, Edit, Write, MultiEdit
- **What action**: Specific command or code pattern
- **When it happened**: During what task/phase
- **Why problematic**: User's stated reason or implicit concern

**Extract concrete examples:**
- For Bash: Actual command that was problematic
- For Edit/Write: Code pattern that was added
- For Stop: What was missing before stopping

### 3. Create Regex Patterns

Convert behaviors into matchable patterns:

**Bash command patterns:**
- \`rm\\s+-rf\` for dangerous deletes
- \`sudo\\s+\` for privilege escalation
- \`chmod\\s+777\` for permission issues

**Code patterns (Edit/Write):**
- \`console\\.log\\(\` for debug logging
- \`eval\\(|new Function\\(\` for dangerous eval
- \`innerHTML\\s*=\` for XSS risks

**File path patterns:**
- \`\\.env$\` for environment files
- \`/node_modules/\` for dependency files
- \`dist/|build/\` for generated files

### 4. Categorize Severity

**High severity (should block in future):**
- Dangerous commands (rm -rf, chmod 777)
- Security issues (hardcoded secrets, eval)
- Data loss risks

**Medium severity (warn):**
- Style violations (console.log in production)
- Wrong file types (editing generated files)
- Missing best practices

**Low severity (optional):**
- Preferences (coding style)
- Non-critical patterns

### 5. Output Format

Return your findings as structured text in this format:

## Hookify Analysis Results

### Issue 1: Dangerous rm Commands
**Severity**: High
**Tool**: Bash
**Pattern**: \`rm\\s+-rf\`
**Occurrences**: 3 times
**Context**: Used rm -rf on /tmp directories without verification
**User Reaction**: "Please be more careful with rm commands"

**Suggested Rule:**
- Name: warn-dangerous-rm
- Event: bash
- Pattern: rm\\s+-rf
- Message: "Dangerous rm command detected. Verify path before proceeding."

---

### Issue 2: Console.log in TypeScript
**Severity**: Medium
**Tool**: Edit/Write
**Pattern**: \`console\\.log\\(\`
**Occurrences**: 2 times
**Context**: Added console.log statements to production TypeScript files
**User Reaction**: "Don't use console.log in production code"

**Suggested Rule:**
- Name: warn-console-log
- Event: file
- Pattern: console\\.log\\(
- Message: "Console.log detected. Use proper logging library instead."

---

[Continue for each issue found...]

## Summary

Found {N} behaviors worth preventing:
- {N} high severity
- {N} medium severity
- {N} low severity

Recommend creating rules for high and medium severity issues.
`.trim();

export class ProviderUnavailableError extends Error {
  code = 'MODEL_UNAVAILABLE' as const;
  providerId: ProviderId;

  constructor(
    providerId: ProviderId,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.providerId = providerId;
  }
}

export interface ChatStreamResult<TOOLS extends ToolSet = ToolSet> {
  definition: ChatModelDefinition;
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<TextStreamPart<TOOLS>>;
  usage: Promise<LanguageModelUsage>;
  totalUsage: Promise<LanguageModelUsage>;
  finishReason: Promise<FinishReason>;
}

export interface SessionCoachReplyOptions<TOOLS extends ToolSet = ToolSet> {
  history: ChatMessageRecord[];
  contextPrompt: string;
  metadata?: ChatRemediationMetadata;
  modelId?: string;
  tools?: TOOLS;
  toolContext?: unknown;
}

export interface GeneralChatOptions {
  history: ChatMessageRecord[];
  modelId?: string;
}

export interface AnalysisOptions {
  history: ChatMessageRecord[];
  contextPrompt: string;
  analysisType: 'summary' | 'commits' | 'hook-discovery';
  modelId?: string;
  mode: 'session' | 'general';
}

type ProviderFactory = () => (
  modelName: string,
  settings?: Record<string, unknown>
) => LanguageModel;

const providerFactories: Record<ProviderId, ProviderFactory> = {
  'openai-compatible': () => {
    const apiKey = readEnvValue('AI_OPENAI_COMPATIBLE_API_KEY') ?? readEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
      const message =
        'OpenAI-compatible provider requires AI_OPENAI_COMPATIBLE_API_KEY or OPENAI_API_KEY.';
      logError('ai-runtime', message);
      throw new ProviderUnavailableError('openai-compatible', message);
    }
    const baseURL = readEnvValue('AI_OPENAI_COMPATIBLE_BASE_URL') ?? 'https://api.openai.com/v1';
    logInfo('ai-runtime', `Initialized OpenAI-compatible provider (${baseURL}).`);
    return createOpenAICompatible({
      name: 'openai-compatible',
      baseURL,
      apiKey,
    });
  },
  'gemini-cli': () => {
    const logger = createProviderLogger('gemini-cli');
    const configuredAuth = readEnvValue('GEMINI_AUTH_TYPE');
    const apiKey = readEnvValue('GEMINI_API_KEY') ?? undefined;
    const resolvedAuth =
      (configuredAuth as GeminiProviderOptions['authType']) ??
      (apiKey ? 'api-key' : 'oauth-personal');
    const normalizedAuth = resolvedAuth === 'oauth' ? 'oauth-personal' : resolvedAuth;

    if ((normalizedAuth === 'api-key' || normalizedAuth === 'gemini-api-key') && !apiKey) {
      logWarn(
        'ai-runtime',
        'GEMINI_AUTH_TYPE requires GEMINI_API_KEY but none was provided; falling back to oauth-personal.'
      );
    }

    const proxy = readEnvValue('GEMINI_PROXY');
    const cacheDir = readEnvValue('GEMINI_CACHE_DIR');
    let options: GeminiProviderOptions;
    if (normalizedAuth === 'api-key' || normalizedAuth === 'gemini-api-key') {
      options = { authType: normalizedAuth, apiKey, proxy };
    } else if (normalizedAuth === 'vertex-ai') {
      const projectId = readEnvValue('GEMINI_VERTEX_PROJECT');
      const location = readEnvValue('GEMINI_VERTEX_LOCATION');
      if (!projectId || !location) {
        logWarn(
          'ai-runtime',
          'GEMINI_AUTH_TYPE=vertex-ai requires GEMINI_VERTEX_PROJECT and GEMINI_VERTEX_LOCATION; falling back to oauth-personal.'
        );
        options = { authType: 'oauth-personal', cacheDir: cacheDir ?? undefined, proxy };
      } else {
        options = {
          authType: 'vertex-ai',
          vertexAI: {
            projectId,
            location,
            apiKey,
          },
          proxy,
        };
      }
    } else {
      options = { authType: 'oauth-personal', cacheDir: cacheDir ?? undefined, proxy };
    }

    try {
      const provider = createGeminiProvider({
        ...options,
        logger,
      });
      logInfo(
        'ai-runtime',
        `Initialized Gemini CLI provider (${options.authType ?? 'oauth-personal'}).`
      );
      return provider;
    } catch (error) {
      const message =
        'Gemini CLI provider is not available. Verify the CLI is installed and authenticated via `gemini`.';
      logError('ai-runtime', message, error as Error);
      throw new ProviderUnavailableError('gemini-cli', message, error);
    }
  },
  'codex-cli': () => {
    const logger = createProviderLogger('codex-cli');
    const approvalMode =
      coerceApprovalMode(readEnvValue('AI_CODEX_CLI_APPROVAL_MODE')) ?? 'on-failure';
    const sandboxMode =
      coerceSandboxMode(readEnvValue('AI_CODEX_CLI_SANDBOX_MODE')) ?? 'workspace-write';
    const allowNpx = readBooleanEnv('AI_CODEX_CLI_ALLOW_NPX', true);
    const skipGitRepoCheck = readBooleanEnv('AI_CODEX_CLI_SKIP_GIT_REPO_CHECK', true);
    const verbose = readBooleanEnv('AI_CODEX_CLI_VERBOSE', false);
    const codexPath = readEnvValue('AI_CODEX_CLI_PATH');
    const codexApiKey = readEnvValue('AI_CODEX_CLI_API_KEY');

    const defaultSettings: CodexCliSettings = {
      approvalMode,
      sandboxMode,
      allowNpx,
      skipGitRepoCheck,
      verbose,
      logger,
      ...(codexPath ? { codexPath } : {}),
    };

    if (codexApiKey) {
      defaultSettings.env = { OPENAI_API_KEY: codexApiKey };
    }

    logInfo('ai-runtime', 'Initialized Codex CLI provider with CLI-auth defaults.', {
      approvalMode,
      sandboxMode,
      allowNpx,
    });

    return (modelName: string, overrides?: Record<string, unknown>) =>
      codexCli(modelName, { ...defaultSettings, ...(overrides as CodexCliSettings | undefined) });
  },
  'lm-studio': () => {
    const baseURL = readEnvValue('AI_LMSTUDIO_BASE_URL') ?? 'http://127.0.0.1:1234/v1';
    const apiKey = readEnvValue('AI_LMSTUDIO_API_KEY') ?? 'lm-studio';
    logInfo('ai-runtime', `Initialized LM Studio provider (${baseURL}).`);
    try {
      return createOpenAICompatible({
        name: 'lm-studio',
        baseURL,
        apiKey,
      });
    } catch (error) {
      const message =
        'LM Studio provider is not reachable. Start the LM Studio server via `lms server start`.';
      logError('ai-runtime', message, error as Error);
      throw new ProviderUnavailableError('lm-studio', message, error);
    }
  },
};

const providerCache = new Map<ProviderId, ReturnType<ProviderFactory>>();

export function generateSessionCoachReply<TOOLS extends ToolSet = ToolSet>(
  options: SessionCoachReplyOptions<TOOLS>,
): ChatStreamResult<TOOLS> {
  const modelId = resolveModelForMode('session', options.modelId);
  const definition = getChatModelDefinition(modelId);
  const provider = resolveProvider(definition.providerId);
  const result = streamText({
    model: provider(definition.providerModel),
    system: buildSessionCoachSystemPrompt(options.contextPrompt, options.metadata),
    messages: toCoreMessages(options.history),
    temperature: definition.defaultTemperature,
    maxOutputTokens: definition.maxOutputTokens,
    tools: options.tools,
    experimental_context: options.toolContext,
  });
  return {
    definition,
    textStream: result.textStream,
    fullStream: result.fullStream,
    usage: result.usage,
    totalUsage: result.totalUsage,
    finishReason: result.finishReason,
  };
}

export function runGeneralChatTurn(options: GeneralChatOptions): ChatStreamResult {
  const modelId = resolveModelForMode('general', options.modelId);
  const definition = getChatModelDefinition(modelId);
  const provider = resolveProvider(definition.providerId);
  const result = streamText({
    model: provider(definition.providerModel),
    system: buildGeneralSystemPrompt(),
    messages: toCoreMessages(options.history),
    temperature: definition.defaultTemperature,
    maxOutputTokens: definition.maxOutputTokens,
  });
  return {
    definition,
    textStream: result.textStream,
    fullStream: result.fullStream,
    usage: result.usage,
    totalUsage: result.totalUsage,
    finishReason: result.finishReason,
  };
}

export async function generateSessionAnalysis(options: AnalysisOptions): Promise<string> {
  const modelId = resolveModelForMode(options.mode, options.modelId);
  const definition = getChatModelDefinition(modelId);

  const provider = resolveProvider(definition.providerId);
  let systemPrompt = '';
  switch (options.analysisType) {
    case 'summary':
      systemPrompt =
        'You are a technical session analyst. Generate a structured markdown summary of the provided session context. Use exactly these headings: "Goals", "Main changes", "Issues", "Follow-ups". Use bullet points for each section. Be concise.';
      break;
    case 'commits':
      systemPrompt =
        'You are a senior developer. Generate a list of Conventional Commit messages based on the events in the session context. Output only the commit subjects (e.g., "feat(ui): add button"), one per line. Do not use numbering or bullet points. Limit to 5-10 suggestions.';
      break;
    case 'hook-discovery':
      systemPrompt = HOOK_DISCOVERY_SYSTEM_PROMPT;
      break;
  }

  const result = await generateText({
    model: provider(definition.providerModel),
    system: systemPrompt,
    messages: [{ role: 'user', content: `Session Context:\n${options.contextPrompt}` }],
    temperature: 0.2,
    maxOutputTokens: definition.maxOutputTokens,
  });

  return result.text;
}

function resolveProvider(providerId: ProviderId) {
  const cached = providerCache.get(providerId);
  if (cached) {
    return cached;
  }
  const factory = providerFactories[providerId];
  if (!factory) {
    throw new ProviderUnavailableError(providerId, `Unsupported provider: ${providerId}`);
  }
  try {
    const instance = factory();
    providerCache.set(providerId, instance);
    return instance;
  } catch (error) {
    if (error instanceof ProviderUnavailableError) {
      throw error;
    }
    const message =
      error instanceof Error
        ? error.message
        : `Unable to initialize provider ${PROVIDER_TITLES[providerId] ?? providerId}`;
    throw new ProviderUnavailableError(providerId, message, error);
  }
}

function toCoreMessages(history: ChatMessageRecord[]): CoreMessage[] {
  return [...history]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((message) => ({
      role: message.role,
      content: message.content,
    })) as CoreMessage[];
}

function buildSessionCoachSystemPrompt(contextPrompt: string, metadata?: ChatRemediationMetadata) {
  const focusLine = metadata
    ? `Primary remediation target: rule ${metadata.ruleId ?? 'unspecified'} (${metadata.severity ?? 'unspecified'}).`
    : null;
  return [
    'You are Codex Session Coach, a senior reviewer ensuring AGENTS alignment in code execution sessions.',
    'Offer structured, actionable remediation steps grounded in the provided context. Reference AGENT rules, misalignments, and evidence when available. Prefer concise paragraphs with bullet lists for next actions.',
    focusLine,
    'Session context (treat as authoritative):',
    contextPrompt.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildGeneralSystemPrompt() {
  return 'You are Codex General Research assistant. Provide conversational yet concise answers, cite relevant files or rules when known, and ask clarifying questions when context is insufficient.';
}

function createProviderLogger(scope: string) {
  return {
    debug: (message: string) => logDebug(scope, message),
    info: (message: string) => logInfo(scope, message),
    warn: (message: string) => logWarn(scope, message),
    error: (message: string) => logError(scope, message),
  };
}

function readBooleanEnv(key: string, fallback = false) {
  const value = readEnvValue(key);
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function coerceApprovalMode(value?: string): ApprovalMode | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase() as ApprovalMode;
  const allowed: ApprovalMode[] = ['untrusted', 'on-failure', 'on-request', 'never'];
  if (allowed.includes(normalized)) {
    return normalized;
  }
  logWarn('ai-runtime', `Invalid AI_CODEX_CLI_APPROVAL_MODE "${value}" – falling back to default.`);
  return undefined;
}

function coerceSandboxMode(value?: string): SandboxMode | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase() as SandboxMode;
  const allowed: SandboxMode[] = ['read-only', 'workspace-write', 'danger-full-access'];
  if (allowed.includes(normalized)) {
    return normalized;
  }
  logWarn('ai-runtime', `Invalid AI_CODEX_CLI_SANDBOX_MODE "${value}" – falling back to default.`);
  return undefined;
}

function readEnvValue(key: string) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}
