import { describe, expect, it } from 'vitest';

import {
  CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE,
  CANDIDATE_VERIFICATION_STAGES,
  buildCandidateVerificationReport,
  buildCandidateVerificationReportReceipt,
  buildCapabilityVerificationBundle,
  buildMutationVerificationReport,
  buildPerformanceVerificationReport,
  buildProfileCanaryVerificationReport,
  buildSourceIntegrityVerificationReport,
  buildStaticPolicyVerificationReport,
  buildTeardownVerificationReport,
  type CandidateVerificationContext,
  type CandidateVerificationReport,
  type CandidateVerificationReportReceipt,
  type CandidateVerificationReportReceiptResolver
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

describe('Step36 candidate verification bundle contracts', () => {
  it('aggregates required trusted reports in fixed order and remains deterministic under reordered input', () => {
    const context = verificationContext();
    const reports = passedReports(context);
    const first = trustedVerificationBundle({ context, reports });
    const second = trustedVerificationBundle({ context, reports: [...reports].reverse() });

    expect(first.status).toBe('PASSED');
    expect(first.issues).toEqual([]);
    expect(first.reportHashes.map((entry) => entry.stageId)).toEqual(CANDIDATE_VERIFICATION_STAGES.filter((stage) => stage !== 'render_fidelity'));
    expect(first.bundleHash).toBe(second.bundleHash);
  });

  it('rejects public self-certified PASSED reports without trusted verification receipts', () => {
    const context = verificationContext();
    const bundle = buildCapabilityVerificationBundle({
      context,
      reports: passedReports(context)
    });

    expect(bundle.status).toBe('FAILED');
    expect(bundle.issues.map((issue) => issue.code)).toContain('VERIFICATION_REPORT_RECEIPT_MISSING');
  });

  it('fails closed for missing, failed, inconclusive, skipped, candidate-controlled, stale-hash and stale-context reports', () => {
    const context = verificationContext();
    const reports = passedReports(context);
    const missing = trustedVerificationBundle({
      context,
      reports: reports.filter((report) => report.stageId !== 'build')
    });
    const inconclusive = trustedVerificationBundle({
      context,
      reports: replaceReport(reports, buildCandidateVerificationReport({ context, stageId: 'typecheck', status: 'INCONCLUSIVE' }))
    });
    const skipped = trustedVerificationBundle({
      context,
      reports: replaceReport(reports, buildCandidateVerificationReport({ context, stageId: 'contract_tests', status: 'SKIPPED' }))
    });
    const candidateControlled = trustedVerificationBundle({
      context,
      reports: replaceReport(reports, buildCandidateVerificationReport({ context, stageId: 'runtime_binding', status: 'PASSED', candidateControlled: true }))
    });
    const forgedPayload = stripReportHash(buildCandidateVerificationReport({ context, stageId: 'ownership', status: 'PASSED' }));
    const hashMismatch = trustedVerificationBundle({
      context,
      reports: replaceReport(reports, { ...forgedPayload, status: 'FAILED', reportHash: hashStableJson(forgedPayload) })
    });
    const staleContextReport = buildCandidateVerificationReport({
      context: { ...context, registrySnapshotHash: 'fnv1a_stale_registry' },
      stageId: 'package_contract',
      status: 'PASSED'
    });
    const staleContext = trustedVerificationBundle({
      context,
      reports: replaceReport(reports, staleContextReport)
    });
    const duplicateStage = trustedVerificationBundle({
      context,
      reports: [
        ...reports,
        buildCandidateVerificationReport({ context, stageId: 'build', status: 'PASSED' })
      ]
    });

    expect(missing.status).toBe('FAILED');
    expect(missing.issues.map((issue) => issue.code)).toContain('VERIFICATION_REQUIRED_REPORT_MISSING');
    expect(inconclusive.issues.map((issue) => issue.code)).toContain('VERIFICATION_REQUIRED_REPORT_INCONCLUSIVE');
    expect(skipped.issues.map((issue) => issue.code)).toContain('VERIFICATION_REQUIRED_REPORT_SKIPPED');
    expect(candidateControlled.issues.map((issue) => issue.code)).toContain('VERIFICATION_REPORT_CANDIDATE_CONTROLLED');
    expect(hashMismatch.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['VERIFICATION_REPORT_HASH_MISMATCH', 'VERIFICATION_REQUIRED_REPORT_FAILED'])
    );
    expect(staleContext.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['VERIFICATION_REPORT_CONTEXT_MISMATCH', 'VERIFICATION_REPORT_RECEIPT_CONTEXT_MISMATCH'])
    );
    expect(duplicateStage.issues.map((issue) => issue.code)).toContain('VERIFICATION_REPORT_DUPLICATE_STAGE');
  });

  it('requires render fidelity report when render evidence is required', () => {
    const context = verificationContext();
    const bundle = trustedVerificationBundle({
      context,
      reports: passedReports(context),
      renderRequired: true
    });

    expect(bundle.status).toBe('FAILED');
    expect(bundle.issues.map((issue) => issue.stageId)).toContain('render_fidelity');
  });

  it('verifies candidate source, source precheck, provenance and trusted external harness before source integrity can pass', () => {
    const fixture = sourceIntegrityFixture();
    const passed = buildSourceIntegrityVerificationReport(fixture);
    const blocked = buildSourceIntegrityVerificationReport({
      ...fixture,
      stagedCandidateFiles: [
        { path: 'src/runtime/phaser_2d_action_arcade.v1.ts', contentHash: 'fnv1a_modified_runtime' },
        { path: 'src/extra.ts', contentHash: 'fnv1a_extra' }
      ],
      stagedExternalTests: [
        { path: 'tests/external/harness-contract.test.ts', contentHash: 'fnv1a_modified', source: 'candidate', readOnly: false }
      ]
    });

    expect(passed.status).toBe('PASSED');
    expect(blocked.status).toBe('FAILED');
    expect(blocked.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'VERIFICATION_SOURCE_FILE_HASH_MISMATCH',
        'VERIFICATION_SOURCE_FILE_UNDECLARED',
        'VERIFICATION_HARNESS_HASH_MISMATCH',
        'VERIFICATION_HARNESS_CANDIDATE_CONTROLLED',
        'VERIFICATION_HARNESS_MISSING'
      ])
    );
  });

  it('fails source integrity when candidate source or harness manifests are stale', () => {
    const fixture = sourceIntegrityFixture();
    const staleSourcePayload = stripCandidateSourceManifestHash(fixture.candidateSourceManifest);
    const staleExternalPayload = stripExternalManifestHash(fixture.externalTestManifest);
    const report = buildSourceIntegrityVerificationReport({
      ...fixture,
      candidateSourceManifest: {
        ...staleSourcePayload,
        files: [
          { path: 'src/runtime/phaser_2d_action_arcade.v1.ts', purpose: 'Runtime module.', contentHash: 'fnv1a_changed', byteLength: 120 }
        ],
        sourceManifestHash: fixture.candidateSourceManifest.sourceManifestHash
      },
      externalTestManifest: {
        ...staleExternalPayload,
        files: [
          { path: 'tests/external/harness-contract.test.ts', contentHash: 'fnv1a_changed', readOnly: true as const }
        ],
        externalTestManifestHash: fixture.externalTestManifest.externalTestManifestHash
      },
      stagedCandidateFiles: [
        { path: 'src/runtime/phaser_2d_action_arcade.v1.ts', contentHash: 'fnv1a_changed' }
      ],
      stagedExternalTests: [
        { path: 'tests/external/harness-contract.test.ts', contentHash: 'fnv1a_changed', source: 'trusted_external_harness', readOnly: true }
      ]
    });

    expect(report.status).toBe('FAILED');
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'VERIFICATION_SOURCE_MANIFEST_HASH_MISMATCH',
        'VERIFICATION_HARNESS_MANIFEST_HASH_MISMATCH'
      ])
    );
  });

  it('requires the written source manifest to cover every writable allowed-file entry', () => {
    const fixture = sourceIntegrityFixture([
      'src/runtime/phaser_2d_action_arcade.v1.ts',
      'src/schema.ts'
    ]);
    const report = buildSourceIntegrityVerificationReport(fixture);

    expect(report.status).toBe('FAILED');
    expect(report.issues.map((issue) => issue.code)).toContain('VERIFICATION_SOURCE_FILE_MISSING');
    expect(report.issues.map((issue) => issue.path)).toContain('src/schema.ts');
  });

  it('blocks forbidden static patterns before build or runtime gates are trusted', () => {
    const context = verificationContext();
    const report = buildStaticPolicyVerificationReport({
      context,
      files: [
        { path: 'src/runtime/phaser_2d_action_arcade.v1.ts', content: 'import leftPad from "left-pad";\nexport const bad = scene.add.sprite(0, 0, "x") as unknown as Runtime;' }
      ]
    });

    expect(report.status).toBe('FAILED');
    expect(report.issues.map((issue) => issue.code)).toContain('VERIFICATION_FORBIDDEN_STATIC_PATTERN');
  });

  it('blocks missing mutation/canary coverage, mutation survivors, performance breaches, teardown leaks and canary regressions', () => {
    const context = verificationContext();
    const emptyMutation = buildMutationVerificationReport({ context, mutations: [] });
    const mutation = buildMutationVerificationReport({
      context,
      mutations: [{ mutationId: 'allow_extra_bounce', killed: false }]
    });
    const performance = buildPerformanceVerificationReport({
      context,
      averageUpdateMs: 4,
      p95UpdateMs: 12,
      peakEntities: 100,
      peakEventRate: 200,
      memoryDeltaBytes: 100_000,
      bundleBytes: 500_000,
      startupMs: 100,
      limits: {
        averageUpdateMs: 1,
        p95UpdateMs: 4,
        peakEntities: 20,
        peakEventRate: 30,
        memoryDeltaBytes: 4_096,
        bundleBytes: 64_000,
        startupMs: 16
      }
    });
    const teardown = buildTeardownVerificationReport({
      context,
      duplicateListeners: true,
      retainedEntityRefs: false,
      schedulerLeaks: false,
      telemetryDuplicated: false,
      baselineRestored: true
    });
    const canary = buildProfileCanaryVerificationReport({
      context,
      profiles: [
        { profileId: 'reference.enabled', role: 'reference_candidate_enabled', regressed: false },
        { profileId: 'unrelated.profile.v1', role: 'unrelated_profile', regressed: true }
      ]
    });

    expect(emptyMutation.issues.map((issue) => issue.code)).toContain('VERIFICATION_MUTATION_COVERAGE_MISSING');
    expect(mutation.status).toBe('FAILED');
    expect(performance.issues.map((issue) => issue.code)).toContain('VERIFICATION_PERFORMANCE_BUDGET_EXCEEDED');
    expect(teardown.issues.map((issue) => issue.code)).toContain('VERIFICATION_TEARDOWN_LEAK');
    expect(canary.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'VERIFICATION_PROFILE_CANARY_COVERAGE_MISSING',
        'VERIFICATION_PROFILE_CANARY_REGRESSION'
      ])
    );
  });
});

