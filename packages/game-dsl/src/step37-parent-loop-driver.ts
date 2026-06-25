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
};

export type Step37ParentLoopInput = {
  atomic_step_boundary_reached?: boolean;
  global_exit_conditions: Step37GlobalExitConditions;
  verified_human_blocker?: { required: boolean; reason: string };
  remaining_checkpoints: readonly string[];
};

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
  const globalExitConditionsMet = step37GlobalExitConditionsMet(input.global_exit_conditions);
  if (globalExitConditionsMet) {
    return {
      loop_status: 'complete',
      global_exit_conditions_met: true,
      user_input_required: false,
      next_action: 'COMPLETE_GLOBAL_LOOP',
      next_atomic_step: null
    };
  }

  if (input.verified_human_blocker?.required === true && input.verified_human_blocker.reason.trim().length > 0) {
    return {
      loop_status: 'blocked',
      global_exit_conditions_met: false,
      user_input_required: true,
      next_action: 'PAUSE_FOR_USER',
      next_atomic_step: null
    };
  }

  const nextAtomicStep = input.remaining_checkpoints.find((checkpoint) => checkpoint.trim().length > 0)?.trim() ?? null;
  if (nextAtomicStep === null) {
    throw new Error('STEP37_NEXT_ATOMIC_STEP_MISSING: global exits are unmet, no verified human blocker exists, and no remaining checkpoint was provided');
  }

  return {
    loop_status: 'running',
    global_exit_conditions_met: false,
    user_input_required: false,
    next_action: 'CONTINUE_PARENT_LOOP',
    next_atomic_step: nextAtomicStep
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
  remaining_checkpoints: readonly string[];
  verified_human_blocker?: { required: boolean; reason: string };
}): Step37ParentLoopDecision & { committed_state_valid: boolean; committed_state_issues: string[] } {
  const committedStateIssues = [
    ...(input.committed_head_sha.trim().length === 0 ? ['COMMITTED_HEAD_MISSING'] : []),
    ...(input.git_status_short.trim().length === 0 ? [] : [`WORKTREE_NOT_CLEAN status="${input.git_status_short}"`])
  ];
  const decision = decideStep37ParentLoop({
    atomic_step_boundary_reached: true,
    global_exit_conditions: input.global_exit_conditions,
    remaining_checkpoints: input.remaining_checkpoints,
    verified_human_blocker: input.verified_human_blocker
  });
  return {
    ...decision,
    committed_state_valid: committedStateIssues.length === 0,
    committed_state_issues: committedStateIssues
  };
}
