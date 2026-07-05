import { createHash } from 'node:crypto';
import { lstat, open, realpath, unlink } from 'node:fs/promises';
import { isAbsolute, posix, relative, resolve } from 'node:path';

import { z } from 'zod';

export const ART_PROVIDER_ARTIFACT_WRITE_SANDBOX_VERSION = 'art-provider-artifact-write-sandbox-v0.1' as const;

export const ArtifactSandboxBlockerSchema = z.enum([
  'artifact_write_not_approved',
  'artifact_sandbox_absolute_path_not_allowed',
  'artifact_sandbox_path_escape',
  'artifact_sandbox_reserved_repo_path',
  'artifact_sandbox_root_required',
  'artifact_sandbox_root_escape',
  'artifact_sandbox_symlink_escape',
  'artifact_sandbox_overwrite_not_allowed',
  'artifact_sandbox_overwrite_not_supported',
  'artifact_sandbox_content_hash_mismatch',
  'artifact_sandbox_write_failed',
  'artifact_sandbox_cleanup_failed'
]);

export type ArtifactSandboxBlocker = z.infer<typeof ArtifactSandboxBlockerSchema>;

export const ART_PROVIDER_ARTIFACT_SANDBOX_CUTOVER_RECORD = {
  producerChange: 'sandboxWritePlan',
  consumerList: ['live dry-run adapter', 'resolver/report evidence', 'contract tests'],
  compatibilityType: 'NEW_CONSUMER_REQUIRED',
  authority: 'artifact sandbox plan/write result',
  legacyStrategy: 'fake and disabled-live paths preserved; resolver has no automatic filesystem side effects',
  failurePolicy: 'fail closed with typed blockers, no outside-root write, no nested paths, and no overwrite support in Loop11 MVP',
  evidence: 'contract tests cover plan/write/manifest/cleanup safety and dry-run plan consumption',
  rollback: 'revert Loop11 commit; no generated/archive/art assets should require cleanup'
} as const;

export const ArtifactSandboxWritePlanSchema = z.strictObject({
  contractVersion: z.literal(ART_PROVIDER_ARTIFACT_WRITE_SANDBOX_VERSION),
  ok: z.boolean(),
  status: z.enum(['planned', 'blocked']),
  artifactId: z.string().min(1).max(120),
  artifactPlanId: z.string().min(1).max(120).optional(),
  sandboxRelativePath: z.string().min(1).max(240).optional(),
  manifestRelativePath: z.string().min(1).max(240).optional(),
  contentType: z.string().min(1).max(120),
  byteLength: z.number().int().min(0),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  writeApproved: z.boolean(),
  wouldWriteArtifact: z.literal(false),
  sandboxRequired: z.literal(true),
  dryRun: z.literal(true),
  sandbox: z.literal(true),
  providerMode: z.string().min(1).max(80).optional(),
  adapterMode: z.string().min(1).max(80).optional(),
  evidenceRef: z.string().min(1).max(160).optional(),
  reportRef: z.string().min(1).max(160).optional(),
  blocker: ArtifactSandboxBlockerSchema.optional(),
  errorCode: ArtifactSandboxBlockerSchema.optional()
});

export const ArtifactSandboxManifestSchema = z.strictObject({
  schemaVersion: z.literal(ART_PROVIDER_ARTIFACT_WRITE_SANDBOX_VERSION),
  artifactId: z.string().min(1).max(120),
  artifactPlanId: z.string().min(1).max(120).optional(),
  sandboxRelativePath: z.string().min(1).max(240),
  manifestRelativePath: z.string().min(1).max(240),
  contentType: z.string().min(1).max(120),
  byteLength: z.number().int().min(0),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  dryRun: z.literal(true),
  sandbox: z.literal(true),
  providerMode: z.string().min(1).max(80).optional(),
  adapterMode: z.string().min(1).max(80).optional(),
  evidenceRef: z.string().min(1).max(160).optional(),
  reportRef: z.string().min(1).max(160).optional(),
  blocker: ArtifactSandboxBlockerSchema.optional(),
  errorCode: ArtifactSandboxBlockerSchema.optional()
});

