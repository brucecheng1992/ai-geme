import {
  classifyLiveEditCapabilityRuntimeMode,
  liveEditCapabilityExposureRegistry,
  type LiveEditCapabilityExposure,
  type LiveEditCapabilityRuntimeMode
} from '../../../../../packages/game-dsl/src/live-edit-capabilities.js';
import {
  isEndToEndLiveEditStatus,
  type LiveEditCapabilityStatus
} from '../../../../../packages/game-dsl/src/live-edit-capability-status.js';

import type { LiveEditCapabilities } from '../../workbench-api.js';

export type LiveEditCapabilityDiagnosticsOptions = {
  runtimeStatus?: 'supported' | 'unsupported';
};

export type LiveEditCapabilityDiagnosticItem = {
  key: string;
  label: string;
  status: LiveEditCapabilityStatus;
  registryStatus: LiveEditCapabilityStatus;
  diagnostic: string;
  runtimeCapabilityMode: LiveEditCapabilityRuntimeMode;
  supportedEndToEnd: boolean;
  examples: readonly string[];
  blockedFallbacks: readonly string[];
};

export type LiveEditCapabilityDiagnosticGroup = {
  status: LiveEditCapabilityStatus;
  title: string;
  summary: string;
  items: LiveEditCapabilityDiagnosticItem[];
};

const STATUS_ORDER: readonly LiveEditCapabilityStatus[] = [
  'supported-live-edit',
  'runtime-complete',
  'warm-restart-only',
  'known-not-exposed',
  'resolver-only',
  'schema-only',
  'artifact-only',
  'runtime-adapter-missing',
  'behavior-not-verified',
  'generation-only',
  'requires-generator-gate',
  'blocked-unsupported'
];

const STATUS_COPY: Record<LiveEditCapabilityStatus, { title: string; summary: string }> = {
  'supported-live-edit': {
    title: 'Live-edit supported',
    summary: 'Parser, patch contract, runtime adapter, lifecycle, and tests are present.'
  },
  'runtime-complete': {
    title: 'Runtime complete',
    summary: 'Runtime behavior exists and can be controlled by a complete live-edit contract.'
  },
  'warm-restart-only': {
    title: 'Warm restart only',
    summary: 'The runtime inventory can reload this domain, but Workbench cannot claim live patch behavior.'
  },
  'generation-only': {
    title: 'Generation only',
    summary: 'The concept belongs to generation prompts, not Workbench live editing.'
  },
  'schema-only': {
    title: 'Schema only',
    summary: 'The DSL can describe this concept, but parser/runtime live-edit support is missing.'
  },
  'resolver-only': {
    title: 'Resolver only',
    summary: 'Resolver support exists, but live-edit event binding or runtime patch support is missing.'
  },
  'artifact-only': {
    title: 'Artifact only',
    summary: 'Artifacts can record this concept, but Workbench live editing cannot apply it.'
  },
  'known-not-exposed': {
    title: 'Known not live-editable',
    summary: 'The concept is known, but it is intentionally blocked from nearby-field fallback.'
  },
  'runtime-adapter-missing': {
    title: 'Runtime adapter missing',
    summary: 'A parser or patch shape may exist, but preview runtime cannot apply it yet.'
  },
  'behavior-not-verified': {
    title: 'Behavior not verified',
    summary: 'Behavior may exist, but tests or Oracle evidence are not sufficient to mark it green.'
  },
  'requires-generator-gate': {
    title: 'Requires generator gate',
    summary: 'This needs generator/runtime source work before Workbench live-edit support.'
  },
  'blocked-unsupported': {
    title: 'Blocked unsupported',
    summary: 'The request must not be converted into a nearby supported live-edit field.'
  }
};

export function buildLiveEditCapabilityDiagnostics(
  capabilities: LiveEditCapabilities,
  options: LiveEditCapabilityDiagnosticsOptions = {}
): LiveEditCapabilityDiagnosticGroup[] {
  const groups = new Map<LiveEditCapabilityStatus, LiveEditCapabilityDiagnosticItem[]>();

  for (const exposure of liveEditCapabilityExposureRegistry) {
    const item = toDiagnosticItem(exposure, capabilities, options);
    groups.set(item.status, [...(groups.get(item.status) ?? []), item]);
  }

  return STATUS_ORDER.flatMap((status) => {
    const items = groups.get(status) ?? [];
    if (items.length === 0) {
      return [];
    }
    return [
      {
        status,
        title: STATUS_COPY[status].title,
        summary: STATUS_COPY[status].summary,
        items
      }
    ];
  });
}

function toDiagnosticItem(
  exposure: LiveEditCapabilityExposure,
  capabilities: LiveEditCapabilities,
  options: LiveEditCapabilityDiagnosticsOptions
): LiveEditCapabilityDiagnosticItem {
  const runtimeCapabilityMode = classifyLiveEditCapabilityRuntimeMode(exposure, capabilities);
  const supportedByRegistry = isEndToEndLiveEditStatus(exposure.status);
  const missingFromCurrentRun = supportedByRegistry && (options.runtimeStatus === 'unsupported' || runtimeCapabilityMode === 'not-listed');
  const status: LiveEditCapabilityStatus = missingFromCurrentRun ? 'runtime-adapter-missing' : exposure.status;
  return {
    key: exposure.key,
    label: exposure.label,
    status,
    registryStatus: exposure.status,
    diagnostic: missingFromCurrentRun
      ? `${exposure.label} is supported by the registry, but the current run does not list a matching runtime capability.`
      : exposure.diagnostic,
    runtimeCapabilityMode,
    supportedEndToEnd: isEndToEndLiveEditStatus(status) && !missingFromCurrentRun,
    examples: exposure.examples,
    blockedFallbacks: exposure.blockedFallbacks
  };
}
