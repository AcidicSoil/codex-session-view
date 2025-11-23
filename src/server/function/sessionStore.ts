import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { logError, logInfo } from '~/lib/logger';
import { saveSessionUpload } from '../persistence/sessionUploads';

const inputSchema = z.object({
  filename: z.string().min(1).max(256),
  content: z.string().min(1),
});

export const persistSessionFile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    logInfo('session-store', 'Persisting session file', { filename: data.filename });
    try {
      const record = await saveSessionUpload(data.filename, data.content);
      logInfo('session-store', 'Persisted session file', { id: record.id });
      return record;
    } catch (error) {
      logError('session-store', 'Failed to persist session file', error as Error);
      throw error;
    }
  });
