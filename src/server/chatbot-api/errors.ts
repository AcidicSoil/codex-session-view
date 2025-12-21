import { ProviderUnavailableError } from '~/server/lib/aiRuntime'

export function isProviderUnavailableError(error: unknown): error is ProviderUnavailableError {
  if (error instanceof ProviderUnavailableError) {
    return true
  }
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'MODEL_UNAVAILABLE'
  )
}

export type AiProviderError = Error & {
  data?: {
    error?: {
      message?: string
    }
  }
}

export function isAiProviderError(error: unknown): error is AiProviderError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'data' in error &&
      typeof (error as { data?: unknown }).data === 'object'
  )
}

export function getProviderErrorMessage(error: unknown): string {
  if (isAiProviderError(error)) {
    const aiMessage = (error.data?.error?.message as string | undefined) ?? error.message
    if (aiMessage) {
      return aiMessage
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Model is not available right now.'
}
