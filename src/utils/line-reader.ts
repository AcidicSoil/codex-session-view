export function splitLinesTransform(): TransformStream<string, string> {
  let carry = '';
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const text = carry + chunk;
      const parts = text.split(/\n/);
      carry = parts.pop() ?? '';
      for (const line of parts) {
        controller.enqueue(line.endsWith('\r') ? line.slice(0, -1) : line);
      }
    },
    flush(controller) {
      if (carry.length > 0) {
        controller.enqueue(carry.endsWith('\r') ? carry.slice(0, -1) : carry);
      }
    },
  });
}

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof (blob as any).arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob);
    });
  }
  if (typeof (blob as any).text === 'function') {
    const text = await blob.text();
    return new TextEncoder().encode(text).buffer;
  }
  return new ArrayBuffer(0);
}

function getBlobStream(blob: Blob): ReadableStream<Uint8Array> {
  if (typeof (blob as any).stream === 'function') {
    return (blob as any).stream();
  }
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const buffer = await readBlobAsArrayBuffer(blob);
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function* streamTextLines(blob: Blob, encoding = 'utf-8'): AsyncGenerator<string> {
  const hasDecoderStream = typeof (globalThis as any).TextDecoderStream === 'function';

  if (hasDecoderStream) {
    const decoded = getBlobStream(blob)
      // @ts-ignore TextDecoderStream exists in modern runtimes; fallback below otherwise.
      .pipeThrough(new TextDecoderStream(encoding))
      .pipeThrough(splitLinesTransform());

    for await (const line of decoded as any as AsyncIterable<string>) {
      yield line;
    }
    return;
  }

  const reader = getBlobStream(blob).getReader();
  const decoder = new TextDecoder(encoding);
  let carry = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const text = carry + chunk;
      const parts = text.split(/\n/);
      carry = parts.pop() ?? '';
      for (const line of parts) {
        yield line.endsWith('\r') ? line.slice(0, -1) : line;
      }
    }
    const last = decoder.decode();
    if (last) {
      const text = carry + last;
      const parts = text.split(/\n/);
      carry = parts.pop() ?? '';
      for (const line of parts) {
        yield line.endsWith('\r') ? line.slice(0, -1) : line;
      }
    }
    if (carry.length) {
      yield carry.endsWith('\r') ? carry.slice(0, -1) : carry;
    }
  } finally {
    reader.releaseLock();
  }
}
