import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import {
  canGameplayDesignEnterGapAnalysis,
  type GameplayDesignRequestContext,
  type GameplayDesignValidationReport,
  type ProposedCapabilityRequirement
} from './gameplay-design.js';

export const CAPABILITY_GAP_ANALYSIS_SCHEMA_VERSION = 'step36.capability-gap-analysis.v1';
export const CAPABILITY_GAP_ANALYSIS_REPORT_KIND = 'capability_gap_report';
export const CAPABILITY_REGISTRY_SNAPSHOT_INPUT_KIND = 'capability_registry_snapshot.input';
export const CAPABILITY_REGISTRY_SNAPSHOT_INPUT_SCHEMA_VERSION = 'step36.capability-registry-snapshot-input.v1';

export const CAPABILITY_REUSE_MATCH_KINDS = [
  'EXACT',
  'COMPOSABLE',
  'CONFIGURATION_ONLY',
  'DECLARATIVE_RULE',
  'PROVIDED_INTERFACE',
  'PARTIAL',
  'SEMANTIC_ALIAS'
] as const;

export const CAPABILITY_GAP_OUTCOMES = [
  'NO_NEW_CAPABILITY_REQUIRED',
  'DECLARATIVE_EXTENSION_REQUIRED',
  'NEW_BOUNDED_CAPABILITY_REQUIRED',
  'MANUAL_ARCHITECTURE_REVIEW_REQUIRED',
  'POLICY_BLOCKED',
  'AMBIGUOUS'
] as const;

export const MISSING_PRIMITIVE_SCOPES = ['small', 'medium', 'large'] as const;

export type CapabilityReuseMatchKind = (typeof CAPABILITY_REUSE_MATCH_KINDS)[number];
export type CapabilityGapOutcome = (typeof CAPABILITY_GAP_OUTCOMES)[number];
export type MissingPrimitiveScope = (typeof MISSING_PRIMITIVE_SCOPES)[number];

export type CapabilityGapRegistryPackage = {
  capabilityId: string;
  packageVersion: string;
  contentHash: string;
  aliases: string[];
  description: string;
  semanticTags: string[];
  runtimeFamilies: string[];
  providedInterfaces: string[];
  requiredRuntimeServices: string[];
  emittedEvents: string[];
  consumedEvents: string[];
  ownedDslPaths: string[];
  ownedIrNodeKinds: string[];
  amendmentOperations: string[];
  profiles: string[];
  dependencies: string[];
  completeness: 'SCHEMA_ONLY' | 'SCHEMA_AND_IR' | 'RUNTIME_WITHOUT_QA' | 'COMPLETE_EXPERIMENTAL' | 'COMPLETE_SUPPORTED';
  qaAvailable: boolean;
  configurationOptions: string[];
  declarativeRuleKinds: string[];
  plannedSuccessorId?: string;
  deprecatedById?: string;
};

export type CapabilityGapRegistrySnapshotInput = {
  artifactKind: typeof CAPABILITY_REGISTRY_SNAPSHOT_INPUT_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_SNAPSHOT_INPUT_SCHEMA_VERSION;
  packages: CapabilityGapRegistryPackage[];
  snapshotHash: string;
};

export type CapabilityReuseMatch = {
  candidateCapabilityId: string;
  packageVersion: string;
  contentHash: string;
  matchKind: CapabilityReuseMatchKind;
  coverage: number;
  coveredRequirements: string[];
  uncoveredRequirements: string[];
  evidence: string[];
};

export type CapabilityCompositionPlan = {
  strategy: 'EXACT_PACKAGE' | 'CONFIGURATION_ONLY' | 'COMPOSITION' | 'DECLARATIVE_RULE' | 'NONE';
  selectedCapabilityIds: string[];
  dependencyGraph: Array<{
    capabilityId: string;
    dependencies: string[];
  }>;
  explanation: string;
};

export type CapabilityGapDependencyRequirement = {
  capabilityId: string;
  requiredInterface: string;
  reason: string;
};

export type MissingCapabilityPrimitive = {
  proposedId: string;
  domain: string;
  semanticContract: string;
  reasonExistingPackagesInsufficient: string[];
  requiredDependencies: CapabilityGapDependencyRequirement[];
  providedInterfaces: string[];
  ownedDslPaths: string[];
  ownedIrNodeKinds: string[];
  expectedReuseProfiles: string[];
  estimatedScope: MissingPrimitiveScope;
};

