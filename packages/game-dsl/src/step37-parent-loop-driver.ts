import { z } from 'zod';

export const STEP37_PARENT_LOOP_ACTIONS = ['CONTINUE_PARENT_LOOP', 'PAUSE_FOR_USER', 'COMPLETE_GLOBAL_LOOP'] as const;
export const STEP37_PARENT_LOOP_STATUSES = ['running', 'complete', 'blocked'] as const;

export type Step37ParentLoopAction = (typeof STEP37_PARENT_LOOP_ACTIONS)[number];
export type Step37ParentLoopStatus = (typeof STEP37_PARENT_LOOP_STATUSES)[number];

export type Step37GlobalExitConditions = {
  schema_expressible: boolean;
  normalized: boolean;
  compiled: boolean;
  runtime_consumed: boolean;
  qa_observed: boolean;
  completeSupported: boolean;
  production_default_cutover_active: boolean;
  legacy_authoritative_path_exited: boolean;
  final_oracle_no_blocking_findings: boolean;
  final_closure_not_blocked: boolean;
  workspace_documentation_reconciled: boolean;
};

export type Step37ParentLoopDecision = {
  loop_status: Step37ParentLoopStatus;
  global_exit_conditions_met: boolean;
  user_input_required: boolean;
  next_action: Step37ParentLoopAction;
  next_atomic_step: string | null;
  next_checkpoint: Step37NextAtomicCheckpoint | null;
};

export type Step37CheckpointInventoryItem = {
  checkpoint_id: string;
  parent_stage_id: string;
  next_atomic_step: string;
  status: 'unmet' | 'complete';
  unmet_reason: string;
  source_plan_revision: string;
};

export type Step37NextAtomicCheckpoint = {
  checkpoint_id: string;
  parent_stage_id: string;
  next_atomic_step: string;
  unmet_reason: string;
  selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory';
  source_plan_revision: string;
};

export type Step37ParentLoopDecisionFailure = {
  error_code: 'NEXT_ATOMIC_STEP_REQUIRED' | 'STATE_RECOVERY_REQUIRED';
  global_exit_conditions_met: boolean;
  user_input_required: boolean;
  parent_stage_status: 'running' | 'complete';
  message: string;
};

export type Step37ParentLoopInput = {
  atomic_step_boundary_reached?: boolean;
  parent_stage_status?: 'running' | 'complete';
  global_exit_conditions: Step37GlobalExitConditions;
  verified_human_blocker?: { required: boolean; reason: string };
  checkpoint_inventory: readonly Step37CheckpointInventoryItem[];
};

export type Step37ParentLoopEvaluation =
  | { ok: true; decision: Step37ParentLoopDecision }
  | { ok: false; failure: Step37ParentLoopDecisionFailure };

export class Step37ParentLoopDecisionError extends Error {
  readonly failure: Step37ParentLoopDecisionFailure;

  constructor(failure: Step37ParentLoopDecisionFailure) {
    super(failure.message);
    this.name = 'Step37ParentLoopDecisionError';
    this.failure = failure;
  }
}

/**
 * Scoped closure records prevent an atomic-step receipt from being mistaken for
 * parent-stage or Step37 global completion.
 */
export const Step37ScopedClosureRecordSchema = z.strictObject({
  closure_scope: z.literal('atomic_step'),
  atomic_step_boundary_reached: z.boolean(),
  atomic_step_status: z.enum(['implementing', 'validating', 'closed', 'blocked']),
  atomic_step: z.strictObject({
    id: z.string().min(1),
    status: z.enum(['implementing', 'validating', 'closed', 'blocked']),
    candidate_commit: z.string().min(1).nullable(),
    receipt_commit: z.string().min(1).nullable(),
    oracle_status: z.enum(['not_submitted', 'pending', 'approved', 'changes_required', 'blocked'])
  }),
  parent_stage: z.strictObject({
    id: z.string().min(1),
    status: z.enum(['running', 'complete']),
    exit_conditions_met: z.boolean()
  }),
  parent_loop: z.strictObject({
    id: z.literal('step37'),
    status: z.enum(STEP37_PARENT_LOOP_STATUSES),
    global_exit_conditions_met: z.boolean(),
    user_input_required: z.boolean(),
    next_action: z.enum(STEP37_PARENT_LOOP_ACTIONS),
    next_atomic_step: z.string().nullable()
  })
});

export type Step37ScopedClosureRecord = z.infer<typeof Step37ScopedClosureRecordSchema>;

