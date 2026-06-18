import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { SceneIrSchema, type SceneIr } from '../../../../packages/game-dsl/src/index.js';

const RuntimeSceneBindingKindSchema = z.enum(['background', 'platform', 'player', 'enemy', 'goal']);
const RuntimeSceneBindingStatusSchema = z.enum(['bound', 'unbound']);

const RuntimeSceneBindingSchema = z.strictObject({
  kind: RuntimeSceneBindingKindSchema,
  sceneRuntimeId: z.string().min(1),
  runtimeInstanceId: z.string().min(1).nullable(),
  source: z.enum(['dsl', 'runtime_plan', 'system']),
  sourceDslPath: z.string().regex(/^\//).optional(),
  status: RuntimeSceneBindingStatusSchema,
  reason: z.string().min(1).optional()
});

export const RuntimeSceneBindingReportSchema = z.strictObject({
  reportVersion: z.literal('runtime-scene-binding-report.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  runtimeProfile: z.literal('side_scrolling_run_and_gun.v1'),
  status: z.enum(['pass', 'fail']),
  sourceArtifacts: z.strictObject({
    sceneIr: z.literal('game.scene.ir.json'),
    generatedSceneIr: z.literal('side_scrolling_run_and_gun/src/scene-ir.generated.json'),
    runtimePlan: z.literal('side_scrolling_run_and_gun/src/runtime-plan.generated.json')
  }),
  summary: z.strictObject({
    backgroundCount: z.number().int().min(0),
    platformCount: z.number().int().min(0),
    enemyInstanceCount: z.number().int().min(0),
    goalCount: z.number().int().min(0),
    boundCount: z.number().int().min(0),
    unboundCount: z.number().int().min(0)
  }),
  bindings: z.array(RuntimeSceneBindingSchema)
});

export type RuntimeSceneBindingReport = z.infer<typeof RuntimeSceneBindingReportSchema>;
type RuntimeSceneBinding = z.infer<typeof RuntimeSceneBindingSchema>;
type RuntimeSceneBindingKind = z.infer<typeof RuntimeSceneBindingKindSchema>;

export function buildRuntimeSceneBindingReport(input: { projectId: string; runId: string; sceneIr: SceneIr }): RuntimeSceneBindingReport {
  const sceneIr = SceneIrSchema.parse(input.sceneIr);
  const bindings = expectedBindings(sceneIr).map((row) => ({
    ...row,
    runtimeInstanceId: null,
    status: 'unbound' as const,
    reason: row.reason ?? 'runtime_observation_pending'
  }));

  return parseReport(input.projectId, input.runId, sceneIr, bindings);
}

export function buildRuntimeObservedSceneBindingReport(input: { projectId: string; runId: string; sceneIr: SceneIr; snapshot: unknown }): RuntimeSceneBindingReport {
  const sceneIr = SceneIrSchema.parse(input.sceneIr);
  const observedBindings = readObservedBindings(input.snapshot);
  const bindings = expectedBindings(sceneIr).map((expected) => {
    if (expected.status === 'unbound') {
      return expected;
    }
    const observed = observedBindings.find(
      (candidate) =>
        candidate.kind === expected.kind &&
        candidate.sceneRuntimeId === expected.sceneRuntimeId &&
        candidate.runtimeInstanceId === expected.sceneRuntimeId &&
        candidate.status === 'bound'
    );

    return observed === undefined
      ? { ...expected, runtimeInstanceId: null, status: 'unbound' as const, reason: 'runtime_binding_not_observed' }
      : { ...expected, runtimeInstanceId: observed.runtimeInstanceId, status: 'bound' as const };
  });

  return parseReport(input.projectId, input.runId, sceneIr, bindings);
}

export async function writeRuntimeSceneBindingReport(input: { outputDir: string; report: RuntimeSceneBindingReport }): Promise<void> {
  await writeFile(join(input.outputDir, 'runtime_scene_binding_report.json'), `${JSON.stringify(RuntimeSceneBindingReportSchema.parse(input.report), null, 2)}\n`, 'utf8');
}

function parseReport(projectId: string, runId: string, sceneIr: SceneIr, bindings: RuntimeSceneBinding[]): RuntimeSceneBindingReport {
  const scene = sceneIr.scenes[0];
  const unboundCount = bindings.filter((row) => row.status === 'unbound').length;
  return RuntimeSceneBindingReportSchema.parse({
    reportVersion: 'runtime-scene-binding-report.v1',
    projectId,
    runId,
    runtimeProfile: 'side_scrolling_run_and_gun.v1',
    status: unboundCount === 0 ? 'pass' : 'fail',
    sourceArtifacts: {
      sceneIr: 'game.scene.ir.json',
      generatedSceneIr: 'side_scrolling_run_and_gun/src/scene-ir.generated.json',
      runtimePlan: 'side_scrolling_run_and_gun/src/runtime-plan.generated.json'
    },
    summary: {
      backgroundCount: scene.backgrounds.length,
      platformCount: scene.platforms.length,
      enemyInstanceCount: scene.enemyInstances.length,
      goalCount: scene.goals.length,
      boundCount: bindings.length - unboundCount,
      unboundCount
    },
    bindings
  });
}

function expectedBindings(sceneIr: SceneIr): RuntimeSceneBinding[] {
  const scene = sceneIr.scenes[0];
  return [
    ...scene.backgrounds.map((background) => binding(sceneIr, 'background', background.runtimeId, background.runtimeId, background.provenanceRef)),
    ...scene.platforms.map((platform) => binding(sceneIr, 'platform', platform.runtimeId, platform.runtimeId, platform.provenanceRef)),
    binding(sceneIr, 'player', scene.player.runtimeId, scene.player.runtimeId, scene.player.provenanceRef),
    ...scene.enemyInstances.map((enemy) => binding(sceneIr, 'enemy', enemy.runtimeId, enemy.runtimeId, enemy.provenanceRef)),
    ...scene.goals.map((goal) => {
      const supported = goal.kind === 'reach' || goal.kind === 'enemy_cleared';
      return binding(
        sceneIr,
        'goal',
        goal.runtimeId,
        supported ? goal.runtimeId : null,
        goal.provenanceRef,
        supported ? 'bound' : 'unbound',
        supported ? undefined : 'unsupported_goal_kind'
      );
    })
  ];
}

function binding(
  sceneIr: SceneIr,
  kind: RuntimeSceneBindingKind,
  sceneRuntimeId: string,
  runtimeInstanceId: string | null,
  provenanceRef: string
): RuntimeSceneBinding;
function binding(
  sceneIr: SceneIr,
  kind: RuntimeSceneBindingKind,
  sceneRuntimeId: string,
  runtimeInstanceId: string | null,
  provenanceRef: string,
  status: RuntimeSceneBinding['status'],
  reason?: string
): RuntimeSceneBinding;
function binding(
  sceneIr: SceneIr,
  kind: RuntimeSceneBindingKind,
  sceneRuntimeId: string,
  runtimeInstanceId: string | null,
  provenanceRef: string,
  status: RuntimeSceneBinding['status'] = 'bound',
  reason?: string
): RuntimeSceneBinding {
  const provenance = sceneIr.provenance[provenanceRef] ?? sceneIr.provenance[sceneRuntimeId];
  return {
    kind,
    sceneRuntimeId,
    runtimeInstanceId,
    source: provenance?.source ?? 'system',
    ...(provenance?.dslPath === undefined ? {} : { sourceDslPath: provenance.dslPath }),
    status,
    ...(reason === undefined ? {} : { reason })
  };
}

function readObservedBindings(snapshot: unknown): RuntimeSceneBinding[] {
  if (snapshot === null || typeof snapshot !== 'object' || !('sceneBindings' in snapshot)) {
    return [];
  }
  const sceneBindings = (snapshot as { sceneBindings?: unknown }).sceneBindings;
  if (sceneBindings === null || typeof sceneBindings !== 'object' || !('bindings' in sceneBindings) || !Array.isArray((sceneBindings as { bindings?: unknown }).bindings)) {
    return [];
  }

  return (sceneBindings as { bindings: unknown[] }).bindings.flatMap((value) => {
    const result = RuntimeSceneBindingSchema.safeParse(value);
    return result.success ? [result.data] : [];
  });
}