export type RejectedCapabilityAlternative = {
  candidateCapabilityId: string;
  reason:
    | 'UNSAFE_SEMANTIC_FALLBACK'
    | 'SIMILAR_BUT_INSUFFICIENT'
    | 'OVER_BROAD_PROPOSAL'
    | 'DUPLICATE_PACKAGE_PROPOSAL'
    | 'PROFILE_ONLY_WORKAROUND'
    | 'RUNTIME_FAMILY_MISMATCH'
    | 'INCOMPLETE_PACKAGE'
    | 'DEPENDENCY_UNRESOLVED'
    | 'OWNERSHIP_OVERLAP';
  evidence: string[];
};

export type CapabilityGapDiagnostic = {
  code:
    | 'DESIGN_REPORT_INVALID'
    | 'REGISTRY_SNAPSHOT_INVALID'
    | 'INCOMPLETE_REUSE_CANDIDATE'
    | 'RUNTIME_FAMILY_MISMATCH'
    | 'DEPENDENCY_UNRESOLVED'
    | 'DUPLICATE_SEMANTIC_ALIAS'
    | 'OWNERSHIP_OVERLAP'
    | 'PROFILE_SPECIFIC_PRIMITIVE'
    | 'MISSING_PRIMITIVE_REQUIRED';
  severity: 'info' | 'warning' | 'error';
  message: string;
};

export type CapabilityGapAnalysis = {
  artifactKind: typeof CAPABILITY_GAP_ANALYSIS_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_GAP_ANALYSIS_SCHEMA_VERSION;
  requestId: string;
  registrySnapshotHash: string;
  activeCapabilityLockHash?: string;
  designValidationReportHash: string;
  reuseMatches: CapabilityReuseMatch[];
  compositionPlan: CapabilityCompositionPlan;
  outcome: CapabilityGapOutcome;
  missingPrimitives: MissingCapabilityPrimitive[];
  rejectedAlternatives: RejectedCapabilityAlternative[];
  diagnostics: CapabilityGapDiagnostic[];
  reportHash: string;
};

export function buildCapabilityGapRegistrySnapshot(packages: readonly CapabilityGapRegistryPackage[]): CapabilityGapRegistrySnapshotInput {
  const normalizedPackages = [...packages].map(normalizeRegistryPackage).sort(compareRegistryPackages);
  const payload: Omit<CapabilityGapRegistrySnapshotInput, 'snapshotHash'> = {
    artifactKind: CAPABILITY_REGISTRY_SNAPSHOT_INPUT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_SNAPSHOT_INPUT_SCHEMA_VERSION,
    packages: normalizedPackages
  };
  return { ...payload, snapshotHash: hashStableJson(payload) };
}

export function buildCapabilityGapAnalysis(input: {
  designReport: GameplayDesignValidationReport;
  requestContext: GameplayDesignRequestContext;
  registrySnapshot: CapabilityGapRegistrySnapshotInput;
  runtimeFamily: string;
  activeCapabilityLockHash?: string;
  expectedReuseProfiles?: readonly string[];
  proposedOwnedDslPaths?: readonly string[];
}): CapabilityGapAnalysis {
  const registryIssues = registrySnapshotIssues(input.registrySnapshot);
  if (!canGameplayDesignEnterGapAnalysis(input.designReport, input.requestContext) || registryIssues.length > 0 || input.designReport.normalizedPlan === undefined) {
    return buildGapReport({
      requestId: input.requestContext.requestId,
      registrySnapshotHash: input.registrySnapshot.snapshotHash,
      activeCapabilityLockHash: input.activeCapabilityLockHash,
      designValidationReportHash: input.designReport.reportHash,
      reuseMatches: [],
      compositionPlan: emptyCompositionPlan('Design report or registry snapshot is not valid for gap analysis.'),
      outcome: 'AMBIGUOUS',
      missingPrimitives: [],
      rejectedAlternatives: [],
      diagnostics: [
        ...(!canGameplayDesignEnterGapAnalysis(input.designReport, input.requestContext)
          ? [{ code: 'DESIGN_REPORT_INVALID' as const, severity: 'error' as const, message: 'Design validation report failed integrity or validity gate.' }]
          : []),
        ...registryIssues
      ]
    });
  }

  const packages = [...input.registrySnapshot.packages].map(normalizeRegistryPackage).sort(compareRegistryPackages);
  const requirements = input.designReport.normalizedPlan.proposedCapabilityRequirements;
  const reuseMatches = packages
    .map((candidate) => matchRegistryPackage(candidate, requirements, input.runtimeFamily, packages))
    .filter((match) => match.coverage > 0 || match.evidence.length > 0 || match.matchKind === 'SEMANTIC_ALIAS')
    .sort(compareReuseMatches);
  const rejectedAlternatives = buildRejectedAlternatives({
    matches: reuseMatches,
    packages,
    runtimeFamily: input.runtimeFamily,
    requirements,
    proposedOwnedDslPaths: input.proposedOwnedDslPaths ?? []
  });
  const diagnostics = buildGapDiagnostics({ matches: reuseMatches, rejectedAlternatives, expectedReuseProfiles: input.expectedReuseProfiles ?? [] });
  const compositionPlan = buildCompositionPlan(reuseMatches, packages, requirements, input.runtimeFamily);
  const outcome = chooseGapOutcome({
    reuseMatches,
    rejectedAlternatives,
    compositionPlan,
    expectedReuseProfiles: input.expectedReuseProfiles ?? [],
    diagnostics
  });
  const missingPrimitives = outcome === 'NEW_BOUNDED_CAPABILITY_REQUIRED'
    ? buildMissingPrimitives({
        requirements,
        matches: reuseMatches,
        expectedReuseProfiles: input.expectedReuseProfiles ?? [],
        proposedOwnedDslPaths: input.proposedOwnedDslPaths ?? []
      })
    : [];

  return buildGapReport({
    requestId: input.requestContext.requestId,
    registrySnapshotHash: input.registrySnapshot.snapshotHash,
    activeCapabilityLockHash: input.activeCapabilityLockHash,
    designValidationReportHash: input.designReport.reportHash,
    reuseMatches,
    compositionPlan,
    outcome,
    missingPrimitives,
    rejectedAlternatives,
    diagnostics
  });
}