export function step37GlobalExitConditionsMet(conditions: Step37GlobalExitConditions): boolean {
  return Object.values(conditions).every((value) => value === true);
}

/**
 * Re-evaluates Step37 after any atomic closure. Atomic closure never stops the
 * parent loop; it either proves global completion, records a verified human
 * blocker, or returns the next unmet checkpoint.
 */
export function decideStep37ParentLoop(input: Step37ParentLoopInput): Step37ParentLoopDecision {
  const evaluation = evaluateStep37ParentLoop(input);
  if (!evaluation.ok) {
    throw new Step37ParentLoopDecisionError(evaluation.failure);
  }
  return evaluation.decision;
}

export function evaluateStep37ParentLoop(input: Step37ParentLoopInput): Step37ParentLoopEvaluation {
  const globalExitConditionsMet = step37GlobalExitConditionsMet(input.global_exit_conditions);
  if (globalExitConditionsMet) {
    return {
      ok: true,
      decision: {
        loop_status: 'complete',
        global_exit_conditions_met: true,
        user_input_required: false,
        next_action: 'COMPLETE_GLOBAL_LOOP',
        next_atomic_step: null,
        next_checkpoint: null
      }
    };
  }

  if (input.verified_human_blocker?.required === true && input.verified_human_blocker.reason.trim().length > 0) {
    return {
      ok: true,
      decision: {
        loop_status: 'blocked',
        global_exit_conditions_met: false,
        user_input_required: true,
        next_action: 'PAUSE_FOR_USER',
        next_atomic_step: null,
        next_checkpoint: null
      }
    };
  }

  const nextCheckpoint = selectNextAtomicCheckpoint(input.checkpoint_inventory);
  if (nextCheckpoint === null) {
    return {
      ok: false,
      failure: {
        error_code: 'NEXT_ATOMIC_STEP_REQUIRED',
        global_exit_conditions_met: false,
        user_input_required: false,
        parent_stage_status: input.parent_stage_status ?? 'running',
        message: 'NEXT_ATOMIC_STEP_REQUIRED: global exits are unmet, no verified human blocker exists, and authoritative checkpoint inventory has no unmet executable checkpoint'
      }
    };
  }

  return {
    ok: true,
    decision: {
      loop_status: 'running',
      global_exit_conditions_met: false,
      user_input_required: false,
      next_action: 'CONTINUE_PARENT_LOOP',
      next_atomic_step: nextCheckpoint.next_atomic_step,
      next_checkpoint: nextCheckpoint
    }
  };
}

export function selectNextAtomicCheckpoint(inventory: readonly Step37CheckpointInventoryItem[]): Step37NextAtomicCheckpoint | null {
  const checkpoint = inventory.find(
    (item) =>
      item.status === 'unmet' &&
      item.checkpoint_id.trim().length > 0 &&
      item.parent_stage_id.trim().length > 0 &&
      item.next_atomic_step.trim().length > 0 &&
      item.unmet_reason.trim().length > 0 &&
      item.source_plan_revision.trim().length > 0
  );
  if (!checkpoint) {
    return null;
  }

  return {
    checkpoint_id: checkpoint.checkpoint_id.trim(),
    parent_stage_id: checkpoint.parent_stage_id.trim(),
    next_atomic_step: checkpoint.next_atomic_step.trim(),
    unmet_reason: checkpoint.unmet_reason.trim(),
    selection_rule: 'first_unmet_checkpoint_in_authoritative_inventory',
    source_plan_revision: checkpoint.source_plan_revision.trim()
  };
}

/**
 * Validates the double-layer closure envelope produced when an atomic step is
 * closed and the parent Step37 loop is re-evaluated.
 */
