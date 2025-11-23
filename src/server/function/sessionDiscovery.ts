import { createServerFn } from '@tanstack/react-start';
import { discoverProjectAssets } from '~/lib/viewerDiscovery.server';
import { logDebug, logError, logInfo } from '~/lib/logger';

export const runSessionDiscovery = createServerFn({ method: 'GET' }).handler(async () => {
  logInfo('session-discovery', 'Starting session discovery');
  try {
    const snapshot = await discoverProjectAssets();
    logDebug('session-discovery', 'Discovery inputs', snapshot.inputs);
    logInfo('session-discovery', 'Discovery outputs', snapshot.stats);
    return snapshot;
  } catch (error) {
    logError('session-discovery', 'Session discovery failed', error as Error);
    throw error;
  }
});