function matchRegistryPackage(
  candidate: CapabilityGapRegistryPackage,
  requirements: readonly ProposedCapabilityRequirement[],
  runtimeFamily: string,
  packages: readonly CapabilityGapRegistryPackage[]
): CapabilityReuseMatch {
  const covered = new Set<string>();
  const evidence: string[] = [];

  for (const requirement of requirements) {
    const requirementKey = requirement.semanticName;
    const semanticMatch = packageMatchesRequirement(candidate, requirement);
    const configurationMatch = candidate.configurationOptions.some((option) => textMatches(option, requirement.semanticName));
    const declarativeMatch = candidate.declarativeRuleKinds.length > 0 && requirement.requiredEvents.length > 0;
    const interfacesCovered = requirement.requiredInterfaces.every((item) => candidate.providedInterfaces.includes(item));
    const eventsCovered = requirement.requiredEvents.every((item) => candidate.emittedEvents.includes(item) || candidate.consumedEvents.includes(item));
    const servicesCovered = requirement.requiredRuntimeServices.every((item) => candidate.requiredRuntimeServices.includes(item));
    const complete = isCompleteReusable(candidate);
    const runtimeCompatible = candidate.runtimeFamilies.includes(runtimeFamily);
    const dependencyFailures = dependencyIssues(candidate, packages, runtimeFamily);
    const dependenciesResolved = dependencyFailures.length === 0;

    if (semanticMatch && interfacesCovered && eventsCovered && servicesCovered && complete && runtimeCompatible && dependenciesResolved) {
      covered.add(requirementKey);
      evidence.push(`${candidate.capabilityId} covers ${requirementKey} with interfaces/events/services and verified QA.`);
    } else if (configurationMatch && complete && runtimeCompatible && dependenciesResolved) {
      covered.add(requirementKey);
      evidence.push(`${candidate.capabilityId} can express ${requirementKey} through configuration options.`);
    } else if (declarativeMatch && complete && runtimeCompatible && dependenciesResolved) {
      covered.add(requirementKey);
      evidence.push(`${candidate.capabilityId} can express ${requirementKey} through declarative rule kinds.`);
    } else {
      if (semanticMatch || configurationMatch || declarativeMatch) {
        evidence.push(`${candidate.capabilityId} is semantically related to ${requirementKey} but lacks full deterministic coverage.`);
        evidence.push(...dependencyFailures);
      }
    }
  }

  const uncovered = requirements.map((requirement) => requirement.semanticName).filter((requirement) => !covered.has(requirement));
  const matchKind = classifyMatchKind(candidate, requirements, covered.size, uncovered.length);
  const total = Math.max(1, requirements.length);
  return {
    candidateCapabilityId: candidate.capabilityId,
    packageVersion: candidate.packageVersion,
    contentHash: candidate.contentHash,
    matchKind,
    coverage: Number((covered.size / total).toFixed(4)),
    coveredRequirements: [...covered].sort(),
    uncoveredRequirements: uncovered.sort(),
    evidence: uniqueStrings(evidence)
  };
}