function trustedVerificationBundle(input: {
  context: CandidateVerificationContext;
  reports: CandidateVerificationReport[];
  renderRequired?: boolean;
}) {
  const receipts = input.reports.map((report) => buildCandidateVerificationReportReceipt({ report }));
  return buildCapabilityVerificationBundle({
    context: input.context,
    reports: input.reports,
    verificationReportReceiptRefs: receipts.map((receipt) => receipt.trustedArtifactRef),
    trustedVerificationReportStore: trustedVerificationReportStore(...receipts),
    ...(input.renderRequired === undefined ? {} : { renderRequired: input.renderRequired })
  });
}

function trustedVerificationReportStore(...receipts: CandidateVerificationReportReceipt[]): CandidateVerificationReportReceiptResolver {
  return {
    namespace: CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE,
    resolveReceipt(ref) {
      return receipts.find((receipt) =>
        receipt.trustedArtifactRef.namespace === ref.namespace &&
        receipt.trustedArtifactRef.artifactKind === ref.artifactKind &&
        receipt.trustedArtifactRef.artifactId === ref.artifactId
      );
    }
  };
}

function passedReports(context: CandidateVerificationContext): CandidateVerificationReport[] {
  return CANDIDATE_VERIFICATION_STAGES
    .filter((stageId) => stageId !== 'render_fidelity')
    .map((stageId) => buildCandidateVerificationReport({
      context,
      stageId,
      status: 'PASSED',
      evidenceRefs: [`${stageId}.json`]
    }));
}

