import type { ToolSet } from 'ai';
import type { ChatStreamResult } from '~/server/lib/aiRuntime';
import { getChatToolEventRepository } from '~/server/persistence/chatToolEvents';

interface NdjsonStreamOptions<TOOLS extends ToolSet = ToolSet> {
  runtime: ChatStreamResult<TOOLS>;
  onComplete: (text: string) => Promise<void>;
  onError?: (error: unknown) => Promise<void> | void;
}

interface StreamChunkBase {
  type: string;
}

type StreamChunk =
  | (StreamChunkBase & { type: 'start' })
  | (StreamChunkBase & { type: 'text-delta'; value: string })
  | (StreamChunkBase & {
      type: 'tool-call'
      toolCallId: string
      toolName: string
      input: unknown
      providerExecuted?: boolean
      dynamic?: boolean
    })
  | (StreamChunkBase & {
      type: 'tool-result'
      toolCallId: string
      toolName: string
      output: unknown
      providerExecuted?: boolean
      dynamic?: boolean
    })
  | (StreamChunkBase & {
      type: 'tool-error'
      toolCallId: string
      toolName: string
      error: unknown
      providerExecuted?: boolean
      dynamic?: boolean
    })
  | (StreamChunkBase & { type: 'done' })
  | (StreamChunkBase & { type: 'error'; message: string });

export function createNdjsonStream(options: NdjsonStreamOptions) {
  const encoder = new TextEncoder();
  const toolEventsRepository = getChatToolEventRepository();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: StreamChunk) => controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
      let assistantText = '';
      write({ type: 'start' });
      try {
        for await (const part of options.runtime.fullStream) {
          switch (part.type) {
            case 'text-delta':
              assistantText += part.text;
              write({ type: 'text-delta', value: part.text });
              break;
            case 'tool-call':
              write({
                type: 'tool-call',
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input: part.input,
                providerExecuted: part.providerExecuted,
                dynamic: part.dynamic,
              });
              break;
            case 'tool-result':
              write({
                type: 'tool-result',
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                output: part.output,
                providerExecuted: part.providerExecuted,
                dynamic: part.dynamic,
              });
              try {
                await toolEventsRepository.updateStatusByToolCall?.(part.toolCallId, 'succeeded', {
                  result: part.output,
                });
              } catch {
                // repository updates are best-effort during streaming
              }
              break;
            case 'tool-error':
              write({
                type: 'tool-error',
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                error: part.error,
                providerExecuted: part.providerExecuted,
                dynamic: part.dynamic,
              });
              try {
                await toolEventsRepository.updateStatusByToolCall?.(part.toolCallId, 'failed', {
                  error:
                    typeof part.error === 'string'
                      ? part.error
                      : part.error instanceof Error
                        ? part.error.message
                        : 'Tool execution failed',
                });
              } catch {
                // repository updates are best-effort during streaming
              }
              break;
            default:
              break;
          }
        }
        await options.onComplete(assistantText);
        write({ type: 'done' });
        controller.close();
      } catch (error) {
        write({
          type: 'error',
          message: error instanceof Error ? error.message : 'Streaming failed',
        });
        if (options.onError) {
          await options.onError(error);
        }
        controller.error(error);
      }
    },
  });
}
