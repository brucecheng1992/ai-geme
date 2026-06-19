import { z } from 'zod';

import { GameplayCapabilityIdSchema, RuntimeFamilyIdSchema } from './registry.js';

export const GAMEPLAY_CAPABILITY_LOCK_KIND = 'gameplay_capability_lock';
export const GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION = 'gameplay_capability_lock.v0.1';

export const GameplayCapabilityLockSchema = z.strictObject({
  artifactKind: z.literal(GAMEPLAY_CAPABILITY_LOCK_KIND),
  schemaVersion: z.literal(GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION),
  profileId: z.string().min(1),
  runtimeFamily: RuntimeFamilyIdSchema,
  capabilityIds: z.array(GameplayCapabilityIdSchema),
  packages: z.array(
    z.strictObject({
      capabilityId: GameplayCapabilityIdSchema,
      packageVersion: z.string().min(1),
      packageHash: z.string().min(1)
    })
  ),
  lockHash: z.string().min(1)
});

export type GameplayCapabilityLock = z.infer<typeof GameplayCapabilityLockSchema>;
