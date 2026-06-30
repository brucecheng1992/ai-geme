import { describe, expect, it } from 'vitest';

import {
  GenerationCapabilityGapReportSchema,
  buildGenerationCapabilityGapReport,
  buildGenerationCapabilityPreflight,
  buildGenerationCapabilityResolutionShadow,
  buildGenerationCapabilityRuntimeShadow
} from '../../packages/game-dsl/src/index.js';

describe('Step 37 generation capability gap escalation report', () => {
  it('binds active side-scrolling profile consumption to source hashes without mutating production registry or lock state', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun'
    });
    const resolution = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });
    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun',
      resolutionReport: resolution.resolutionReport,
      activeRuntimeAuthority: activeRuntimeAuthorityEvidence()
    });

    const report = buildGenerationCapabilityGapReport({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun',
      readinessReport: preflight.readinessReport,
      resolutionReport: resolution.resolutionReport,
      runtimeReport: runtime.runtimeReport
    });
    const second = buildGenerationCapabilityGapReport({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun',
      readinessReport: preflight.readinessReport,
      resolutionReport: resolution.resolutionReport,
      runtimeReport: runtime.runtimeReport
    });

    expect(GenerationCapabilityGapReportSchema.parse(report)).toEqual(report);
    expect(report.reportHash).toBe(second.reportHash);
    expect(report).toMatchObject({
      artifactKind: 'generation_capability_gap_report',
      schemaVersion: 'generation_capability_gap_report.v0.1',
      selectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      shadowMode: false,
      capabilityPathGate: 'ready_for_active_profile_provider',
      gapStatus: 'not_required',
      providerInvocationPolicy: 'active_profile_provider_allowed',
      step36EscalationStatus: 'not_required',
      missingRegistryCapabilityAliases: [],
      installPolicy: {
        resolverPackageNamespace: 'active_immutable_registry_snapshot',
        uninstalledStep36CandidateAllowed: false,
        approvedButNotInstalledCandidateAllowed: false,
        installedPackagesRequireNewSnapshotAndRun: true
      },
      productionMutation: {
        activeRegistryMutation: false,
        activeExactLockMutation: false,
        fixedTemplateFallbackOnGap: false
      },
      step36EscalationPreconditions: {
        sourceRunBound: true,
        profileResolutionBound: true,
        capabilityRequirementsBound: true,
        registrySnapshotBound: true,
        blockedRequiredGapPresent: false,
        activeInstallAllowedFromGenerationRun: false
      },
      blockers: []
    });
    expect(report.missingRequiredCapabilityIds).toEqual([]);
    expect(report.registrySnapshotHash).toBe(preflight.registrySnapshot.snapshotHash);
    expect(report.readinessReportHash).toBe(preflight.readinessReport.reportHash);
    expect(report.resolutionReportHash).toBe(resolution.resolutionReport.reportHash);
    expect(report.runtimeReportHash).toBe(runtime.runtimeReport.reportHash);
    expect(report.runtimeEvidenceBlockers).toEqual([]);
  });

  it('does not route unsupported intent into Step36 capability synthesis', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_unsupported_capability_gap',
      normalizedGenre: 'unrecognized_2d_genre'
    });
    const resolution = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_unsupported_capability_gap',
      normalizedGenre: 'unrecognized_2d_genre',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });
    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_unsupported_capability_gap',
      normalizedGenre: 'unrecognized_2d_genre',
      resolutionReport: resolution.resolutionReport
    });

    const report = buildGenerationCapabilityGapReport({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_unsupported_capability_gap',
      normalizedGenre: 'unrecognized_2d_genre',
      readinessReport: preflight.readinessReport,
      resolutionReport: resolution.resolutionReport,
      runtimeReport: runtime.runtimeReport
    });

    expect(report).toMatchObject({
      selectedPath: 'fail_closed_unsupported_intent',
      capabilityPathGate: 'unsupported_intent_fail_closed',
      gapStatus: 'unsupported_intent',
      providerInvocationPolicy: 'unsupported_intent_not_sent_to_provider',
      step36EscalationStatus: 'not_applicable_unsupported_intent',
      missingRequiredCapabilityIds: [],
      missingRegistryCapabilityAliases: [],
      resolverMissingCapabilityIds: []
    });
    expect(report.step36EscalationPreconditions.profileResolutionBound).toBe(false);
    expect(report.step36EscalationPreconditions.blockedRequiredGapPresent).toBe(false);
  });

  it('rejects attempted Step36 candidate package input before atomic registry installation', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_candidate_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun'
    });
    const resolution = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_candidate_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });
    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_candidate_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun',
      resolutionReport: resolution.resolutionReport,
      activeRuntimeAuthority: activeRuntimeAuthorityEvidence()
    });

    const report = buildGenerationCapabilityGapReport({
      projectId: 'proj_20260619_capability_gap',
      runId: 'run_20260619_candidate_capability_gap',
      normalizedGenre: 'side_scrolling_run_and_gun',
      readinessReport: preflight.readinessReport,
      resolutionReport: resolution.resolutionReport,
      runtimeReport: runtime.runtimeReport,
      attemptedCandidatePackageInputCount: 1
    });

    expect(report.attemptedCandidatePackageInputCount).toBe(1);
    expect(report.attemptedCandidatePackageInputRejected).toBe(true);
    expect(report.installPolicy.uninstalledStep36CandidateAllowed).toBe(false);
    expect(report.installPolicy.approvedButNotInstalledCandidateAllowed).toBe(false);
    expect(report.productionMutation.activeRegistryMutation).toBe(false);
    expect(report.blockers).toContain('candidate_package_input_forbidden');
  });
});

function activeRuntimeAuthorityEvidence() {
  return {
    authorityBundleRef: {
      artifactKind: 'authority_bundle' as const,
      path: 'authority_bundle.json' as const,
      bundleHash: 'fnv1a_12345678'
    },
    activeProfileLockRef: {
      artifactKind: 'active_profile_lock' as const,
      path: 'active_profile_lock.json' as const,
      lockHash: 'fnv1a_87654321'
    }
  };
}
