import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ChatAiSettings } from '~/lib/chatbot/aiSettings'
import { DEFAULT_CHAT_AI_SETTINGS } from '~/lib/chatbot/aiSettings'

export interface ChatDockSettingsState {
  keepLoadedProviders: Record<string, boolean>
  setKeepLoaded: (providerId: string, value: boolean) => void
  isKeepLoaded: (providerId: string) => boolean
  aiSettings: ChatAiSettings
  setAiSettings: (updater: ChatAiSettings | ((prev: ChatAiSettings) => ChatAiSettings)) => void
}

const memoryStore = new Map<string, string>()
const memoryStorage: Storage = {
  get length() {
    return memoryStore.size
  },
  clear: () => {
    memoryStore.clear()
  },
  getItem: (key: string) => memoryStore.get(key) ?? null,
  key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
  removeItem: (key: string) => {
    memoryStore.delete(key)
  },
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value)
  },
}

const storage = createJSONStorage<ChatDockSettingsState>(() => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryStorage
  }
  return window.localStorage
})

export const useChatDockSettings = create<ChatDockSettingsState>()(
  persist(
    (set, get) => ({
      keepLoadedProviders: {},
      setKeepLoaded: (providerId, value) =>
        set((state) => ({ keepLoadedProviders: { ...state.keepLoadedProviders, [providerId]: value } })),
      isKeepLoaded: (providerId) => Boolean(get().keepLoadedProviders[providerId]),
      aiSettings: { ...DEFAULT_CHAT_AI_SETTINGS },
      setAiSettings: (updater) =>
        set((state) => ({
          aiSettings: typeof updater === 'function' ? (updater as (prev: ChatAiSettings) => ChatAiSettings)(state.aiSettings) : updater,
        })),
    }),
    {
      name: 'codex-chatdock-settings',
      storage,
    },
  ),
)
