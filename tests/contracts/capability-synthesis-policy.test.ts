import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_SPECIFICATION_CONTRACT_VERSION,
  CAPABILITY_SPECIFICATION_SCHEMA_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_REPORT_KIND,
  CAPABILITY_SPECIFICATION_VALIDATION_REPORT_SCHEMA_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_REQUIRED_CHECKS,
  CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE,
  CAPABILITY_SYNTHESIS_POLICY_VERSION,
  buildCapabilitySpecificationCandidate,
  buildCapabilitySpecificationValidationAttestation,
  buildCapabilitySynthesisReusePlan,
  decideCapabilitySynthesisPolicy,
  type CapabilitySpecificationCandidate,
  type CapabilitySpecificationValidationReport,
  type SpecificationValidationAttestation,
  type SpecificationValidationAttestationStoreResolver,
  type CapabilitySynthesisPolicyAuditEvidence,
  type CapabilitySynthesisSpecificationPolicyInput
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const VALIDATION_ATTEMPT_ID = 'capsyn_attempt_policy_validation_00000001';

describe('Step36 synthesis mode and risk classification policy', () => {
  it('classifies validated no-new-package reuse plans as R0 composition without sandbox access', () => {
    const firstPlan = buildCapabilitySynthesisReusePlan({
      requestId: 'capsyn_req_policy_12345678',
      sourceGapReportHash: 'fnv1a_gap',
      registrySnapshotHash: 'fnv1a_registry',
      activeCapabilityLockHash: 'fnv1a_lock',
      mode: 'COMPOSITION_ONLY',
      reusedCapabilityIds: ['combat.projectile.v1', 'movement.platformer.v1'],
      noNewPackage: true,
      noCandidateWorkspace: true
    });
    const secondPlan = buildCapabilitySynthesisReusePlan({
      requestId: 'capsyn_req_policy_12345678',
      sourceGapReportHash: 'fnv1a_gap',
      registrySnapshotHash: 'fnv1a_registry',
      activeCapabilityLockHash: 'fnv1a_lock',
      mode: 'COMPOSITION_ONLY',
      reusedCapabilityIds: ['movement.platformer.v1', 'combat.projectile.v1'],
      noNewPackage: true,
      noCandidateWorkspace: true
    });

    const first = decideCapabilitySynthesisPolicy({
      source: 'validated_reuse_plan',
      reusePlan: firstPlan,
      auditEvidence: cleanAuditEvidence(),
      advisoryModelSuggestion: {
        riskTier: 'R2_BOUNDED_RUNTIME_MODULE',
        mode: 'BOUNDED_TYPED_RUNTIME_MODULE'
      }
    });
    const firstWithoutAdvisory = decideCapabilitySynthesisPolicy({
      source: 'validated_reuse_plan',
      reusePlan: firstPlan,
      auditEvidence: cleanAuditEvidence()
    });
    const second = decideCapabilitySynthesisPolicy({
      source: 'validated_reuse_plan',
      reusePlan: secondPlan,
      auditEvidence: cleanAuditEvidence()
    });

    expect(first.riskTier).toBe('R0_COMPOSITION_ONLY');
    expect(first.mode).toBe('COMPOSITION_ONLY');
    expect(first.allowed).toBe(true);
    expect(first.implementationSandboxAllowed).toBe(false);
    expect(first.requiredApprovals).toEqual([]);
    expect(first.requiredGates).toEqual(['composition_contract', 'policy_decision', 'reuse_plan_validation']);
    expect(first.reusePlanHash).toBe(firstPlan.planHash);
    expect(firstPlan.planHash).toBe(secondPlan.planHash);
    expect(firstWithoutAdvisory).toEqual(second);
  });

  it('blocks precondition for invalid or stale specification validation reports without producing a risk tier', () => {
    const report = makeSpecificationReport(makeSpecification());
    const attestation = makeValidationAttestation(report);
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: { ...report, reportHash: 'tampered_report_hash' },
      ...trustedAttestationInput(attestation),
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, ['CAP_SYNTH_SPEC_VALIDATION_REPORT_HASH_MISMATCH', 'CAP_SYNTH_SPEC_INVALID']);
  });

  it('requires a trusted validation attestation from the 36.4 validator stage', () => {
    const report = makeSpecificationReport(makeSpecification());
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: report,
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, ['CAP_SYNTH_SPEC_VALIDATION_ATTESTATION_MISSING']);
  });

  it('rejects fully forged validation report with recomputed digest when no trusted attestation exists', () => {
    const forgedReport = makeSpecificationReport(makeSpecification({ title: 'Forged capability title with recomputed hashes' }));
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: forgedReport,
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, ['CAP_SYNTH_SPEC_VALIDATION_ATTESTATION_MISSING']);
  });

  it('rejects a self-contained trusted-looking attestation supplied inline by the caller', () => {
    const forgedReport = makeSpecificationReport(makeSpecification({ title: 'Inline forged report with matching trusted-looking attestation' }));
    const inlineAttestation = makeValidationAttestation(forgedReport);
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: forgedReport,
      specificationValidationAttestation: inlineAttestation,
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    } as CapabilitySynthesisSpecificationPolicyInput);

    expectBlockedPrecondition(decision, [
      'CAP_SYNTH_SPEC_VALIDATION_ATTESTATION_MISSING',
      'CAP_SYNTH_SPEC_VALIDATION_PROVENANCE_INVALID'
    ]);
  });

  it('rejects fully forged validation report that self-claims a trusted producer', () => {
    const forgedReport = makeSpecificationReport(makeSpecification({ title: 'Forged capability title with recomputed hashes' }));
    const untrustedAttestation = makeValidationAttestation(forgedReport, { issuerServiceId: 'candidate.self-claimed-validator' });
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: forgedReport,
      ...trustedAttestationInput(untrustedAttestation),
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, ['CAP_SYNTH_SPEC_VALIDATION_PROVENANCE_INVALID']);
  });

  it('rejects forged validation report that copies another report attestation', () => {
    const trustedReport = makeSpecificationReport(makeSpecification());
    const forgedReport = makeSpecificationReport(makeSpecification({ title: 'Forged capability title with recomputed hashes' }));
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: forgedReport,
      ...trustedAttestationInput(makeValidationAttestation(trustedReport)),
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, [
      'CAP_SYNTH_SPEC_VALIDATION_REPORT_HASH_MISMATCH',
      'CAP_SYNTH_SPEC_VALIDATION_SUBJECT_MISMATCH'
    ]);
  });

  it('rejects real validation report when any report field is modified after attestation', () => {
    const report = makeSpecificationReport(makeSpecification());
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: { ...report, registrySnapshotHash: 'fnv1a_registry_tampered' },
      ...trustedAttestationInput(makeValidationAttestation(report)),
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, [
      'CAP_SYNTH_SPEC_VALIDATION_REPORT_HASH_MISMATCH',
      'CAP_SYNTH_SPEC_VALIDATION_CONTEXT_MISMATCH',
      'CAP_SYNTH_SPEC_INVALID'
    ]);
  });

  it('rejects real attestation when the specification subject is replaced', () => {
    const report = makeSpecificationReport(makeSpecification());
    const otherSpecReport = makeSpecificationReport(makeSpecification({ proposedPackageVersion: '2.0.0' }));
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: otherSpecReport,
      ...trustedAttestationInput(makeValidationAttestation(report)),
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, [
      'CAP_SYNTH_SPEC_VALIDATION_REPORT_HASH_MISMATCH',
      'CAP_SYNTH_SPEC_VALIDATION_SUBJECT_MISMATCH'
    ]);
  });

  it('rejects real attestation reused for another attempt context', () => {
    const report = makeSpecificationReport(makeSpecification());
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: report,
      ...trustedAttestationInput(makeValidationAttestation(report)),
      attemptId: 'capsyn_attempt_policy_validation_00000002',
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, ['CAP_SYNTH_SPEC_VALIDATION_CONTEXT_MISMATCH']);
  });

  it('rejects real attestation reused under another registry snapshot context', () => {
    const report = makeSpecificationReport(makeSpecification());
    const { reportHash: _reportHash, ...payload } = report;
    const registryDriftReport = {
      ...payload,
      registrySnapshotHash: 'fnv1a_other_registry',
      reportHash: hashStableJson({ ...payload, registrySnapshotHash: 'fnv1a_other_registry' })
    };
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: registryDriftReport,
      ...trustedAttestationInput(makeValidationAttestation(report)),
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, [
      'CAP_SYNTH_SPEC_VALIDATION_REPORT_HASH_MISMATCH',
      'CAP_SYNTH_SPEC_VALIDATION_CONTEXT_MISMATCH',
      'CAP_SYNTH_SPEC_INVALID'
    ]);
  });

  it('rejects candidate supplied trustedValidationReportHash fields instead of trusting them', () => {
    const report = makeSpecificationReport(makeSpecification());
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: report,
      ...trustedAttestationInput(makeValidationAttestation(report)),
      trustedValidationReportHash: report.reportHash,
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    } as CapabilitySynthesisSpecificationPolicyInput);

    expectBlockedPrecondition(decision, ['CAP_SYNTH_SPEC_VALIDATION_PROVENANCE_INVALID']);
  });

  it('rejects attestations that omit a required validator rule while claiming PASSED', () => {
    const report = makeSpecificationReport(makeSpecification());
    const attestation = makeValidationAttestation(report);
    const { attestationHash: _attestationHash, ...payload } = attestation;
    const forgedPayload = {
      ...payload,
      predicate: {
        ...payload.predicate,
        requiredChecks: CAPABILITY_SPECIFICATION_VALIDATION_REQUIRED_CHECKS.slice(0, -1)
      }
    };
    const forgedAttestation = { ...forgedPayload, attestationHash: hashStableJson(forgedPayload) };
    const decision = decideCapabilitySynthesisPolicy({
      source: 'validated_specification',
      specificationReport: report,
      ...trustedAttestationInput(forgedAttestation),
      attemptId: VALIDATION_ATTEMPT_ID,
      auditEvidence: cleanAuditEvidence()
    });

    expectBlockedPrecondition(decision, ['CAP_SYNTH_SPEC_VALIDATION_RULESET_UNTRUSTED']);
  });

  it('allows policy evaluation only when trusted report and attestation match completely', () => {
    const decision = decideCapabilitySynthesisPolicy(runtimePolicyInput());

    expect(decision.policyEvaluationStatus).toBe('EVALUATED');
      expect(decision.specificationValidationAttestationHash).toBeDefined();
      expect(decision.policyInputHash).toBeDefined();
      expect(decision.decisionContextHash).toBeDefined();
      expect(decision.allowed).toBe(true);
      expect(decision.riskTier).toBe('R2_BOUNDED_RUNTIME_MODULE');
    });

    it('fails closed when R3/R4 audit evidence is missing', () => {
      const decision = decideCapabilitySynthesisPolicy({
        ...runtimePolicyInput(),
        auditEvidence: undefined
      });

    expect(decision.riskTier).toBe('R4_PROHIBITED');
    expect(decision.mode).toBe('PROHIBITED');
    expect(decision.allowed).toBe(false);
    expect(decision.blockingRules).toEqual([
      'AUDIT_EVIDENCE_MISSING:candidate_file_policy',
      'AUDIT_EVIDENCE_MISSING:external_dependencies'
    ]);
  });

  it('does not allow a model-suggested lower tier to override R4 network policy', () => {
    const spec = makeSpecification({
      security: {
        requiredPrivileges: ['network'],
        forbiddenPrivileges: ['filesystem', 'network', 'package_manager', 'secrets', 'shell'],
        dataAccess: ['candidate_spec_only']
      }
    });
    const decision = decideCapabilitySynthesisPolicy({
      ...runtimePolicyInput(spec),
      advisoryModelSuggestion: {
        riskTier: 'R0_COMPOSITION_ONLY',
        mode: 'COMPOSITION_ONLY'
      }
    });

    expect(decision.riskTier).toBe('R4_PROHIBITED');
    expect(decision.mode).toBe('PROHIBITED');
    expect(decision.allowed).toBe(false);
    expect(decision.implementationSandboxAllowed).toBe(false);
    expect(decision.blockingRules).toEqual(['R4:NETWORK_ACCESS']);
    expect(decision.advisoryModelSuggestion).toEqual({ riskTier: 'R0_COMPOSITION_ONLY', mode: 'COMPOSITION_ONLY' });
  });

  it.each([
    ['filesystem', 'R4:FILESYSTEM_ACCESS'],
    ['secrets', 'R4:SECRETS_ACCESS'],
    ['dynamic_code', 'R4:DYNAMIC_CODE_EXECUTION'],
    ['native_wasm', 'R4:NATIVE_OR_WASM_BINARY'],
    ['child_process', 'R4:CHILD_PROCESS'],
    ['runtime_package_install', 'R4:RUNTIME_PACKAGE_INSTALL'],
    ['cross_origin', 'R4:CROSS_ORIGIN_ACCESS'],
    ['credential_storage', 'R4:CREDENTIAL_STORAGE'],
    ['payment', 'R4:PAYMENT_OR_AUTHENTICATION'],
    ['authentication', 'R4:PAYMENT_OR_AUTHENTICATION'],
    ['self_update', 'R4:SELF_UPDATE'],
    ['obfuscated_source', 'R4:OBFUSCATED_SOURCE'],
    ['license_unknown', 'R4:LICENSE_UNKNOWN_CODE'],
    ['mystery_native_privilege', 'R4:UNKNOWN_REQUIRED_PRIVILEGE:mystery_native_privilege']
  ])('maps required privilege %s to prohibited policy rule %s', (privilege, expectedRule) => {
    const spec = makeSpecification({
      security: {
        requiredPrivileges: [privilege],
        forbiddenPrivileges: ['filesystem', 'network', 'package_manager', 'secrets', 'shell'],
        dataAccess: ['candidate_spec_only']
      }
    });
    const decision = decideCapabilitySynthesisPolicy(runtimePolicyInput(spec));

    expect(decision.riskTier).toBe('R4_PROHIBITED');
    expect(decision.mode).toBe('PROHIBITED');
    expect(decision.allowed).toBe(false);
    expect(decision.implementationSandboxAllowed).toBe(false);
    expect(decision.blockingRules).toEqual([expectedRule]);
  });

  it('treats external dependencies and candidate policy mutation as R4 prohibited', () => {
    const decision = decideCapabilitySynthesisPolicy({
      ...runtimePolicyInput(),
      auditEvidence: cleanAuditEvidence({
        externalDependencies: ['left-pad@latest'],
        candidateFilePolicyMutable: true
      })
    });

    expect(decision.riskTier).toBe('R4_PROHIBITED');
    expect(decision.mode).toBe('PROHIBITED');
    expect(decision.blockingRules).toEqual(['R4:CANDIDATE_POLICY_MUTATION_ATTEMPT', 'R4:EXTERNAL_DEPENDENCY']);
  });

  it('routes unapproved runtime services to R3 manual architecture review', () => {
    const decision = decideCapabilitySynthesisPolicy({
      ...runtimePolicyInput(),
      approvedRuntimeServices: ['physics.arcade_collision']
    });

    expect(decision.riskTier).toBe('R3_MANUAL_ARCHITECTURE_REVIEW');
    expect(decision.mode).toBe('MANUAL_SPEC_ONLY');
    expect(decision.allowed).toBe(false);
    expect(decision.implementationSandboxAllowed).toBe(false);
    expect(decision.requiredGates).toEqual(['manual_architecture_review', 'policy_decision', 'specification_validation', 'step33_render_fidelity']);
    expect(decision.blockingRules).toEqual(['R3:NEW_RUNTIME_SERVICE:combat.damage_pipeline']);
  });

  it('allows bounded one-runtime-family typed modules as R2 with approvals and gates', () => {
    const decision = decideCapabilitySynthesisPolicy(runtimePolicyInput());

    expect(decision.policyVersion).toBe(CAPABILITY_SYNTHESIS_POLICY_VERSION);
    expect(decision.riskTier).toBe('R2_BOUNDED_RUNTIME_MODULE');
    expect(decision.mode).toBe('BOUNDED_TYPED_RUNTIME_MODULE');
    expect(decision.allowed).toBe(true);
    expect(decision.implementationSandboxAllowed).toBe(true);
    expect(decision.requiredApprovals).toEqual(['capability_maintainer', 'runtime_code_owner']);
    expect(decision.requiredGates).toEqual([
      'ast_policy',
      'build',
      'ownership',
      'package_contract',
      'performance',
      'policy_decision',
      'runtime_qa',
      'security_qa',
      'source_integrity',
      'specification_validation',
      'step33_render_fidelity',
      'teardown',
      'typecheck'
    ]);
    expect(decision.blockingRules).toEqual([]);
  });

  it('keeps visual-only declarative behavior in R1 instead of escalating to runtime R2', () => {
    const spec = makeSpecification({
      runtime: {
        ...baseRuntimeSection(),
        requiredServices: [],
        patchPolicy: 'not_patchable',
        teardownRequirements: ['remove declarative ricochet rule'],
        ownedStateKeys: ['projectile.ricochet.rule'],
        ownedEvents: ['projectile.ricochet']
      },
      render: {
        assetRoles: ['ricochet_spark'],
        sceneBindings: ['projectile.ricochet'],
        fallbackPolicy: 'fail_closed',
        renderEvidence: ['step33_render_fidelity_required']
      }
    });
      const report = makeSpecificationReport(spec);
      const decision = decideCapabilitySynthesisPolicy({
        source: 'validated_specification',
        specificationReport: report,
        ...trustedAttestationInput(makeValidationAttestation(report)),
        attemptId: VALIDATION_ATTEMPT_ID,
        auditEvidence: cleanAuditEvidence(),
      approvedRuntimeServices: [],
      existingInterpreterSupportsOperations: true,
      boundedState: true,
      boundedEventRate: true
    });

    expect(decision.riskTier).toBe('R1_DECLARATIVE_EXTENSION');
    expect(decision.mode).toBe('DECLARATIVE_STATE_MACHINE');
    expect(decision.allowed).toBe(true);
    expect(decision.implementationSandboxAllowed).toBe(false);
    expect(decision.requiredApprovals).toEqual(['capability_maintainer']);
    expect(decision.requiredGates).toEqual(['capability_qa', 'declarative_contract_tests', 'policy_decision', 'specification_validation', 'step33_render_fidelity']);
  });

  it('never lets R3 audit triggers enter the implementation sandbox', () => {
    const decision = decideCapabilitySynthesisPolicy({
      ...runtimePolicyInput(),
      auditEvidence: cleanAuditEvidence({
        r3Triggers: ['UNDECLARED_DEPENDENCY_CHANGE', 'KERNEL_LIFECYCLE_CHANGE', 'DIRECT_ENGINE_API_ACCESS'],
        globalKernelChanges: true
      })
    });

    expect(decision.riskTier).toBe('R3_MANUAL_ARCHITECTURE_REVIEW');
    expect(decision.mode).toBe('MANUAL_SPEC_ONLY');
    expect(decision.allowed).toBe(false);
    expect(decision.implementationSandboxAllowed).toBe(false);
    expect(decision.blockingRules).toEqual(['R3:DIRECT_ENGINE_API_ACCESS', 'R3:KERNEL_LIFECYCLE_CHANGE', 'R3:UNDECLARED_DEPENDENCY_CHANGE']);
  });

  it('keeps policy decisions deterministic under reordered non-authority input arrays', () => {
    const spec = makeSpecification();
    const first = decideCapabilitySynthesisPolicy({
      ...runtimePolicyInput(spec),
      approvedRuntimeServices: ['combat.damage_pipeline', 'physics.arcade_collision']
    });
    const second = decideCapabilitySynthesisPolicy({
      ...runtimePolicyInput(spec),
      approvedRuntimeServices: ['physics.arcade_collision', 'combat.damage_pipeline']
    });

    expect(first.decisionHash).toBe(second.decisionHash);
    expect(first).toEqual(second);
  });
});

