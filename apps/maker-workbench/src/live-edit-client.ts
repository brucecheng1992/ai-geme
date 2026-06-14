import type { GameDslArtifact, LiveEditCapabilities, PreparedDeterministicPatch, RuntimeApplyReport, RuntimePatchResult } from './workbench-api.js';

export type LiveObjectTreeNode = {
  id: string;
  label: string;
  kind: 'player' | 'enemyType' | 'projectile' | 'wave';
  path: string;
};

export type LiveEditableField = {
  path: string;
  label: string;
  value: number | undefined;
  enabled: boolean;
};

export function buildRuntimeApplyReportFromPatchResult(
  runId: string,
  prepared: Pick<PreparedDeterministicPatch, 'patch_id' | 'live_update_plan_ref' | 'apply_mode'>,
  result: RuntimePatchResult
): RuntimeApplyReport {
  return {
    artifactKind: 'runtime_apply_report',
    schemaVersion: 'runtime_apply_report.v1',
    runId,
    patchId: prepared.patch_id,
    liveUpdatePlanRef: prepared.live_update_plan_ref,
    status: result.status === 'applied_hot' ? 'applied_hot' : result.status === 'unsupported' ? 'unsupported' : 'failed_runtime_apply',
    applyMode: result.status === 'unsupported' ? 'none' : prepared.apply_mode,
    runtimeTarget: result.runtimeTarget,
    appliedPaths: result.appliedPaths,
    warnings: result.warnings,
    errors: result.errors
  };
}

export function buildLiveObjectTree(dsl: GameDslArtifact): LiveObjectTreeNode[] {
  return [
    { id: dsl.player.id, label: dsl.player.label ?? dsl.player.id, kind: 'player', path: '/player' },
    ...Object.values(dsl.enemyTypes).map((enemy) => ({ id: enemy.id, label: enemy.label ?? enemy.id, kind: 'enemyType' as const, path: `/enemyTypes/${enemy.id}` })),
    ...Object.values(dsl.projectiles).map((projectile) => ({
      id: projectile.id,
      label: projectile.label ?? projectile.id,
      kind: 'projectile' as const,
      path: `/projectiles/${projectile.id}`
    })),
    ...getLevelWaves(dsl.level.waves).map((wave) => ({ id: wave.id, label: wave.id, kind: 'wave' as const, path: `/level/waves/${wave.id}` }))
  ];
}

export function buildEditableFields(dsl: GameDslArtifact, capabilities: LiveEditCapabilities, selectedPath: string): LiveEditableField[] {
  if (selectedPath === '/player') {
    return [
      field('/player/render/scale', 'Scale', dsl.player.render?.scale, capabilities),
      field('/player/physics/maxSpeed', 'Max speed', dsl.player.physics?.maxSpeed, capabilities),
      field('/player/health/max', 'Max health', dsl.player.health?.max, capabilities)
    ];
  }

  const enemyMatch = selectedPath.match(/^\/enemyTypes\/([^/]+)$/);
  if (enemyMatch?.[1] !== undefined) {
    const enemy = dsl.enemyTypes[enemyMatch[1]];
    return enemy === undefined
      ? []
      : [
          field(`/enemyTypes/${enemy.id}/physics/speed`, 'Speed', enemy.physics?.speed, capabilities),
          field(`/enemyTypes/${enemy.id}/health/max`, 'Max health', enemy.health?.max, capabilities)
        ];
  }

  const projectileMatch = selectedPath.match(/^\/projectiles\/([^/]+)$/);
  if (projectileMatch?.[1] !== undefined) {
    const projectile = dsl.projectiles[projectileMatch[1]];
    return projectile === undefined
      ? []
      : [
          field(`/projectiles/${projectile.id}/speed`, 'Speed', projectile.speed, capabilities),
          field(`/projectiles/${projectile.id}/damage`, 'Damage', projectile.damage, capabilities)
        ];
  }

  return [];
}

export function isHotEditablePath(path: string, capabilities: LiveEditCapabilities): boolean {
  return capabilities.hot.some((pattern) => pattern === path || (pattern.includes('*') && matchesWildcardPath(pattern, path)));
}

export function buildReplacePrepareBody(path: string, value: number) {
  return {
    op: 'replace' as const,
    path,
    value,
    intent: `Workbench replace ${path}`
  };
}

function field(path: string, label: string, value: number | undefined, capabilities: LiveEditCapabilities): LiveEditableField {
  return { path, label, value, enabled: isHotEditablePath(path, capabilities) };
}

function getLevelWaves(waves: GameDslArtifact['level']['waves']): Array<{ id: string }> {
  if (waves === undefined) {
    return [];
  }

  return Array.isArray(waves) ? waves : Object.values(waves);
}

function matchesWildcardPath(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  return patternParts.length === pathParts.length && patternParts.every((part, index) => part === '*' || part === pathParts[index]);
}