function replaceReport(
  reports: CandidateVerificationReport[],
  replacement: CandidateVerificationReport
): CandidateVerificationReport[] {
  return reports.map((report) => report.stageId === replacement.stageId ? replacement : report);
}

function sourceIntegrityFixture(writablePaths = ['src/runtime/phaser_2d_action_arcade.v1.ts']) {
  const externalTestManifest = trustedExternalTestManifest([
    { path: 'tests/external/harness-contract.test.ts', contentHash: 'fnv1a_harness', readOnly: true as const },
    { path: 'tests/external/security-policy.test.ts', contentHash: 'fnv1a_security', readOnly: true as const }
  ]);
  const allowedFileMap = trustedAllowedFileMap(writablePaths);
  const baseContext = verificationContext({
    allowedFileMapHash: allowedFileMap.allowedFileMapHash,
    externalTestManifestHash: externalTestManifest.externalTestManifestHash
  });
  const sourceContext = candidateSourceContext(baseContext);
  const sourcePolicyPrecheck = trustedSourcePrecheck(sourceContext);
  const sourceProvenance = trustedSourceProvenance(sourceContext, sourcePolicyPrecheck.normalizedResponseHash ?? '');
  const candidateSourceManifest = trustedCandidateSourceManifest(sourceContext);
  const context = verificationContext({
    allowedFileMapHash: allowedFileMap.allowedFileMapHash,
    candidateSourceManifestHash: candidateSourceManifest.sourceManifestHash,
    externalTestManifestHash: externalTestManifest.externalTestManifestHash
  });

  return {
    context,
    allowedFileMap,
    candidateSourceManifest,
    sourcePolicyPrecheck,
    sourceProvenance,
    stagedCandidateFiles: [
      { path: 'src/runtime/phaser_2d_action_arcade.v1.ts', contentHash: 'fnv1a_candidate_runtime' }
    ],
    externalTestManifest,
    stagedExternalTests: [
      { path: 'tests/external/harness-contract.test.ts', contentHash: 'fnv1a_harness', source: 'trusted_external_harness' as const, readOnly: true },
      { path: 'tests/external/security-policy.test.ts', contentHash: 'fnv1a_security', source: 'trusted_external_harness' as const, readOnly: true }
    ]
  };
}