function runtimePolicyInput(spec = makeSpecification()): CapabilitySynthesisSpecificationPolicyInput {
  const report = makeSpecificationReport(spec);
  const attestation = makeValidationAttestation(report);
  return {
    source: 'validated_specification',
    specificationReport: report,
    ...trustedAttestationInput(attestation),
    attemptId: VALIDATION_ATTEMPT_ID,
    auditEvidence: cleanAuditEvidence(),
    approvedRuntimeServices: ['physics.arcade_collision', 'combat.damage_pipeline'],
    boundedSourceFileSet: true,
    boundedState: true,
    boundedEntityCreation: true,
    deterministicClockAndRng: true,
    teardownVerifiable: true,
    behaviorObservable: true
  };
}

function trustedAttestationInput(attestation: SpecificationValidationAttestation): Pick<
  CapabilitySynthesisSpecificationPolicyInput,
  'specificationValidationAttestationRef' | 'trustedValidationAttestationStore'
> {
  return {
    specificationValidationAttestationRef: attestation.trustedArtifactRef,
    trustedValidationAttestationStore: trustedAttestationStore(attestation)
  };
}

function trustedAttestationStore(...attestations: SpecificationValidationAttestation[]): SpecificationValidationAttestationStoreResolver {
  return {
    namespace: CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE,
    resolveAttestation(ref) {
      return attestations.find((attestation) =>
        attestation.trustedArtifactRef.namespace === ref.namespace &&
        attestation.trustedArtifactRef.artifactKind === ref.artifactKind &&
        attestation.trustedArtifactRef.artifactId === ref.artifactId
      );
    }
  };
}

