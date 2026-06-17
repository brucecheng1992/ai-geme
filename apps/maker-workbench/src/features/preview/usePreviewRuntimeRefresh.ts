import { useCallback, useState } from 'react';

import {
  createPreviewRuntimeRefreshAdapter,
  type CreatePreviewRuntimeRefreshAdapterOptions,
  type PreviewRefreshArtifactContext,
  type PreviewRefreshRequest,
  type PreviewRefreshResult
} from './PreviewRuntimeRefreshAdapter.js';
import type { QaReport } from '../../workbench-api.js';

export type UsePreviewRuntimeRefreshResult = {
  current: PreviewRefreshResult | undefined;
  requestRefresh: (request: PreviewRefreshRequest, context: PreviewRefreshArtifactContext) => PreviewRefreshResult;
  markIframeLoaded: (refreshId: string) => PreviewRefreshResult;
  markRuntimeLoaded: (refreshId: string) => PreviewRefreshResult;
  markQaRunning: (refreshId: string) => PreviewRefreshResult;
  completeQa: (refreshId: string, input: { qaReport?: QaReport }) => PreviewRefreshResult;
};

export function usePreviewRuntimeRefresh(options: CreatePreviewRuntimeRefreshAdapterOptions = {}): UsePreviewRuntimeRefreshResult {
  const [adapter] = useState(() => createPreviewRuntimeRefreshAdapter(options));
  const [current, setCurrent] = useState<PreviewRefreshResult | undefined>(() => adapter.current());

  const update = useCallback(
    (result: PreviewRefreshResult) => {
      const latest = adapter.current();
      if (result.status === 'stale' && latest !== undefined && latest.refreshId !== result.refreshId) {
        setCurrent(latest);
        return latest;
      }

      setCurrent(result);
      return result;
    },
    [adapter]
  );

  const requestRefresh = useCallback(
    (request: PreviewRefreshRequest, context: PreviewRefreshArtifactContext) => update(adapter.requestRefresh(request, context)),
    [adapter, update]
  );
  const markIframeLoaded = useCallback((refreshId: string) => update(adapter.markIframeLoaded(refreshId)), [adapter, update]);
  const markRuntimeLoaded = useCallback((refreshId: string) => update(adapter.markRuntimeLoaded(refreshId)), [adapter, update]);
  const markQaRunning = useCallback((refreshId: string) => update(adapter.markQaRunning(refreshId)), [adapter, update]);
  const completeQa = useCallback((refreshId: string, input: { qaReport?: QaReport }) => update(adapter.completeQa(refreshId, input)), [adapter, update]);

  return {
    current,
    requestRefresh,
    markIframeLoaded,
    markRuntimeLoaded,
    markQaRunning,
    completeQa
  };
}