export type ArtifactSandboxWritePlan = z.infer<typeof ArtifactSandboxWritePlanSchema>;
export type ArtifactSandboxManifest = z.infer<typeof ArtifactSandboxManifestSchema>;

export type ArtifactSandboxFileStat = {
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
};

export type ArtifactSandboxFileHandle = {
  writeFile(content: string, encoding: BufferEncoding): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
};

export type ArtifactSandboxFileOps = {
  lstat(path: string): Promise<ArtifactSandboxFileStat>;
  realpath(path: string): Promise<string>;
  openExclusive(path: string): Promise<ArtifactSandboxFileHandle>;
  unlink(path: string): Promise<void>;
};

export type ArtifactSandboxCleanupEvidence = {
  attempted: boolean;
  ok: boolean;
  removedPaths: string[];
  failedPaths: string[];
};

export type ArtifactSandboxFilesystemErrorCode = 'EACCES' | 'EIO' | 'ELOOP' | 'EPERM' | 'ENOTDIR' | 'UNKNOWN';

export type ArtifactSandboxFilesystemPathRole = 'sandboxRoot' | 'target' | 'manifest' | 'cleanup';

export type ArtifactSandboxFilesystemOperation = 'lstat' | 'realpath' | 'prevalidate' | 'open' | 'write' | 'sync' | 'close';

export type ArtifactSandboxFilesystemErrorEvidence = {
  pathRole: ArtifactSandboxFilesystemPathRole;
  operation: ArtifactSandboxFilesystemOperation;
  fsErrorCode: ArtifactSandboxFilesystemErrorCode;
  blockerCode: ArtifactSandboxBlocker;
};

export type PlanArtifactSandboxWriteInput = {
  artifactId: string;
  artifactPlanId?: string;
  targetPath: string;
  manifestPath?: string;
  content: string;
  contentType: string;
  artifactWriteApproved?: boolean;
  artifactWriteIntent?: 'none' | 'sandbox-write-approved' | 'write-through-approved';
  providerMode?: string;
  adapterMode?: string;
  evidenceRef?: string;
  reportRef?: string;
};

export type ArtifactSandboxWriteResult = {
  ok: boolean;
  status: 'written' | 'blocked';
  sandboxRoot?: string;
  plan: ArtifactSandboxWritePlan;
  manifest?: ArtifactSandboxManifest;
  filesWritten: string[];
  cleanup?: ArtifactSandboxCleanupEvidence;
  filesystemError?: ArtifactSandboxFilesystemErrorEvidence;
  blocker?: ArtifactSandboxBlocker;
  errorCode?: ArtifactSandboxBlocker;
  message?: string;
};

export type ArtifactSandboxCleanupResult = {
  ok: boolean;
  status: 'cleaned' | 'blocked';
  sandboxRoot?: string;
  removedPaths: string[];
  failedPaths: string[];
  filesystemError?: ArtifactSandboxFilesystemErrorEvidence;
  blocker?: ArtifactSandboxBlocker;
  errorCode?: ArtifactSandboxBlocker;
  message?: string;
};

const nodeFileOps: ArtifactSandboxFileOps = {
  lstat,
  realpath,
  unlink,
  async openExclusive(path) {
    const handle = await open(path, 'wx');
    return {
      writeFile(content, encoding) {
        return handle.writeFile(content, encoding);
      },
      sync() {
        return handle.sync();
      },
      close() {
        return handle.close();
      }
    };
  }
};

/**
 * Builds deterministic artifact write metadata without touching the filesystem.
 * A separate explicit write call must supply a sandbox root before any bytes move.
 */
