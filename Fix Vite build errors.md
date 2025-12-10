# build-failing

build is failing because two server-only modules use Node built-ins in a way that Vite’s browser build cannot bundle:

* `src/server/lib/chatbotData.ts` → `node:crypto` (`createHash`)

* `src/server/lib/sessionUploadWatchers.ts` → `node:fs` (`watch`)

Vite replaces `node:*` with a browser stub (`__vite-browser-external`) for the client build, and that stub does not export `createHash` or `watch`, so Rollup errors.

Fix by:

1. removing the `node:crypto` dependency and using Web Crypto / pure JS hashing, and

2. switching `node:fs` to a dynamic import and type-only import.

* * *

### 1\. Patch `src/server/lib/chatbotData.ts`

Remove the Node crypto import and change hashing to use `crypto.subtle` with a JS fallback.

At the top of the file, delete the `node:crypto` import:

    - import * as crypto from 'node:crypto';
    import { parseAgentRules, type AgentRule } from '~/lib/agents-rules/parser';
    import type { SessionSnapshot } from '~/lib/sessions/model';

Then update the `loadAgentRules` loop to await the (now async) hash function:

      for (const filePath of files) {
        try {
          const buffer = await fs.readFile(filePath);
    -     const hash = hashBuffer(buffer);
    +     const hash = await hashBuffer(buffer);
          const existing = hashIndex.byHash.get(hash);
          if (existing) {
            existing.paths.add(filePath);
            duplicateFileCount += 1;
            continue;
          }

Update `checkDuplicateInstructionFile` to await the hash as well:

      const fs = await import('node:fs/promises');
      const buffer = await fs.readFile(filePath);
    - const hash = hashBuffer(buffer);
    + const hash = await hashBuffer(buffer);
      const existing = hashIndex.byHash.get(hash);
      if (existing) {
        const isCanonical = existing.canonicalPath === filePath;
        return {
          hash,
          isDuplicate: !isCanonical,
          existingPath: isCanonical ? undefined : existing.canonicalPath,
        };
      }

Finally, replace the old `hashBuffer` implementation with an async, Node/browser-safe version:

    -function hashBuffer(buffer: Buffer) {
    -  return crypto.createHash('sha256').update(buffer).digest('hex');
    -}
    +async function hashBuffer(buffer: Buffer): Promise<string> {
    +  const bytes =
    +    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as unknown as ArrayBuffer);
    +
    +  // Prefer Web Crypto (Node 18+ and browsers)
    +  if (typeof crypto !== 'undefined' && 'subtle' in crypto && crypto.subtle) {
    +    const digest = await crypto.subtle.digest('SHA-256', bytes);
    +    const view = new Uint8Array(digest);
    +    let hex = '';
    +    for (let i = 0; i < view.length; i += 1) {
    +      const b = view[i].toString(16);
    +      hex += b.length === 1 ? '0' + b : b;
    +    }
    +    return hex;
    +  }
    +
    +  // Fallback: simple non-cryptographic hash if Web Crypto is unavailable
    +  let h1 = 0x811c9dc5;
    +  for (let i = 0; i < bytes.length; i += 1) {
    +    h1 ^= bytes[i];
    +    h1 = Math.imul(h1, 0x01000193) >>> 0;
    +  }
    +  return h1.toString(16);
    +}

This completely removes the `node:crypto` dependency, so Vite no longer needs to stub it.

* * *

### 2\. Patch `src/server/lib/sessionUploadWatchers.ts`

Make `node:fs` a dynamic import and move `FSWatcher` to a type-only import so there is no runtime dependency on `node:fs` in the client bundle.

Replace the top import:

    -import { watch, type FSWatcher } from 'node:fs';
    +import type { FSWatcher } from 'node:fs';
     import { logError, logWarn } from '~/lib/logger';
     import { uploadRecordToAsset, type DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
     import {
       findSessionUploadRecordById,
       getSessionUploadSummaryById,
       refreshSessionUploadFromSource,
     } from '~/server/persistence/sessionUploads';

Add a small helper to lazily load `node:fs`:

    +type NodeFsModule = typeof import('node:fs');
    +
    +let fsModulePromise: Promise<NodeFsModule> | null = null;
    +
    +async function ensureNodeFs(): Promise<NodeFsModule> {
    +  if (!fsModulePromise) {
    +    fsModulePromise = import('node:fs');
    +  }
    +  return fsModulePromise;
    +}

Then update `initialize` to guard for Node and use the dynamic import:

      private async initialize() {
    +    if (typeof process === 'undefined' || !process.versions?.node) {
    +      throw new Error('Session upload watcher requires a Node.js runtime.');
    +    }
    +
         const summary = getSessionUploadSummaryById(this.uploadId);
         if (!summary) {
           throw new Error('Session upload not found.');
         }
         this.latestAsset = uploadRecordToAsset(summary);
         this.broadcast({ type: 'ready', asset: this.latestAsset });

         const record = findSessionUploadRecordById(this.uploadId);
         if (!record?.sourcePath) {
           throw new Error('Session upload is not backed by a workspace file; live updates are unavailable.');
         }
         this.sourcePath = record.sourcePath;
    -    this.fsWatcher = watch(record.sourcePath, { persistent: false }, (eventType) => {
    +    const fs = await ensureNodeFs();
    +    this.fsWatcher = fs.watch(record.sourcePath, { persistent: false }, (eventType) => {
           if (eventType === 'rename') {
             logWarn('session-upload-watch', 'Session file was renamed or deleted', {
               uploadId: this.uploadId,
               sourcePath: record.sourcePath,
             });
             this.broadcast({
               type: 'error',
               message: 'Session file was moved or deleted; live updates paused.',
             });
             return;
           }
           this.scheduleRefresh();
         });

The rest of the file (`scheduleRefresh`, `broadcast`, `dispose`, etc.) stays as-is.

This removes all runtime `import { watch } from 'node:fs'` usage, so Vite no longer tries to bind `watch` from the browser stub and the `"watch" is not exported by "__vite-browser-external"` error goes away.

* * *

After applying these two patches, run the build again with your existing script:

    npm run build
    # or
    pnpm build

The `createHash` and `watch` errors will be resolved.