function classifyMatchKind(candidate: CapabilityGapRegistryPackage, requirements: readonly ProposedCapabilityRequirement[], coveredCount: number, uncoveredCount: number): CapabilityReuseMatchKind {
  if (coveredCount > 0 && uncoveredCount === 0) {
    if (candidate.configurationOptions.some((option) => requirements.some((requirement) => textMatches(option, requirement.semanticName)))) {
      return 'CONFIGURATION_ONLY';
    }
    if (candidate.declarativeRuleKinds.length > 0 && requirements.some((requirement) => requirement.requiredEvents.length > 0)) {
      return 'DECLARATIVE_RULE';
    }
    return 'EXACT';
  }
  if (candidate.configurationOptions.some((option) => requirements.some((requirement) => textMatches(option, requirement.semanticName)))) {
    return 'CONFIGURATION_ONLY';
  }
  if (candidate.declarativeRuleKinds.length > 0 && requirements.some((requirement) => requirement.requiredEvents.length > 0)) {
    return 'DECLARATIVE_RULE';
  }
  if (candidate.providedInterfaces.some((providedInterface) => requirements.some((requirement) => requirement.requiredInterfaces.includes(providedInterface)))) {
    return 'PROVIDED_INTERFACE';
  }
  if (requirements.some((requirement) => requirement.suggestedCapabilityIds.some((id) => candidate.aliases.includes(id)))) {
    return 'SEMANTIC_ALIAS';
  }
  return coveredCount > 0 ? 'COMPOSABLE' : 'PARTIAL';
}

function chooseGapOutcome(input: {
  reuseMatches: readonly CapabilityReuseMatch[];
  rejectedAlternatives: readonly RejectedCapabilityAlternative[];
  compositionPlan: CapabilityCompositionPlan;
  expectedReuseProfiles: readonly string[];
  diagnostics: readonly CapabilityGapDiagnostic[];
}): CapabilityGapOutcome {
  if (input.diagnostics.some((diagnostic) => diagnostic.code === 'OWNERSHIP_OVERLAP' || diagnostic.code === 'DUPLICATE_SEMANTIC_ALIAS')) {
    return 'POLICY_BLOCKED';
  }
  if (input.rejectedAlternatives.some((alternative) => alternative.reason === 'RUNTIME_FAMILY_MISMATCH')) {
    return 'MANUAL_ARCHITECTURE_REVIEW_REQUIRED';
  }
  if (input.compositionPlan.strategy === 'EXACT_PACKAGE' || input.compositionPlan.strategy === 'CONFIGURATION_ONLY' || input.compositionPlan.strategy === 'COMPOSITION') {
    return 'NO_NEW_CAPABILITY_REQUIRED';
  }
  if (input.compositionPlan.strategy === 'DECLARATIVE_RULE') {
    return 'DECLARATIVE_EXTENSION_REQUIRED';
  }
  if (input.expectedReuseProfiles.length > 0 && input.expectedReuseProfiles.length < 2) {
    return 'MANUAL_ARCHITECTURE_REVIEW_REQUIRED';
  }
  return 'NEW_BOUNDED_CAPABILITY_REQUIRED';
}

function buildCompositionPlan(
  matches: readonly CapabilityReuseMatch[],
  packages: readonly CapabilityGapRegistryPackage[],
  requirements: readonly ProposedCapabilityRequirement[],
  runtimeFamily: string
): CapabilityCompositionPlan {
  const selectableMatches = matches.filter((match) => isSelectableReuseMatch(match, packages, runtimeFamily));
  const completeMatches = selectableMatches.filter((match) => match.coverage === 1);
  const exact = completeMatches.find((match) => match.matchKind === 'EXACT');
  const configuration = completeMatches.find((match) => match.matchKind === 'CONFIGURATION_ONLY');
  const compositionMatches = selectCompositionMatches(selectableMatches, requirements);
  const declarative = completeMatches.find((match) => match.matchKind === 'DECLARATIVE_RULE');
  const strategy = exact !== undefined
    ? 'EXACT_PACKAGE'
    : configuration !== undefined
      ? 'CONFIGURATION_ONLY'
      : compositionMatches.length > 1
        ? 'COMPOSITION'
        : declarative !== undefined
          ? 'DECLARATIVE_RULE'
          : 'NONE';
  const selectedMatches = exact !== undefined
    ? [exact]
    : configuration !== undefined
      ? [configuration]
      : compositionMatches.length > 1
        ? compositionMatches
        : declarative !== undefined
          ? [declarative]
          : compositionMatches;
  const selectedCapabilityIds = strategy === 'NONE' ? [] : uniqueStrings(selectedMatches.map((match) => match.candidateCapabilityId));
  return {
    strategy,
    selectedCapabilityIds,
    dependencyGraph: selectedCapabilityIds.map((capabilityId) => ({
      capabilityId,
      dependencies: dependencyClosureIds(capabilityId, packages)
    })),
    explanation: strategy === 'NONE' ? 'No deterministic reuse path covers the design requirements.' : `${strategy} covers the design requirements without new typed runtime code.`
  };
}

