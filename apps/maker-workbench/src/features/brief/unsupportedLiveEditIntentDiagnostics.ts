import {
  findLiveEditCapabilityExposure,
  isEndToEndLiveEditStatus,
  type LiveEditCapabilityExposure,
  type LiveEditCapabilityStatus
} from '@ai-game-maker/game-dsl';

import type { LiveEditableField } from '../../live-edit-client.js';

export type UnsupportedLiveEditIntentReason =
  | 'unknown-concept'
  | 'known-dsl-concept-not-live-editable'
  | 'known-artifact-concept-not-live-editable'
  | 'resolver-capability-not-event-binding'
  | 'warm-restart-only'
  | 'runtime-adapter-missing'
  | 'behavior-not-verified'
  | 'requires-generator-gate'
  | 'unsafe-fallback-blocked';

export type UnsupportedLiveEditIntentDiagnostic = {
  code: 'LIVE_EDIT_UNSUPPORTED_CAPABILITY';
  capability: string;
  label: string;
  status: LiveEditCapabilityStatus;
  message: string;
  blockedFallbacks: readonly string[];
};

export type UnsupportedLiveEditIntentDetails = {
  unsupported: true;
  unsupportedReason: UnsupportedLiveEditIntentReason;
  recognizedCapabilities: string[];
  blockedFallbacks: string[];
  suggestions: string[];
  diagnostics: UnsupportedLiveEditIntentDiagnostic[];
  message: string;
};

type UnsupportedIntentPattern = {
  capabilityKey: string;
  keywords: readonly string[];
};

const UNSUPPORTED_INTENT_PATTERNS: readonly UnsupportedIntentPattern[] = [
  {
    capabilityKey: 'pickups.enabled',
    keywords: ['补给掉落', '开启补给', 'pickup drops', 'drop pickups']
  },
  {
    capabilityKey: 'pickups.dropRate',
    keywords: ['掉落概率', 'drop rate']
  },
  {
    capabilityKey: 'pickups.weapon',
    keywords: ['武器掉落', '散弹武器掉落', '掉落散弹', '激光武器掉落', 'weapon drop', 'weapon pickup drop']
  },
  {
    capabilityKey: 'pickups.shield',
    keywords: ['护盾补给', 'shield pickup']
  },
  {
    capabilityKey: 'bosses.enabled',
    keywords: ['关底 boss', '增加 boss', 'boss encounter', 'boss 战', 'boss战']
  },
  {
    capabilityKey: 'bosses.health',
    keywords: ['boss 血量', 'boss health']
  },
  {
    capabilityKey: 'bosses.healthBar',
    keywords: ['boss 血条', 'boss health bar', 'health bar']
  },
  {
    capabilityKey: 'bosses.attackPatterns',
    keywords: ['攻击模式', 'boss attack', 'boss 有三种']
  },
  {
    capabilityKey: 'bosses.introWarning',
    keywords: ['boss 登场', 'boss 出现', 'boss intro']
  },
  {
    capabilityKey: 'bosses.defeatEffect',
    keywords: ['boss 死亡', 'boss 击败', '击败 boss', '打败 boss']
  },
  {
    capabilityKey: 'audio.events.pickupCollected',
    keywords: ['获得武器', '拾取武器', '播放提示音', 'pickup sound', 'pickup audio']
  },
  {
    capabilityKey: 'audio.events.explosion',
    keywords: ['爆炸音效', 'explosion sound', 'explosion audio']
  },
  {
    capabilityKey: 'audio.events.warning',
    keywords: ['警告提示音', '警告提示', '播放警告', 'warning sound', 'warning audio']
  },
  {
    capabilityKey: 'feedback.cameraShake',
    keywords: ['屏幕震动', '镜头震动', 'camera shake', 'screen shake']
  },
  {
    capabilityKey: 'feedback.hitFlash',
    keywords: ['受击后闪烁', '受击闪烁', 'hit flash', 'damage flash']
  },
  {
    capabilityKey: 'player.invulnerabilityFrames',
    keywords: ['短暂无敌', '无敌帧', 'invulnerability', 'invincible']
  },
  {
    capabilityKey: 'effects.explosion',
    keywords: ['爆炸特效', '大爆炸', '触发爆炸', 'explosion effect', 'visual explosion']
  },
  {
    capabilityKey: 'collision.effects',
    keywords: ['碰撞触发效果', 'collision effect']
  },
  {
    capabilityKey: 'hazards.damage',
    keywords: ['陷阱伤害', 'hazard damage', 'trap damage']
  },
  {
    capabilityKey: 'hazards.movement',
    keywords: ['移动的陷阱', '会移动的陷阱', 'moving trap', 'moving hazard', '陷阱移动']
  },
  {
    capabilityKey: 'obstacles.platforms',
    keywords: ['障碍物', '障碍', '平台', 'obstacle', 'barrier', 'platform']
  }
];

const FIELD_EXAMPLES: readonly { test: (field: LiveEditableField) => boolean; example: string }[] = [
  { test: (field) => field.path === '/world/width', example: '扩大世界宽度' },
  { test: (field) => field.path.includes('/render/scale'), example: '玩家变大一点' },
  { test: (field) => field.path.includes('/physics/maxSpeed') || field.path.endsWith('/physics/speed') || field.path.endsWith('/speed'), example: '提高玩家速度' },
  { test: (field) => field.path.includes('/health/max'), example: '增加玩家血量' },
  { test: (field) => field.path.endsWith('/damage'), example: '提高子弹伤害' },
  { test: (field) => field.path.includes('/level/waves/') && field.path.endsWith('/count'), example: '增加敌人数量' },
  { test: (field) => field.valueKind === 'label' && field.targetKind === 'player', example: '把玩家角色改成小猫' },
  { test: (field) => field.valueKind === 'label' && field.targetKind === 'enemyType', example: '把敌人改成猫' }
];