function verificationContext(overrides: Partial<CandidateVerificationContext> = {}): CandidateVerificationContext {
  return {
    requestId: 'capsyn_req_12345678',
    attemptId: 'capsyn_attempt_1_12345678',
    packageId: 'combat.projectile_ricochet.v1',
    specificationHash: 'fnv1a_spec',
    decisionContextHash: 'fnv1a_decision_context',
    policyDecisionReceiptHash: 'fnv1a_policy_receipt',
    sourceManifestHash: 'fnv1a_initial_source',
    candidateSourceManifestHash: 'fnv1a_candidate_source',
    scaffoldReportHash: 'fnv1a_scaffold',
    allowedFileMapHash: 'fnv1a_allowed_map',
    generatedTestManifestHash: 'fnv1a_generated_tests',
    externalTestManifestHash: 'fnv1a_external_tests',
    registrySnapshotHash: 'fnv1a_registry',
    ...overrides
  };
}

function candidateSourceContext(context: CandidateVerificationContext) {
  return {
    requestId: context.requestId,
    attemptId: context.attemptId,
    specificationHash: context.specificationHash,
    decisionContextHash: context.decisionContextHash,
    policyDecisionHash: 'fnv1a_policy_decision',
    policyDecisionReceiptHash: context.policyDecisionReceiptHash,
    attemptManifestHash: 'fnv1a_attempt_manifest',
    workspaceManifestHash: 'fnv1a_workspace_manifest',
    scaffoldReportHash: context.scaffoldReportHash,
    allowedFileMapHash: context.allowedFileMapHash,
    initialSourceManifestHash: context.sourceManifestHash,
    sdkVersion: 'step36.capability-sdk.v1'
  };
}

