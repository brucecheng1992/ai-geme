import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  buildSemanticAmendmentRuntimeApplyReport,
  isPreviewableSemanticAmendment,
  requiresRuntimeApplyReport,
  type SemanticAmendmentPreviewState,
  type SemanticEditProposal
} from '../index.js';

describe('Workbench semantic amendment client', () => {
  it('builds runtime apply reports from previewed semantic amendments', () => {
    const report = buildSemanticAmendmentRuntimeApplyReport('run_demo', createPreviewState(), {
      status: 'applied_warm_restart',
      applyMode: 'warm_restart',
      runtimeTarget: 'phaser:top_down_shooter',
      appliedPaths: ['/player/actions/0/cooldownMs'],
      warnings: [],
      errors: []
    });

    expect(report).toMatchObject({
      artifactKind: 'runtime_apply_report',
      schemaVersion: 'runtime_apply_report.v1',
      runId: 'run_demo',
      patchId: 'patch_amend_demo',
      liveUpdatePlanRef: { artifact: 'patch_amend_demo.live_update_plan.json', patchId: 'patch_amend_demo' },
      status: 'applied_warm_restart',
      applyMode: 'warm_restart',
      appliedPaths: ['/player/actions/0/cooldownMs']
    });
  });

  it('keeps previewability and runtime-accept requirements mode-specific', () => {
    expect(isPreviewableSemanticAmendment(createProposal({ mode: 'hot_runtime_patch' }))).toBe(true);
    expect(isPreviewableSemanticAmendment(createProposal({ mode: 'dsl_patch_warm_restart' }))).toBe(true);
    expect(isPreviewableSemanticAmendment(createProposal({ mode: 'candidate_regeneration' }))).toBe(true);
    expect(isPreviewableSemanticAmendment(createProposal({ mode: 'unsupported_capability' }))).toBe(false);
    expect(isPreviewableSemanticAmendment(createProposal({ mode: 'needs_clarification' }))).toBe(false);

    expect(requiresRuntimeApplyReport(createProposal({ mode: 'hot_runtime_patch' }))).toBe(true);
    expect(requiresRuntimeApplyReport(createProposal({ mode: 'dsl_patch_warm_restart' }))).toBe(false);
    expect(requiresRuntimeApplyReport(createProposal({ mode: 'candidate_regeneration' }))).toBe(false);
  });

  it('routes Workbench conversation submit through semantic amendments instead of field-first parsing', async () => {
    const appSource = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');
    const panelSource = await readFile(new URL('../../brief/BriefTextboxPanel.tsx', import.meta.url), 'utf8');

    expect(appSource).toContain('planSemanticAmendment({');
    expect(appSource).toContain('previewSemanticAmendment({');
    expect(appSource).toContain('acceptSemanticAmendment({');
    expect(appSource).toContain('amendmentCards={semanticAmendmentCardViews}');
    expect(appSource).toContain('artifactRefs: mergeSemanticAmendmentArtifactRefs');
    expect(appSource).toContain('acceptGateLabel: semanticAmendmentAcceptGateLabel(card, context)');
    expect(appSource).toContain('evidenceRefs: buildSemanticAmendmentEvidenceRefs(card)');
    expect(appSource).toContain('if (requiresRuntimeApplyReport(card.proposal))');
    expect(appSource).not.toContain('parseConversationLiveEditCommand({ text');
    expect(panelSource).toContain('SemanticAmendmentProposalCard');
    expect(panelSource).toContain('amendmentCards?: SemanticAmendmentProposalCardView[];');
  });

  it('renders semantic amendment accept gate and evidence refs in proposal cards', async () => {
    const cardSource = await readFile(new URL('../SemanticAmendmentProposalCard.tsx', import.meta.url), 'utf8');

    expect(cardSource).toContain('DetailRow label="Accept gate"');
    expect(cardSource).toContain('CompactList title="Evidence refs"');
  });
});

function createPreviewState(): SemanticAmendmentPreviewState {
  return {
    proposalId: 'amend_demo',
    projectId: 'proj_demo',
    runId: 'run_demo',
    reviewState: 'previewing',
    executionMode: 'dsl_patch_warm_restart',
    preparedLiveEdit: {
      patch_id: 'patch_amend_demo',
      status: 'warm_restart_required',
      apply_mode: 'warm_restart',
      runtime_patch: { player: { maxSpeed: 320 } },
      live_update_plan_ref: { artifact: 'patch_amend_demo.live_update_plan.json', patchId: 'patch_amend_demo' },
      validation_report: { status: 'valid', errors: [] },
      live_update_plan: {
        status: 'warm_restart_required',
        applyMode: 'warm_restart',
        affectedPaths: ['/player/actions/0/cooldownMs']
      }
    },
    createdAt: '2026-06-18T00:00:00.000Z'
  };
}

function createProposal(input: { mode: SemanticEditProposal['execution']['mode'] }): SemanticEditProposal {
  return {
    id: 'amend_demo',
    projectId: 'proj_demo',
    runId: 'run_demo',
    createdAt: '2026-06-18T00:00:00.000Z',
    sourceText: '提高玩家速度',
    language: 'zh',
    understanding: {
      understood: true,
      confidence: 0.9,
      summary: '提高玩家速度',
      affectedDomains: ['player'],
      designDeltas: [],
      operations: []
    },
    execution: {
      mode: input.mode,
      reason: 'test',
      supportedNow: input.mode !== 'unsupported_capability' && input.mode !== 'needs_clarification',
      requiresPreviewReload: input.mode === 'dsl_patch_warm_restart' || input.mode === 'candidate_regeneration',
      requiresCandidateRun: input.mode === 'candidate_regeneration',
      missingCapabilities: [],
      rejectedUnsafeFallbacks: []
    },
    reviewState: 'proposed',
    userMessage: 'Proposal ready.'
  };
}
