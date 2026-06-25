import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  decideStep37ParentLoop,
  evaluateStep37ParentLoop,
  rebuildStep37ParentLoopFromCommittedState,
  validateStep37ClosureTextBoundary,
  validateStep37ScopedClosureRecord,
  type Step37CheckpointInventoryItem,
  type Step37GlobalExitConditions,
  type Step37ParentLoopDecisionError,
  type Step37ScopedClosureRecord
} from '../../packages/game-dsl/src/index.js';

const unmetExitConditions: Step37GlobalExitConditions = {
  schema_expressible: true,
  normalized: true,
  compiled: true,
  runtime_consumed: true,
  qa_observed: true,
  completeSupported: false,
  production_default_cutover_active: false,
  legacy_authoritative_path_exited: false,
  final_oracle_no_blocking_findings: false,
  final_closure_not_blocked: false,
  workspace_documentation_reconciled: false
};

const metExitConditions: Step37GlobalExitConditions = {
  schema_expressible: true,
  normalized: true,
  compiled: true,
  runtime_consumed: true,
  qa_observed: true,
  completeSupported: true,
  production_default_cutover_active: true,
  legacy_authoritative_path_exited: true,
  final_oracle_no_blocking_findings: true,
  final_closure_not_blocked: true,
  workspace_documentation_reconciled: true
};

const sourcePlanRevision = '64c223a77a3f870747faf7adb43c7c16c9d80aeb:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md';
const pickupImplementationCheckpoint: Step37CheckpointInventoryItem = {
  checkpoint_id: 'stage4.pickup_collectible.package_owned_qa_slice.implementation',
  parent_stage_id: 'stage4',
  next_atomic_step: 'Stage 4 pickup.collectible package-owned QA slice implementation atomic step',
  status: 'unmet',
  unmet_reason: 'Stage 4 pickup.collectible implementation remains NOT_ENTERED while global exit conditions are false.',
  source_plan_revision: sourcePlanRevision
};

