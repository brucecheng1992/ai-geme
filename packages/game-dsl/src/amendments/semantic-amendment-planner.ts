import {
  describeRuntimeGenreCapability,
  findRuntimeGenreCapability,
  isRuntimeGenreExecutable
} from '../runtime-capabilities.js';
import { GameDslArtifactSchema, type GameDslArtifact } from '../artifact-contract.js';
import type { RuntimeCapabilityReport } from '../live-edit.js';
import {
  AmendmentContextPackSchema,
  SemanticEditProposalSchema,
  type AmendmentContextPack,
  type GameDesignDelta,
  type GameDomain,
  type GameOperation,
  type SemanticAmendmentDraftPatch,
  type SemanticAmendmentExecutionMode,
  type SemanticEditProposal
} from './semantic-amendment-schema.js';

export type BuildAmendmentContextPackInput = {
  projectId: string;
  runId: string;
  currentBrief?: unknown;
  currentDsl?: GameDslArtifact;
  runtimeCapabilityReport?: RuntimeCapabilityReport;
  pipelineArtifactIndex?: unknown;
  generatorCapabilities?: string[];
};

export type PlanSemanticAmendmentInput = {
  projectId: string;
  runId: string;
  text: string;
  language?: 'zh' | 'en';
  context: AmendmentContextPack;
  now?: () => Date;
  createProposalId?: () => string;
};

type UnderstandingDraft = {
  understood: boolean;
  confidence: number;
  summary: string;
  affectedDomains: GameDomain[];
  designDeltas: GameDesignDelta[];
  operations: GameOperation[];
  clarificationQuestion?: string;
  rejectedUnsafeFallbacks: string[];
  missingCapabilities: string[];
};

type DraftPatchBuildResult =
  | { ok: true; patch: SemanticAmendmentDraftPatch }
  | { ok: false; missingCapabilities: string[] };

const DEFAULT_GENERATOR_CAPABILITIES = ['candidate_brief', 'candidate_dsl', 'candidate_run', 'candidate_theme_player'];
const DEFAULT_RUNTIME_TEMPLATES = ['phaser/top_down_shooter.v1', 'phaser/dodger_collector.v1', 'phaser/side_scrolling_run_and_gun.v1'];

export function buildAmendmentContextPack(input: BuildAmendmentContextPackInput): AmendmentContextPack {
  const runtimeCapabilityReport = input.runtimeCapabilityReport;
  const liveEditCapabilities = runtimeCapabilityReport?.liveEditCapabilities;
  return AmendmentContextPackSchema.parse({
    projectId: input.projectId,
    runId: input.runId,
    ...(input.currentBrief === undefined ? {} : { currentBrief: input.currentBrief }),
    ...(input.currentDsl === undefined ? {} : { currentDsl: input.currentDsl }),
    ...(runtimeCapabilityReport === undefined ? {} : { runtimeCapabilityReport }),
    ...(input.pipelineArtifactIndex === undefined ? {} : { pipelineArtifactIndex: input.pipelineArtifactIndex }),
    ...(input.currentDsl === undefined
      ? {}
      : {
          intentPlan: {
            normalizedGenre: input.currentDsl.genre,
            matchedAlias: input.currentDsl.intentPlanRef.matchedAlias,
            runtimeDslSupport: runtimeCapabilityReport?.status === 'supported' ? 'supported' : 'unsupported'
          },
          activeGenre: input.currentDsl.genre
        }),
    hotPatchCapabilities: liveEditCapabilities?.hot ?? [],
    dslPatchCapabilities: [...(liveEditCapabilities?.warmRestart ?? []), ...(liveEditCapabilities?.assetSwap ?? [])],
    generatorCapabilities: input.generatorCapabilities ?? DEFAULT_GENERATOR_CAPABILITIES,
    runtimeTemplates: runtimeCapabilityReport?.runtimeTemplateId === undefined ? DEFAULT_RUNTIME_TEMPLATES : [runtimeCapabilityReport.runtimeTemplateId],
    preview: {
      available: runtimeCapabilityReport?.status === 'supported',
      lastQaStatus: 'unknown'
    },
    ...(runtimeCapabilityReport?.runtimeTemplateId === undefined ? {} : { activeRuntimeTemplate: runtimeCapabilityReport.runtimeTemplateId })
  });
}