function selectCompositionMatches(matches: readonly CapabilityReuseMatch[], requirements: readonly ProposedCapabilityRequirement[]): CapabilityReuseMatch[] {
  const required = new Set(requirements.map((requirement) => requirement.semanticName));
  const covered = new Set<string>();
  const selected: CapabilityReuseMatch[] = [];

  for (const match of [...matches].filter((item) => item.coveredRequirements.length > 0).sort(compareReuseMatches)) {
    if (match.coveredRequirements.some((requirement) => required.has(requirement) && !covered.has(requirement))) {
      selected.push(match);
      for (const requirement of match.coveredRequirements) {
        covered.add(requirement);
      }
    }
    if ([...required].every((requirement) => covered.has(requirement))) {
      return selected;
    }
  }

  return [];
}

function buildMissingPrimitives(input: {
  requirements: readonly ProposedCapabilityRequirement[];
  matches: readonly CapabilityReuseMatch[];
  expectedReuseProfiles: readonly string[];
  proposedOwnedDslPaths: readonly string[];
}): MissingCapabilityPrimitive[] {
  return input.requirements.map((requirement) => {
    const proposedId = chooseProposedCapabilityId(requirement);
    return {
      proposedId,
      domain: proposedId.split('.')[0] ?? 'gameplay',
      semanticContract: requirement.semanticName,
      reasonExistingPackagesInsufficient: missingReasons(requirement, input.matches),
      requiredDependencies: requirement.suggestedCapabilityIds.slice(1).map((capabilityId) => ({
        capabilityId,
        requiredInterface: requirement.requiredInterfaces[0] ?? 'unspecified_interface',
        reason: `Dependency suggested by design requirement ${requirement.semanticName}.`
      })),
      providedInterfaces: requirement.requiredInterfaces,
      ownedDslPaths: input.proposedOwnedDslPaths.length === 0 ? [`/capabilities/${proposedId.replaceAll('.', '_')}`] : [...input.proposedOwnedDslPaths].sort(),
      ownedIrNodeKinds: requirement.requiredInterfaces.map((item) => `capability.${item}`),
      expectedReuseProfiles: [...input.expectedReuseProfiles].sort(),
      estimatedScope: estimateScope(requirement)
    };
  });
}

function buildRejectedAlternatives(input: {
  matches: readonly CapabilityReuseMatch[];
  packages: readonly CapabilityGapRegistryPackage[];
  runtimeFamily: string;
  requirements: readonly ProposedCapabilityRequirement[];
  proposedOwnedDslPaths: readonly string[];
}): RejectedCapabilityAlternative[] {
  const alternatives: RejectedCapabilityAlternative[] = [];
  for (const match of input.matches) {
    const candidate = input.packages.find((item) => item.capabilityId === match.candidateCapabilityId);
    if (candidate === undefined) {
      continue;
    }
    if (!candidate.runtimeFamilies.includes(input.runtimeFamily)) {
      alternatives.push({ candidateCapabilityId: candidate.capabilityId, reason: 'RUNTIME_FAMILY_MISMATCH', evidence: [`${candidate.capabilityId} does not support ${input.runtimeFamily}.`] });
    }
    if (!isCompleteReusable(candidate)) {
      alternatives.push({ candidateCapabilityId: candidate.capabilityId, reason: 'INCOMPLETE_PACKAGE', evidence: [`${candidate.capabilityId} completeness is ${candidate.completeness}.`] });
    }
    const dependencyFailures = dependencyIssues(candidate, input.packages, input.runtimeFamily);
    if (dependencyFailures.length > 0) {
      alternatives.push({ candidateCapabilityId: candidate.capabilityId, reason: 'DEPENDENCY_UNRESOLVED', evidence: dependencyFailures });
    }
    if (match.matchKind === 'SEMANTIC_ALIAS') {
      alternatives.push({ candidateCapabilityId: candidate.capabilityId, reason: 'DUPLICATE_PACKAGE_PROPOSAL', evidence: [`${candidate.capabilityId} already owns a semantic alias for the proposed requirement.`] });
    }
    if (candidate.plannedSuccessorId !== undefined || candidate.deprecatedById !== undefined) {
      alternatives.push({
        candidateCapabilityId: candidate.capabilityId,
        reason: 'DUPLICATE_PACKAGE_PROPOSAL',
        evidence: uniqueStrings([
          ...(candidate.plannedSuccessorId === undefined ? [] : [`${candidate.capabilityId} has planned successor ${candidate.plannedSuccessorId}.`]),
          ...(candidate.deprecatedById === undefined ? [] : [`${candidate.capabilityId} is deprecated by ${candidate.deprecatedById}.`])
        ])
      });
    }
    if (match.coverage > 0 && match.coverage < 1) {
      alternatives.push({ candidateCapabilityId: candidate.capabilityId, reason: 'SIMILAR_BUT_INSUFFICIENT', evidence: match.evidence });
    }
    if (input.proposedOwnedDslPaths.some((path) => candidate.ownedDslPaths.some((ownedPath) => jsonPointerOverlaps(path, ownedPath)))) {
      alternatives.push({ candidateCapabilityId: candidate.capabilityId, reason: 'OWNERSHIP_OVERLAP', evidence: [`Proposed owned path overlaps ${candidate.capabilityId}.`] });
    }
  }
  if (input.requirements.some((requirement) => /profile|genre|template/i.test(requirement.semanticName))) {
    alternatives.push({ candidateCapabilityId: 'profile_recipe', reason: 'PROFILE_ONLY_WORKAROUND', evidence: ['Requirement appears profile-specific rather than reusable primitive.'] });
  }
  return dedupeAlternatives(alternatives).sort(compareRejectedAlternatives);
}

