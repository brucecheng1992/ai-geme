import type { PreviewRefreshReason, PreviewRefreshRequest } from '../preview/index.js';

export type SemanticEditPreviewRefreshEvent =
  | {
      type: 'semantic_patch_applied';
      projectId: string;
      runId: string;
      patchId: string;
      intentId?: string;
      expectedSSOTHash?: string;
    }
  | {
      type: 'semantic_patch_rolled_back';
      projectId: string;
      runId: string;
      patchId: string;
      intentId?: string;
      expectedSSOTHash?: string;
    };

export function buildPreviewRefreshRequestFromSemanticPatchEvent(event: SemanticEditPreviewRefreshEvent): PreviewRefreshRequest {
  return {
    projectId: event.projectId,
    runId: event.runId,
    patchId: event.patchId,
    ...(event.intentId === undefined ? {} : { intentId: event.intentId }),
    reason: toPreviewRefreshReason(event.type),
    ...(event.expectedSSOTHash === undefined ? {} : { expectedSSOTHash: event.expectedSSOTHash }),
    forceQa: true
  };
}

function toPreviewRefreshReason(type: SemanticEditPreviewRefreshEvent['type']): PreviewRefreshReason {
  return type === 'semantic_patch_applied' ? 'semantic_patch_applied' : 'semantic_patch_rolled_back';
}
