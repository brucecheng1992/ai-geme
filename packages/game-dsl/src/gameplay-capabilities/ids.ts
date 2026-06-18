import { z } from 'zod';

export const GameplayCapabilityIdSchema = z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\.v[1-9][0-9]*$/);
export const GameplayCapabilityVersionSchema = z.string().regex(/^v[1-9][0-9]*$/);
export const RuntimeFamilyIdSchema = z.string().regex(/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*\.v[1-9][0-9]*$/);