function cleanAuditEvidence(
  overrides: {
    externalDependencies?: string[];
    candidateFilePolicyMutable?: boolean;
    r3Triggers?: CapabilitySynthesisPolicyAuditEvidence['r3Triggers']['values'];
    globalKernelChanges?: boolean;
  } = {}
): CapabilitySynthesisPolicyAuditEvidence {
  return {
    externalDependencies: {
      checked: true,
      values: overrides.externalDependencies ?? []
    },
    candidateFilePolicyMutable: {
      checked: true,
      value: overrides.candidateFilePolicyMutable ?? false
    },
    r3Triggers: {
      checked: true,
      values: overrides.r3Triggers ?? []
    },
    globalKernelChanges: {
      checked: true,
      value: overrides.globalKernelChanges ?? false
    }
  };
}

function makeSpecification(overrides: Partial<Omit<CapabilitySpecificationCandidate, 'specificationHash'>> = {}): CapabilitySpecificationCandidate {
  return buildCapabilitySpecificationCandidate({
    schemaVersion: CAPABILITY_SPECIFICATION_SCHEMA_VERSION,
    specificationId: 'spec_combat_projectile_ricochet_v1',
    requestId: 'capsyn_req_policy_12345678',
    sourceGapReportHash: 'fnv1a_gap',
    registrySnapshotHash: 'fnv1a_registry',
    activeCapabilityLockHash: 'fnv1a_lock',
    proposedCapabilityId: 'combat.projectile_ricochet.v1',
    proposedPackageVersion: '1.0.0',
    capabilityContractVersion: CAPABILITY_SPECIFICATION_CONTRACT_VERSION,
    title: 'Projectile Ricochet',
    description: 'Adds bounded projectile ricochet with deterministic damage falloff.',
    semanticContract: 'Projectile ricochet with bounded wall bounce count and deterministic damage falloff.',
    explicitNonGoals: ['does not change fire cadence', 'does not add package dependencies'],
    runtimeFamilies: ['phaser_2d_action_arcade.v1'],
    dependencies: [
      {
        capabilityId: 'combat.projectile.v1',
        versionRange: '^1.0.0',
        requiredInterface: 'ProjectileLifecycle.v1',
        reason: 'Ricochet augments existing projectile instances.'
      }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ interfaceId: 'ProjectileRicochet.v1', description: 'Bounded ricochet behavior for projectile entities.' }],
    dsl: {
      ownedPaths: ['/entities/components/projectile_ricochet'],
      schema: { type: 'object', required: ['maxBounces', 'damageFalloff'] },
      defaults: { maxBounces: 2, damageFalloff: 0.25 },
      normalizationRules: ['maxBounces must be clamped to 0..5'],
      validationRules: [{ ruleId: 'ricochet_bounds', path: '/entities/components/projectile_ricochet', assertion: 'maxBounces <= 5' }],
      examples: [{ maxBounces: 2, damageFalloff: 0.25 }]
    },
    ir: {
      ownedNodeKinds: ['component.projectile.ricochet'],
      fragmentContract: { component: 'projectile.ricochet' },
      compileRules: ['compile projectile ricochet component into runtime system config'],
      mergePolicy: ['append runtime system config without overriding projectile lifecycle owner']
    },
    runtime: baseRuntimeSection(),
    amendments: {
      supportedOperations: ['set_ricochet_count', 'set_damage_falloff'],
      patchPolicy: 'warm',
      expectedEffects: ['projectile trajectory reflects after wall collision']
    },
    qa: {
      requiredProbes: [scenario('ricochet_twice')],
      externalAssertions: ['no third ricochet event after max bounce count'],
      mutationTargets: ['maxBounces', 'damageFalloff'],
      failureScenarios: ['projectile bounces more than configured max']
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable',
      renderEvidence: ['step33_render_fidelity_required']
    },
    security: {
      requiredPrivileges: [],
      forbiddenPrivileges: ['filesystem', 'network', 'package_manager', 'secrets', 'shell'],
      dataAccess: ['candidate_spec_only']
    },
    budgets: {
      maxRuntimeMsPerFrame: 0.4,
      maxTelemetryEventsPerSecond: 20
    },
    acceptanceScenarios: [scenario('ricochet_twice')],
    provenance: {
      provider: 'fixture',
      model: 'fixture',
      invocationId: 'policy_invocation_ricochet',
      promptVersion: 'step36.capability-specification.prompt.v1'
    },
    ...overrides
  });
}