export function planArtifactSandboxWrite(input: PlanArtifactSandboxWriteInput): ArtifactSandboxWritePlan {
  const common = commonPlanFields(input);
  const writeApproved = input.artifactWriteApproved === true || input.artifactWriteIntent === 'sandbox-write-approved';
  if (!writeApproved) {
    return blockedPlan({ ...common, writeApproved }, 'artifact_write_not_approved');
  }

  const targetPath = normalizeSandboxPath(input.targetPath);
  if (!targetPath.ok) {
    return blockedPlan({ ...common, writeApproved }, targetPath.blocker);
  }

  const manifestPath = normalizeSandboxPath(input.manifestPath ?? defaultManifestPath(targetPath.path));
  if (!manifestPath.ok) {
    return blockedPlan({ ...common, writeApproved }, manifestPath.blocker);
  }

  if (targetPath.path === manifestPath.path) {
    return blockedPlan({ ...common, writeApproved }, 'artifact_sandbox_path_escape');
  }

  if (isReservedRepoAssetPath(targetPath.path) || isReservedRepoAssetPath(manifestPath.path)) {
    return blockedPlan({ ...common, writeApproved }, 'artifact_sandbox_reserved_repo_path');
  }

  return ArtifactSandboxWritePlanSchema.parse({
    ...common,
    ok: true,
    status: 'planned',
    writeApproved,
    sandboxRelativePath: targetPath.path,
    manifestRelativePath: manifestPath.path
  });
}

export function createArtifactSandboxManifest(plan: ArtifactSandboxWritePlan): ArtifactSandboxManifest {
  const sandboxRelativePath = plan.sandboxRelativePath ?? 'blocked';
  const manifestRelativePath = plan.manifestRelativePath ?? defaultManifestPath(sandboxRelativePath);
  return ArtifactSandboxManifestSchema.parse({
    schemaVersion: ART_PROVIDER_ARTIFACT_WRITE_SANDBOX_VERSION,
    artifactId: plan.artifactId,
    ...(plan.artifactPlanId === undefined ? {} : { artifactPlanId: plan.artifactPlanId }),
    sandboxRelativePath,
    manifestRelativePath,
    contentType: plan.contentType,
    byteLength: plan.byteLength,
    sha256: plan.sha256,
    dryRun: true,
    sandbox: true,
    ...(plan.providerMode === undefined ? {} : { providerMode: plan.providerMode }),
    ...(plan.adapterMode === undefined ? {} : { adapterMode: plan.adapterMode }),
    ...(plan.evidenceRef === undefined ? {} : { evidenceRef: plan.evidenceRef }),
    ...(plan.reportRef === undefined ? {} : { reportRef: plan.reportRef }),
    ...(plan.blocker === undefined ? {} : { blocker: plan.blocker, errorCode: plan.blocker })
  });
}

export async function writeArtifactToSandbox(input: {
  sandboxRoot: string;
  plan: ArtifactSandboxWritePlan;
  content: string;
  allowOverwrite?: boolean;
  fileOps?: ArtifactSandboxFileOps;
}): Promise<ArtifactSandboxWriteResult> {
  if (!input.plan.ok) {
    return blockedWrite(input.plan, input.plan.blocker ?? 'artifact_write_not_approved');
  }
  const sandboxRelativePath = input.plan.sandboxRelativePath;
  const manifestRelativePath = input.plan.manifestRelativePath;
  if (sandboxRelativePath === undefined || manifestRelativePath === undefined) {
    return blockedWrite(input.plan, 'artifact_sandbox_root_escape');
  }
  if (input.sandboxRoot.trim().length === 0) {
    return blockedWrite(input.plan, 'artifact_sandbox_root_required');
  }
  if (sha256(input.content) !== input.plan.sha256 || Buffer.byteLength(input.content, 'utf8') !== input.plan.byteLength) {
    return blockedWrite(input.plan, 'artifact_sandbox_content_hash_mismatch');
  }
  if (input.allowOverwrite === true) {
    return blockedWrite(input.plan, 'artifact_sandbox_overwrite_not_supported');
  }

  const fileOps = input.fileOps ?? nodeFileOps;
  const root = await realSandboxRoot(input.sandboxRoot, fileOps);
  if (!root.ok) {
    return blockedWrite(input.plan, root.blocker, undefined, undefined, root.filesystemError);
  }

  const target = resolveInsideRoot(root.path, sandboxRelativePath);
  const manifestPath = resolveInsideRoot(root.path, manifestRelativePath);
  if (!target.ok || !manifestPath.ok) {
    return blockedWrite(input.plan, 'artifact_sandbox_root_escape', root.path);
  }

  const preparedTarget = await prevalidateFinalSandboxFile(target.path, 'target', fileOps);
  if (!preparedTarget.ok) {
    return blockedWrite(input.plan, preparedTarget.blocker, root.path, undefined, preparedTarget.filesystemError);
  }
  const preparedManifest = await prevalidateFinalSandboxFile(manifestPath.path, 'manifest', fileOps);
  if (!preparedManifest.ok) {
    return blockedWrite(input.plan, preparedManifest.blocker, root.path, undefined, preparedManifest.filesystemError);
  }

  const manifest = createArtifactSandboxManifest(input.plan);
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

  const targetWrite = await writeFileExclusive({
    path: target.path,
    pathRole: 'target',
    relativePath: sandboxRelativePath,
    content: input.content,
    fileOps
  });
  if (!targetWrite.ok) {
    return blockedWrite(input.plan, targetWrite.blocker, root.path, targetWrite.cleanup, targetWrite.filesystemError);
  }

  const manifestWrite = await writeFileExclusive({
    path: manifestPath.path,
    pathRole: 'manifest',
    relativePath: manifestRelativePath,
    content: manifestJson,
    fileOps
  });
  if (!manifestWrite.ok) {
    const targetCleanup = await rollbackSandboxFiles([{ path: target.path, relativePath: sandboxRelativePath }], fileOps);
    const cleanup = mergeCleanupEvidence(targetCleanup, manifestWrite.cleanup);
    const blocker = cleanup.ok ? manifestWrite.blocker : 'artifact_sandbox_cleanup_failed';
    return blockedWrite(input.plan, blocker, root.path, cleanup, manifestWrite.filesystemError);
  }

  return {
    ok: true,
    status: 'written',
    sandboxRoot: root.path,
    plan: input.plan,
    manifest,
    filesWritten: [sandboxRelativePath, manifestRelativePath]
  };
}

