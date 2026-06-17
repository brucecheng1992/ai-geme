import phaserCapabilities from '../../runtime-adapters/phaser/src/phaser-adapter-v0.1.capabilities.json' with { type: 'json' };
import type { NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';

export type UnsupportedRuntimeCapability = {
  capability: string;
  path: string;
  reason: string;
};

export type RuntimeCapabilityGateResult =
  | { ok: true }
  | {
      ok: false;
      unsupportedCapabilities: UnsupportedRuntimeCapability[];
    };

/** Checks the normalized DSL against the selected runtime before template files are generated. */
export function checkPhaserRuntimeCapabilities(ir: NormalizedGameIr): RuntimeCapabilityGateResult {
  const supports = phaserCapabilities.supports;
  const unsupportedCapabilities = [
    ...unsupportedValues('runtime_requirements.camera', [ir.runtime_requirements.camera], supports.camera),
    ...unsupportedValues('runtime_requirements.movement', ir.runtime_requirements.movement, supports.movement),
    ...unsupportedValues('runtime_requirements.collision', ir.runtime_requirements.collision, supports.collision),
    ...unsupportedValues('runtime_requirements.actions', ir.runtime_requirements.actions, supports.actions),
    ...unsupportedValues('runtime_requirements.objectives', ir.runtime_requirements.objectives, supports.objectives),
    ...unsupportedValues('runtime_requirements.capabilities', ir.runtime_requirements.capabilities, supports.capabilities ?? [])
  ];

  return unsupportedCapabilities.length === 0 ? { ok: true } : { ok: false, unsupportedCapabilities };
}

function unsupportedValues(path: string, values: string[], supported: readonly string[]): UnsupportedRuntimeCapability[] {
  return values
    .filter((value) => !supported.includes(value))
    .map((value) => ({
      capability: value,
      path,
      reason: `Phaser adapter does not support "${value}".`
    }));
}