function buildGapDiagnostics(input: {
  matches: readonly CapabilityReuseMatch[];
  rejectedAlternatives: readonly RejectedCapabilityAlternative[];
  expectedReuseProfiles: readonly string[];
}): CapabilityGapDiagnostic[] {
  return [
    ...input.rejectedAlternatives.map((alternative): CapabilityGapDiagnostic => ({
      code: alternative.reason === 'RUNTIME_FAMILY_MISMATCH'
        ? 'RUNTIME_FAMILY_MISMATCH'
        : alternative.reason === 'DUPLICATE_PACKAGE_PROPOSAL'
          ? 'DUPLICATE_SEMANTIC_ALIAS'
          : alternative.reason === 'DEPENDENCY_UNRESOLVED'
            ? 'DEPENDENCY_UNRESOLVED'
            : alternative.reason === 'OWNERSHIP_OVERLAP'
              ? 'OWNERSHIP_OVERLAP'
              : alternative.reason === 'INCOMPLETE_PACKAGE'
                ? 'INCOMPLETE_REUSE_CANDIDATE'
                : alternative.reason === 'PROFILE_ONLY_WORKAROUND'
                  ? 'PROFILE_SPECIFIC_PRIMITIVE'
                  : 'MISSING_PRIMITIVE_REQUIRED',
      severity: alternative.reason === 'OWNERSHIP_OVERLAP' || alternative.reason === 'DUPLICATE_PACKAGE_PROPOSAL' ? 'error' : 'warning',
      message: `${alternative.candidateCapabilityId} rejected: ${alternative.reason}.`
    })),
    ...(input.matches.length === 0 ? [{ code: 'MISSING_PRIMITIVE_REQUIRED' as const, severity: 'info' as const, message: 'No existing capability covers the design requirement.' }] : []),
    ...(input.expectedReuseProfiles.length > 0 && input.expectedReuseProfiles.length < 2
      ? [{ code: 'PROFILE_SPECIFIC_PRIMITIVE' as const, severity: 'warning' as const, message: 'Missing primitive appears reusable by fewer than two profiles.' }]
      : [])
  ].sort(compareDiagnostics);
}

