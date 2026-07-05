import { createHash } from 'node:crypto';
import { lstat, mkdtemp, open, readFile, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ART_PROVIDER_ARTIFACT_SANDBOX_CUTOVER_RECORD,
  ArtifactSandboxManifestSchema,
  ArtifactSandboxWritePlanSchema,
  cleanupArtifactSandboxWrite,
  createArtifactSandboxManifest,
  createArtProviderLivePreflightEvidence,
  createArtProviderRequest,
  createLiveDryRunArtProvider,
  planArtifactSandboxWrite,
  resolveArtProviderLivePreflight,
  resolveArtSources,
  writeArtifactToSandbox,
  type ArtifactSandboxFileOps,
  type AssetIntent,
  type AssetIntentManifest,
  type AssetPlan
} from '../../packages/asset-pipeline/src/index.js';

describe('Loop11 artifact write sandbox', () => {
  let sandboxRoot: string;

  beforeEach(async () => {
    sandboxRoot = await mkdtemp(join(tmpdir(), 'ai-game-maker-artifact-sandbox-'));
  });

  afterEach(async () => {
    await rm(sandboxRoot, { recursive: true, force: true });
  });

  it('records Compatibility & Cutover metadata for the sandboxWritePlan producer surface', () => {
    expect(ART_PROVIDER_ARTIFACT_SANDBOX_CUTOVER_RECORD).toMatchObject({
      producerChange: 'sandboxWritePlan',
      consumerList: ['live dry-run adapter', 'resolver/report evidence', 'contract tests'],
      compatibilityType: 'NEW_CONSUMER_REQUIRED',
      authority: 'artifact sandbox plan/write result',
      legacyStrategy: 'fake and disabled-live paths preserved; resolver has no automatic filesystem side effects',
      failurePolicy: 'fail closed with typed blockers, no outside-root write, no nested paths, and no overwrite support in Loop11 MVP',
      evidence: 'contract tests cover plan/write/manifest/cleanup safety and dry-run plan consumption',
      rollback: 'revert Loop11 commit; no generated/archive/art assets should require cleanup'
    });
  });

  it('defaults to fail-closed plan-only behavior without explicit sandbox write approval', async () => {
    const plan = planArtifactSandboxWrite({
      ...approvedArtifactInput(),
      artifactWriteIntent: 'none',
      artifactWriteApproved: false
    });

    expect(plan).toMatchObject({
      ok: false,
      status: 'blocked',
      writeApproved: false,
      wouldWriteArtifact: false,
      dryRun: true,
      sandbox: true,
      blocker: 'artifact_write_not_approved'
    });
    expect(ArtifactSandboxWritePlanSchema.parse(plan)).toEqual(plan);

    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent()
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_write_not_approved',
      filesWritten: []
    });
  });

  it('creates deterministic sandbox-only write plans and manifests without raw payload or secret leakage', async () => {
    const first = planArtifactSandboxWrite(approvedArtifactInput());
    const second = planArtifactSandboxWrite(approvedArtifactInput());
    const firstManifest = createArtifactSandboxManifest(first);
    const secondManifest = createArtifactSandboxManifest(second);

    expect(first).toEqual(second);
    expect(firstManifest).toEqual(secondManifest);
    expect(first).toMatchObject({
      ok: true,
      status: 'planned',
      writeApproved: true,
      wouldWriteArtifact: false,
      sandboxRequired: true,
      sandboxRelativePath: 'player.metadata.json',
      manifestRelativePath: 'player.metadata.manifest.json',
      contentType: 'metadata/json',
      byteLength: Buffer.byteLength(artifactContent(), 'utf8'),
      sha256: sha256(artifactContent()),
      dryRun: true,
      sandbox: true,
      providerMode: 'live_dry_run',
      adapterMode: 'live-dry-run'
    });
    expect(firstManifest).toMatchObject({
      schemaVersion: 'art-provider-artifact-write-sandbox-v0.1',
      artifactId: 'player',
      artifactPlanId: 'player_sprite',
      sandboxRelativePath: 'player.metadata.json',
      manifestRelativePath: 'player.metadata.manifest.json',
      contentType: 'metadata/json',
      byteLength: Buffer.byteLength(artifactContent(), 'utf8'),
      sha256: sha256(artifactContent()),
      dryRun: true,
      sandbox: true
    });
    expect(JSON.stringify(firstManifest)).not.toContain('sk-live-secret-123');
    expect(JSON.stringify(firstManifest)).not.toContain(artifactContent());
    expect(JSON.stringify(firstManifest)).not.toMatch(/authorization|Bearer|base64|Uint8Array|ArrayBuffer/i);

    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan: first,
      content: artifactContent()
    });

    expect(write).toMatchObject({
      ok: true,
      status: 'written',
      sandboxRoot: await realpath(sandboxRoot),
      filesWritten: ['player.metadata.json', 'player.metadata.manifest.json']
    });
    expect(ArtifactSandboxManifestSchema.parse(write.manifest)).toEqual(write.manifest);
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).resolves.toBe(artifactContent());
    const manifestJson = await readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8');
    expect(manifestJson).not.toContain('sk-live-secret-123');
    expect(manifestJson).not.toContain(artifactContent());
  });

  it('rejects traversal, absolute, and nested target paths before any write can occur', async () => {
    expect(planArtifactSandboxWrite({ ...approvedArtifactInput(), targetPath: '../escape.json' })).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_path_escape'
    });

    expect(planArtifactSandboxWrite({ ...approvedArtifactInput(), targetPath: join(tmpdir(), 'escape.json') })).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_absolute_path_not_allowed'
    });

    expect(planArtifactSandboxWrite({ ...approvedArtifactInput(), targetPath: 'provider_dry_run/player.metadata.json' })).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_path_escape'
    });
  });

  it('rejects traversal, absolute, and nested manifest paths before target writes', async () => {
    const traversalPlan = planArtifactSandboxWrite({
      ...approvedArtifactInput(),
      manifestPath: '../player.metadata.manifest.json'
    });
    const absolutePlan = planArtifactSandboxWrite({
      ...approvedArtifactInput(),
      manifestPath: join(tmpdir(), 'player.metadata.manifest.json')
    });
    const nestedPlan = planArtifactSandboxWrite({
      ...approvedArtifactInput(),
      manifestPath: 'provider_dry_run/player.metadata.manifest.json'
    });

    expect(traversalPlan).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_path_escape'
    });
    expect(absolutePlan).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_absolute_path_not_allowed'
    });
    expect(nestedPlan).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_path_escape'
    });

    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
  });

  it('rejects identical target and manifest filenames', () => {
    expect(planArtifactSandboxWrite({ ...approvedArtifactInput(), manifestPath: 'player.metadata.json' })).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_path_escape'
    });
  });

  it('blocks overwrites by default and treats allowOverwrite as unsupported in Loop11', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const first = await writeArtifactToSandbox({ sandboxRoot, plan, content: artifactContent() });
    const blockedOverwrite = await writeArtifactToSandbox({ sandboxRoot, plan, content: artifactContent() });
    const allowedOverwrite = await writeArtifactToSandbox({ sandboxRoot, plan, content: artifactContent(), allowOverwrite: true });

    expect(first.ok).toBe(true);
    expect(blockedOverwrite).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_overwrite_not_allowed',
      filesWritten: []
    });
    expect(allowedOverwrite).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_overwrite_not_supported',
      filesWritten: []
    });
  });

  it('does not replace existing target content when default overwrite protection blocks', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const existingPath = join(sandboxRoot, 'player.metadata.json');
    await writeFile(existingPath, 'existing-content', 'utf8');

    const blockedOverwrite = await writeArtifactToSandbox({ sandboxRoot, plan, content: artifactContent() });

    expect(blockedOverwrite).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_overwrite_not_allowed',
      filesWritten: []
    });
    await expect(readFile(existingPath, 'utf8')).resolves.toBe('existing-content');
  });

  it('rejects sandbox root symlinks and final target/manifest symlinks without replacing linked content', async () => {
    const finalTargetPlan = planArtifactSandboxWrite(approvedArtifactInput());
    const outsideRoot = await mkdtemp(join(tmpdir(), 'ai-game-maker-artifact-outside-'));
    const rootLink = join(tmpdir(), `ai-game-maker-artifact-root-link-${Date.now()}`);
    await symlink(outsideRoot, rootLink);
    const rootSymlinkWrite = await writeArtifactToSandbox({
      sandboxRoot: rootLink,
      plan: finalTargetPlan,
      content: artifactContent()
    });

    expect(rootSymlinkWrite).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_symlink_escape',
      filesWritten: []
    });

    const outsideFile = join(outsideRoot, 'outside.json');
    await writeFile(outsideFile, 'outside-content', 'utf8');
    await symlink(outsideFile, join(sandboxRoot, 'player.metadata.json'));

    const finalTargetWrite = await writeArtifactToSandbox({
      sandboxRoot,
      plan: finalTargetPlan,
      content: artifactContent()
    });

    expect(finalTargetWrite).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_symlink_escape',
      filesWritten: []
    });
    await expect(readFile(outsideFile, 'utf8')).resolves.toBe('outside-content');

    await rm(sandboxRoot, { recursive: true, force: true });
    sandboxRoot = await mkdtemp(join(tmpdir(), 'ai-game-maker-artifact-sandbox-'));
    await symlink(outsideFile, join(sandboxRoot, 'player.metadata.manifest.json'));
    const finalManifestWrite = await writeArtifactToSandbox({
      sandboxRoot,
      plan: finalTargetPlan,
      content: artifactContent()
    });

    expect(finalManifestWrite).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_symlink_escape',
      filesWritten: []
    });

    await rm(rootLink, { force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  });

  it('does not leave target artifacts when manifest write fails after target creation', async () => {
    const manifestDirectoryPlan = planArtifactSandboxWrite({
      ...approvedArtifactInput(),
      manifestPath: 'player.metadata.manifest.json'
    });

    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan: manifestDirectoryPlan,
      content: artifactContent(),
      fileOps: manifestCloseFailingFileOps('player.metadata.manifest.json')
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      cleanup: {
        attempted: true,
        ok: true,
        removedPaths: ['player.metadata.json', 'player.metadata.manifest.json'],
        failedPaths: []
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('rolls back when close fails after target write succeeds', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: targetCloseFailingFileOps('player.metadata.json')
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      cleanup: {
        attempted: true,
        ok: true,
        removedPaths: ['player.metadata.json'],
        failedPaths: []
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('returns typed sync failure evidence and rolls back target writes without creating manifests', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: syncFailingFileOps({
        syncFileName: 'player.metadata.json',
        syncError: Object.assign(new Error('sk-live-secret-123 raw sync stack marker'), { code: 'EIO' })
      })
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      cleanup: {
        attempted: true,
        ok: true,
        removedPaths: ['player.metadata.json'],
        failedPaths: []
      },
      filesystemError: {
        pathRole: 'target',
        operation: 'sync',
        fsErrorCode: 'EIO',
        blockerCode: 'artifact_sandbox_write_failed'
      }
    });
    expect(JSON.stringify(write)).not.toContain('sk-live-secret-123');
    expect(JSON.stringify(write)).not.toContain('raw sync stack marker');
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('returns typed sync failure evidence and rolls back manifest plus target writes', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: syncFailingFileOps({
        syncFileName: 'player.metadata.manifest.json',
        syncError: errnoError('EPERM')
      })
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      cleanup: {
        attempted: true,
        ok: true,
        removedPaths: ['player.metadata.json', 'player.metadata.manifest.json'],
        failedPaths: []
      },
      filesystemError: {
        pathRole: 'manifest',
        operation: 'sync',
        fsErrorCode: 'EPERM',
        blockerCode: 'artifact_sandbox_write_failed'
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('reports typed rollback failure evidence when sync failure cleanup cannot remove the created file', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: syncFailingFileOps({
        syncFileName: 'player.metadata.json',
        syncError: errnoError('EIO'),
        unlinkFailureFileName: 'player.metadata.json'
      })
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_cleanup_failed',
      filesWritten: [],
      cleanup: {
        attempted: true,
        ok: false,
        removedPaths: [],
        failedPaths: ['player.metadata.json']
      },
      filesystemError: {
        pathRole: 'target',
        operation: 'sync',
        fsErrorCode: 'EIO',
        blockerCode: 'artifact_sandbox_write_failed'
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).resolves.toBe(artifactContent());
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('cleans up only sandbox-owned manifest paths and refuses outside-root cleanup evidence', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({ sandboxRoot, plan, content: artifactContent() });
    if (!write.ok || write.manifest === undefined) {
      throw new Error('expected sandbox write to succeed');
    }

    const cleanup = await cleanupArtifactSandboxWrite({ sandboxRoot, manifest: write.manifest });

    expect(cleanup).toMatchObject({
      ok: true,
      status: 'cleaned',
      removedPaths: ['player.metadata.json', 'player.metadata.manifest.json'],
      failedPaths: []
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();

    const maliciousCleanup = await cleanupArtifactSandboxWrite({
      sandboxRoot,
      manifest: {
        ...write.manifest,
        sandboxRelativePath: '../escape.json'
      }
    });

    expect(maliciousCleanup).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_path_escape',
      removedPaths: [],
      failedPaths: []
    });
  });

  it('reports partial cleanup failure with typed evidence', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({ sandboxRoot, plan, content: artifactContent() });
    if (!write.ok || write.manifest === undefined) {
      throw new Error('expected sandbox write to succeed');
    }

    const cleanup = await cleanupArtifactSandboxWrite({
      sandboxRoot,
      manifest: write.manifest,
      fileOps: unlinkFailingFileOps('player.metadata.manifest.json')
    });

    expect(cleanup).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_cleanup_failed',
      removedPaths: ['player.metadata.json'],
      failedPaths: ['player.metadata.manifest.json']
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).resolves.toContain('player');
  });

  it('returns typed write blockers for target lstat filesystem failures without writing files', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: lstatFailingFileOps((path) => path.endsWith('player.metadata.json'), errnoError('EACCES'))
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      filesystemError: {
        pathRole: 'target',
        operation: 'lstat',
        fsErrorCode: 'EACCES',
        blockerCode: 'artifact_sandbox_write_failed'
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('returns typed write blockers for manifest lstat filesystem failures before target creation', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: lstatFailingFileOps((path) => path.endsWith('player.metadata.manifest.json'), errnoError('EIO'))
    });

    expect(write).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      filesystemError: {
        pathRole: 'manifest',
        operation: 'lstat',
        fsErrorCode: 'EIO',
        blockerCode: 'artifact_sandbox_write_failed'
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('returns typed write blockers for target ELOOP and unknown lstat failures without leaking thrown values', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const loopFailure = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: lstatFailingFileOps((path) => path.endsWith('player.metadata.json'), errnoError('ELOOP'))
    });
    const unknownFailure = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: lstatFailingFileOps((path) => path.endsWith('player.metadata.json'), new Error('sk-live-secret-123 raw stack marker'))
    });

    expect(loopFailure).toMatchObject({
      ok: false,
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      filesystemError: {
        pathRole: 'target',
        operation: 'lstat',
        fsErrorCode: 'ELOOP',
        blockerCode: 'artifact_sandbox_write_failed'
      }
    });
    expect(unknownFailure).toMatchObject({
      ok: false,
      blocker: 'artifact_sandbox_write_failed',
      filesWritten: [],
      filesystemError: {
        pathRole: 'target',
        operation: 'lstat',
        fsErrorCode: 'UNKNOWN',
        blockerCode: 'artifact_sandbox_write_failed'
      }
    });
    expect(JSON.stringify(unknownFailure)).not.toContain('sk-live-secret-123');
    expect(JSON.stringify(unknownFailure)).not.toContain('raw stack marker');
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('returns typed blockers for sandbox root lstat and realpath failures without writing files', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const lstatFailure = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: lstatFailingFileOps((path) => path === sandboxRoot, errnoError('EPERM'))
    });
    const realpathFailure = await writeArtifactToSandbox({
      sandboxRoot,
      plan,
      content: artifactContent(),
      fileOps: realpathFailingFileOps(errnoError('EIO'))
    });

    expect(lstatFailure).toMatchObject({
      ok: false,
      blocker: 'artifact_sandbox_root_required',
      filesWritten: [],
      filesystemError: {
        pathRole: 'sandboxRoot',
        operation: 'lstat',
        fsErrorCode: 'EPERM',
        blockerCode: 'artifact_sandbox_root_required'
      }
    });
    expect(realpathFailure).toMatchObject({
      ok: false,
      blocker: 'artifact_sandbox_root_required',
      filesWritten: [],
      filesystemError: {
        pathRole: 'sandboxRoot',
        operation: 'realpath',
        fsErrorCode: 'EIO',
        blockerCode: 'artifact_sandbox_root_required'
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).rejects.toThrow();
  });

  it('returns typed cleanup failure evidence for cleanup lstat failures without throwing', async () => {
    const plan = planArtifactSandboxWrite(approvedArtifactInput());
    const write = await writeArtifactToSandbox({ sandboxRoot, plan, content: artifactContent() });
    if (!write.ok || write.manifest === undefined) {
      throw new Error('expected sandbox write to succeed');
    }

    const cleanup = await cleanupArtifactSandboxWrite({
      sandboxRoot,
      manifest: write.manifest,
      fileOps: lstatFailingFileOps((path) => path.endsWith('player.metadata.json'), errnoError('EACCES'))
    });

    expect(cleanup).toMatchObject({
      ok: false,
      status: 'blocked',
      blocker: 'artifact_sandbox_cleanup_failed',
      removedPaths: [],
      failedPaths: [],
      filesystemError: {
        pathRole: 'cleanup',
        operation: 'lstat',
        fsErrorCode: 'EACCES',
        blockerCode: 'artifact_sandbox_cleanup_failed'
      }
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).resolves.toBe(artifactContent());
    await expect(readFile(join(sandboxRoot, 'player.metadata.manifest.json'), 'utf8')).resolves.toContain('player');
  });

  it('lets live dry-run expose sandbox write plan metadata without resolver filesystem writes', async () => {
    const evidence = readyLivePreflightEvidence('sk-live-secret-123');
    const provider = createLiveDryRunArtProvider({ livePreflightEvidence: evidence });
    const providerResult = await provider.generate(createArtProviderRequest(assetIntent(), 'live_dry_run'));

    expect(providerResult).toMatchObject({
      ok: true,
      liveDryRunResult: {
        artifactWrite: {
          wouldWriteArtifact: false,
          sandboxWritePlan: {
            ok: true,
            status: 'planned',
            sandboxRequired: true,
            sandboxRelativePath: 'player.metadata.json',
            manifestRelativePath: 'player.metadata.manifest.json',
            contentType: 'metadata/json',
            dryRun: true,
            sandbox: true
          }
        }
      }
    });
    expect(JSON.stringify(providerResult)).not.toContain('sk-live-secret-123');
    expect(JSON.stringify(providerResult)).not.toMatch(/authorization|Bearer|base64|Uint8Array|ArrayBuffer/i);

    const resolved = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: { ...readyLivePolicyInput('sk-live-secret-123'), allowLiveDryRun: true }
    });

    expect(resolved).toMatchObject({
      ok: true,
      assets: [
        {
          liveDryRunResult: {
            artifactWrite: {
              wouldWriteArtifact: false,
              sandboxWritePlan: {
                ok: true,
                status: 'planned',
                sandboxRequired: true
              }
            }
          }
        }
      ],
      liveDryRunResults: [
        {
          artifactWrite: {
            sandboxWritePlan: {
              ok: true,
              status: 'planned',
              sandboxRequired: true
            }
          }
        }
      ]
    });
    await expect(readFile(join(sandboxRoot, 'player.metadata.json'), 'utf8')).rejects.toThrow();

    const fake = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: { requestedMode: 'fake' }
    });
    const disabledLive = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: { requestedMode: 'disabled-live', allowLiveDryRun: true }
    });

    expect(fake).toMatchObject({ ok: true, assets: [{ providerId: 'deterministic_fake_art_provider' }] });
    expect(fake.assets[0]).not.toHaveProperty('liveDryRunResult');
    expect(disabledLive).toMatchObject({ ok: false, failures: [{}] });
    expect(disabledLive.failures[0]).not.toHaveProperty('liveDryRunResult');
  });
});