export function planSemanticAmendment(input: PlanSemanticAmendmentInput): SemanticEditProposal {
  const sourceText = input.text.trim();
  const language = input.language ?? detectLanguage(sourceText);
  const createdAt = (input.now ?? (() => new Date()))().toISOString();
  const proposalId = input.createProposalId?.() ?? `amend_${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const draft = understandSemanticAmendment(sourceText);
  const draftPatchResult = buildDraftPatch(draft.designDeltas, input.context);
  const dslPatch = draftPatchResult.ok ? draftPatchResult.patch : undefined;
  const execution = routeAmendment({
    draft,
    dslPatch,
    draftPatchMissingCapabilities: draftPatchResult.ok ? [] : draftPatchResult.missingCapabilities,
    context: input.context
  });
  const candidate = buildCandidatePreview({ draft, dslPatch, mode: execution.mode, sourceText });

  return SemanticEditProposalSchema.parse({
    id: proposalId,
    projectId: input.projectId,
    runId: input.runId,
    createdAt,
    sourceText,
    language,
    understanding: {
      understood: draft.understood,
      confidence: draft.confidence,
      summary: draft.summary,
      affectedDomains: draft.affectedDomains,
      designDeltas: draft.designDeltas,
      operations: draft.operations,
      ...(draft.clarificationQuestion === undefined ? {} : { clarificationQuestion: draft.clarificationQuestion })
    },
    execution,
    ...(candidate === undefined ? {} : { candidate }),
    reviewState: 'proposed',
    userMessage: userMessageForExecution(execution.mode, draft.summary, execution.missingCapabilities)
  });
}

function understandSemanticAmendment(sourceText: string): UnderstandingDraft {
  const normalized = normalizeText(sourceText);
  if (normalized.length === 0) {
    return clarification('修改内容为空，请描述你想改变的游戏体验。');
  }
  if (looksTooVague(normalized)) {
    return clarification('修改目标不够明确：请优先选择更快、更难、更爽、更公平、画面反馈更强或敌人更有压迫感。');
  }
  if (mentionsBossIntroFeedback(normalized)) {
    return {
      understood: true,
      confidence: 0.88,
      summary: 'Boss 登场时触发屏幕震动和警告反馈',
      affectedDomains: ['boss', 'camera', 'audio', 'ui'],
      designDeltas: [
        { kind: 'add_mechanic', mechanic: 'boss', description: '需要 Boss lifecycle event。' },
        { kind: 'add_feedback', event: 'boss_intro', feedback: 'screen_shake', description: 'Boss 登场时屏幕震动。' },
        { kind: 'add_feedback', event: 'boss_intro', feedback: 'audio_cue', description: 'Boss 登场时播放警告音。' }
      ],
      operations: [
        {
          kind: 'event_action',
          event: 'boss_intro',
          actions: [
            { kind: 'camera_shake', intensity: 0.7, durationMs: 450 },
            { kind: 'play_audio', audioEvent: 'warning' },
            { kind: 'show_ui_warning', message: 'WARNING', durationMs: 1600 }
          ]
        }
      ],
      rejectedUnsafeFallbacks: ['enemy.count', 'enemy.speed', 'projectile.damage'],
      missingCapabilities: ['boss_lifecycle_event', 'camera_shake_runtime_effect', 'warning_audio_event_binding']
    };
  }
  if (mentionsWeaponDrop(normalized)) {
    return {
      understood: true,
      confidence: 0.84,
      summary: '敌人被击败后掉落武器升级',
      affectedDomains: ['enemy', 'pickup', 'weapon'],
      designDeltas: [{ kind: 'add_mechanic', mechanic: 'weapon_upgrade', description: '击败敌人后生成武器升级 pickup。' }],
      operations: [
        {
          kind: 'event_action',
          event: 'enemy_defeated',
          conditions: [{ kind: 'random_chance', value: 0.25 }],
          actions: [{ kind: 'spawn_pickup', pickup: 'weapon_upgrade' }]
        }
      ],
      rejectedUnsafeFallbacks: ['enemy.count', 'projectile.damage'],
      missingCapabilities: ['enemy_defeated_drop_rule', 'weapon_pickup_runtime_behavior']
    };
  }
  if (mentionsBoss(normalized)) {
    return {
      understood: true,
      confidence: 0.78,
      summary: '加入关底 Boss 战',
      affectedDomains: ['boss', 'enemy', 'level'],
      designDeltas: [{ kind: 'add_mechanic', mechanic: 'boss', description: '新增一个关底 Boss encounter。' }],
      operations: [{ kind: 'behavior_change', target: 'level.final_encounter', behavior: 'add_boss', parameters: { phases: 2 } }],
      rejectedUnsafeFallbacks: ['enemy.count'],
      missingCapabilities: ['boss_runtime_behavior', 'boss_qa_profile']
    };
  }
  if (mentionsCatPlayerTheme(normalized)) {
    return {
      understood: true,
      confidence: 0.9,
      summary: '把玩家角色改成小猫主题',
      affectedDomains: ['player', 'theme'],
      designDeltas: [{ kind: 'reskin_or_theme', target: 'player', themeDescription: '小猫玩家角色，保持当前玩法不变。' }],
      operations: [{ kind: 'theme_regeneration', target: 'player', themePrompt: 'cat player character; preserve gameplay loop' }],
      rejectedUnsafeFallbacks: ['player.scale'],
      missingCapabilities: []
    };
  }
  if (mentionsRunAndGun(normalized)) {
    return {
      understood: true,
      confidence: 0.86,
      summary: '切换为高速横版跑枪方向',
      affectedDomains: ['genre', 'pacing', 'enemy', 'weapon'],
      designDeltas: [
        { kind: 'change_genre_or_perspective', targetGenre: 'side_scrolling_run_and_gun', description: '切换为通用高速横版跑枪，不保留受保护 IP 名称。' },
        buildPacingDelta('more_arcade')
      ],
      operations: [{ kind: 'behavior_change', target: 'genre', behavior: 'change_to_side_scrolling_run_and_gun', parameters: { preserveProtectedNames: false } }],
      rejectedUnsafeFallbacks: ['top_down_shooter downgrade'],
      missingCapabilities: []
    };
  }
  if (mentionsWeaponFireRate(normalized)) {
    return tuneStat('提高玩家主武器射速', 'weapon', 'player.primaryWeapon', 'fireRate', 'increase', 'moderate', ['weapon'], ['projectile.speed', 'projectile.damage']);
  }
  if (mentionsProjectileSpeed(normalized)) {
    return tuneStat('提高子弹速度', 'projectile', undefined, 'speed', 'increase', 'moderate', ['projectile'], ['weapon.fireRate']);
  }
  if (mentionsProjectileDamage(normalized)) {
    return tuneStat('提高子弹伤害', 'projectile', undefined, 'damage', 'increase', 'moderate', ['projectile'], ['weapon.fireRate']);
  }
  if (mentionsPlayerSpeed(normalized)) {
    return tuneStat('提高玩家移动速度', 'player', undefined, 'speed', 'increase', 'moderate', ['player'], []);
  }
  if (mentionsPlayerHealth(normalized)) {
    return tuneStat('提高玩家生命值', 'player', undefined, 'health', 'increase', 'moderate', ['player'], []);
  }
  if (mentionsEnemySpeed(normalized)) {
    return tuneStat('提高敌人移动速度', 'enemy', undefined, 'speed', 'increase', 'moderate', ['enemy'], []);
  }
  if (mentionsEnemyHealth(normalized)) {
    return tuneStat('提高敌人生命值', 'enemy', undefined, 'health', 'increase', 'moderate', ['enemy'], []);
  }
  if (mentionsEnemyCount(normalized)) {
    return tuneStat('增加敌人数量', 'enemy', undefined, 'count', 'increase', 'moderate', ['enemy', 'level'], []);
  }
  if (mentionsHarderPacing(normalized)) {
    const delta = buildPacingDelta(normalized.includes('arcade') || normalized.includes('街机') || normalized.includes('爽') ? 'more_arcade' : 'harder');
    return {
      understood: true,
      confidence: 0.74,
      summary: '提高游戏节奏和战斗压力',
      affectedDomains: ['difficulty', 'pacing', 'enemy', 'projectile'],
      designDeltas: [delta],
      operations: delta.inferredDeltas.map(deltaToOperation),
      rejectedUnsafeFallbacks: [],
      missingCapabilities: []
    };
  }

  return {
    understood: true,
    confidence: 0.42,
    summary: '开放式游戏修改请求',
    affectedDomains: ['rules'],
    designDeltas: [{ kind: 'open_design_request', description: sourceText, inferredGoals: [] }],
    operations: [],
    clarificationQuestion: '请补充你想优先改变的对象、节奏、反馈、玩法或主题。',
    rejectedUnsafeFallbacks: [],
    missingCapabilities: []
  };
}

function tuneStat(
  summary: string,
  targetDomain: 'player' | 'enemy' | 'projectile' | 'weapon' | 'world' | 'boss' | 'pickup',
  targetRef: string | undefined,
  stat: string,
  direction: 'increase' | 'decrease' | 'set',
  amount: 'small' | 'moderate' | 'large',
  affectedDomains: GameDomain[],
  rejectedUnsafeFallbacks: string[]
): UnderstandingDraft {
  const delta: GameDesignDelta = { kind: 'tune_stat', targetDomain, stat, direction, amount, ...(targetRef === undefined ? {} : { targetRef }) };
  return {
    understood: true,
    confidence: 0.86,
    summary,
    affectedDomains,
    designDeltas: [delta],
    operations: [deltaToOperation(delta)],
    rejectedUnsafeFallbacks,
    missingCapabilities: []
  };
}

function buildPacingDelta(direction: 'harder' | 'more_arcade'): GameDesignDelta & { kind: 'modify_pacing' } {
  return {
    kind: 'modify_pacing',
    direction,
    description: direction === 'more_arcade' ? '让战斗更街机、更爽快，同时保持公平。' : '提高战斗压力，同时保持公平。',
    inferredDeltas: [
      { kind: 'tune_stat', targetDomain: 'enemy', stat: 'count', direction: 'increase', amount: 'moderate' },
      { kind: 'tune_stat', targetDomain: 'enemy', stat: 'speed', direction: 'increase', amount: 'small' },
      { kind: 'tune_stat', targetDomain: 'projectile', stat: 'speed', direction: 'increase', amount: 'small' }
    ]
  };
}

function deltaToOperation(delta: GameDesignDelta): GameOperation {
  if (delta.kind === 'tune_stat') {
    return {
      kind: 'stat_tuning',
      target: delta.targetRef ?? delta.targetDomain,
      stat: delta.stat,
      change: { direction: delta.direction, amount: delta.amount }
    };
  }
  if (delta.kind === 'reskin_or_theme') {
    return { kind: 'theme_regeneration', target: delta.target, themePrompt: delta.themeDescription };
  }
  return { kind: 'behavior_change', target: delta.kind, behavior: delta.kind, parameters: { description: 'Semantic design operation requires generator support.' } };
}

function buildDraftPatch(deltas: GameDesignDelta[], context: AmendmentContextPack): DraftPatchBuildResult {
  if (deltas.length === 0 || !deltas.some(deltaCanMapToDraftPatch)) {
    return { ok: false, missingCapabilities: [] };
  }

  const parsedDsl = GameDslArtifactSchema.safeParse(context.currentDsl);
  if (!parsedDsl.success) {
    return { ok: false, missingCapabilities: ['current_dsl_context'] };
  }
  const currentDsl = parsedDsl.data;
  const ops = deltas.flatMap((delta) => deltaToPatchOps(delta, currentDsl));
  if (ops.length === 0) {
    return { ok: false, missingCapabilities: deltas.flatMap(missingCapabilityForDelta) };
  }
  return { ok: true, patch: { ops, reason: 'Natural language amendment planner deterministic patch draft.' } };
}

function deltaCanMapToDraftPatch(delta: GameDesignDelta): boolean {
  if (delta.kind === 'modify_pacing') {
    return delta.inferredDeltas.some(deltaCanMapToDraftPatch);
  }
  return delta.kind === 'tune_stat';
}

function deltaToPatchOps(delta: GameDesignDelta, currentDsl: GameDslArtifact): SemanticAmendmentDraftPatch['ops'] {
  if (delta.kind === 'modify_pacing') {
    return delta.inferredDeltas.flatMap((item) => deltaToPatchOps(item, currentDsl));
  }
  if (delta.kind !== 'tune_stat') {
    return [];
  }
  if (delta.targetDomain === 'player' && delta.stat === 'speed') {
    return [{ op: 'replace', path: '/player/physics/maxSpeed', value: increaseNumber(currentDsl.player.physics.maxSpeed, 20, 2000) }];
  }
  if (delta.targetDomain === 'player' && delta.stat === 'health') {
    return [{ op: 'replace', path: '/player/health/max', value: increaseNumber(currentDsl.player.health.max, 1, 20) }];
  }
  if (delta.targetDomain === 'weapon' && delta.stat === 'fireRate') {
    const fireIndex = currentDsl.player.actions.findIndex((action) => action.type === 'shoot_projectile');
    if (fireIndex < 0) {
      return [];
    }
    const currentCooldown = currentDsl.player.actions[fireIndex]?.cooldownMs ?? 300;
    return [{ op: 'replace', path: `/player/actions/${fireIndex}/cooldownMs`, value: Math.max(60, Math.round(currentCooldown * 0.75)) }];
  }
  if (delta.targetDomain === 'projectile' && delta.stat === 'speed') {
    return Object.values(currentDsl.projectiles).map((projectile) => ({
      op: 'replace' as const,
      path: `/projectiles/${projectile.id}/speed`,
      value: increaseNumber(projectile.speed, 20, 2000)
    }));
  }
  if (delta.targetDomain === 'projectile' && delta.stat === 'damage') {
    return Object.values(currentDsl.projectiles).map((projectile) => ({
      op: 'replace' as const,
      path: `/projectiles/${projectile.id}/damage`,
      value: increaseNumber(projectile.damage, 1, 50)
    }));
  }
  if (delta.targetDomain === 'enemy' && delta.stat === 'speed') {
    return Object.values(currentDsl.enemyTypes).map((enemy) => ({
      op: 'replace' as const,
      path: `/enemyTypes/${enemy.id}/physics/speed`,
      value: increaseNumber(enemy.physics.speed, 20, 2000)
    }));
  }
  if (delta.targetDomain === 'enemy' && delta.stat === 'health') {
    return Object.values(currentDsl.enemyTypes).map((enemy) => ({
      op: 'replace' as const,
      path: `/enemyTypes/${enemy.id}/health/max`,
      value: increaseNumber(enemy.health.max, 1, 50)
    }));
  }
  if (delta.targetDomain === 'enemy' && delta.stat === 'count') {
    return Object.values(currentDsl.level.waves).map((wave) => ({
      op: 'replace' as const,
      path: `/level/waves/${wave.id}/count`,
      value: increaseNumber(wave.count ?? 1, 1, 100)
    }));
  }
  return [];
}

function routeAmendment(input: {
  draft: UnderstandingDraft;
  dslPatch: SemanticAmendmentDraftPatch | undefined;
  draftPatchMissingCapabilities: string[];
  context: AmendmentContextPack;
}): SemanticEditProposal['execution'] {
  if (!input.draft.understood || input.draft.clarificationQuestion !== undefined) {
    return {
      mode: 'needs_clarification',
      reason: input.draft.clarificationQuestion ?? 'The amendment target is not specific enough.',
      supportedNow: false,
      requiresPreviewReload: false,
      requiresCandidateRun: false,
      missingCapabilities: [],
      rejectedUnsafeFallbacks: input.draft.rejectedUnsafeFallbacks
    };
  }
  if (input.draft.missingCapabilities.length > 0) {
    return unsupported(input.draft.missingCapabilities, input.draft.rejectedUnsafeFallbacks, 'Intent is understood but current DSL/runtime capability is missing.');
  }
  if (input.draft.designDeltas.some((delta) => delta.kind === 'change_genre_or_perspective')) {
    const genre = input.draft.designDeltas.find((delta): delta is GameDesignDelta & { kind: 'change_genre_or_perspective' } => delta.kind === 'change_genre_or_perspective')?.targetGenre;
    const capability = genre === undefined ? undefined : findRuntimeGenreCapability(genre);
    if (capability !== undefined && !isRuntimeGenreExecutable(capability)) {
      return unsupported(capability.missingCapabilities, input.draft.rejectedUnsafeFallbacks, describeRuntimeGenreCapability(capability));
    }
    return route(
      'candidate_regeneration',
      'Genre or perspective changes require a candidate version.',
      input.draft.rejectedUnsafeFallbacks,
      candidateGenerationMissingCapabilities(input.context, genre === undefined ? [] : [`candidate_genre_${genre}`])
    );
  }
  const themeDeltas = input.draft.designDeltas.filter((delta): delta is GameDesignDelta & { kind: 'reskin_or_theme' } => delta.kind === 'reskin_or_theme');
  if (themeDeltas.length > 0) {
    return route(
      'candidate_regeneration',
      'Theme and identity changes require a candidate version.',
      input.draft.rejectedUnsafeFallbacks,
      candidateGenerationMissingCapabilities(input.context, themeDeltas.map((delta) => `candidate_theme_${delta.target}`))
    );
  }
  if (input.dslPatch === undefined) {
    return unsupported(
      input.draftPatchMissingCapabilities.length > 0 ? input.draftPatchMissingCapabilities : ['deterministic_operation_mapping'],
      input.draft.rejectedUnsafeFallbacks,
      'Planner understood the request, but the current DSL/context cannot produce an executable deterministic operation.'
    );
  }

  const pathModes = input.dslPatch.ops.map((op) => capabilityModeForPath(op.path, input.context));
  if (pathModes.some((mode) => mode === 'none')) {
    const missing = input.dslPatch.ops.filter((op, index) => pathModes[index] === 'none').map((op) => `live_edit_path:${op.path}`);
    return unsupported(missing, input.draft.rejectedUnsafeFallbacks, 'No current hot/warm/candidate capability can execute this deterministic operation.');
  }
  if (pathModes.every((mode) => mode === 'hot')) {
    return route('hot_runtime_patch', 'All planned operations are hot runtime patchable.', input.draft.rejectedUnsafeFallbacks);
  }
  return route('dsl_patch_warm_restart', 'At least one planned operation requires DSL patch plus preview reload.', input.draft.rejectedUnsafeFallbacks);
}

function route(
  mode: SemanticAmendmentExecutionMode,
  reason: string,
  rejectedUnsafeFallbacks: string[],
  missingCapabilities: string[] = []
): SemanticEditProposal['execution'] {
  if (mode === 'candidate_regeneration' && missingCapabilities.length > 0) {
    return unsupported(missingCapabilities, rejectedUnsafeFallbacks, 'Candidate generation capability is not available in the current context.');
  }
  return {
    mode,
    reason,
    supportedNow: mode === 'hot_runtime_patch' || mode === 'dsl_patch_warm_restart' || mode === 'candidate_regeneration',
    requiresPreviewReload: mode === 'dsl_patch_warm_restart' || mode === 'candidate_regeneration',
    requiresCandidateRun: mode === 'candidate_regeneration',
    missingCapabilities: [],
    rejectedUnsafeFallbacks
  };
}

function unsupported(missingCapabilities: string[], rejectedUnsafeFallbacks: string[], reason: string): SemanticEditProposal['execution'] {
  return {
    mode: 'unsupported_capability',
    reason,
    supportedNow: false,
    requiresPreviewReload: false,
    requiresCandidateRun: false,
    missingCapabilities,
    rejectedUnsafeFallbacks
  };
}

function buildCandidatePreview(input: {
  draft: UnderstandingDraft;
  dslPatch: SemanticAmendmentDraftPatch | undefined;
  mode: SemanticAmendmentExecutionMode;
  sourceText: string;
}): SemanticEditProposal['candidate'] | undefined {
  if (input.mode === 'needs_clarification' || input.mode === 'unsupported_capability') {
    return undefined;
  }
  if (input.mode === 'candidate_regeneration') {
    return {
      candidateBrief: {
        sourceText: input.sourceText,
        amendmentSummary: input.draft.summary,
        preserveGameplay: true
      },
      expectedChangeSummary: input.draft.designDeltas.map(describeDelta)
    };
  }
  return input.dslPatch === undefined
    ? undefined
    : {
        dslPatch: input.dslPatch,
        expectedChangeSummary: input.dslPatch.ops.map((op) => `${op.path} -> ${String(op.value)}`)
      };
}

function missingCapabilityForDelta(delta: GameDesignDelta): string[] {
  if (delta.kind === 'modify_pacing') {
    return delta.inferredDeltas.flatMap(missingCapabilityForDelta);
  }
  if (delta.kind === 'tune_stat' && delta.targetDomain === 'weapon' && delta.stat === 'fireRate') {
    return ['weapon_fire_rate_action'];
  }
  if (delta.kind === 'tune_stat') {
    return [`deterministic_operation_mapping:${delta.targetDomain}.${delta.stat}`];
  }
  return [];
}

function capabilityModeForPath(path: string, context: AmendmentContextPack): 'hot' | 'warm' | 'rebuild' | 'none' {
  if (matchesAnyCapability(path, context.hotPatchCapabilities)) {
    return 'hot';
  }
  if (matchesAnyCapability(path, context.dslPatchCapabilities)) {
    return 'warm';
  }
  if (matchesAnyCapability(path, context.generatorCapabilities)) {
    return 'rebuild';
  }
  return 'none';
}

function candidateGenerationMissingCapabilities(context: AmendmentContextPack, extraRequiredCapabilities: string[]): string[] {
  const required = ['candidate_brief', 'candidate_dsl', 'candidate_run', ...extraRequiredCapabilities];
  return required.filter((capability) => !context.generatorCapabilities.includes(capability));
}

function matchesAnyCapability(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => pathMatchesPattern(path, pattern));
}

function pathMatchesPattern(path: string, pattern: string): boolean {
  const pathSegments = path.split('/').slice(1);
  const patternSegments = pattern.split('/').slice(1);
  return pathSegments.length === patternSegments.length && patternSegments.every((segment, index) => segment === '*' || segment === pathSegments[index]);
}

function userMessageForExecution(mode: SemanticAmendmentExecutionMode, summary: string, missingCapabilities: string[]): string {
  if (mode === 'hot_runtime_patch') {
    return `已理解，可实时预览：${summary}`;
  }
  if (mode === 'dsl_patch_warm_restart') {
    return `已理解，需要重新加载预览：${summary}`;
  }
  if (mode === 'candidate_regeneration') {
    return `已理解，将生成候选新版本：${summary}`;
  }
  if (mode === 'unsupported_capability') {
    return `已理解，但当前能力缺失：${missingCapabilities.join(', ')}`;
  }
  return `修改目标不够明确，需要澄清：${summary}`;
}

function describeDelta(delta: GameDesignDelta): string {
  if (delta.kind === 'tune_stat') {
    return `${delta.targetDomain}.${delta.stat} ${delta.direction}`;
  }
  if (delta.kind === 'reskin_or_theme') {
    return `${delta.target} theme: ${delta.themeDescription}`;
  }
  if (delta.kind === 'change_genre_or_perspective') {
    return `genre -> ${delta.targetGenre}`;
  }
  return delta.kind;
}

function clarification(question: string): UnderstandingDraft {
  return {
    understood: false,
    confidence: 0.2,
    summary: '需要澄清修改目标',
    affectedDomains: [],
    designDeltas: [],
    operations: [],
    clarificationQuestion: question,
    rejectedUnsafeFallbacks: [],
    missingCapabilities: []
  };
}

function detectLanguage(text: string): 'zh' | 'en' {
  return /[\u3400-\u9fff]/u.test(text) ? 'zh' : 'en';
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/gu, ' ');
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function looksTooVague(text: string): boolean {
  return ['改好玩点', '更好玩', 'make it fun', 'make better', '好玩点'].some((term) => text === term || text.includes(term));
}

function mentionsWeaponFireRate(text: string): boolean {
  return includesAny(text, ['武器射速', '射速', '开火更快', 'fire rate', 'fire faster', 'shoot faster', 'firing rate']);
}

function mentionsProjectileSpeed(text: string): boolean {
  return includesAny(text, ['子弹速度', '飞弹更快', 'projectile speed', 'bullet speed']);
}

function mentionsProjectileDamage(text: string): boolean {
  return includesAny(text, ['子弹伤害', '飞弹伤害', 'bullet damage', 'projectile damage']);
}

function mentionsPlayerSpeed(text: string): boolean {
  return (includesAny(text, ['玩家', '主角', 'player']) && includesAny(text, ['速度', '移速', 'speed', '更快'])) || includesAny(text, ['提高玩家速度']);
}

function mentionsPlayerHealth(text: string): boolean {
  return includesAny(text, ['玩家生命值', '玩家血量', '主角生命值', '主角血量', 'player health', 'player hp']);
}

function mentionsEnemySpeed(text: string): boolean {
  return includesAny(text, ['敌人速度', '敌人移速', '敌人更快', 'enemy speed', 'enemies faster']);
}

function mentionsEnemyHealth(text: string): boolean {
  return includesAny(text, ['敌人生命值', '敌人血量', 'enemy health', 'enemy hp']);
}

function mentionsEnemyCount(text: string): boolean {
  return includesAny(text, ['敌人数量', '更多敌人', '增加敌人', 'more enemies', 'enemy count']);
}

function mentionsHarderPacing(text: string): boolean {
  return includesAny(text, ['更紧张', '压迫感', '更爽', '街机', 'harder', 'more intense', 'arcade']);
}

function mentionsCatPlayerTheme(text: string): boolean {
  return includesAny(text, ['玩家变成小猫', '玩家角色改成小猫', '把玩家变成小猫', 'cat player', 'player into a cat']);
}

function mentionsBoss(text: string): boolean {
  return includesAny(text, ['boss', '关底', '首领']);
}

function mentionsBossIntroFeedback(text: string): boolean {
  return mentionsBoss(text) && includesAny(text, ['屏幕震动', '警告音', 'warning', 'screen shake']);
}

function mentionsWeaponDrop(text: string): boolean {
  return includesAny(text, ['敌人死后掉落武器', '敌人掉落武器', 'drop weapon', 'weapon pickup']);
}

function mentionsRunAndGun(text: string): boolean {
  return includesAny(text, ['魂斗罗', 'contra', '横版跑枪', 'run and gun', 'side scrolling']);
}

function increaseNumber(value: number, step: number, max: number): number {
  return Math.min(max, Math.max(1, Math.round(value + Math.max(step, value * 0.2))));
}