describe('Step37 parent loop driver', () => {
  it('keeps the repository AGENTS rule scoped to atomic versus parent-loop completion', async () => {
    const agents = await readFile('AGENTS.md', 'utf8');

    expect(agents).toContain('Completion is always scoped.');
    expect(agents).toContain('only closes that atomic step');
    expect(agents).toContain('CONTINUE_PARENT_LOOP');
    expect(agents).toContain('PAUSE_FOR_USER');
    expect(agents).toContain('COMPLETE_GLOBAL_LOOP');
    expect(agents).toContain('record a non-empty `next_atomic_step`');
    expect(agents).toContain('After compaction, resume, or a new session, rebuild loop state from repository facts');
  });

  it('keeps the active Skill rule explicit about parent-loop continuation after atomic closure', async () => {
    const skill = await readFile('/Users/dahufa/.agents/skills/code-change-discipline/SKILL.md', 'utf8');

    expect(skill).toContain('completion 必须带作用域');
    expect(skill).toContain('当前步骤收口只关闭该原子步骤，不代表父 Stage、父 Loop 或最终目标完成');
    expect(skill).toContain('收口后必须运行 Parent Loop Driver');
    expect(skill).toContain('if atomicStepClosed:');
    expect(skill).toContain('STOP');
    expect(skill).toContain('CONTINUE_PARENT_LOOP');
    expect(skill).toContain('PAUSE_FOR_USER');
    expect(skill).toContain('COMPLETE_GLOBAL_LOOP');
    expect(skill).toContain('只有全部全局退出条件均为 true 才允许 `COMPLETE_GLOBAL_LOOP`');
  });

  it('binds the current guardrail record to the active external Skill bundle revision', async () => {
    const plan = await readFile('docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md', 'utf8');
    const skillBytes = await readFile('/Users/dahufa/.agents/skills/code-change-discipline/SKILL.md');
    const skillSha = createHash('sha256').update(skillBytes).digest('hex');
    const bundleDigest = digestSingleFileSkillBundle({
      relativePath: 'SKILL.md',
      fileType: 'file',
      byteLength: skillBytes.byteLength,
      sha256: skillSha,
      symlinkTarget: '-',
      symlinkEscapesRoot: false
    });

    expect(plan).toContain('- checkpoint_id: `hierarchical_completion_parent_loop_guardrail`.');
    expect(plan).toContain(`skill_bundle_file_byte_length=${skillBytes.byteLength}`);
    expect(plan).toContain(`skill_bundle_file_sha256=${skillSha}`);
    expect(plan).toContain(`skill_bundle_digest=${bundleDigest}`);
    expect(plan).toContain('skill_bundle_generation_exit_code=0');
  });

  it('continues the parent loop after an atomic step closes while global exits remain unmet', () => {
    expect(
      decideStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: unmetExitConditions,
        checkpoint_inventory: [pickupImplementationCheckpoint]
      })
    ).toEqual({
      loop_status: 'running',
      global_exit_conditions_met: false,
      user_input_required: false,
      next_action: 'CONTINUE_PARENT_LOOP',
      next_atomic_step: 'Stage 4 pickup.collectible package-owned QA slice implementation atomic step',
      next_checkpoint: {
        checkpoint_id: 'stage4.pickup_collectible.package_owned_qa_slice.implementation',
        parent_stage_id: 'stage4',
        next_atomic_step: 'Stage 4 pickup.collectible package-owned QA slice implementation atomic step',
        unmet_reason: 'Stage 4 pickup.collectible implementation remains NOT_ENTERED while global exit conditions are false.',
        selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory',
        source_plan_revision: sourcePlanRevision
      }
    });
  });

  it('does not let a candidate commit end Step37 while Stage 4 closure is not met', () => {
    const record = runningClosureRecord({
      atomicStepStatus: 'closed',
      candidateCommit: '1111111111111111111111111111111111111111',
      receiptCommit: null,
      oracleStatus: 'not_submitted',
      parentStageExitConditionsMet: false,
      nextAtomicStep: 'submit candidate to Oracle'
    });

    expect(validateStep37ScopedClosureRecord(record)).toEqual([]);
    expect(record.parent_loop.next_action).toBe('CONTINUE_PARENT_LOOP');
    expect(record.parent_loop.global_exit_conditions_met).toBe(false);
  });

  it('does not complete the global loop after Oracle PASS when final closure is still unmet', () => {
    const conditions = { ...unmetExitConditions, final_oracle_no_blocking_findings: true };

    expect(
      decideStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: conditions,
        checkpoint_inventory: [pickupImplementationCheckpoint]
      })
    ).toMatchObject({
      loop_status: 'running',
      global_exit_conditions_met: false,
      next_action: 'CONTINUE_PARENT_LOOP',
      next_atomic_step: 'Stage 4 pickup.collectible package-owned QA slice implementation atomic step'
    });
  });

  it('continues after a receipt commit when unmet checkpoints remain', () => {
    const record = runningClosureRecord({
      atomicStepStatus: 'closed',
      candidateCommit: '2222222222222222222222222222222222222222',
      receiptCommit: '3333333333333333333333333333333333333333',
      oracleStatus: 'approved',
      parentStageExitConditionsMet: false,
      nextAtomicStep: 'pickup.collectible.v1 implementation'
    });

    expect(validateStep37ScopedClosureRecord(record)).toEqual([]);
    expect(record.parent_loop.status).toBe('running');
    expect(record.parent_loop.next_action).toBe('CONTINUE_PARENT_LOOP');
  });

  it('rejects a running loop with no next atomic step', () => {
    expect(validateStep37ScopedClosureRecord(runningClosureRecord({ nextAtomicStep: null }))).toContain(
      'RUNNING_LOOP_NEXT_STEP_MISSING actual="<empty>" expected="next_atomic_step"'
    );
  });

  it('fails closed with structured diagnostics instead of returning a running loop without a next checkpoint', () => {
    expect(
      evaluateStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: unmetExitConditions,
        parent_stage_status: 'running',
        checkpoint_inventory: []
      })
    ).toEqual({
      ok: false,
      failure: {
        error_code: 'NEXT_ATOMIC_STEP_REQUIRED',
        global_exit_conditions_met: false,
        user_input_required: false,
        parent_stage_status: 'running',
        message: 'NEXT_ATOMIC_STEP_REQUIRED: global exits are unmet, no verified human blocker exists, and authoritative checkpoint inventory has no unmet executable checkpoint'
      }
    });

    try {
      decideStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: unmetExitConditions,
        parent_stage_status: 'running',
        checkpoint_inventory: []
      });
      throw new Error('expected decideStep37ParentLoop to throw');
    } catch (error) {
      expect((error as Step37ParentLoopDecisionError).failure).toMatchObject({
        error_code: 'NEXT_ATOMIC_STEP_REQUIRED',
        global_exit_conditions_met: false,
        user_input_required: false,
        parent_stage_status: 'running'
      });
    }
  });

  it('continues when global exits are unmet, no blocker exists, and the authoritative checkpoint inventory has an unmet checkpoint', () => {
    expect(
      evaluateStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: unmetExitConditions,
        checkpoint_inventory: [pickupImplementationCheckpoint]
      })
    ).toMatchObject({
      ok: true,
      decision: {
        next_action: 'CONTINUE_PARENT_LOOP',
        next_atomic_step: pickupImplementationCheckpoint.next_atomic_step,
        next_checkpoint: {
          checkpoint_id: pickupImplementationCheckpoint.checkpoint_id,
          parent_stage_id: pickupImplementationCheckpoint.parent_stage_id,
          unmet_reason: pickupImplementationCheckpoint.unmet_reason,
          selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory',
          source_plan_revision: sourcePlanRevision
        }
      }
    });
  });

  it('fails closed when the first unmet authoritative checkpoint is malformed even if a later checkpoint is valid', () => {
    const malformedFirstCheckpoint: Step37CheckpointInventoryItem = {
      ...pickupImplementationCheckpoint,
      checkpoint_id: 'stage4.malformed_first_unmet',
      next_atomic_step: '',
      unmet_reason: ''
    };
    const laterValidCheckpoint: Step37CheckpointInventoryItem = {
      ...pickupImplementationCheckpoint,
      checkpoint_id: 'stage4.later_valid_unmet',
      next_atomic_step: 'Later valid checkpoint must not be selected while first unmet is malformed.'
    };

    expect(
      evaluateStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: unmetExitConditions,
        checkpoint_inventory: [malformedFirstCheckpoint, laterValidCheckpoint]
      })
    ).toEqual({
      ok: false,
      failure: {
        error_code: 'NEXT_ATOMIC_CHECKPOINT_INVALID',
        global_exit_conditions_met: false,
        user_input_required: false,
        parent_stage_status: 'running',
        checkpoint_id: 'stage4.malformed_first_unmet',
        invalid_fields: ['next_atomic_step', 'unmet_reason'],
        message: 'NEXT_ATOMIC_CHECKPOINT_INVALID: first unmet authoritative checkpoint is missing required fields: next_atomic_step, unmet_reason'
      }
    });
  });

  it('pauses for a verified human blocker even when no next checkpoint is available', () => {
    expect(
      decideStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: unmetExitConditions,
        verified_human_blocker: { required: true, reason: 'Owner must choose between incompatible authority paths.' },
        checkpoint_inventory: []
      })
    ).toEqual({
      loop_status: 'blocked',
      global_exit_conditions_met: false,
      user_input_required: true,
      next_action: 'PAUSE_FOR_USER',
      next_atomic_step: null,
      next_checkpoint: null
    });
  });

  it('rejects illegal parent_stage_status values such as blocked or pending', () => {
    for (const illegalStatus of ['blocked', 'pending']) {
      const issues = validateStep37ScopedClosureRecord({
        ...runningClosureRecord(),
        parent_stage: {
          id: 'stage4',
          status: illegalStatus,
          exit_conditions_met: false
        }
      });

      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain('SCHEMA_INVALID path="parent_stage.status"');
      expect(issues[0]).toContain('"running"|"complete"');
    }
  });

  it('fails when authoritative plan still has an unmet checkpoint but resolver output is null', () => {
    const authoritativeInventory = [pickupImplementationCheckpoint];
    const resolverOutput = null;

    expect(authoritativeInventory.some((checkpoint) => checkpoint.status === 'unmet')).toBe(true);
    expect(resolverOutput).toBeNull();
    expect(
      validateStep37ScopedClosureRecord({
        ...runningClosureRecord({ nextAtomicStep: resolverOutput })
      })
    ).toContain('RUNNING_LOOP_NEXT_STEP_MISSING actual="<empty>" expected="next_atomic_step"');
  });

  it('rejects COMPLETE_GLOBAL_LOOP while global exit conditions are false', () => {
    expect(
      validateStep37ScopedClosureRecord({
        ...runningClosureRecord({ nextAtomicStep: null }),
        parent_loop: {
          id: 'step37',
          status: 'complete',
          global_exit_conditions_met: false,
          user_input_required: false,
          next_action: 'COMPLETE_GLOBAL_LOOP',
          next_atomic_step: null
        }
      })
    ).toEqual([
      'ATOMIC_CLOSURE_CANNOT_COMPLETE_PARENT_LOOP actual="atomic_step_status:closed,parent_loop.status:complete" expected="parent_loop reevaluation"',
      'GLOBAL_COMPLETE_WITH_UNMET_EXIT_CONDITIONS actual="global_exit_conditions_met:false,next_action:COMPLETE_GLOBAL_LOOP" expected="CONTINUE_PARENT_LOOP|PAUSE_FOR_USER"',
      'PARENT_STAGE_INCOMPLETE_GLOBAL_COMPLETE actual="parent_stage.exit_conditions_met:false" expected="non-global completion action"'
    ]);
  });

  it('rejects PAUSE_FOR_USER when no user decision blocker is recorded', () => {
    expect(
      validateStep37ScopedClosureRecord({
        ...runningClosureRecord({ nextAtomicStep: null }),
        parent_loop: {
          id: 'step37',
          status: 'blocked',
          global_exit_conditions_met: false,
          user_input_required: false,
          next_action: 'PAUSE_FOR_USER',
          next_atomic_step: null
        }
      })
    ).toEqual([
      'PAUSE_WITHOUT_USER_BLOCKER actual="user_input_required:false,next_action:PAUSE_FOR_USER" expected="CONTINUE_PARENT_LOOP|COMPLETE_GLOBAL_LOOP"'
    ]);
  });

  it('rejects unscoped stop markers while global exit conditions are unmet', () => {
    expect(
      validateStep37ClosureTextBoundary({
        global_exit_conditions_met: false,
        text: 'Stop marker: checkpoint committed. Task finished.'
      })
    ).toEqual([
      'UNSCOPED_COMPLETION_MARKER marker="stop marker" global_exit_conditions_met="false"',
      'UNSCOPED_COMPLETION_MARKER marker="task finished" global_exit_conditions_met="false"'
    ]);
  });

  it('rebuilds parent-loop state from committed facts after compaction or resume', () => {
    expect(
      rebuildStep37ParentLoopFromCommittedState({
        committed_head_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        git_status_short: '',
        global_exit_conditions: unmetExitConditions,
        checkpoint_inventory: [pickupImplementationCheckpoint]
      })
    ).toEqual({
      committed_state_valid: true,
      committed_state_issues: [],
      loop_status: 'running',
      global_exit_conditions_met: false,
      user_input_required: false,
      next_action: 'CONTINUE_PARENT_LOOP',
      next_atomic_step: 'Stage 4 pickup.collectible package-owned QA slice implementation atomic step',
      next_checkpoint: {
        checkpoint_id: pickupImplementationCheckpoint.checkpoint_id,
        parent_stage_id: pickupImplementationCheckpoint.parent_stage_id,
        next_atomic_step: pickupImplementationCheckpoint.next_atomic_step,
        unmet_reason: pickupImplementationCheckpoint.unmet_reason,
        selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory',
        source_plan_revision: sourcePlanRevision
      }
    });
  });

  it('reports a state recovery failure instead of rebuilding running/null after resume', () => {
    expect(
      rebuildStep37ParentLoopFromCommittedState({
        committed_head_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        git_status_short: '',
        global_exit_conditions: unmetExitConditions,
        checkpoint_inventory: []
      })
    ).toEqual({
      committed_state_valid: false,
      committed_state_issues: ['STATE_RECOVERY_NEXT_ATOMIC_STEP_MISSING'],
      failure: {
        error_code: 'STATE_RECOVERY_REQUIRED',
        global_exit_conditions_met: false,
        user_input_required: false,
        parent_stage_status: 'running',
        message: 'NEXT_ATOMIC_STEP_REQUIRED: global exits are unmet, no verified human blocker exists, and authoritative checkpoint inventory has no unmet executable checkpoint'
      }
    });
  });

  it('allows COMPLETE_GLOBAL_LOOP only when every global exit condition is true', () => {
    expect(
      decideStep37ParentLoop({
        atomic_step_boundary_reached: true,
        global_exit_conditions: metExitConditions,
        checkpoint_inventory: []
      })
    ).toEqual({
      loop_status: 'complete',
      global_exit_conditions_met: true,
      user_input_required: false,
      next_action: 'COMPLETE_GLOBAL_LOOP',
      next_atomic_step: null,
      next_checkpoint: null
    });
  });
});