function approvedArtifactInput() {
  return {
    artifactId: 'player',
    artifactPlanId: 'player_sprite',
    targetPath: 'player.metadata.json',
    manifestPath: 'player.metadata.manifest.json',
    content: artifactContent(),
    contentType: 'metadata/json',
    artifactWriteApproved: true,
    artifactWriteIntent: 'sandbox-write-approved',
    providerMode: 'live_dry_run',
    adapterMode: 'live-dry-run',
    evidenceRef: 'sk-live-secret-123'
  } as const;
}

function targetCloseFailingFileOps(targetFileName: string): ArtifactSandboxFileOps {
  return closeFailingFileOps((path) => path.endsWith(targetFileName));
}

function manifestCloseFailingFileOps(manifestFileName: string): ArtifactSandboxFileOps {
  return closeFailingFileOps((path) => path.endsWith(manifestFileName));
}

function closeFailingFileOps(shouldFailClose: (path: string) => boolean): ArtifactSandboxFileOps {
  return {
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
        async close() {
          await handle.close();
          if (shouldFailClose(path)) {
            throw new Error('injected close failure');
          }
        }
      };
    }
  };
}

function syncFailingFileOps(input: {
  syncFileName: string;
  syncError: unknown;
  unlinkFailureFileName?: string;
}): ArtifactSandboxFileOps {
  return {
    lstat,
    realpath,
    async unlink(path) {
      if (input.unlinkFailureFileName !== undefined && path.endsWith(input.unlinkFailureFileName)) {
        throw new Error('injected rollback unlink failure');
      }
      await unlink(path);
    },
    async openExclusive(path) {
      const handle = await open(path, 'wx');
      return {
        writeFile(content, encoding) {
          return handle.writeFile(content, encoding);
        },
        async sync() {
          if (path.endsWith(input.syncFileName)) {
            throw input.syncError;
          }
          await handle.sync();
        },
        close() {
          return handle.close();
        }
      };
    }
  };
}