const REASON_PRIORITY: readonly UnsupportedLiveEditIntentReason[] = [
  'requires-generator-gate',
  'runtime-adapter-missing',
  'behavior-not-verified',
  'resolver-capability-not-event-binding',
  'warm-restart-only',
  'known-artifact-concept-not-live-editable',
  'known-dsl-concept-not-live-editable',
  'unsafe-fallback-blocked',
  'unknown-concept'
];

export function detectUnsupportedLiveEditIntent(input: { normalizedText: string; fields: LiveEditableField[] }): UnsupportedLiveEditIntentDetails | undefined {
  const exposures = matchUnsupportedExposures(input.normalizedText).filter((exposure) => !isEndToEndLiveEditStatus(exposure.status));
  if (exposures.length === 0) {
    return undefined;
  }

  const unsupportedReason = pickPrimaryReason(exposures);
  const recognizedCapabilities = exposures.map((exposure) => exposure.key);
  const blockedFallbacks = unique(exposures.flatMap((exposure) => [...exposure.blockedFallbacks]));
  const suggestions = buildSupportedLiveEditSuggestions(input.fields);
  const diagnostics = exposures.map((exposure) => ({
    code: 'LIVE_EDIT_UNSUPPORTED_CAPABILITY' as const,
    capability: exposure.key,
    label: exposure.label,
    status: exposure.status,
    message: exposure.diagnostic,
    blockedFallbacks: exposure.blockedFallbacks
  }));

  return {
    unsupported: true,
    unsupportedReason,
    recognizedCapabilities,
    blockedFallbacks,
    suggestions,
    diagnostics,
    message: buildKnownUnsupportedMessage(exposures, blockedFallbacks, suggestions)
  };
}

export function buildUnknownLiveEditIntentDetails(input: { fields: LiveEditableField[]; message: string }): UnsupportedLiveEditIntentDetails {
  const suggestions = buildSupportedLiveEditSuggestions(input.fields);
  return {
    unsupported: true,
    unsupportedReason: 'unknown-concept',
    recognizedCapabilities: [],
    blockedFallbacks: [],
    suggestions,
    diagnostics: [],
    message: `${input.message}${suggestions.length > 0 ? ` 可实时编辑示例：${suggestions.slice(0, 3).join('；')}。` : ''}`
  };
}

function matchUnsupportedExposures(normalizedText: string): LiveEditCapabilityExposure[] {
  const capabilityKeys = new Set<string>();
  for (const pattern of UNSUPPORTED_INTENT_PATTERNS) {
    if (pattern.keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase()))) {
      capabilityKeys.add(pattern.capabilityKey);
    }
  }

  return [...capabilityKeys].flatMap((key) => {
    const exposure = findLiveEditCapabilityExposure(key);
    return exposure === undefined ? [] : [exposure];
  });
}

function buildSupportedLiveEditSuggestions(fields: LiveEditableField[]): string[] {
  const suggestions = fields
    .filter((field) => field.enabled)
    .flatMap((field) => {
      const match = FIELD_EXAMPLES.find((candidate) => candidate.test(field));
      return match === undefined ? [] : [match.example];
    });

  return unique(suggestions).slice(0, 5);
}

function buildKnownUnsupportedMessage(exposures: readonly LiveEditCapabilityExposure[], blockedFallbacks: readonly string[], suggestions: readonly string[]): string {
  const labels = exposures.map((exposure) => exposure.label).join('、');
  const fallbackCopy =
    blockedFallbacks.length > 0
      ? `已阻止误回退到 ${blockedFallbacks.join(', ')}。`
      : '已阻止误回退到相邻字段。';
  const suggestionCopy = suggestions.length > 0 ? ` 可实时编辑示例：${suggestions.slice(0, 3).join('；')}。` : '';
  return `这句话涉及尚未暴露为实时编辑字段的能力：${labels}。没有应用 patch；${fallbackCopy}${suggestionCopy}`;
}

function pickPrimaryReason(exposures: readonly LiveEditCapabilityExposure[]): UnsupportedLiveEditIntentReason {
  const reasons = exposures.map((exposure) => reasonForExposure(exposure));
  return (
    REASON_PRIORITY.find((candidate) => reasons.includes(candidate)) ??
    'known-dsl-concept-not-live-editable'
  );
}

function reasonForExposure(exposure: LiveEditCapabilityExposure): UnsupportedLiveEditIntentReason {
  if (exposure.status === 'resolver-only') {
    return 'resolver-capability-not-event-binding';
  }
  if (exposure.status === 'warm-restart-only') {
    return 'warm-restart-only';
  }
  if (exposure.status === 'runtime-adapter-missing') {
    return 'runtime-adapter-missing';
  }
  if (exposure.status === 'behavior-not-verified') {
    return 'behavior-not-verified';
  }
  if (exposure.status === 'requires-generator-gate' || exposure.status === 'generation-only') {
    return 'requires-generator-gate';
  }
  if (exposure.status === 'blocked-unsupported') {
    return 'unsafe-fallback-blocked';
  }
  if (exposure.artifactContract && !exposure.dslSchema) {
    return 'known-artifact-concept-not-live-editable';
  }
  return 'known-dsl-concept-not-live-editable';
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
