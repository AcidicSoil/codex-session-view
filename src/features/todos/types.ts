import { z } from 'zod'

export const todoSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Todo text is required'),
  completed: z.boolean(),
  createdAt: z.string(),
})

export type Todo = z.infer<typeof todoSchema>

export const createTodoInputSchema = z.object({
  text: todoSchema.shape.text,
})

export const todoIdSchema = z.object({
  id: z.string().min(1, 'Todo id is required'),
})
