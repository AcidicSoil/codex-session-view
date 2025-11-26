import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

export const env = createEnv({
  server: {
    MY_SECRET_VAR: z.url().default('https://example.com'),
    SESSION_COACH_ENABLED: z.enum(['true', 'false', '1', '0']).optional(),
  },
  runtimeEnv: process.env,
});