function buildGapReport(input: Omit<CapabilityGapAnalysis, 'artifactKind' | 'schemaVersion' | 'reportHash'>): CapabilityGapAnalysis {
  const payload: Omit<CapabilityGapAnalysis, 'reportHash'> = {
    artifactKind: CAPABILITY_GAP_ANALYSIS_REPORT_KIND,
    schemaVersion: CAPABILITY_GAP_ANALYSIS_SCHEMA_VERSION,
    requestId: input.requestId,
    registrySnapshotHash: input.registrySnapshotHash,
    ...(input.activeCapabilityLockHash === undefined ? {} : { activeCapabilityLockHash: input.activeCapabilityLockHash }),
    designValidationReportHash: input.designValidationReportHash,
    reuseMatches: [...input.reuseMatches].sort(compareReuseMatches),
    compositionPlan: input.compositionPlan,
    outcome: input.outcome,
    missingPrimitives: [...input.missingPrimitives].sort((left, right) => left.proposedId.localeCompare(right.proposedId)),
    rejectedAlternatives: [...input.rejectedAlternatives].sort(compareRejectedAlternatives),
    diagnostics: [...input.diagnostics].sort(compareDiagnostics)
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function emptyCompositionPlan(explanation: string): CapabilityCompositionPlan {
  return { strategy: 'NONE', selectedCapabilityIds: [], dependencyGraph: [], explanation };
}

function registrySnapshotIssues(snapshot: CapabilityGapRegistrySnapshotInput): CapabilityGapDiagnostic[] {
  return snapshot.artifactKind !== CAPABILITY_REGISTRY_SNAPSHOT_INPUT_KIND || snapshot.schemaVersion !== CAPABILITY_REGISTRY_SNAPSHOT_INPUT_SCHEMA_VERSION || snapshot.snapshotHash !== buildCapabilityGapRegistrySnapshot(snapshot.packages).snapshotHash
    ? [{ code: 'REGISTRY_SNAPSHOT_INVALID', severity: 'error', message: 'Registry snapshot input failed kind/schema/hash validation.' }]
    : [];
}

function packageMatchesRequirement(candidate: CapabilityGapRegistryPackage, requirement: ProposedCapabilityRequirement): boolean {
  return requirement.suggestedCapabilityIds.includes(candidate.capabilityId) ||
    requirement.suggestedCapabilityIds.some((id) => candidate.aliases.includes(id)) ||
    textMatches(candidate.capabilityId, requirement.semanticName) ||
    textMatches(candidate.description, requirement.semanticName) ||
    candidate.semanticTags.some((tag) => textMatches(tag, requirement.semanticName));
}

function isCompleteReusable(candidate: CapabilityGapRegistryPackage): boolean {
  return candidate.completeness === 'COMPLETE_SUPPORTED' && candidate.qaAvailable;
}

function dependencyIssues(candidate: CapabilityGapRegistryPackage, packages: readonly CapabilityGapRegistryPackage[], runtimeFamily: string): string[] {
  const byId = new Map(packages.map((item) => [item.capabilityId, item]));
  return uniqueStrings(collectDependencyIssues(candidate, byId, runtimeFamily, [candidate.capabilityId]));
}

function dependencyClosureIds(capabilityId: string, packages: readonly CapabilityGapRegistryPackage[]): string[] {
  const byId = new Map(packages.map((item) => [item.capabilityId, item]));
  const candidate = byId.get(capabilityId);
  return candidate === undefined ? [] : uniqueStrings(collectDependencyIds(candidate, byId, [capabilityId]));
}

function collectDependencyIds(
  candidate: CapabilityGapRegistryPackage,
  packagesById: ReadonlyMap<string, CapabilityGapRegistryPackage>,
  path: readonly string[]
): string[] {
  return candidate.dependencies.flatMap((dependencyId) => {
    if (path.includes(dependencyId)) {
      return [dependencyId];
    }
    const dependency = packagesById.get(dependencyId);
    return dependency === undefined ? [dependencyId] : [dependencyId, ...collectDependencyIds(dependency, packagesById, [...path, dependencyId])];
  });
}

function collectDependencyIssues(
  candidate: CapabilityGapRegistryPackage,
  packagesById: ReadonlyMap<string, CapabilityGapRegistryPackage>,
  runtimeFamily: string,
  path: readonly string[]
): string[] {
  return candidate.dependencies.flatMap((dependencyId) => {
    const dependencyPath = [...path, dependencyId];
    if (path.includes(dependencyId)) {
      return [`Dependency cycle detected in ${dependencyPath.join(' -> ')}.`];
    }
    const dependency = packagesById.get(dependencyId);
    if (dependency === undefined) {
      return [`Dependency chain ${dependencyPath.join(' -> ')} is missing ${dependencyId} from registry snapshot.`];
    }

    const directIssues = [
      ...(!dependency.runtimeFamilies.includes(runtimeFamily)
        ? [`Dependency chain ${dependencyPath.join(' -> ')} does not support ${runtimeFamily}.`]
        : []),
      ...(!isCompleteReusable(dependency)
        ? [`Dependency chain ${dependencyPath.join(' -> ')} is not complete supported with QA.`]
        : [])
    ];
    return [...directIssues, ...collectDependencyIssues(dependency, packagesById, runtimeFamily, dependencyPath)];
  });
}

function isSelectableReuseMatch(match: CapabilityReuseMatch, packages: readonly CapabilityGapRegistryPackage[], runtimeFamily: string): boolean {
  const candidate = packages.find((item) => item.capabilityId === match.candidateCapabilityId);
  return candidate !== undefined &&
    candidate.runtimeFamilies.includes(runtimeFamily) &&
    isCompleteReusable(candidate) &&
    dependencyIssues(candidate, packages, runtimeFamily).length === 0;
}

function missingReasons(requirement: ProposedCapabilityRequirement, matches: readonly CapabilityReuseMatch[]): string[] {
  const related = matches.filter((match) => match.coveredRequirements.includes(requirement.semanticName) || match.uncoveredRequirements.includes(requirement.semanticName));
  if (related.length === 0) {
    return ['No existing package semantically covers the requirement.'];
  }
  return uniqueStrings(related.flatMap((match) => match.uncoveredRequirements.includes(requirement.semanticName) ? [`${match.candidateCapabilityId} does not cover all required interfaces/events/services.`] : []));
}

function estimateScope(requirement: ProposedCapabilityRequirement): MissingPrimitiveScope {
  const size = requirement.requiredInterfaces.length + requirement.requiredEvents.length + requirement.requiredRuntimeServices.length;
  return size <= 2 ? 'small' : size <= 5 ? 'medium' : 'large';
}

function proposedCapabilityId(semanticName: string): string {
  const slug = semanticName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `gameplay.${slug.length === 0 ? 'missing_primitive' : slug}.v1`;
}

function chooseProposedCapabilityId(requirement: ProposedCapabilityRequirement): string {
  return [...requirement.suggestedCapabilityIds]
    .sort((left, right) => semanticMatchScore(right, requirement.semanticName) - semanticMatchScore(left, requirement.semanticName) || left.localeCompare(right))[0] ?? proposedCapabilityId(requirement.semanticName);
}

function semanticMatchScore(candidateId: string, semanticName: string): number {
  const semanticTokens = meaningfulSearchTokens(semanticName);
  const candidateTokens = new Set(meaningfulSearchTokens(candidateId));
  return semanticTokens.filter((token) => candidateTokens.has(token)).length;
}

function normalizeRegistryPackage(input: CapabilityGapRegistryPackage): CapabilityGapRegistryPackage {
  return {
    ...input,
    aliases: uniqueStrings(input.aliases),
    semanticTags: uniqueStrings(input.semanticTags),
    runtimeFamilies: uniqueStrings(input.runtimeFamilies),
    providedInterfaces: uniqueStrings(input.providedInterfaces),
    requiredRuntimeServices: uniqueStrings(input.requiredRuntimeServices),
    emittedEvents: uniqueStrings(input.emittedEvents),
    consumedEvents: uniqueStrings(input.consumedEvents),
    ownedDslPaths: uniqueStrings(input.ownedDslPaths),
    ownedIrNodeKinds: uniqueStrings(input.ownedIrNodeKinds),
    amendmentOperations: uniqueStrings(input.amendmentOperations),
    profiles: uniqueStrings(input.profiles),
    dependencies: uniqueStrings(input.dependencies),
    configurationOptions: uniqueStrings(input.configurationOptions),
    declarativeRuleKinds: uniqueStrings(input.declarativeRuleKinds)
  };
}

function textMatches(left: string, right: string): boolean {
  const leftNormalized = normalizeSearchText(left);
  const rightNormalized = normalizeSearchText(right);
  return leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized) || sharedTokens(leftNormalized, rightNormalized).length > 0;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sharedTokens(left: string, right: string): string[] {
  const leftTokens = new Set(meaningfulSearchTokens(left));
  return meaningfulSearchTokens(right).filter((token) => leftTokens.has(token));
}

function meaningfulSearchTokens(value: string): string[] {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

function jsonPointerOverlaps(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function dedupeAlternatives(alternatives: readonly RejectedCapabilityAlternative[]): RejectedCapabilityAlternative[] {
  const seen = new Set<string>();
  return alternatives.filter((alternative) => {
    const key = `${alternative.candidateCapabilityId}:${alternative.reason}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function compareRegistryPackages(left: CapabilityGapRegistryPackage, right: CapabilityGapRegistryPackage): number {
  return `${left.capabilityId}:${left.packageVersion}:${left.contentHash}`.localeCompare(`${right.capabilityId}:${right.packageVersion}:${right.contentHash}`);
}

function compareReuseMatches(left: CapabilityReuseMatch, right: CapabilityReuseMatch): number {
  return `${left.candidateCapabilityId}:${left.matchKind}:${left.coverage}`.localeCompare(`${right.candidateCapabilityId}:${right.matchKind}:${right.coverage}`);
}

function compareRejectedAlternatives(left: RejectedCapabilityAlternative, right: RejectedCapabilityAlternative): number {
  return `${left.candidateCapabilityId}:${left.reason}`.localeCompare(`${right.candidateCapabilityId}:${right.reason}`);
}

function compareDiagnostics(left: CapabilityGapDiagnostic, right: CapabilityGapDiagnostic): number {
  return `${left.severity}:${left.code}:${left.message}`.localeCompare(`${right.severity}:${right.code}:${right.message}`);
}
