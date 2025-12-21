import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createGeminiProvider, type GeminiProviderOptions } from 'ai-sdk-provider-gemini-cli'
import {
  codexCli,
  type ApprovalMode,
  type CodexCliSettings,
  type SandboxMode,
} from 'ai-sdk-provider-codex-cli'
import type { LanguageModel } from 'ai'
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger'
import type { ProviderId } from '~/lib/ai/client'
import { ProviderUnavailableError } from '~/server/lib/aiRuntime'

export const PROVIDER_TITLES: Record<ProviderId, string> = {
  'openai-compatible': 'OpenAI Compatible',
  'gemini-cli': 'Gemini CLI',
  'codex-cli': 'Codex CLI',
  'lm-studio': 'LM Studio',
}

type ProviderFactory = () => (
  modelName: string,
  settings?: Record<string, unknown>
) => LanguageModel

const providerFactories: Record<ProviderId, ProviderFactory> = {
  'openai-compatible': () => {
    const apiKey = readEnvValue('AI_OPENAI_COMPATIBLE_API_KEY') ?? readEnvValue('OPENAI_API_KEY')
    if (!apiKey) {
      const message =
        'OpenAI-compatible provider requires AI_OPENAI_COMPATIBLE_API_KEY or OPENAI_API_KEY.'
      logError('ai-runtime', message)
      throw new ProviderUnavailableError('openai-compatible', message)
    }
    const baseURL = readEnvValue('AI_OPENAI_COMPATIBLE_BASE_URL') ?? 'https://api.openai.com/v1'
    logInfo('ai-runtime', `Initialized OpenAI-compatible provider (${baseURL}).`)
    return createOpenAICompatible({
      name: 'openai-compatible',
      baseURL,
      apiKey,
    })
  },
  'gemini-cli': () => {
    const logger = createProviderLogger('gemini-cli')
    const configuredAuth = readEnvValue('GEMINI_AUTH_TYPE')
    const apiKey = readEnvValue('GEMINI_API_KEY') ?? undefined
    const resolvedAuth =
      (configuredAuth as GeminiProviderOptions['authType']) ??
      (apiKey ? 'api-key' : 'oauth-personal')
    const normalizedAuth = resolvedAuth === 'oauth' ? 'oauth-personal' : resolvedAuth

    if ((normalizedAuth === 'api-key' || normalizedAuth === 'gemini-api-key') && !apiKey) {
      logWarn(
        'ai-runtime',
        'GEMINI_AUTH_TYPE requires GEMINI_API_KEY but none was provided; falling back to oauth-personal.'
      )
    }

    const proxy = readEnvValue('GEMINI_PROXY')
    const cacheDir = readEnvValue('GEMINI_CACHE_DIR')
    let options: GeminiProviderOptions
    if (normalizedAuth === 'api-key' || normalizedAuth === 'gemini-api-key') {
      options = { authType: normalizedAuth, apiKey, proxy }
    } else if (normalizedAuth === 'vertex-ai') {
      const projectId = readEnvValue('GEMINI_VERTEX_PROJECT')
      const location = readEnvValue('GEMINI_VERTEX_LOCATION')
      if (!projectId || !location) {
        logWarn(
          'ai-runtime',
          'GEMINI_AUTH_TYPE=vertex-ai requires GEMINI_VERTEX_PROJECT and GEMINI_VERTEX_LOCATION; falling back to oauth-personal.'
        )
        options = { authType: 'oauth-personal', cacheDir: cacheDir ?? undefined, proxy }
      } else {
        options = {
          authType: 'vertex-ai',
          vertexAI: {
            projectId,
            location,
            apiKey,
          },
          proxy,
        }
      }
    } else {
      options = { authType: 'oauth-personal', cacheDir: cacheDir ?? undefined, proxy }
    }

    try {
      const provider = createGeminiProvider({
        ...options,
        logger,
      })
      logInfo(
        'ai-runtime',
        `Initialized Gemini CLI provider (${options.authType ?? 'oauth-personal'}).`
      )
      return provider
    } catch (error) {
      const message =
        'Gemini CLI provider is not available. Verify the CLI is installed and authenticated via `gemini`.'
      logError('ai-runtime', message, error as Error)
      throw new ProviderUnavailableError('gemini-cli', message, error)
    }
  },
  'codex-cli': () => {
    const logger = createProviderLogger('codex-cli')
    const approvalMode =
      coerceApprovalMode(readEnvValue('AI_CODEX_CLI_APPROVAL_MODE')) ?? 'on-failure'
    const sandboxMode =
      coerceSandboxMode(readEnvValue('AI_CODEX_CLI_SANDBOX_MODE')) ?? 'workspace-write'
    const allowNpx = readBooleanEnv('AI_CODEX_CLI_ALLOW_NPX', true)
    const skipGitRepoCheck = readBooleanEnv('AI_CODEX_CLI_SKIP_GIT_REPO_CHECK', true)
    const verbose = readBooleanEnv('AI_CODEX_CLI_VERBOSE', false)
    const codexPath = readEnvValue('AI_CODEX_CLI_PATH')
    const codexApiKey = readEnvValue('AI_CODEX_CLI_API_KEY')

    const defaultSettings: CodexCliSettings = {
      approvalMode,
      sandboxMode,
      allowNpx,
      skipGitRepoCheck,
      verbose,
      logger,
      ...(codexPath ? { codexPath } : {}),
    }

    if (codexApiKey) {
      defaultSettings.env = { OPENAI_API_KEY: codexApiKey }
    }

    logInfo('ai-runtime', 'Initialized Codex CLI provider with CLI-auth defaults.', {
      approvalMode,
      sandboxMode,
      allowNpx,
    })

    return (modelName: string, overrides?: Record<string, unknown>) =>
      codexCli(modelName, { ...defaultSettings, ...(overrides as CodexCliSettings | undefined) })
  },
  'lm-studio': () => {
    const baseURL = readEnvValue('AI_LMSTUDIO_BASE_URL') ?? 'http://127.0.0.1:1234/v1'
    const apiKey = readEnvValue('AI_LMSTUDIO_API_KEY') ?? 'lm-studio'
    logInfo('ai-runtime', `Initialized LM Studio provider (${baseURL}).`)
    try {
      return createOpenAICompatible({
        name: 'lm-studio',
        baseURL,
        apiKey,
      })
    } catch (error) {
      const message =
        'LM Studio provider is not reachable. Start the LM Studio server via `lms server start`.'
      logError('ai-runtime', message, error as Error)
      throw new ProviderUnavailableError('lm-studio', message, error)
    }
  },
}