function baseRuntimeSection(): Omit<CapabilitySpecificationCandidate['runtime'], 'stateModel'> & { stateModel: { reversible: boolean; keys: string[] } } {
  return {
    requiredServices: ['physics.arcade_collision', 'combat.damage_pipeline'],
    lifecycle: ['create', 'update', 'teardown'],
    stateModel: { reversible: true, keys: ['bounceCount', 'currentDamage'] },
    deterministicRules: ['reflect velocity on wall collision', 'decrease damage after each bounce'],
    patchPolicy: 'warm',
    teardownRequirements: ['remove projectile collision listener'],
    ownedStateKeys: ['projectile.ricochet.bounceCount'],
    ownedEvents: ['projectile.ricochet']
  };
}

function makeSpecificationReport(spec: CapabilitySpecificationCandidate): CapabilitySpecificationValidationReport {
  const payload: Omit<CapabilitySpecificationValidationReport, 'reportHash'> = {
    artifactKind: CAPABILITY_SPECIFICATION_VALIDATION_REPORT_KIND,
    schemaVersion: CAPABILITY_SPECIFICATION_VALIDATION_REPORT_SCHEMA_VERSION,
    requestId: spec.requestId,
    sourceGapReportHash: spec.sourceGapReportHash,
    registrySnapshotHash: spec.registrySnapshotHash,
    status: 'valid',
    issues: [],
    normalizedSpec: spec,
    specificationHash: spec.specificationHash
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function makeValidationAttestation(
  report: CapabilitySpecificationValidationReport,
  input: { attemptId?: string; issuerServiceId?: string } = {}
): SpecificationValidationAttestation {
  return buildCapabilitySpecificationValidationAttestation({
    report,
    attemptId: input.attemptId ?? VALIDATION_ATTEMPT_ID,
    issuer: {
      serviceId: input.issuerServiceId ?? 'maker-api.capability-specification-validator',
      issuedAt: '2026-06-19T00:00:00.000Z'
    }
  });
}

function expectBlockedPrecondition(
  decision: ReturnType<typeof decideCapabilitySynthesisPolicy>,
  expectedRules: readonly string[]
): void {
  expect(decision.policyEvaluationStatus).toBe('BLOCKED_PRECONDITION');
  expect(decision.riskTier).toBeUndefined();
  expect(decision.mode).toBeUndefined();
  expect(decision.allowed).toBe(false);
  expect(decision.implementationSandboxAllowed).toBe(false);
  expect(decision.repairableByModel).toBe(false);
  expect(decision.blockingRules).toEqual(expect.arrayContaining([...expectedRules]));
}

function scenario(id: string) {
  return {
    scenarioId: id,
    probeId: id,
    given: ['projectile is moving toward a wall'],
    when: 'projectile collides with wall',
    actions: ['spawn projectile', 'advance physics until wall collision'],
    observations: ['projectile emits projectile.ricochet event', 'projectile velocity reflects'],
    assertions: ['ricochet count is at most 2', 'damage falls by 25 percent after bounce'],
    negativeAssertions: ['projectile does not ricochet a third time'],
    tolerance: 'one physics tick',
    requiredEvidenceSource: 'capability_qa_report'
  };
}