function unlinkFailingFileOps(fileName: string): ArtifactSandboxFileOps {
  return {
    lstat,
    realpath,
    async unlink(path) {
      if (path.endsWith(fileName)) {
        throw new Error('injected unlink failure');
      }
      await unlink(path);
    },
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
}

function lstatFailingFileOps(shouldFailLstat: (path: string) => boolean, error: unknown): ArtifactSandboxFileOps {
  return {
    async lstat(path) {
      if (shouldFailLstat(path)) {
        throw error;
      }
      return lstat(path);
    },
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
}

function realpathFailingFileOps(error: unknown): ArtifactSandboxFileOps {
  return {
    lstat,
    async realpath() {
      throw error;
    },
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
}

function errnoError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`injected ${code}`), { code });
}

function artifactContent(): string {
  return `${JSON.stringify({ kind: 'dry-run-metadata', assetId: 'player', pixels: [0, 1, 2] }, null, 2)}\n`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function readyLivePreflightEvidence(credentialRef: string) {
  return createArtProviderLivePreflightEvidence(
    resolveArtProviderLivePreflight({
      requestedProvider: 'live',
      allowLiveProvider: true,
      allowNetwork: true,
      credentialRef,
      credentialAvailable: true,
      costAcknowledged: true,
      budgetLimitCents: 2500,
      artifactWriteIntent: 'write-through-approved'
    })
  );
}

function readyLivePolicyInput(credentialRef: string) {
  return {
    requestedMode: 'live',
    allowLiveProvider: true,
    allowNetwork: true,
    credentialRef,
    credentialAvailable: true,
    costAcknowledged: true,
    budgetLimitCents: 2500,
    artifactWriteIntent: 'write-through-approved'
  };
}

function assetPlan(): AssetPlan {
  return {
    version: 'asset-plan-v0.1',
    projectId: 'proj_loop11',
    style: {
      visual_theme: 'bright arcade forest',
      camera: 'side_view'
    },
    items: [
      {
        id: 'player',
        role: 'player_character',
        subject: 'runner player',
        view: 'side_view',
        size: { w: 128, h: 128 },
        format: 'svg',
        required: true,
        provider_priority: ['runtime_asset', 'template_svg']
      }
    ]
  };
}

function assetIntentManifest(): AssetIntentManifest {
  return {
    version: 'asset-intent-manifest-v0.1',
    projectId: 'proj_loop11',
    sourceArtifacts: {
      assetPlan: 'asset_plan.json'
    },
    summary: {
      total: 1,
      coreRequired: 1,
      requestRequired: 0,
      optional: 0,
      fallbackAllowed: 0,
      cacheKeyVersion: 'asset-intent-cache-v0.1'
    },
    intents: [assetIntent()]
  };
}

function assetIntent(): AssetIntent {
  return {
    id: 'player_sprite',
    assetPlanId: 'player',
    role: 'player_sprite',
    requiredLevel: 'core_required',
    style: 'bright arcade forest',
    subject: 'runner player',
    dimensions: { width: 128, height: 128 },
    sourceDslPaths: ['/visual/player'],
    fallbackPolicy: {
      allowed: false,
      reason: 'not_allowed_for_core_required'
    },
    cacheKey: {
      version: 'asset-intent-cache-v0.1',
      intentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      styleProfileVersion: 'asset-style-profile-v0.1',
      providerPolicyVersion: 'asset-provider-policy-v0.1'
    }
  };
}
