import { env } from '~/env/server'

export function isSessionCoachEnabled() {
  const override = env.SESSION_COACH_ENABLED
  if (override === 'true' || override === '1') {
    return true
  }
  if (override === 'false' || override === '0') {
    return false
  }
  return true
}

export const featureFlags = {
  sessionCoach: {
    enabled: isSessionCoachEnabled,
  },
}