export function validateStep37ScopedClosureRecord(record: unknown): string[] {
  const parsed = Step37ScopedClosureRecordSchema.safeParse(record);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `SCHEMA_INVALID path="${issue.path.join('.')}" message="${issue.message}"`);
  }

  const closure = parsed.data;
  const issues: string[] = [];
  const loop = closure.parent_loop;
  if (closure.atomic_step_boundary_reached && closure.atomic_step_status === 'closed' && loop.status === 'complete' && !loop.global_exit_conditions_met) {
    issues.push('ATOMIC_CLOSURE_CANNOT_COMPLETE_PARENT_LOOP actual="atomic_step_status:closed,parent_loop.status:complete" expected="parent_loop reevaluation"');
  }
  if (loop.status === 'running' && loop.next_action !== 'CONTINUE_PARENT_LOOP') {
    issues.push(`RUNNING_LOOP_ACTION_INVALID actual="${loop.next_action}" expected="CONTINUE_PARENT_LOOP"`);
  }
  if (loop.status === 'running' && (loop.next_atomic_step === null || loop.next_atomic_step.trim().length === 0)) {
    issues.push('RUNNING_LOOP_NEXT_STEP_MISSING actual="<empty>" expected="next_atomic_step"');
  }
  if (!loop.global_exit_conditions_met && loop.next_action === 'COMPLETE_GLOBAL_LOOP') {
    issues.push('GLOBAL_COMPLETE_WITH_UNMET_EXIT_CONDITIONS actual="global_exit_conditions_met:false,next_action:COMPLETE_GLOBAL_LOOP" expected="CONTINUE_PARENT_LOOP|PAUSE_FOR_USER"');
  }
  if (!loop.user_input_required && loop.next_action === 'PAUSE_FOR_USER') {
    issues.push('PAUSE_WITHOUT_USER_BLOCKER actual="user_input_required:false,next_action:PAUSE_FOR_USER" expected="CONTINUE_PARENT_LOOP|COMPLETE_GLOBAL_LOOP"');
  }
  if (loop.next_action === 'COMPLETE_GLOBAL_LOOP' && loop.status !== 'complete') {
    issues.push(`GLOBAL_COMPLETE_STATUS_INVALID actual="${loop.status}" expected="complete"`);
  }
  if (loop.next_action === 'PAUSE_FOR_USER' && loop.status !== 'blocked') {
    issues.push(`PAUSE_STATUS_INVALID actual="${loop.status}" expected="blocked"`);
  }
  if (closure.parent_stage.exit_conditions_met === false && loop.next_action === 'COMPLETE_GLOBAL_LOOP') {
    issues.push('PARENT_STAGE_INCOMPLETE_GLOBAL_COMPLETE actual="parent_stage.exit_conditions_met:false" expected="non-global completion action"');
  }
  return issues;
}

/**
 * Rejects unscoped closure prose when Step37 global exit conditions are still
 * unmet.
 */
export function validateStep37ClosureTextBoundary(input: { text: string; global_exit_conditions_met: boolean }): string[] {
  if (input.global_exit_conditions_met) {
    return [];
  }

  const markers = [
    { label: 'stop marker', pattern: /^\s*stop marker\s*:/im },
    { label: 'task finished', pattern: /\btask finished\b/i },
    { label: 'completed', pattern: /^\s*completed\s*$/im },
    { label: 'closed', pattern: /^\s*closed\s*$/im }
  ];
  return markers
    .filter((marker) => marker.pattern.test(input.text))
    .map((marker) => `UNSCOPED_COMPLETION_MARKER marker="${marker.label}" global_exit_conditions_met="false"`);
}

/**
 * Rebuilds parent-loop state from committed repository facts after compaction,
 * resume, or a new session.
 */
export function rebuildStep37ParentLoopFromCommittedState(input: {
  committed_head_sha: string;
  git_status_short: string;
  global_exit_conditions: Step37GlobalExitConditions;
  checkpoint_inventory: readonly Step37CheckpointInventoryItem[];
  verified_human_blocker?: { required: boolean; reason: string };
}): (Step37ParentLoopDecision & { committed_state_valid: boolean; committed_state_issues: string[] }) | { committed_state_valid: false; committed_state_issues: string[]; failure: Step37ParentLoopDecisionFailure } {
  const committedStateIssues = [
    ...(input.committed_head_sha.trim().length === 0 ? ['COMMITTED_HEAD_MISSING'] : []),
    ...(input.git_status_short.trim().length === 0 ? [] : [`WORKTREE_NOT_CLEAN status="${input.git_status_short}"`])
  ];
  const evaluation = evaluateStep37ParentLoop({
    atomic_step_boundary_reached: true,
    global_exit_conditions: input.global_exit_conditions,
    checkpoint_inventory: input.checkpoint_inventory,
    verified_human_blocker: input.verified_human_blocker
  });
  if (!evaluation.ok) {
    return {
      committed_state_valid: false,
      committed_state_issues: [...committedStateIssues, 'STATE_RECOVERY_NEXT_ATOMIC_STEP_MISSING'],
      failure: { ...evaluation.failure, error_code: 'STATE_RECOVERY_REQUIRED' }
    };
  }
  return {
    ...evaluation.decision,
    committed_state_valid: committedStateIssues.length === 0,
    committed_state_issues: committedStateIssues
  };
}