const providerCache = new Map<ProviderId, ReturnType<ProviderFactory>>()

export function resolveProvider(providerId: ProviderId) {
  const cached = providerCache.get(providerId)
  if (cached) {
    return cached
  }
  const factory = providerFactories[providerId]
  if (!factory) {
    throw new ProviderUnavailableError(providerId, `Unsupported provider: ${providerId}`)
  }
  try {
    const instance = factory()
    providerCache.set(providerId, instance)
    return instance
  } catch (error) {
    if (error instanceof ProviderUnavailableError) {
      throw error
    }
    const message =
      error instanceof Error
        ? error.message
        : `Unable to initialize provider ${PROVIDER_TITLES[providerId] ?? providerId}`
    throw new ProviderUnavailableError(providerId, message, error)
  }
}

export function createProviderLogger(scope: string) {
  return {
    debug: (message: string) => logDebug(scope, message),
    info: (message: string) => logInfo(scope, message),
    warn: (message: string) => logWarn(scope, message),
    error: (message: string) => logError(scope, message),
  }
}

export function readBooleanEnv(key: string, fallback = false) {
  const value = readEnvValue(key)
  if (value == null) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function coerceApprovalMode(value?: string): ApprovalMode | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase() as ApprovalMode
  const allowed: ApprovalMode[] = ['untrusted', 'on-failure', 'on-request', 'never']
  if (allowed.includes(normalized)) {
    return normalized
  }
  logWarn('ai-runtime', `Invalid AI_CODEX_CLI_APPROVAL_MODE "${value}" – falling back to default.`)
  return undefined
}

export function coerceSandboxMode(value?: string): SandboxMode | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase() as SandboxMode
  const allowed: SandboxMode[] = ['read-only', 'workspace-write', 'danger-full-access']
  if (allowed.includes(normalized)) {
    return normalized
  }
  logWarn('ai-runtime', `Invalid AI_CODEX_CLI_SANDBOX_MODE "${value}" – falling back to default.`)
  return undefined
}

export function readEnvValue(key: string) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}
