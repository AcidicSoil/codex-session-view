import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { UiSettingsSnapshot } from '~/lib/ui-settings'
import { saveUiSettings } from '~/server/persistence/uiSettingsStore'

const inputSchema = z.object({
  profileId: z.string().min(1),
  settings: z.unknown(),
})

export const persistUiSettings = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const snapshot = data.settings as UiSettingsSnapshot
    await saveUiSettings(data.profileId, snapshot)
    return { ok: true as const }
  })
