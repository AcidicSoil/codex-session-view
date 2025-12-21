import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const loadChatThreadsStateServer = createServerOnlyFn(() => import('./chatThreadsState.server'))

const renameInput = z.object({
  threadId: z.string().min(1),
  title: z.string().min(1),
})

export const renameChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => renameInput.parse(data))
  .handler(async ({ data }) => {
    const { renameChatThreadStateServer } = await loadChatThreadsStateServer()
    return renameChatThreadStateServer(data.threadId, data.title)
  })

const deleteInput = z.object({
  threadId: z.string().min(1),
})

export const deleteChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => deleteInput.parse(data))
  .handler(async ({ data }) => {
    const { deleteChatThreadStateServer } = await loadChatThreadsStateServer()
    return deleteChatThreadStateServer(data.threadId)
  })

const archiveInput = z.object({
  threadId: z.string().min(1),
})

export const archiveChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => archiveInput.parse(data))
  .handler(async ({ data }) => {
    const { archiveChatThreadStateServer } = await loadChatThreadsStateServer()
    return archiveChatThreadStateServer(data.threadId)
  })

const clearInput = z.object({
  threadId: z.string().min(1),
})

export const clearChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => clearInput.parse(data))
  .handler(async ({ data }) => {
    const { clearChatThreadStateServer } = await loadChatThreadsStateServer()
    return clearChatThreadStateServer(data.threadId)
  })
