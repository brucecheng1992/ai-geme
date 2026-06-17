import type { GameDslArtifact, LiveEditCapabilities, PreparedDeterministicPatch, RuntimeApplyReport, RuntimePatchResult } from './workbench-api.js';

export type LiveObjectTreeNode = {
  id: string;
  label: string;
  kind: 'world' | 'player' | 'enemyType' | 'projectile' | 'wave';
  path: string;
};

export type LiveEditableField = {
  path: string;
  label: string;
  value: number | string | undefined;
  valueKind: 'number' | 'label';
  enabled: boolean;
  applyMode: 'hot' | 'warm_restart' | 'none';
  targetKind: LiveObjectTreeNode['kind'];
  aliases: string[];
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
    status:
      result.status === 'applied_hot'
        ? 'applied_hot'
        : result.status === 'applied_warm_restart'
          ? 'applied_warm_restart'
          : result.status === 'unsupported'
            ? 'unsupported'
            : 'failed_runtime_apply',
    applyMode: result.status === 'unsupported' ? 'none' : prepared.apply_mode,
    runtimeTarget: result.runtimeTarget,
    appliedPaths: result.appliedPaths,
    warnings: result.warnings,
    errors: result.errors
  };
}

export function buildLiveObjectTree(dsl: GameDslArtifact): LiveObjectTreeNode[] {
  return [
    { id: 'world', label: 'World', kind: 'world', path: '/world' },
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
  if (selectedPath === '/world') {
    return [
      field('/world/width', 'World width', dsl.world?.width, capabilities, 'world', ['world', 'game', '游戏', '世界', 'x轴', 'x axis', '横向', '宽度'])
    ];
  }

  if (selectedPath === '/player') {
    return [
      field('/player/label', 'Player concept', dsl.player.label ?? dsl.player.id, capabilities, 'player', ['player', '玩家', '玩家角色', '主角', '角色', dsl.player.id, dsl.player.label]),
      field('/player/render/scale', 'Scale', dsl.player.render?.scale, capabilities, 'player', ['player', '玩家', '主角', dsl.player.id, dsl.player.label]),
      field('/player/physics/maxSpeed', 'Max speed', dsl.player.physics?.maxSpeed, capabilities, 'player', ['player', '玩家', '主角', dsl.player.id, dsl.player.label]),
      field('/player/health/max', 'Max health', dsl.player.health?.max, capabilities, 'player', ['player', '玩家', '主角', dsl.player.id, dsl.player.label])
    ];
  }

  const enemyMatch = selectedPath.match(/^\/enemyTypes\/([^/]+)$/);
  if (enemyMatch?.[1] !== undefined) {
    const enemy = dsl.enemyTypes[enemyMatch[1]];
    return enemy === undefined
      ? []
      : [
          field(`/enemyTypes/${enemy.id}/label`, 'Enemy concept', enemy.label ?? enemy.id, capabilities, 'enemyType', [
            'enemy',
            'enemies',
            '敌人',
            '怪物',
            '敌方',
            enemy.id,
            enemy.label
          ]),
          field(`/enemyTypes/${enemy.id}/physics/speed`, 'Speed', enemy.physics?.speed, capabilities, 'enemyType', ['enemy', '敌人', '怪物', enemy.id, enemy.label]),
          field(`/enemyTypes/${enemy.id}/health/max`, 'Max health', enemy.health?.max, capabilities, 'enemyType', ['enemy', '敌人', '怪物', enemy.id, enemy.label])
        ];
  }

  const projectileMatch = selectedPath.match(/^\/projectiles\/([^/]+)$/);
  if (projectileMatch?.[1] !== undefined) {
    const projectile = dsl.projectiles[projectileMatch[1]];
    return projectile === undefined
      ? []
      : [
          field(`/projectiles/${projectile.id}/speed`, 'Speed', projectile.speed, capabilities, 'projectile', ['projectile', 'bullet', '子弹', '飞弹', '弹幕', projectile.id, projectile.label]),
          field(`/projectiles/${projectile.id}/damage`, 'Damage', projectile.damage, capabilities, 'projectile', ['projectile', 'bullet', '子弹', '飞弹', '弹幕', projectile.id, projectile.label])
        ];
  }

  const waveMatch = selectedPath.match(/^\/level\/waves\/([^/]+)$/);
  if (waveMatch?.[1] !== undefined) {
    const wave = getLevelWaves(dsl.level.waves).find((item) => item.id === waveMatch[1]);
    const enemy = wave?.enemyTypeRef === undefined ? undefined : dsl.enemyTypes[wave.enemyTypeRef];
    return wave === undefined
      ? []
      : [
          field(`/level/waves/${wave.id}/count`, 'Enemy count', wave.count, capabilities, 'wave', [
            'wave',
            'enemy',
            'enemies',
            '敌人',
            '敌人数量',
            '数量',
            '个数',
            wave.id,
            enemy?.id,
            enemy?.label
          ])
        ];
  }

  return [];
}

export function buildConversationEditableFields(dsl: GameDslArtifact, capabilities: LiveEditCapabilities): LiveEditableField[] {
  return [
    ...buildEditableFields(dsl, capabilities, '/world'),
    ...buildEditableFields(dsl, capabilities, '/player'),
    ...Object.keys(dsl.enemyTypes).flatMap((id) => buildEditableFields(dsl, capabilities, `/enemyTypes/${id}`)),
    ...Object.keys(dsl.projectiles).flatMap((id) => buildEditableFields(dsl, capabilities, `/projectiles/${id}`)),
    ...getLevelWaves(dsl.level.waves).flatMap((wave) => buildEditableFields(dsl, capabilities, `/level/waves/${wave.id}`))
  ];
}

export function isHotEditablePath(path: string, capabilities: LiveEditCapabilities): boolean {
  return capabilities.hot.some((pattern) => pattern === path || (pattern.includes('*') && matchesWildcardPath(pattern, path)));
}

export function classifyLiveEditPath(path: string, capabilities: LiveEditCapabilities): LiveEditableField['applyMode'] {
  if (isHotEditablePath(path, capabilities)) {
    return 'hot';
  }
  if (capabilities.warmRestart.some((pattern) => path === pattern || path.startsWith(`${pattern}/`) || (pattern.includes('*') && matchesWildcardPath(pattern, path)))) {
    return 'warm_restart';
  }
  return 'none';
}

export function buildReplacePrepareBody(path: string, value: number | string, intent?: string) {
  return {
    op: 'replace' as const,
    path,
    value,
    intent: intent?.trim() ? intent.trim() : `Workbench replace ${path}`
  };
}

export function buildReplacePrepareBodyForEdits(edits: Array<{ path: string; value: number | string }>, intent?: string) {
  return {
    ops: edits.map((edit) => ({ op: 'replace' as const, path: edit.path, value: edit.value })),
    intent: intent?.trim() ? intent.trim() : `Workbench replace ${edits.map((edit) => edit.path).join(', ')}`
  };
}

function field(
  path: string,
  label: string,
  value: number | string | undefined,
  capabilities: LiveEditCapabilities,
  targetKind: LiveEditableField['targetKind'],
  aliases: Array<string | undefined>
): LiveEditableField {
  const applyMode = classifyLiveEditPath(path, capabilities);
  return {
    path,
    label,
    value,
    valueKind: typeof value === 'string' || path.endsWith('/label') ? 'label' : 'number',
    enabled: applyMode !== 'none',
    applyMode,
    targetKind,
    aliases: aliases.filter(isNonEmptyString)
  };
}

function getLevelWaves(waves: GameDslArtifact['level']['waves']): Array<{ id: string; enemyTypeRef?: string; count?: number }> {
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

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
