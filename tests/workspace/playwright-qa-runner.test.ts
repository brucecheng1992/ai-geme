import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PlayableQaGateService } from '../../apps/maker-api/src/qa/playable-qa-gate.service.js';
import { evaluateCapabilityRuntimeEvidence, evaluateRuntimeAuthorityEvidence } from '../../apps/maker-api/src/qa/playwright-browser-runner.js';
import { PlaywrightQaRunnerService } from '../../apps/maker-api/src/qa/playwright-qa-runner.service.js';
import type { QaAssetRuntimeTelemetry, QaBrowserRunner, QaCapabilityRuntimeExpectation, QaRuntimeAuthorityExpectation } from '../../apps/maker-api/src/qa/qa.types.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import type { TelemetryEvent } from '../../packages/runtime-core/src/index.js';

const projectId = 'proj_20260610_030000_qa';
const runId = 'run_20260610_030000_qa';

describe('Playable QA gate and runner', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let gate: PlayableQaGateService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-qa-'));
    workspace = new LocalWorkspaceService(root);
    gate = new PlayableQaGateService();
    await writeValidAssetManifest(workspace, projectId);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('evaluates common, genre all, and any group telemetry requirements', () => {
    const required = gate.getRequiredEvents('shooter');
    const missing = gate.evaluate(['game.ready', 'game.started', 'input.received', 'player.moved', 'player.fired', 'projectile.spawned', 'enemy.hit', 'game.restarted'], required);

    expect(missing).toEqual({
      passed: false,
      missing_events: [],
      missing_any_groups: [['enemy.cleared', 'score.changed']]
    });

    const passed = gate.evaluate([...missingObservedBase(), 'score.changed'], required);
    expect(passed).toEqual({ passed: true, missing_events: [], missing_any_groups: [] });
  });

  it('writes a passed QA report from browser telemetry', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      snapshot: { gameStatus: 'READY', score: 1, health: 3, frame: 0 },
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile'])
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report.status).toBe('PASSED');
    expect(report.runtime_status).toBe('PASSED');
    expect(report.asset_semantic_status).toBe('PASSED');
    expect(report.overall_status).toBe('PLAYABLE');
    expect(report.code).toBeUndefined();
    expect(report.asset_report).toMatchObject({
      semantic_status: 'PASSED',
      required: ['background_main', 'player', 'enemy', 'projectile'],
      ready: ['background_main', 'player', 'enemy', 'projectile'],
      fallback_used: [],
      placeholder_used: [],
      missing: [],
      semantic_issues: [],
      failures: []
    });
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"status": "PASSED"');
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"overall_status": "PLAYABLE"');
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"asset_manifest_summary"');
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"asset_report"');
  });

  it('passes runtime authority evidence through the QA report', async () => {
    const expectedRuntimeAuthority = createRuntimeAuthorityExpectation();
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      snapshot: { runtimeAuthority: expectedRuntimeAuthority },
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile']),
      runtime_authority: {
        status: 'PASSED',
        expected: expectedRuntimeAuthority,
        observed: expectedRuntimeAuthority,
        mismatches: []
      }
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({
      projectId,
      runId,
      genre: 'shooter',
      previewUrl: 'http://localhost:3000/preview/proj/index.html',
      expectedRuntimeAuthority
    });

    expect(report.status).toBe('PASSED');
    expect(report.runtime_authority).toEqual({
      status: 'PASSED',
      expected: expectedRuntimeAuthority,
      observed: expectedRuntimeAuthority,
      mismatches: []
    });
  });

  it('evaluates capability runtime probe evidence from QA snapshot and telemetry', () => {
    const expectedCapabilityRuntime = createDefaultWeaponCapabilityRuntimeExpectation();
    const probe = {
      capabilityId: 'weapon.default_straight_single.v1',
      probeId: 'weapon.default_straight_single.v1.fire.browser_qa.v1',
      runtimeModuleId: 'weapon.default_straight_single',
      action: 'fire',
      eventType: 'player.fired',
      projectileEntityId: 'pulse_bolt',
      projectileId: 'projectile_1_0',
      sourceRef: 'runtime_plan.side_scrolling.player.projectileEntityId',
      status: 'observed'
    };
    const telemetry: TelemetryEvent[] = [
      {
        type: 'player.fired',
        timestamp_ms: 1,
        frame: 1,
        payload: { capabilityRuntime: probe }
      }
    ];

    expect(
      evaluateCapabilityRuntimeEvidence(
        {
          capabilityRuntime: {
            source: 'side_scrolling_runtime',
            probes: [probe]
          }
        },
        telemetry,
        expectedCapabilityRuntime
      )
    ).toMatchObject({
      status: 'PASSED',
      expected: expectedCapabilityRuntime,
      missingProbeIds: [],
      mismatches: [],
      observed: [
        expect.objectContaining({
          capabilityId: 'weapon.default_straight_single.v1',
          probeId: 'weapon.default_straight_single.v1.fire.browser_qa.v1',
          action: 'fire',
          eventType: 'player.fired',
          observedIn: ['snapshot', 'telemetry']
        })
      ]
    });
  });

  it('fails capability runtime evidence when a required probe is absent', () => {
    const expectedCapabilityRuntime = createDefaultWeaponCapabilityRuntimeExpectation();

    expect(evaluateCapabilityRuntimeEvidence({}, [], expectedCapabilityRuntime)).toEqual({
      status: 'FAILED',
      expected: expectedCapabilityRuntime,
      observed: [],
      missingProbeIds: ['weapon.default_straight_single.v1.fire.browser_qa.v1'],
      mismatches: ['capabilityRuntime.probes[weapon.default_straight_single.v1.fire.browser_qa.v1]: missing']
    });
  });

  it('passes capability runtime evidence through the QA report', async () => {
    const expectedCapabilityRuntime = createDefaultWeaponCapabilityRuntimeExpectation();
    const capabilityRuntime = evaluateCapabilityRuntimeEvidence(
      {
        capabilityRuntime: {
          source: 'side_scrolling_runtime',
          probes: [
            {
              capabilityId: 'weapon.default_straight_single.v1',
              probeId: 'weapon.default_straight_single.v1.fire.browser_qa.v1',
              runtimeModuleId: 'weapon.default_straight_single',
              action: 'fire',
              eventType: 'player.fired',
              projectileEntityId: 'pulse_bolt',
              projectileId: 'projectile_1_0',
              sourceRef: 'runtime_plan.side_scrolling.player.projectileEntityId',
              status: 'observed'
            }
          ]
        }
      },
      [],
      expectedCapabilityRuntime
    );
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: sideScrollingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: sideScrollingObservedBase(),
      snapshot: {},
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile']),
      capability_runtime: capabilityRuntime
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({
      projectId,
      runId,
      genre: 'side_scrolling_run_and_gun',
      previewUrl: 'http://localhost:3000/preview/proj/index.html',
      expectedCapabilityRuntime
    });

    expect(report.status).toBe('PASSED');
    expect(report.capability_runtime).toEqual(capabilityRuntime);
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"capability_runtime"');
  });

  it('fails QA when runtime authority evidence mismatches the expected bundle hash', async () => {
    const expectedRuntimeAuthority = createRuntimeAuthorityExpectation();
    const runtimeAuthority = evaluateRuntimeAuthorityEvidence(
      {
        runtimeAuthority: {
          ...expectedRuntimeAuthority,
          authorityBundleRef: {
            ...expectedRuntimeAuthority.authorityBundleRef,
            bundleHash: 'fnv1a_bad00000'
          }
        }
      },
      expectedRuntimeAuthority
    );
    const browserRunner: QaBrowserRunner = async () => ({
      ok: false,
      visual_ok: true,
      interaction_ok: false,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      snapshot: { runtimeAuthority: runtimeAuthority?.observed },
      console_errors: [],
      failure_code: 'RUNTIME_AUTHORITY_MISMATCH',
      message: runtimeAuthority?.mismatches.join('; '),
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile']),
      runtime_authority: runtimeAuthority
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({
      projectId,
      runId,
      genre: 'shooter',
      previewUrl: 'http://localhost:3000/preview/proj/index.html',
      expectedRuntimeAuthority
    });

    expect(runtimeAuthority).toMatchObject({
      status: 'FAILED',
      mismatches: ['authorityBundleRef.bundleHash: expected fnv1a_12345678, observed fnv1a_bad00000']
    });
    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'RUNTIME_AUTHORITY_MISMATCH',
      runtime_authority: runtimeAuthority
    });
  });

  it('keeps runtime QA passed but marks hard semantic mismatch as asset repair needed', async () => {
    for (const assetRoot of [workspace.getGeneratedProjectPublicDir(projectId), workspace.getGeneratedProjectDistDir(projectId)]) {
      await rewriteManifestAssetSemanticFit(assetRoot, 'player', {
        status: 'mismatch',
        confidence: 0,
        strictness: 'hard',
        expectedConcept: 'cat',
        expectedAnyTags: ['cat', 'kitten', 'feline'],
        actualTags: ['tank', 'vehicle', 'turret'],
        missingTags: ['cat', 'kitten', 'feline'],
        conflictingTags: ['tank', 'vehicle'],
        reason: 'Local asset semantic tags do not satisfy expected cat.'
      });
    }
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile'])
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'PASSED',
      runtime_status: 'PASSED',
      asset_semantic_status: 'FAILED',
      overall_status: 'NEEDS_ASSET_REPAIR',
      asset_report: {
        semantic_status: 'FAILED',
        assets: expect.arrayContaining([
          expect.objectContaining({
            id: 'background_main',
            semantic_status: 'PASSED'
          }),
          expect.objectContaining({
            id: 'player',
            semantic_status: 'FAILED',
            semantic_fit: expect.objectContaining({
              status: 'mismatch',
              strictness: 'hard',
              expectedConcept: 'cat'
            })
          })
        ]),
        semantic_issues: [
          {
            severity: 'failure',
            asset_id: 'player',
            role: 'player_character',
            semantic_fit_status: 'mismatch',
            strictness: 'hard',
            expected_concept: 'cat',
            missing_tags: ['cat', 'kitten', 'feline'],
            conflicting_tags: ['tank', 'vehicle'],
            reason: 'Local asset semantic tags do not satisfy expected cat.'
          }
        ],
        failures: []
      }
    });
  });

  it('treats generated semantic fallback as playable fallback assets, not mismatch', async () => {
    for (const assetRoot of [workspace.getGeneratedProjectPublicDir(projectId), workspace.getGeneratedProjectDistDir(projectId)]) {
      await rewriteManifestAssetSemanticFit(assetRoot, 'player', {
        status: 'fallback_generated',
        confidence: 1,
        strictness: 'hard',
        expectedConcept: 'cat',
        expectedAnyTags: ['cat', 'kitten', 'feline'],
        actualTags: ['template_svg'],
        reason: 'Generated deterministic template SVG fallback for expected cat.'
      });
    }
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile'])
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'PASSED',
      runtime_status: 'PASSED',
      asset_semantic_status: 'PASSED',
      overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS',
      asset_report: {
        semantic_status: 'PASSED',
        semantic_issues: [],
        assets: expect.arrayContaining([
          expect.objectContaining({
            id: 'player',
            semantic_status: 'PASSED',
            semantic_fit: expect.objectContaining({
              status: 'fallback_generated',
              strictness: 'hard',
              expectedConcept: 'cat'
            })
          })
        ])
      }
    });
  });

  it('keeps medium semantic mismatch as a non-blocking asset warning', async () => {
    for (const assetRoot of [workspace.getGeneratedProjectPublicDir(projectId), workspace.getGeneratedProjectDistDir(projectId)]) {
      await rewriteManifestAssetSemanticFit(assetRoot, 'background_main', {
        status: 'mismatch',
        confidence: 0,
        strictness: 'medium',
        expectedConcept: 'space',
        expectedAnyTags: ['space'],
        actualTags: ['battlefield', 'grassland'],
        missingTags: ['space'],
        conflictingTags: [],
        reason: 'Local asset semantic tags do not satisfy expected space.'
      });
    }
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile'])
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'PASSED',
      runtime_status: 'PASSED',
      asset_semantic_status: 'WARNING',
      overall_status: 'PLAYABLE_WITH_ART_WARNINGS',
      asset_report: {
        semantic_status: 'WARNING',
        semantic_issues: [
          {
            severity: 'warning',
            asset_id: 'background_main',
            role: 'background',
            semantic_fit_status: 'mismatch',
            strictness: 'medium',
            expected_concept: 'space',
            missing_tags: ['space'],
            conflicting_tags: [],
            reason: 'Local asset semantic tags do not satisfy expected space.'
          }
        ],
        failures: []
      }
    });
  });

  it('keeps mixed per-asset source metadata in the QA asset report', async () => {
    for (const assetRoot of [workspace.getGeneratedProjectPublicDir(projectId), workspace.getGeneratedProjectDistDir(projectId)]) {
      await rewriteManifestAssetMetadata(assetRoot, 'background_main', {
        source: 'local_asset_pack',
        sourcePack: 'kenney-tiny-dodger-tanks',
        licenseId: 'CC0-1.0',
        licenseName: 'Creative Commons CC0 1.0 Universal',
        attribution: 'AI Game Maker local background',
        sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
      });
      await rewriteManifestAssetMetadata(assetRoot, 'player', {
        source: 'local_asset_pack',
        sourcePack: 'kenney-tiny-dodger-tanks',
        licenseId: 'CC0-1.0',
        licenseName: 'Creative Commons CC0 1.0 Universal',
        attribution: 'Kenney Tanks by Kenney Vleugels',
        sourceUrl: 'https://kenney.nl/assets/tanks'
      });
    }
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'enemy', 'projectile'])
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report.asset_report?.sources).toEqual([
      {
        source_pack: 'kenney-tiny-dodger-tanks',
        license_id: 'CC0-1.0',
        license_name: 'Creative Commons CC0 1.0 Universal',
        attribution: 'AI Game Maker local background',
        source_url: 'https://creativecommons.org/publicdomain/zero/1.0/'
      },
      {
        source_pack: 'kenney-tiny-dodger-tanks',
        license_id: 'CC0-1.0',
        license_name: 'Creative Commons CC0 1.0 Universal',
        attribution: 'Kenney Tanks by Kenney Vleugels',
        source_url: 'https://kenney.nl/assets/tanks'
      }
    ]);
  });

  it('fails before browser QA when the generated asset manifest is missing', async () => {
    let browserCalled = false;
    await rm(workspace.getGeneratedProjectPublicDir(projectId), { recursive: true, force: true });
    const browserRunner: QaBrowserRunner = async () => {
      browserCalled = true;
      return {
        ok: true,
        visual_ok: true,
        interaction_ok: true,
        telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
        observed_events: missingObservedBase(),
        console_errors: []
      };
    };
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(browserCalled).toBe(false);
    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'ASSET_MANIFEST_INVALID'
    });
    expect(report.asset_report?.failures).toEqual([
      {
        code: 'ASSET_MANIFEST_INVALID',
        message: expect.stringContaining('Asset manifest is missing or unreadable'),
        asset_ids: [],
        roles: []
      }
    ]);
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "ASSET_MANIFEST_INVALID"');
  });

  it('fails before browser QA when preview build assets are missing', async () => {
    let browserCalled = false;
    await rm(workspace.getGeneratedProjectDistDir(projectId), { recursive: true, force: true });
    const browserRunner: QaBrowserRunner = async () => {
      browserCalled = true;
      return {
        ok: true,
        visual_ok: true,
        interaction_ok: true,
        telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
        observed_events: missingObservedBase(),
        console_errors: []
      };
    };
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(browserCalled).toBe(false);
    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'ASSET_MANIFEST_INVALID',
      message: expect.stringContaining('Preview asset validation failed')
    });
    expect(report.asset_report).toMatchObject({
      required: ['background_main', 'player', 'enemy', 'projectile'],
      failures: [
        {
          code: 'ASSET_MANIFEST_INVALID',
          message: expect.stringContaining('Preview asset validation failed'),
          asset_ids: [],
          roles: []
        }
      ]
    });
  });

  it('reports structured asset ids when a preview asset file is missing', async () => {
    let browserCalled = false;
    await rm(join(workspace.getGeneratedProjectDistDir(projectId), 'assets/player.svg'), { force: true });
    const browserRunner: QaBrowserRunner = async () => {
      browserCalled = true;
      return {
        ok: true,
        visual_ok: true,
        interaction_ok: true,
        telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
        observed_events: missingObservedBase(),
        console_errors: []
      };
    };
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(browserCalled).toBe(false);
    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'ASSET_MISSING',
      asset_report: {
        failures: [
          {
            code: 'ASSET_MISSING',
            message: 'Preview asset validation failed: Asset file is missing for player: assets/player.svg',
            asset_ids: ['player'],
            roles: ['player_character']
          }
        ]
      }
    });
  });

  it('reports structured asset ids when a core placeholder blocks QA', async () => {
    let browserCalled = false;
    await rewriteManifestAsset(workspace.getGeneratedProjectPublicDir(projectId), 'player', { source: 'placeholder' });
    await rewriteManifestAsset(workspace.getGeneratedProjectDistDir(projectId), 'player', { source: 'placeholder' });
    const browserRunner: QaBrowserRunner = async () => {
      browserCalled = true;
      return {
        ok: true,
        visual_ok: true,
        interaction_ok: true,
        telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
        observed_events: missingObservedBase(),
        console_errors: []
      };
    };
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(browserCalled).toBe(false);
    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED',
      asset_report: {
        failures: [
          {
            code: 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED',
            message: 'Required core asset player uses placeholder provider.',
            asset_ids: ['player'],
            roles: ['player_character']
          }
        ]
      }
    });
  });

  it('writes a QA_FAILED report when required telemetry is missing', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: [{ type: 'game.ready', timestamp_ms: 0, frame: 0 }],
      observed_events: ['game.ready'],
      console_errors: [],
      asset_runtime: validQaAssetRuntime(['background_main', 'player', 'collectible'])
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'collector', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'REQUIRED_TELEMETRY_MISSING',
      missing_events: ['game.started', 'input.received', 'game.restarted', 'player.moved', 'item.spawned', 'item.collected', 'score.changed']
    });
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "REQUIRED_TELEMETRY_MISSING"');
  });

  it('fails collector QA when an injected browser runner omits runtime asset telemetry', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      snapshot: { gameStatus: 'READY', score: 1, health: 3, frame: 0 },
      console_errors: []
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'collector', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'ASSET_LOAD_FAILED',
      message: 'Collector QA expected runtime asset telemetry in browser result.',
      asset_report: {
        failures: [
          {
            code: 'ASSET_LOAD_FAILED',
            message: 'Collector QA expected runtime asset telemetry in browser result.',
            asset_ids: [],
            roles: []
          }
        ]
      }
    });
  });

  it('preserves QA bridge missing failures in the QA report', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: false,
      visual_ok: true,
      interaction_ok: false,
      telemetry: [],
      observed_events: [],
      console_errors: [],
      failure_code: 'QA_BRIDGE_MISSING',
      message: 'Timed out waiting for __GAME_QA__.'
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'collector', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'QA_BRIDGE_MISSING',
      message: 'Timed out waiting for __GAME_QA__.'
    });
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "QA_BRIDGE_MISSING"');
  });

  it('fails dodger QA when an injected browser runner omits runtime asset telemetry', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: dodgerObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: dodgerObservedBase(),
      snapshot: { gameStatus: 'READY', score: 1, health: 3, frame: 0 },
      console_errors: []
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'ASSET_LOAD_FAILED',
      message: 'Dodger QA expected runtime asset telemetry in browser result.',
      asset_report: {
        failures: [
          {
            code: 'ASSET_LOAD_FAILED',
            message: 'Dodger QA expected runtime asset telemetry in browser result.',
            asset_ids: [],
            roles: []
          }
        ]
      }
    });
  });

  it(
    'p0_false_playable_blank_preview',
    async () => {
      const server = await startBlankTelemetryPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'VISUAL_QA_FAILED',
          code: 'PREVIEW_BLANK_SCREEN'
        });
        expect(report.observed_events).toEqual([]);
        await expect(readFile(workspace.getQaScreenshotPath(projectId, runId))).resolves.toBeTruthy();
        await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "PREVIEW_BLANK_SCREEN"');
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when required runtime assets are not loaded',
    async () => {
      const server = await startStaticDodgerPreviewServer(dodgerRuntimeAssetsJson({ loaded: ['background_main', 'hazard'] }));
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'ASSET_LOAD_FAILED',
          message: 'Dodger QA expected required assets to load: player'
        });
        expect(report.asset_report).toMatchObject({
          runtime: {
            manifest_loaded: true,
            required: ['background_main', 'player', 'hazard'],
            loaded: ['background_main', 'hazard']
          },
          failures: [
            {
              code: 'ASSET_LOAD_FAILED',
              message: 'Dodger QA expected required assets to load: player',
              asset_ids: ['player'],
              roles: []
            }
          ]
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime asset telemetry reports missing assets',
    async () => {
      const server = await startStaticDodgerPreviewServer(dodgerRuntimeAssetsJson({ missing: ['player'] }));
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'ASSET_LOAD_FAILED',
          message: 'Dodger QA observed missing manifest assets: player'
        });
        expect(report.asset_report?.failures).toEqual([
          {
            code: 'ASSET_LOAD_FAILED',
            message: 'Dodger QA observed missing manifest assets: player',
            asset_ids: ['player'],
            roles: []
          }
        ]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'passes collector QA only after directional movement collects an item',
    async () => {
      const server = await startHtmlPreviewServer(collectorMovementHtml());
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'collector', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'PASSED',
          runtime_status: 'PASSED',
          visual_status: 'PASSED',
          missing_events: [],
          missing_any_groups: []
        });
        expect(report.observed_events).toEqual(expect.arrayContaining(['player.moved', 'item.collected', 'score.changed', 'game.restarted']));
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when required manifest roles are absent from runtime assets',
    async () => {
      const server = await startStaticDodgerPreviewServer(dodgerRuntimeAssetsJson({ required: ['background_main', 'hazard'], loaded: ['background_main', 'hazard'], missingRequiredRoles: ['player_character'] }));
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'ASSET_LOAD_FAILED',
          message: 'Dodger QA observed missing required asset roles: player_character'
        });
        expect(report.asset_report?.failures).toEqual([
          {
            code: 'ASSET_LOAD_FAILED',
            message: 'Dodger QA observed missing required asset roles: player_character',
            asset_ids: [],
            roles: ['player_character']
          }
        ]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when telemetry exists but the survival frame does not advance',
    async () => {
      const server = await startStaticDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected survival frame to advance automatically after preview load.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan spawn telemetry does not match the QA snapshot',
    async () => {
      const server = await startRuntimePlanMismatchDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan hazard spawn telemetry to match the snapshot spawnPlan.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan spawnPlan metadata is incomplete',
    async () => {
      const server = await startIncompleteRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan spawnPlan.hazard to include entityId, strategy, count, maxActive, intervalMs, and laneCount.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan difficultyPlan metadata is incomplete',
    async () => {
      const telemetry = dodgerObservedBase()
        .map((type, index) => ({
          type,
          timestamp_ms: index,
          frame: index,
          payload:
            type === 'hazard.spawned'
              ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'right_edge_wave', count: 5, maxActive: 2, intervalMs: 700, laneCount: 4 }
              : undefined
        }))
        .map((event) => JSON.stringify(event))
        .join(',');
      const html = dodgerRuntimePlanHtml(
        telemetry,
        {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2,
            intervalMs: 700,
            laneCount: 4
          }
        },
        { difficultyPlan: { level: 'normal', source: 'runtime_plan' } }
      );
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message:
            'Dodger QA expected runtime_plan difficultyPlan to include level, derivedFrom, rampDurationMs, rampProgress, speed multipliers, and spawn interval multipliers.'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan difficultyPlan is present but hazard telemetry lacks difficulty metadata',
    async () => {
      const telemetry = dodgerObservedBase()
        .map((type, index) => ({
          type,
          timestamp_ms: index,
          frame: index,
          payload: type === 'hazard.spawned' ? { source: 'template_default', entityId: 'hazard', strategy: 'right_edge_wave', count: 99, maxActive: 3, intervalMs: 1000, laneCount: 3 } : undefined
        }))
        .map((event) => JSON.stringify(event))
        .join(',');
      const html = dodgerRuntimePlanHtml(
        telemetry,
        {
          hazard: {
            entityId: 'hazard',
            strategy: 'right_edge_wave',
            source: 'template_default',
            count: 99,
            maxActive: 3,
            intervalMs: 1000,
            laneCount: 3
          }
        },
        {
          difficultyPlan: {
            level: 'normal',
            source: 'runtime_plan',
            derivedFrom: 'game.difficulty,game.target_play_time_sec',
            rampDurationMs: 60000,
            rampProgress: 0,
            speedMultiplierStart: 1,
            speedMultiplierEnd: 1.25,
            speedMultiplier: 1,
            spawnIntervalMultiplierStart: 1,
            spawnIntervalMultiplierEnd: 0.8,
            spawnIntervalMultiplier: 1
          }
        }
      );
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan difficulty_curve metadata on hazard spawn telemetry.'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'accepts collectible runtime_plan spawns while hazard difficulty curve metadata is present',
    async () => {
      const telemetry = dodgerObservedBase()
        .map((type, index) => ({
          type,
          timestamp_ms: index,
          frame: index,
          payload:
            type === 'hazard.spawned'
              ? {
                  source: 'runtime_plan',
                  entityId: 'obstacle',
                  strategy: 'right_edge_wave',
                  count: 5,
                  maxActive: 2,
                  intervalMs: 700,
                  effectiveIntervalMs: 700,
                  laneCount: 4,
                  difficultyLevel: 'normal',
                  difficultySource: 'runtime_plan',
                  rampProgress: 0,
                  speedMultiplier: 1,
                  spawnIntervalMultiplier: 1
                }
              : type === 'item.spawned'
                ? { source: 'runtime_plan', entityId: 'coin', strategy: 'fixed_positions', count: 6, maxActive: 2, intervalMs: 900 }
                : undefined
        }))
        .map((event) => JSON.stringify(event))
        .join(',');
      const html = dodgerRuntimePlanHtml(
        telemetry,
        {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2,
            intervalMs: 700,
            laneCount: 4
          },
          collectible: {
            entityId: 'coin',
            strategy: 'fixed_positions',
            source: 'runtime_plan',
            count: 6,
            maxActive: 2,
            intervalMs: 900
          }
        },
        {
          difficultyPlan: {
            level: 'normal',
            source: 'runtime_plan',
            derivedFrom: 'game.difficulty,game.target_play_time_sec',
            rampDurationMs: 60000,
            rampProgress: 0,
            speedMultiplierStart: 1,
            speedMultiplierEnd: 1.25,
            speedMultiplier: 1,
            spawnIntervalMultiplierStart: 1,
            spawnIntervalMultiplierEnd: 0.8,
            spawnIntervalMultiplier: 1
          }
        }
      );
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'PASSED',
          visual_status: 'PASSED'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when collectible runtime_plan spawn telemetry does not match the QA snapshot',
    async () => {
      const server = await startCollectibleRuntimePlanMismatchDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan collectible spawn telemetry to match the snapshot spawnPlan.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when collectible runtime_plan spawnPlan metadata is incomplete',
    async () => {
      const server = await startIncompleteCollectibleRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan spawnPlan.collectible to include entityId, strategy, count, maxActive, and intervalMs.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when collectible runtime_plan uses an unsupported strategy even if telemetry matches',
    async () => {
      const server = await startUnsupportedCollectibleRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan collectible strategy to be fixed_positions without laneCount.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when hazard runtime_plan uses an unsupported strategy even if telemetry matches',
    async () => {
      const server = await startUnsupportedHazardRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan hazard strategy to be right_edge_wave.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'accepts shooter runtime_plan enemy wave metadata when hit telemetry matches the QA snapshot',
    async () => {
      const html = shooterRuntimePlanHtml({
        enemiesActive: 1,
        hitPayload: { entityId: 'alien', waveSource: 'runtime_plan', strategy: 'right_edge_wave', speedMultiplier: 1.15 }
      });
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'PASSED',
          visual_status: 'PASSED'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails shooter QA when runtime_plan enemyWavePlan exceeds maxActive',
    async () => {
      const html = shooterRuntimePlanHtml({
        enemiesActive: 2,
        hitPayload: { entityId: 'alien', waveSource: 'runtime_plan', strategy: 'right_edge_wave', speedMultiplier: 1.15 }
      });
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Shooter QA expected runtime_plan enemyWavePlan maxActive 1, observed 2 active enemies.'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails shooter QA when runtime_plan enemy hit telemetry does not match the QA snapshot',
    async () => {
      const html = shooterRuntimePlanHtml({
        enemiesActive: 1,
        hitPayload: { entityId: 'alien', waveSource: 'template_default', strategy: 'right_edge_wave', speedMultiplier: 1 }
      });
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Shooter QA expected runtime_plan enemy wave hit or clear telemetry to match the snapshot enemyWavePlan.'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );
});

function missingObservedBase(): TelemetryEvent['type'][] {
  return ['game.ready', 'game.started', 'input.received', 'player.moved', 'player.fired', 'projectile.spawned', 'enemy.hit', 'game.restarted', 'score.changed'];
}

function sideScrollingObservedBase(): TelemetryEvent['type'][] {
  return [
    'game.ready',
    'game.started',
    'input.received',
    'player.moved',
    'player.jumped',
    'player.fired',
    'enemy.fired',
    'projectile.spawned',
    'enemy.hit',
    'checkpoint.reached',
    'game.restarted',
    'level.segment.completed'
  ];
}

async function writeValidAssetManifest(workspace: LocalWorkspaceService, id: string): Promise<void> {
  const assets = [
    { id: 'background_main', role: 'background', size: { w: 640, h: 360 } },
    { id: 'player', role: 'player_character', size: { w: 64, h: 64 } },
    { id: 'enemy', role: 'enemy', size: { w: 64, h: 64 } },
    { id: 'projectile', role: 'projectile', size: { w: 32, h: 32 } }
  ] as const;
  const projectDir = workspace.getGeneratedProjectDir(id);
  const publicDir = workspace.getGeneratedProjectPublicDir(id);
  const distDir = workspace.getGeneratedProjectDistDir(id);
  const assetRoots = [publicDir, distDir];
  for (const assetRoot of assetRoots) {
    await mkdir(join(assetRoot, 'assets'), { recursive: true });
  }
  await writeFile(
    join(projectDir, 'asset_plan.json'),
    `${JSON.stringify(
      {
        version: 'asset-plan-v0.1',
        projectId: id,
        style: { visual_theme: 'test', camera: 'top_down' },
        items: assets.map((asset) => ({
          id: asset.id,
          role: asset.role,
          subject: asset.id,
          view: 'top_down',
          size: asset.size,
          format: 'svg',
          required: true,
          provider_priority: ['local_asset_pack', 'template_svg', 'placeholder']
        }))
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  for (const assetRoot of assetRoots) {
    for (const asset of assets) {
      await writeFile(
        join(assetRoot, `assets/${asset.id}.svg`),
        `<svg xmlns="http://www.w3.org/2000/svg" width="${asset.size.w}" height="${asset.size.h}"></svg>`,
        'utf8'
      );
    }
    await writeFile(
      join(assetRoot, 'asset_manifest.json'),
      `${JSON.stringify(
        {
          version: 'asset-manifest-v0.1',
          projectId: id,
          strict: true,
          assets: assets.map((asset) => ({
            id: asset.id,
            loadKey: `agm.${asset.id}`,
            role: asset.role,
            type: 'image',
            format: 'svg',
            path: `assets/${asset.id}.svg`,
            source: 'template_svg',
            required: true,
            status: 'ready',
            size: asset.size
          })),
          summary: { required: assets.length, ready: assets.length, fallback_used: 0, missing: 0, placeholder_used: 0 }
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }
}

async function startBlankTelemetryPreviewServer(): Promise<Server> {
  const telemetry = missingObservedBase()
    .map((type, index) => ({ type, timestamp_ms: index, frame: index }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:white">
    <canvas width="640" height="360" style="width:640px;height:360px"></canvas>
    <script>
      const telemetry = [${telemetry}];
      window.__GAME_TELEMETRY__ = { events: telemetry, state: { gameStatus: 'READY', score: 1, health: 3, frame: 0 } };
      window.__GAME_QA__ = {
        snapshot() { return window.__GAME_TELEMETRY__.state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startStaticDodgerPreviewServer(assetTelemetry = dodgerRuntimeAssetsJson()): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({ type, timestamp_ms: index, frame: 0 }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px;background:linear-gradient(135deg,#07111f 0%,#2a2438 35%,#ffd28a 62%,#9ca3af 100%)"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      const assets = ${assetTelemetry};
      window.__GAME_TELEMETRY__ = { events: telemetry, state: { gameStatus: 'PLAYING', score: 0, health: 3, frame: 0 }, assets };
      window.__GAME_QA__ = {
        snapshot() { return window.__GAME_TELEMETRY__.state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startRuntimePlanMismatchDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'right_edge_wave', count: 5, maxActive: 99, intervalMs: 700, laneCount: 3 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px;background:linear-gradient(135deg,#07111f 0%,#2a2438 35%,#ffd28a 62%,#9ca3af 100%)"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      const assets = ${dodgerRuntimeAssetsJson()};
      const state = {
        gameStatus: 'PLAYING',
        score: 0,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        spawnPlan: {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2,
            intervalMs: 700,
            laneCount: 4
          }
        }
      };
      setInterval(() => {
        state.frame += 1;
      }, 350);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          state.player.y += 80;
        }
        if (event.key === 'ArrowUp') {
          state.player.y -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state, assets };
      window.__GAME_QA__ = {
        snapshot() { return state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startIncompleteRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'right_edge_wave', count: 5, maxActive: 2, intervalMs: 700, laneCount: 4 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px;background:linear-gradient(135deg,#07111f 0%,#2a2438 35%,#ffd28a 62%,#9ca3af 100%)"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      const assets = ${dodgerRuntimeAssetsJson()};
      const state = {
        gameStatus: 'PLAYING',
        score: 0,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        spawnPlan: {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2
          }
        }
      };
      setInterval(() => {
        state.frame += 1;
      }, 350);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          state.player.y += 80;
        }
        if (event.key === 'ArrowUp') {
          state.player.y -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state, assets };
      window.__GAME_QA__ = {
        snapshot() { return state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startCollectibleRuntimePlanMismatchDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'template_default', entityId: 'hazard', strategy: 'right_edge_wave', count: 99, maxActive: 3, intervalMs: 1000, laneCount: 3 }
          : type === 'item.spawned'
            ? { source: 'runtime_plan', entityId: 'coin', strategy: 'fixed_positions', count: 6, maxActive: 99, intervalMs: 900 }
            : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    collectible: {
      entityId: 'coin',
      strategy: 'fixed_positions',
      source: 'runtime_plan',
      count: 6,
      maxActive: 2,
      intervalMs: 900
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startIncompleteCollectibleRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'item.spawned'
          ? { source: 'runtime_plan', entityId: 'coin', strategy: 'fixed_positions', count: 6, maxActive: 2, intervalMs: 900 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    collectible: {
      entityId: 'coin',
      strategy: 'fixed_positions',
      source: 'runtime_plan',
      count: 6,
      maxActive: 2
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startUnsupportedCollectibleRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'item.spawned'
          ? { source: 'runtime_plan', entityId: 'coin', strategy: 'right_edge_wave', count: 6, maxActive: 2, intervalMs: 900, laneCount: 3 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    collectible: {
      entityId: 'coin',
      strategy: 'right_edge_wave',
      source: 'runtime_plan',
      count: 6,
      maxActive: 2,
      intervalMs: 900,
      laneCount: 3
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startUnsupportedHazardRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'fixed_positions', count: 5, maxActive: 2, intervalMs: 700, laneCount: 3 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    hazard: {
      entityId: 'obstacle',
      strategy: 'fixed_positions',
      source: 'runtime_plan',
      count: 5,
      maxActive: 2,
      intervalMs: 700,
      laneCount: 3
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

function dodgerRuntimePlanHtml(telemetry: string, spawnPlan: Record<string, unknown>, extraState: Record<string, unknown> = {}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px;background:linear-gradient(135deg,#07111f 0%,#2a2438 35%,#ffd28a 62%,#9ca3af 100%)"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      const assets = ${dodgerRuntimeAssetsJson()};
      const state = {
        gameStatus: 'PLAYING',
        score: 0,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        spawnPlan: ${JSON.stringify(spawnPlan)},
        ...${JSON.stringify(extraState)}
      };
      setInterval(() => {
        state.frame += 1;
      }, 350);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          state.player.y += 80;
        }
        if (event.key === 'ArrowUp') {
          state.player.y -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state, assets };
      window.__GAME_QA__ = {
        snapshot() { return state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
}

function shooterRuntimePlanHtml(params: { enemiesActive: number; hitPayload: Record<string, unknown> }): string {
  const telemetry = missingObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload: type === 'enemy.hit' || type === 'enemy.cleared' ? params.hitPayload : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  return `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px;background:linear-gradient(135deg,#07111f 0%,#2a2438 35%,#ffd28a 62%,#9ca3af 100%)"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#22d3ee';
      context.fillRect(80, 150, 90, 70);
      context.fillStyle = '#f97316';
      context.beginPath();
      context.arc(470, 180, 46, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fef08a';
      context.fillRect(250, 176, 120, 10);
      const telemetry = [${telemetry}];
      const state = {
        gameStatus: 'PLAYING',
        score: 1,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        enemiesActive: ${params.enemiesActive},
        enemyWavePlan: {
          derivedFrom: 'entities.enemy.id,entities.enemy.count,entities.enemy.health,entities.enemy.movement.speed_px_per_sec,game.difficulty,game.target_play_time_sec',
          entityId: 'alien',
          strategy: 'right_edge_wave',
          source: 'runtime_plan',
          count: 3,
          maxActive: 1,
          intervalMs: 700,
          speedMultiplier: 1.15
        }
      };
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
          state.player.x += 80;
        }
        if (event.key === 'ArrowLeft') {
          state.player.x -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state, assets: ${shooterRuntimeAssetsJson()} };
      window.__GAME_QA__ = {
        snapshot() { return state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
}

function collectorMovementHtml(): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px;background:linear-gradient(135deg,#07111f 0%,#123323 45%,#ffd95a 100%)"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffd95a';
      context.beginPath();
      context.arc(470, 180, 36, 0, Math.PI * 2);
      context.fill();
      const telemetry = [
        { type: 'game.ready', timestamp_ms: 0, frame: 0 },
        { type: 'item.spawned', timestamp_ms: 1, frame: 0 }
      ];
      const state = { gameStatus: 'READY', score: 0, health: 1, frame: 0, player: { x: 250, y: 180 }, collectible: { x: 470, y: 180 } };
      let movingRight = false;
      function emit(type, payload) {
        telemetry.push({ type, timestamp_ms: telemetry.length, frame: state.frame, payload });
      }
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          state.gameStatus = 'PLAYING';
          emit('input.received', { input: 'start' });
          emit('game.started');
        }
        if (event.key === 'ArrowRight') {
          movingRight = true;
          emit('input.received', { input: 'move' });
        }
        if (event.key.toLowerCase() === 'r') {
          state.gameStatus = 'READY';
          emit('input.received', { input: 'restart' });
          emit('game.restarted');
        }
      });
      document.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowRight') {
          movingRight = false;
        }
      });
      setInterval(() => {
        if (state.gameStatus !== 'PLAYING' || !movingRight) {
          return;
        }
        const fromX = state.player.x;
        state.frame += 1;
        state.player.x += 28;
        emit('player.moved', { fromX, fromY: state.player.y, toX: state.player.x, toY: state.player.y });
        if (state.score === 0 && Math.abs(state.player.x - state.collectible.x) <= 84) {
          emit('collision.detected', { source: 'player', target: 'collectible' });
          emit('item.collected');
          state.score = 1;
          emit('score.changed', { score: state.score });
        }
      }, 80);
      window.__GAME_TELEMETRY__ = { events: telemetry, state, assets: ${collectorRuntimeAssetsJson()} };
      window.__GAME_QA__ = {
        snapshot() { return state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
}

async function startHtmlPreviewServer(html: string): Promise<Server> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

function dodgerObservedBase(): TelemetryEvent['type'][] {
  return [
    'game.ready',
    'game.started',
    'input.received',
    'game.restarted',
    'player.moved',
    'hazard.spawned',
    'collision.detected',
    'player.damaged',
    'item.spawned',
    'survival_time.changed'
  ];
}

function dodgerRuntimeAssetsJson(
  options: { collectible?: boolean; required?: string[]; loaded?: string[]; missing?: string[]; missingRequiredRoles?: string[] } = {}
): string {
  const required = options.required ?? ['background_main', 'player', 'hazard', ...(options.collectible === true ? ['collectible'] : [])];
  const loaded = options.loaded ?? required;
  return JSON.stringify({
    manifestLoaded: true,
    required,
    loaded,
    failed: [],
    fallbackUsed: required,
    placeholderUsed: [],
    missing: options.missing ?? [],
    missingRequiredRoles: options.missingRequiredRoles ?? []
  });
}

function shooterRuntimeAssetsJson(): string {
  const required = ['background_main', 'player', 'enemy', 'projectile'];
  return JSON.stringify({
    manifestLoaded: true,
    required,
    loaded: required,
    failed: [],
    fallbackUsed: [],
    placeholderUsed: [],
    missing: [],
    missingRequiredRoles: []
  });
}

function collectorRuntimeAssetsJson(): string {
  const required = ['background_main', 'player', 'collectible'];
  return JSON.stringify({
    manifestLoaded: true,
    required,
    loaded: required,
    failed: [],
    fallbackUsed: [],
    placeholderUsed: [],
    missing: [],
    missingRequiredRoles: []
  });
}

function validQaAssetRuntime(assetIds: string[]): QaAssetRuntimeTelemetry {
  return {
    manifest_loaded: true,
    required: assetIds,
    loaded: assetIds,
    failed: [],
    fallback_used: [],
    placeholder_used: [],
    missing: [],
    missing_required_roles: []
  };
}

async function rewriteManifestAsset(
  assetRoot: string,
  assetId: string,
  patch: { source?: 'template_svg' | 'placeholder'; status?: 'ready' | 'fallback_used' | 'missing' }
): Promise<void> {
  const manifestPath = join(assetRoot, 'asset_manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    assets: Array<{ id: string; source: string; status: string }>;
    summary: { required: number; ready: number; fallback_used: number; missing: number; placeholder_used: number };
  };
  const asset = manifest.assets.find((candidate) => candidate.id === assetId);
  if (asset === undefined) {
    throw new Error(`Unable to find test asset ${assetId}`);
  }

  Object.assign(asset, patch);
  manifest.summary = {
    required: manifest.assets.filter((candidate) => candidate.status !== 'missing').length,
    ready: manifest.assets.filter((candidate) => candidate.status === 'ready').length,
    fallback_used: manifest.assets.filter((candidate) => candidate.status === 'fallback_used').length,
    missing: manifest.assets.filter((candidate) => candidate.status === 'missing').length,
    placeholder_used: manifest.assets.filter((candidate) => candidate.source === 'placeholder').length
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function rewriteManifestAssetMetadata(
  assetRoot: string,
  assetId: string,
  patch: {
    source: 'local_asset_pack';
    sourcePack: string;
    licenseId: string;
    licenseName: string;
    attribution: string;
    sourceUrl: string;
  }
): Promise<void> {
  const manifestPath = join(assetRoot, 'asset_manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    assets: Array<{
      id: string;
      source: string;
      sourcePack?: string;
      licenseId?: string;
      licenseName?: string;
      attribution?: string;
      sourceUrl?: string;
    }>;
  };
  const asset = manifest.assets.find((candidate) => candidate.id === assetId);
  if (asset === undefined) {
    throw new Error(`Unable to find test asset ${assetId}`);
  }

  Object.assign(asset, patch);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function rewriteManifestAssetSemanticFit(
  assetRoot: string,
  assetId: string,
  semanticFit: {
    status: 'exact' | 'compatible' | 'fallback_generated' | 'not_applicable' | 'unknown' | 'mismatch';
    confidence: number;
    strictness?: 'hard' | 'medium' | 'soft';
    expectedConcept?: string;
    expectedAnyTags?: string[];
    actualTags?: string[];
    missingTags?: string[];
    conflictingTags?: string[];
    reason?: string;
  }
): Promise<void> {
  const manifestPath = join(assetRoot, 'asset_manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    assets: Array<{
      id: string;
      semanticFit?: unknown;
    }>;
  };
  const asset = manifest.assets.find((candidate) => candidate.id === assetId);
  if (asset === undefined) {
    throw new Error(`Unable to find test asset ${assetId}`);
  }

  asset.semanticFit = semanticFit;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function createRuntimeAuthorityExpectation(): QaRuntimeAuthorityExpectation {
  return {
    authorityBundleRef: {
      artifactKind: 'authority_bundle',
      path: 'authority_bundle.json',
      bundleHash: 'fnv1a_12345678'
    },
    activeProfileLockRef: {
      artifactKind: 'active_profile_lock',
      path: 'active_profile_lock.json',
      lockHash: 'fnv1a_87654321'
    },
    profileId: 'side_scrolling_run_and_gun.v1',
    runtimeTemplateId: 'phaser/side_scrolling_run_and_gun.v1',
    runtimeTemplateManifestId: 'side_scrolling_run_and_gun.v1',
    qaProfile: 'side_scrolling_run_and_gun_smoke'
  };
}

function createDefaultWeaponCapabilityRuntimeExpectation(): QaCapabilityRuntimeExpectation {
  return {
    requiredProbes: [
      {
        capabilityId: 'weapon.default_straight_single.v1',
        probeId: 'weapon.default_straight_single.v1.fire.browser_qa.v1',
        action: 'fire',
        eventType: 'player.fired'
      }
    ]
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}