async function prevalidateFinalSandboxFile(
  path: string,
  pathRole: 'target' | 'manifest',
  fileOps: ArtifactSandboxFileOps
): Promise<{ ok: true } | { ok: false; blocker: ArtifactSandboxBlocker; filesystemError?: ArtifactSandboxFilesystemErrorEvidence }> {
  const existing = await lstatIfPresent(path, fileOps, pathRole, 'artifact_sandbox_write_failed');
  if (!existing.ok) {
    return {
      ok: false,
      blocker: existing.filesystemError.blockerCode,
      filesystemError: existing.filesystemError
    };
  }
  const stat = existing.stat;
  if (stat?.isSymbolicLink()) {
    return { ok: false, blocker: 'artifact_sandbox_symlink_escape' };
  }
  if (stat !== undefined) {
    return { ok: false, blocker: 'artifact_sandbox_overwrite_not_allowed' };
  }
  return { ok: true };
}

async function writeFileExclusive(input: {
  path: string;
  pathRole: 'target' | 'manifest';
  relativePath: string;
  content: string;
  fileOps: ArtifactSandboxFileOps;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      blocker: ArtifactSandboxBlocker;
      cleanup: ArtifactSandboxCleanupEvidence;
      filesystemError: ArtifactSandboxFilesystemErrorEvidence;
    }
> {
  let handle: ArtifactSandboxFileHandle | undefined;
  let created = false;
  let failure: unknown;
  let failureOperation: ArtifactSandboxFilesystemOperation = 'open';
  try {
    handle = await input.fileOps.openExclusive(input.path);
    created = true;
    try {
      await handle.writeFile(input.content, 'utf8');
    } catch (error) {
      failure = error;
      failureOperation = 'write';
    }
    if (failure === undefined) {
      try {
        await handle.sync();
      } catch (error) {
        failure = error;
        failureOperation = 'sync';
      }
    }
  } catch (error) {
    failure = error;
    failureOperation = created ? 'write' : 'open';
  }

  if (handle !== undefined) {
    try {
      await handle.close();
    } catch (error) {
      if (failure === undefined) {
        failureOperation = 'close';
      }
      failure ??= error;
    }
  }

  if (failure === undefined) {
    return { ok: true };
  }

  const cleanup = created
    ? await rollbackSandboxFiles([{ path: input.path, relativePath: input.relativePath }], input.fileOps)
    : noCleanupAttempted();
  const blocker = cleanup.attempted && !cleanup.ok
    ? 'artifact_sandbox_cleanup_failed'
    : writeFailureBlocker(failure);
  return {
    ok: false,
    blocker,
    cleanup,
    filesystemError: filesystemErrorEvidence(
      input.pathRole,
      failureOperation,
      writeFailureBlocker(failure),
      failure
    )
  };
}

async function rollbackSandboxFiles(
  files: Array<{ path: string; relativePath: string }>,
  fileOps: ArtifactSandboxFileOps
): Promise<ArtifactSandboxCleanupEvidence> {
  const evidence: ArtifactSandboxCleanupEvidence = {
    attempted: files.length > 0,
    ok: true,
    removedPaths: [],
    failedPaths: []
  };

  for (const file of files) {
    try {
      await fileOps.unlink(file.path);
      evidence.removedPaths.push(file.relativePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      evidence.failedPaths.push(file.relativePath);
      evidence.ok = false;
    }
  }

  return evidence;
}

function noCleanupAttempted(): ArtifactSandboxCleanupEvidence {
  return {
    attempted: false,
    ok: true,
    removedPaths: [],
    failedPaths: []
  };
}

function mergeCleanupEvidence(...entries: ArtifactSandboxCleanupEvidence[]): ArtifactSandboxCleanupEvidence {
  return {
    attempted: entries.some((entry) => entry.attempted),
    ok: entries.every((entry) => entry.ok),
    removedPaths: entries.flatMap((entry) => entry.removedPaths),
    failedPaths: entries.flatMap((entry) => entry.failedPaths)
  };
}

function writeFailureBlocker(error: unknown): ArtifactSandboxBlocker {
  return (error as NodeJS.ErrnoException).code === 'EEXIST'
    ? 'artifact_sandbox_overwrite_not_allowed'
    : 'artifact_sandbox_write_failed';
}

export async function cleanupArtifactSandboxWrite(input: {
  sandboxRoot: string;
  manifest: ArtifactSandboxManifest;
  fileOps?: ArtifactSandboxFileOps;
}): Promise<ArtifactSandboxCleanupResult> {
  const targetPath = normalizeSandboxPath(input.manifest.sandboxRelativePath);
  const manifestPath = normalizeSandboxPath(input.manifest.manifestRelativePath);
  if (!targetPath.ok) {
    return blockedCleanup(targetPath.blocker);
  }
  if (!manifestPath.ok) {
    return blockedCleanup(manifestPath.blocker);
  }

  const fileOps = input.fileOps ?? nodeFileOps;
  const root = await realSandboxRoot(input.sandboxRoot, fileOps);
  if (!root.ok) {
    const blocker = root.filesystemError === undefined ? root.blocker : 'artifact_sandbox_cleanup_failed';
    return blockedCleanup(blocker, undefined, [], [], root.filesystemError === undefined
      ? undefined
      : { ...root.filesystemError, blockerCode: blocker });
  }

  const target = resolveInsideRoot(root.path, targetPath.path);
  const manifest = resolveInsideRoot(root.path, manifestPath.path);
  if (!target.ok || !manifest.ok) {
    return blockedCleanup('artifact_sandbox_root_escape', root.path);
  }

  const preparedTarget = await prevalidateCleanupSandboxFile(target.path, fileOps);
  if (!preparedTarget.ok) {
    return blockedCleanup('artifact_sandbox_cleanup_failed', root.path, [], [], preparedTarget.filesystemError);
  }
  const preparedManifest = await prevalidateCleanupSandboxFile(manifest.path, fileOps);
  if (!preparedManifest.ok) {
    return blockedCleanup('artifact_sandbox_cleanup_failed', root.path, [], [], preparedManifest.filesystemError);
  }

  const cleanup = await rollbackSandboxFiles([
    { path: target.path, relativePath: targetPath.path },
    { path: manifest.path, relativePath: manifestPath.path }
  ], fileOps);
  if (cleanup.ok) {
    return {
      ok: true,
      status: 'cleaned',
      sandboxRoot: root.path,
      removedPaths: cleanup.removedPaths,
      failedPaths: cleanup.failedPaths
    };
  }
  return blockedCleanup('artifact_sandbox_cleanup_failed', root.path, cleanup.removedPaths, cleanup.failedPaths);
}

async function prevalidateCleanupSandboxFile(
  path: string,
  fileOps: ArtifactSandboxFileOps
): Promise<{ ok: true } | { ok: false; filesystemError: ArtifactSandboxFilesystemErrorEvidence }> {
  const existing = await lstatIfPresent(path, fileOps, 'cleanup', 'artifact_sandbox_cleanup_failed');
  if (!existing.ok) {
    return { ok: false, filesystemError: existing.filesystemError };
  }
  return { ok: true };
}

function commonPlanFields(input: PlanArtifactSandboxWriteInput): Omit<ArtifactSandboxWritePlan, 'ok' | 'status' | 'writeApproved'> {
  return {
    contractVersion: ART_PROVIDER_ARTIFACT_WRITE_SANDBOX_VERSION,
    artifactId: input.artifactId,
    ...(input.artifactPlanId === undefined ? {} : { artifactPlanId: input.artifactPlanId }),
    contentType: input.contentType,
    byteLength: Buffer.byteLength(input.content, 'utf8'),
    sha256: sha256(input.content),
    wouldWriteArtifact: false,
    sandboxRequired: true,
    dryRun: true,
    sandbox: true,
    ...(sanitizeRef(input.providerMode) === undefined ? {} : { providerMode: sanitizeRef(input.providerMode) }),
    ...(sanitizeRef(input.adapterMode) === undefined ? {} : { adapterMode: sanitizeRef(input.adapterMode) }),
    ...(sanitizeRef(input.evidenceRef) === undefined ? {} : { evidenceRef: sanitizeRef(input.evidenceRef) }),
    ...(sanitizeRef(input.reportRef) === undefined ? {} : { reportRef: sanitizeRef(input.reportRef) })
  };
}

function blockedPlan(
  common: Omit<ArtifactSandboxWritePlan, 'ok' | 'status'> & { writeApproved: boolean },
  blocker: ArtifactSandboxBlocker
): ArtifactSandboxWritePlan {
  return ArtifactSandboxWritePlanSchema.parse({
    ...common,
    ok: false,
    status: 'blocked',
    blocker,
    errorCode: blocker
  });
}

function blockedWrite(
  plan: ArtifactSandboxWritePlan,
  blocker: ArtifactSandboxBlocker,
  sandboxRoot?: string,
  cleanup?: ArtifactSandboxCleanupEvidence,
  filesystemError?: ArtifactSandboxFilesystemErrorEvidence
): ArtifactSandboxWriteResult {
  return {
    ok: false,
    status: 'blocked',
    ...(sandboxRoot === undefined ? {} : { sandboxRoot }),
    plan,
    filesWritten: [],
    ...(cleanup === undefined ? {} : { cleanup }),
    ...(filesystemError === undefined ? {} : { filesystemError }),
    blocker,
    errorCode: blocker,
    message: `Artifact sandbox write blocked: ${blocker}.`
  };
}

function blockedCleanup(
  blocker: ArtifactSandboxBlocker,
  sandboxRoot?: string,
  removedPaths: string[] = [],
  failedPaths: string[] = [],
  filesystemError?: ArtifactSandboxFilesystemErrorEvidence
): ArtifactSandboxCleanupResult {
  return {
    ok: false,
    status: 'blocked',
    ...(sandboxRoot === undefined ? {} : { sandboxRoot }),
    removedPaths,
    failedPaths,
    ...(filesystemError === undefined ? {} : { filesystemError }),
    blocker,
    errorCode: blocker,
    message: `Artifact sandbox cleanup blocked: ${blocker}.`
  };
}

function normalizeSandboxPath(value: string | undefined): { ok: true; path: string } | { ok: false; blocker: ArtifactSandboxBlocker } {
  if (value === undefined || value.trim().length === 0) {
    return { ok: false, blocker: 'artifact_sandbox_path_escape' };
  }
  const trimmed = value.trim();
  if (trimmed !== value) {
    return { ok: false, blocker: 'artifact_sandbox_path_escape' };
  }
  const unixValue = trimmed.replace(/\\/g, '/');
  if (isAbsolute(trimmed) || isAbsolute(unixValue) || posix.isAbsolute(unixValue) || /^[A-Za-z]:\//.test(unixValue)) {
    return { ok: false, blocker: 'artifact_sandbox_absolute_path_not_allowed' };
  }
  if (unixValue.includes('/')) {
    return { ok: false, blocker: 'artifact_sandbox_path_escape' };
  }
  const normalized = posix.normalize(unixValue);
  if (normalized !== unixValue || normalized === '.' || normalized === '..') {
    return { ok: false, blocker: 'artifact_sandbox_path_escape' };
  }
  return { ok: true, path: normalized };
}

function defaultManifestPath(targetPath: string): string {
  return targetPath.endsWith('.json') ? targetPath.replace(/\.json$/, '.manifest.json') : `${targetPath}.manifest.json`;
}

function isReservedRepoAssetPath(relativePath: string): boolean {
  const segments = relativePath.toLowerCase().split('/').filter(Boolean);
  return segments.some((segment) => segment === 'generated' || segment === 'archive' || segment === 'art' || segment === 'art-assets') || segments.join('/').includes('assets/art/');
}

async function realSandboxRoot(
  sandboxRoot: string,
  fileOps: ArtifactSandboxFileOps
): Promise<{ ok: true; path: string } | { ok: false; blocker: ArtifactSandboxBlocker; filesystemError?: ArtifactSandboxFilesystemErrorEvidence }> {
  let stat: ArtifactSandboxFileStat;
  try {
    stat = await fileOps.lstat(sandboxRoot);
  } catch (error) {
    const blocker = 'artifact_sandbox_root_required';
    return {
      ok: false,
      blocker,
      filesystemError: filesystemErrorEvidence('sandboxRoot', 'lstat', blocker, error)
    };
  }

  if (stat.isSymbolicLink()) {
    return { ok: false, blocker: 'artifact_sandbox_symlink_escape' };
  }
  if (!stat.isDirectory()) {
    return { ok: false, blocker: 'artifact_sandbox_root_required' };
  }

  try {
    const path = await fileOps.realpath(sandboxRoot);
    return { ok: true, path };
  } catch (error) {
    const blocker = 'artifact_sandbox_root_required';
    return {
      ok: false,
      blocker,
      filesystemError: filesystemErrorEvidence('sandboxRoot', 'realpath', blocker, error)
    };
  }
}

function resolveInsideRoot(root: string, relativePath: string | undefined): { ok: true; path: string } | { ok: false } {
  if (relativePath === undefined) {
    return { ok: false };
  }
  const path = resolve(root, relativePath);
  const relativePathFromRoot = relative(root, path);
  if (relativePathFromRoot === '' || relativePathFromRoot.startsWith('..') || isAbsolute(relativePathFromRoot)) {
    return { ok: false };
  }
  return { ok: true, path };
}

async function lstatIfPresent(
  path: string,
  fileOps: ArtifactSandboxFileOps,
  pathRole: ArtifactSandboxFilesystemPathRole,
  blocker: ArtifactSandboxBlocker
): Promise<
  | { ok: true; stat?: ArtifactSandboxFileStat }
  | { ok: false; filesystemError: ArtifactSandboxFilesystemErrorEvidence }
> {
  try {
    return { ok: true, stat: await fileOps.lstat(path) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { ok: true };
    }
    return {
      ok: false,
      filesystemError: filesystemErrorEvidence(pathRole, 'lstat', blocker, error)
    };
  }
}

function filesystemErrorEvidence(
  pathRole: ArtifactSandboxFilesystemPathRole,
  operation: ArtifactSandboxFilesystemOperation,
  blockerCode: ArtifactSandboxBlocker,
  error: unknown
): ArtifactSandboxFilesystemErrorEvidence {
  return {
    pathRole,
    operation,
    fsErrorCode: normalizeFilesystemErrorCode(error),
    blockerCode
  };
}

function normalizeFilesystemErrorCode(error: unknown): ArtifactSandboxFilesystemErrorCode {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
  if (code === 'EACCES' || code === 'EIO' || code === 'ELOOP' || code === 'EPERM' || code === 'ENOTDIR') {
    return code;
  }
  return 'UNKNOWN';
}

function sanitizeRef(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }
  if (/sk-[a-z0-9_-]+|secret|token|authorization|bearer/i.test(value)) {
    return undefined;
  }
  return value.slice(0, 160);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
