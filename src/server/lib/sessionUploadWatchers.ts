import type { FSWatcher } from 'node:fs';
import { logError, logWarn } from '~/lib/logger';
import { uploadRecordToAsset, type DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import {
  findSessionUploadRecordById,
  getSessionUploadSummaryById,
  refreshSessionUploadFromSource,
} from '~/server/persistence/sessionUploads';

type NodeFsModule = typeof import('node:fs');

let fsModulePromise: Promise<NodeFsModule> | null = null;

async function ensureNodeFs(): Promise<NodeFsModule> {
  if (!fsModulePromise) {
    fsModulePromise = import('node:fs');
  }
  return fsModulePromise;
}

export type UploadWatcherEvent =
  | { type: 'ready'; asset: DiscoveredSessionAsset }
  | { type: 'update'; asset: DiscoveredSessionAsset }
  | { type: 'error'; message: string };

type UploadWatcherListener = (event: UploadWatcherEvent) => void;

class UploadWatcher {
  private listeners = new Set<UploadWatcherListener>();
  private fsWatcher?: FSWatcher;
  private startPromise: Promise<void> | null = null;
  private refreshPromise: Promise<void> | null = null;
  private latestAsset?: DiscoveredSessionAsset;
  private sourcePath?: string;

  constructor(private readonly uploadId: string) {}

  subscribe(listener: UploadWatcherListener) {
    this.listeners.add(listener);
    if (this.latestAsset) {
      listener({ type: 'ready', asset: this.latestAsset });
    }
    this.ensureStarted().catch((error) => {
      logError('session-upload-watch', 'Failed to start watcher', error as Error);
      listener({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to start live session watcher.',
      });
    });
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.dispose();
      }
    };
  }

  hasListeners() {
    return this.listeners.size > 0;
  }

  private async ensureStarted() {
    if (this.startPromise) {
      return this.startPromise;
    }
    this.startPromise = this.initialize();
    return this.startPromise;
  }

  private async initialize() {
    if (typeof process === 'undefined' || !process.versions?.node) {
      throw new Error('Session upload watcher requires a Node.js runtime.');
    }

    const summary = await getSessionUploadSummaryById(this.uploadId);
    if (!summary) {
      throw new Error('Session upload not found.');
    }
    this.latestAsset = uploadRecordToAsset(summary);
    this.broadcast({ type: 'ready', asset: this.latestAsset });

    const record = await findSessionUploadRecordById(this.uploadId);
    if (!record?.sourcePath) {
      throw new Error('Session upload is not backed by a workspace file; live updates are unavailable.');
    }
    this.sourcePath = record.sourcePath;
    const fs = await ensureNodeFs();
    this.fsWatcher = fs.watch(record.sourcePath, { persistent: false }, (eventType) => {
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
    this.fsWatcher.on('error', (error) => {
      logError('session-upload-watch', 'Underlying file watcher error', error as Error);
      this.broadcast({
        type: 'error',
        message: 'Live session watcher failed. Check terminal logs.',
      });
    });
  }

  private scheduleRefresh() {
    if (this.refreshPromise) {
      return;
    }
    this.refreshPromise = (async () => {
      try {
        const summary = await refreshSessionUploadFromSource(this.uploadId);
        if (!summary) {
          return;
        }
        this.latestAsset = uploadRecordToAsset(summary);
        this.broadcast({ type: 'update', asset: this.latestAsset });
      } finally {
        this.refreshPromise = null;
      }
    })().catch((error) => {
      logError('session-upload-watch', 'Failed to refresh session upload during live update', error as Error);
      this.broadcast({
        type: 'error',
        message: 'Failed to refresh session asset. Check terminal logs.',
      });
    });
  }

  private broadcast(event: UploadWatcherEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  dispose() {
    this.fsWatcher?.close();
    this.fsWatcher = undefined;
    this.startPromise = null;
    this.refreshPromise = null;
  }
}

const watcherRegistry = new Map<string, UploadWatcher>();

export function subscribeToUploadWatcher(uploadId: string, listener: UploadWatcherListener) {
  let watcher = watcherRegistry.get(uploadId);
  if (!watcher) {
    watcher = new UploadWatcher(uploadId);
    watcherRegistry.set(uploadId, watcher);
  }
  const unsubscribe = watcher.subscribe(listener);
  return () => {
    unsubscribe();
    const activeWatcher = watcherRegistry.get(uploadId);
    if (activeWatcher && !activeWatcher.hasListeners()) {
      activeWatcher.dispose();
      watcherRegistry.delete(uploadId);
    }
  };
}
