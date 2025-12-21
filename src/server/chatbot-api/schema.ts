import { z } from 'zod'

export const metadataSchema = z
  .object({
    misalignmentId: z.string().optional(),
    ruleId: z.string().optional(),
    severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
    eventRange: z
      .object({
        startIndex: z.number().min(0),
        endIndex: z.number().min(0),
      })
      .optional(),
  })
  .optional()

export const streamInputSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
  clientMessageId: z.string().optional(),
  metadata: metadataSchema,
  modelId: z.string().optional(),
  threadId: z.string().optional(),
})

export const analyzeInputSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
  analysisType: z.enum(['summary', 'commits', 'hook-discovery']).default('summary'),
  prompt: z.string().optional(),
})

export type StreamInput = z.infer<typeof streamInputSchema>
export type AnalyzeInput = z.infer<typeof analyzeInputSchema>
