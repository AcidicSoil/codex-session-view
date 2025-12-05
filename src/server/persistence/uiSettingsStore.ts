import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import type { UiSettingsSnapshot } from '~/lib/ui-settings'
import { cloneUiSettingsSnapshot, DEFAULT_UI_SETTINGS_SNAPSHOT } from '~/lib/ui-settings'

interface UiSettingsRecord {
  profileId: string
  settings: UiSettingsSnapshot
  updatedAt: string
}

const uiSettingsCollection = createCollection(
  localOnlyCollectionOptions<UiSettingsRecord>({
    id: 'ui-settings-store',
    getKey: (record) => record.profileId,
  }),
)

export function loadUiSettings(profileId: string): UiSettingsSnapshot | null {
  const record = uiSettingsCollection.get(profileId)
  if (!record) return null
  return cloneUiSettingsSnapshot(record.settings)
}

export async function saveUiSettings(profileId: string, snapshot: UiSettingsSnapshot): Promise<UiSettingsSnapshot> {
  const normalized = cloneUiSettingsSnapshot(snapshot ?? DEFAULT_UI_SETTINGS_SNAPSHOT)
  const existing = uiSettingsCollection.get(profileId)
  if (existing) {
    await uiSettingsCollection.update(existing.profileId, (draft) => {
      draft.settings = normalized
      draft.updatedAt = new Date().toISOString()
    })
  } else {
    await uiSettingsCollection.insert({
      profileId,
      settings: normalized,
      updatedAt: new Date().toISOString(),
    })
  }
  return normalized
}
