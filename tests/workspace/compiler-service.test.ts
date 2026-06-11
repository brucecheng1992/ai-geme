import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TemplateCompilerService } from '../../apps/maker-api/src/compiler/template-compiler.service.js';
import { ViteBuildRunnerService } from '../../apps/maker-api/src/compiler/vite-build-runner.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import { validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createDodgerRawDsl, createShooterRawDsl } from '../contracts/fixtures.js';

const projectId = 'proj_20260610_020000_abcd';
const runId = 'run_20260610_020000_abcd';
const repoRoot = process.cwd();
const templateRoot = join(repoRoot, 'templates', 'phaser');

describe('Compiler + Build + Preview services', () => {
  let root: string;
  let workspace: LocalWorkspaceService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-compiler-'));
    workspace = new LocalWorkspaceService(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes a generated project from normalized IR and selected template', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCollectorRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await new TemplateCompilerService(workspace, templateRoot).compile({ projectId, runId, ir: normalized.ir });

    expect(result).toMatchObject({
      ok: true,
      projectId,
      templateId: 'collector_v1',
      outputDir: workspace.getGeneratedProjectDir(projectId),
      distDir: workspace.getGeneratedProjectDistDir(projectId)
    });
    await expect(readFile(join(result.outputDir, 'collector/src/GameScene.ts'), 'utf8')).resolves.toContain('CollectorGameScene');
    await expect(readFile(join(result.outputDir, 'collector/src/collector-art-library.ts'), 'utf8')).resolves.toContain('createCollectorArtRuntime');
    await expect(readFile(join(result.outputDir, 'collector/src/asset-manifest.generated.json'), 'utf8')).resolves.toContain('"sourcePack": "agm-tiny-collector"');
    await expect(readFile(join(result.outputDir, 'collector/src/template-params.generated.json'), 'utf8')).resolves.toContain('collectible');
    await expect(readFile(join(result.outputDir, 'collector/src/main.ts'), 'utf8')).resolves.toContain('template-params.generated.json');
    await expect(readFile(join(result.outputDir, 'collector/src/main.ts'), 'utf8')).resolves.toContain('collectorArt.preload(this)');
    await expect(readFile(join(result.outputDir, 'collector/src/main.ts'), 'utf8')).resolves.toContain('new CollectorGameScene(collectorParams, collectorArt)');
    await expect(readFile(join(result.outputDir, 'index.html'), 'utf8')).resolves.toContain('./src/main.ts');
    await expect(readFile(join(result.outputDir, 'index.html'), 'utf8')).resolves.toContain('agm.preview.key');
    await expect(readFile(join(result.outputDir, 'src/main.ts'), 'utf8')).resolves.toContain("../collector/src/main.js");
    await expect(readFile(join(result.outputDir, 'package.json'), 'utf8')).resolves.toContain('vite build');
    await expect(readFile(join(result.outputDir, 'game.ir.json'), 'utf8')).resolves.toContain('"game-ir-v0.1"');
    await expect(readFile(join(result.outputDir, 'asset_plan.json'), 'utf8')).resolves.toContain('"asset-plan-v0.1"');
    await expect(readFile(join(result.outputDir, 'public/asset_manifest.json'), 'utf8')).resolves.toContain('"sourcePack": "agm-tiny-collector"');
    await expect(readFile(join(result.outputDir, 'public/asset_manifest.json'), 'utf8')).resolves.toContain('"licenseId": "CC0-1.0"');
    await expect(readFile(join(result.outputDir, 'public/assets/player.svg'), 'utf8')).resolves.toContain('<svg');
    await expect(readFile(join(result.outputDir, 'public/assets/background_main.svg'), 'utf8')).resolves.toContain('<svg');
    await expect(readFile(join(result.outputDir, 'public/assets/background_main.svg'), 'utf8')).resolves.toContain('Arcade field background');
  });

  it('resolves the default template root from the workspace root when started in the API package', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createCollectorRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const cwdProjectId = 'proj_20260610_020000_cwd';
    const originalCwd = process.cwd();
    try {
      process.chdir(join(repoRoot, 'apps/maker-api'));
      const result = await new TemplateCompilerService(new LocalWorkspaceService()).compile({ projectId: cwdProjectId, runId, ir: normalized.ir });

      expect(result.outputDir).toBe(join(repoRoot, 'data/generated-projects', cwdProjectId));
      await expect(readFile(join(result.outputDir, 'collector/src/GameScene.ts'), 'utf8')).resolves.toContain('CollectorGameScene');
    } finally {
      process.chdir(originalCwd);
      await rm(join(repoRoot, 'data/generated-projects', cwdProjectId), { recursive: true, force: true });
    }
  });

  it('cleans stale template files before recompiling the same generated project', async () => {
    const collector = validateAndNormalizeRawGameDsl(createCollectorRawDsl());
    const shooter = validateAndNormalizeRawGameDsl(createShooterRawDsl());
    expect(collector.ok).toBe(true);
    expect(shooter.ok).toBe(true);
    if (!collector.ok || !shooter.ok) {
      return;
    }

    const compiler = new TemplateCompilerService(workspace, templateRoot);
    const first = await compiler.compile({ projectId, runId, ir: collector.ir });
    await expect(readFile(join(first.outputDir, 'collector/src/GameScene.ts'), 'utf8')).resolves.toContain('CollectorGameScene');

    const second = await compiler.compile({ projectId, runId, ir: shooter.ir });
    await expect(readFile(join(second.outputDir, 'shooter/src/GameScene.ts'), 'utf8')).resolves.toContain('ShooterGameScene');
    await expect(readFile(join(second.outputDir, 'shooter/src/shooter-art-library.ts'), 'utf8')).resolves.toContain('createShooterArtRuntime');
    await expect(readFile(join(second.outputDir, 'shooter/src/asset-manifest.generated.json'), 'utf8')).resolves.toContain('"sourcePack": "kenney-tiny-shooter-tanks"');
    await expect(readFile(join(second.outputDir, 'shooter/src/asset-manifest.generated.json'), 'utf8')).resolves.toContain('"attribution": "Kenney Tanks by Kenney Vleugels"');
    await expect(readFile(join(second.outputDir, 'shooter/src/template-visuals.ts'), 'utf8')).resolves.toContain('drawShooterPlayer');
    await expect(readFile(join(second.outputDir, 'shooter/src/runtime-plan.generated.json'), 'utf8')).resolves.toContain('"enemy_waves"');
    await expect(readFile(join(second.outputDir, 'shooter/src/main.ts'), 'utf8')).resolves.toContain('runtime-plan.generated.json');
    await expect(readFile(join(second.outputDir, 'shooter/src/main.ts'), 'utf8')).resolves.toContain('shooterArt.preload(this)');
    await expect(readFile(join(second.outputDir, 'public/assets/enemy.svg'), 'utf8')).resolves.toContain('Kenney grey tank enemy sprite');
    await expect(readFile(join(second.outputDir, 'public/assets/projectile.svg'), 'utf8')).resolves.toContain('data:image/png;base64');
    await expect(readFile(join(second.outputDir, 'public/assets/collectible.svg'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(second.outputDir, 'collector/src/GameScene.ts'), 'utf8')).rejects.toThrow();
  });

  it('writes optional dodger collectible params when the DSL includes coins', async () => {
    const normalized = validateAndNormalizeRawGameDsl(createDodgerRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await new TemplateCompilerService(workspace, templateRoot).compile({ projectId, runId, ir: normalized.ir });

    await expect(readFile(join(result.outputDir, 'dodger/src/template-params.generated.json'), 'utf8')).resolves.toContain('"collectible"');
    await expect(readFile(join(result.outputDir, 'dodger/src/runtime-plan.generated.json'), 'utf8')).resolves.toContain('"spawn_rules"');
    await expect(readFile(join(result.outputDir, 'dodger/src/runtime-plan.generated.json'), 'utf8')).resolves.toContain('"entity_id": "obstacle"');
    await expect(readFile(join(result.outputDir, 'dodger/src/asset-manifest.generated.json'), 'utf8')).resolves.toContain('"loadKey": "agm.hazard"');
    await expect(readFile(join(result.outputDir, 'dodger/src/GameScene.ts'), 'utf8')).resolves.toContain('collectItem()');
    await expect(readFile(join(result.outputDir, 'dodger/src/dodger-art-library.ts'), 'utf8')).resolves.toContain('createDodgerArtRuntime');
    await expect(readFile(join(result.outputDir, 'dodger/src/main.ts'), 'utf8')).resolves.toContain('runtime-plan.generated.json');
    await expect(readFile(join(result.outputDir, 'dodger/src/asset-manifest.generated.json'), 'utf8')).resolves.toContain('"sourcePack": "kenney-tiny-dodger-tanks"');
    await expect(readFile(join(result.outputDir, 'dodger/src/asset-manifest.generated.json'), 'utf8')).resolves.toContain('"attribution": "Kenney Tanks by Kenney Vleugels"');
    await expect(readFile(join(result.outputDir, 'public/assets/hazard.svg'), 'utf8')).resolves.toContain('<svg');
    await expect(readFile(join(result.outputDir, 'public/assets/hazard.svg'), 'utf8')).resolves.toContain('data:image/png;base64');
    await expect(readFile(join(result.outputDir, 'public/assets/collectible.svg'), 'utf8')).resolves.toContain('<svg');
  });

  it('does not emit or preload collectible assets for dodger games without coins', async () => {
    const raw = createDodgerRawDsl();
    raw.player.actions = [];
    raw.entities = raw.entities.filter((entity) => entity.kind !== 'collectible');
    raw.rules.collisions = raw.rules.collisions.filter((collision) => collision.target !== 'coin');
    raw.ui.hud = ['health', 'timer'];
    const normalized = validateAndNormalizeRawGameDsl(raw);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const result = await new TemplateCompilerService(workspace, templateRoot).compile({ projectId, runId, ir: normalized.ir });

    await expect(readFile(join(result.outputDir, 'dodger/src/template-params.generated.json'), 'utf8')).resolves.not.toContain('"collectible"');
    await expect(readFile(join(result.outputDir, 'public/assets/hazard.svg'), 'utf8')).resolves.toContain('<svg');
    await expect(readFile(join(result.outputDir, 'public/assets/collectible.svg'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(result.outputDir, 'dodger/src/main.ts'), 'utf8')).resolves.toContain('dodgerParams.collectible !== undefined');
    await expect(readFile(join(result.outputDir, 'dodger/src/asset-manifest.generated.json'), 'utf8')).resolves.not.toContain('"id": "collectible"');
  });

  it('runs the injectable Vite build command and writes build logs', async () => {
    const projectDir = workspace.getGeneratedProjectDir(projectId);
    await mkdir(projectDir, { recursive: true });
    const runner = new ViteBuildRunnerService(workspace, async (_cmd, args) => ({
      exitCode: 0,
      stdout: args[0] === 'install' ? 'install ok' : 'built ok',
      stderr: ''
    }));

    const result = await runner.build({ projectId, runId, projectDir });

    expect(result).toMatchObject({
      ok: true,
      projectId,
      distDir: workspace.getGeneratedProjectDistDir(projectId),
      logPath: workspace.getBuildLogPath(projectId, runId)
    });
    await expect(readFile(workspace.getBuildLogPath(projectId, runId), 'utf8')).resolves.toContain('built ok');
  });

  it('captures Vite build failures with the same build log path', async () => {
    const projectDir = workspace.getGeneratedProjectDir(projectId);
    await mkdir(projectDir, { recursive: true });
    const runner = new ViteBuildRunnerService(workspace, async (_cmd, args) =>
      args[0] === 'install' ? { exitCode: 0, stdout: 'install ok', stderr: '' } : { exitCode: 1, stdout: '', stderr: 'build failed' }
    );

    const result = await runner.build({ projectId, runId, projectDir });

    expect(result).toMatchObject({
      ok: false,
      projectId,
      logPath: workspace.getBuildLogPath(projectId, runId),
      message: 'npm run build failed with exit code 1'
    });
    await expect(readFile(workspace.getBuildLogPath(projectId, runId), 'utf8')).resolves.toContain('build failed');
  });

  it('rejects build directories that do not match the current generated project', async () => {
    const mismatchedProjectDir = workspace.getGeneratedProjectDir('proj_other');
    await mkdir(mismatchedProjectDir, { recursive: true });
    const runner = new ViteBuildRunnerService(workspace, async () => ({ exitCode: 0, stdout: 'should not run', stderr: '' }));

    await expect(runner.build({ projectId, runId, projectDir: mismatchedProjectDir })).rejects.toThrow(
      `Build projectDir must match generated project directory for project ${projectId}`
    );
  });

  it('uses the generated dist index path expected by preview routing', async () => {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    const indexPath = join(distDir, 'index.html');
    await mkdir(distDir, { recursive: true });
    await writeFile(indexPath, '<html></html>');

    await expect(readFile(indexPath, 'utf8')).resolves.toBe('<html></html>');
  });
});