function trustedAllowedFileMap(writablePaths: string[]) {
  const payload = {
    artifactKind: 'candidate_allowed_files' as const,
    schemaVersion: 'step36.capability-scaffold-artifact.v1' as const,
    files: writablePaths.map((path) => ({
      path,
      classification: 'writable_by_model' as const,
      owner: 'model_candidate' as const,
      purpose: 'Runtime module.'
    }))
  };
  return { ...payload, allowedFileMapHash: hashStableJson(payload) };
}

function trustedCandidateSourceManifest(sourceContext: ReturnType<typeof candidateSourceContext>) {
  const payload = {
    artifactKind: 'candidate_source_manifest' as const,
    schemaVersion: 'step36.candidate-source-artifact.v1' as const,
    status: 'written' as const,
    context: sourceContext,
    allOrNothing: true as const,
    files: [
      {
        path: 'src/runtime/phaser_2d_action_arcade.v1.ts',
        purpose: 'Runtime module.',
        contentHash: 'fnv1a_candidate_runtime',
        byteLength: 120
      }
    ]
  };
  return { ...payload, sourceManifestHash: hashStableJson(payload) };
}

function trustedSourcePrecheck(sourceContext: ReturnType<typeof candidateSourceContext>) {
  const payload = {
    artifactKind: 'candidate_source_policy_precheck' as const,
    schemaVersion: 'step36.candidate-source-artifact.v1' as const,
    status: 'allowed' as const,
    context: sourceContext,
    writeMode: 'all_or_nothing' as const,
    filesWritten: true,
    issues: [],
    normalizedResponseHash: 'fnv1a_normalized_response'
  };
  return { ...payload, precheckHash: hashStableJson(payload) };
}

function trustedSourceProvenance(sourceContext: ReturnType<typeof candidateSourceContext>, outputHash: string) {
  const payload = {
    artifactKind: 'candidate_source_provenance' as const,
    schemaVersion: 'step36.candidate-source-artifact.v1' as const,
    context: sourceContext,
    model: {
      provider: 'test-provider',
      model: 'test-model',
      promptVersion: 'step36.candidate-source-prompt.v1',
      invocationId: 'inv_12345678',
      fallbackUsed: false
    },
    inputHashes: {
      specificationHash: sourceContext.specificationHash,
      decisionContextHash: sourceContext.decisionContextHash,
      policyDecisionReceiptHash: sourceContext.policyDecisionReceiptHash,
      attemptManifestHash: sourceContext.attemptManifestHash,
      workspaceManifestHash: sourceContext.workspaceManifestHash,
      scaffoldReportHash: sourceContext.scaffoldReportHash,
      allowedFileMapHash: sourceContext.allowedFileMapHash,
      initialSourceManifestHash: sourceContext.initialSourceManifestHash,
      sdkVersion: sourceContext.sdkVersion
    },
    outputHash
  };
  return { ...payload, provenanceHash: hashStableJson(payload) };
}

function trustedExternalTestManifest(files: Array<{ path: string; contentHash: string; readOnly: true }>) {
  const payload = {
    artifactKind: 'candidate_external_test_manifest' as const,
    schemaVersion: 'step36.capability-scaffold-artifact.v1' as const,
    files
  };
  return { ...payload, externalTestManifestHash: hashStableJson(payload) };
}

function stripReportHash(report: CandidateVerificationReport): Omit<CandidateVerificationReport, 'reportHash'> {
  const { reportHash: _reportHash, ...payload } = report;
  return payload;
}

function stripCandidateSourceManifestHash(manifest: ReturnType<typeof trustedCandidateSourceManifest>) {
  const { sourceManifestHash: _sourceManifestHash, ...payload } = manifest;
  return payload;
}

function stripExternalManifestHash(manifest: ReturnType<typeof trustedExternalTestManifest>) {
  const { externalTestManifestHash: _externalTestManifestHash, ...payload } = manifest;
  return payload;
}
