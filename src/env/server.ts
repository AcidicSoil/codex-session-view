import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

export const env = createEnv({
  server: {
    MY_SECRET_VAR: z.url().default('https://example.com'),
    SESSION_COACH_ENABLED: z.enum(['true', 'false', '1', '0']).optional(),
    AI_OPENAI_COMPATIBLE_API_KEY: z.string().optional(),
    AI_OPENAI_COMPATIBLE_BASE_URL: z.string().url().optional(),
    AI_SESSION_DEFAULT_MODEL: z.string().optional(),
    AI_GENERAL_DEFAULT_MODEL: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    DATABASE_URL: z.string().url(),
    ELECTRIC_HTTP_URL: z.string().url(),
    ELECTRIC_SYNC_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
