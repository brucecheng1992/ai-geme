export const LIVE_EDIT_CAPABILITY_STATUSES = [
  'supported-live-edit',
  'runtime-complete',
  'warm-restart-only',
  'generation-only',
  'schema-only',
  'resolver-only',
  'artifact-only',
  'known-not-exposed',
  'runtime-adapter-missing',
  'behavior-not-verified',
  'requires-generator-gate',
  'blocked-unsupported'
] as const;

export type LiveEditCapabilityStatus = (typeof LIVE_EDIT_CAPABILITY_STATUSES)[number];

const END_TO_END_LIVE_EDIT_STATUSES = new Set<LiveEditCapabilityStatus>(['supported-live-edit', 'runtime-complete']);

export function isEndToEndLiveEditStatus(status: LiveEditCapabilityStatus): boolean {
  return END_TO_END_LIVE_EDIT_STATUSES.has(status);
}