function runningClosureRecord(
  overrides: {
    atomicStepStatus?: Step37ScopedClosureRecord['atomic_step_status'];
    candidateCommit?: string | null;
    receiptCommit?: string | null;
    oracleStatus?: Step37ScopedClosureRecord['atomic_step']['oracle_status'];
    parentStageExitConditionsMet?: boolean;
    nextAtomicStep?: string | null;
  } = {}
): Step37ScopedClosureRecord {
  return {
    closure_scope: 'atomic_step',
    atomic_step_boundary_reached: true,
    atomic_step_status: overrides.atomicStepStatus ?? 'closed',
    atomic_step: {
      id: 'hierarchical_completion_parent_loop_guardrail',
      status: overrides.atomicStepStatus ?? 'closed',
      candidate_commit: overrides.candidateCommit ?? '1111111111111111111111111111111111111111',
      receipt_commit: overrides.receiptCommit ?? null,
      oracle_status: overrides.oracleStatus ?? 'approved'
    },
    parent_stage: {
      id: 'stage4',
      status: overrides.parentStageExitConditionsMet === true ? 'complete' : 'running',
      exit_conditions_met: overrides.parentStageExitConditionsMet ?? false
    },
    parent_loop: {
      id: 'step37',
      status: 'running',
      global_exit_conditions_met: false,
      user_input_required: false,
      next_action: 'CONTINUE_PARENT_LOOP',
      next_atomic_step: overrides.nextAtomicStep === undefined ? 'pickup.collectible.v1 implementation' : overrides.nextAtomicStep
    }
  };
}

function digestSingleFileSkillBundle(entry: {
  relativePath: string;
  fileType: string;
  byteLength: number;
  sha256: string;
  symlinkTarget: string;
  symlinkEscapesRoot: boolean;
}): string {
  const source = [
    entry.relativePath,
    entry.fileType,
    entry.byteLength,
    entry.sha256,
    entry.symlinkTarget,
    String(entry.symlinkEscapesRoot).replace('false', 'False').replace('true', 'True')
  ].join('\t');
  return createHash('sha256').update(source).digest('hex');
}
