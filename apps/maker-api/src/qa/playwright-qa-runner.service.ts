import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Injectable } from '@nestjs/common';

import { validateGeneratedProjectAssets, type AssetManifestValidationFailure } from '../../../../packages/asset-pipeline/src/index.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { PlayableQaGateService } from './playable-qa-gate.service.js';
import { runPlaywrightQaBrowser } from './playwright-browser-runner.js';
import type { QaAssetFailure, QaAssetReport, QaAssetRuntimeTelemetry, QaBrowserRunner, QaFailureCode, QaReport, RunQaInput } from './qa.types.js';
import type { AssetManifest } from '../../../../packages/asset-pipeline/src/index.js';

@Injectable()
export class PlaywrightQaRunnerService {
  constructor(
    private readonly workspace: LocalWorkspaceService,
    private readonly gate: PlayableQaGateService,
    private readonly browserRunner: QaBrowserRunner = runPlaywrightQaBrowser
  ) {}

  async run(input: RunQaInput): Promise<QaReport> {
    const startedAt = new Date().toISOString();
    const seed = input.seed ?? 'golden';
    const requiredEvents = this.gate.getRequiredEvents(input.genre);
    const assetGate = await validateGeneratedProjectAssets({
      projectId: input.projectId,
      projectDir: this.workspace.getGeneratedProjectDir(input.projectId)
    });

    if (!assetGate.ok) {
      const report: QaReport = {
        status: 'QA_FAILED',
        project_id: input.projectId,
        run_id: input.runId,
        genre: input.genre,
        preview_url: input.previewUrl,
        seed,
        required_events: requiredEvents,
        observed_events: [],
        missing_events: [],
        missing_any_groups: [],
        console_errors: [],
        code: assetGate.code,
        message: assetGate.message,
        asset_report: buildAssetReport(undefined, undefined, buildAssetGateFailure(assetGate)),
        started_at: startedAt,
        completed_at: new Date().toISOString()
      };
      await this.writeReport(input.projectId, input.runId, report);
      return report;
    }

    const previewAssetGate = await validateGeneratedProjectAssets({
      projectId: input.projectId,
      projectDir: this.workspace.getGeneratedProjectDir(input.projectId),
      assetRootDir: this.workspace.getGeneratedProjectDistDir(input.projectId)
    });

    if (!previewAssetGate.ok) {
      const report: QaReport = {
        status: 'QA_FAILED',
        project_id: input.projectId,
        run_id: input.runId,
        genre: input.genre,
        preview_url: input.previewUrl,
        seed,
        required_events: requiredEvents,
        observed_events: [],
        missing_events: [],
        missing_any_groups: [],
        console_errors: [],
        code: previewAssetGate.code,
        message: `Preview asset validation failed: ${previewAssetGate.message}`,
        asset_manifest_summary: assetGate.manifest.summary,
        asset_report: buildAssetReport(assetGate.manifest, undefined, buildAssetGateFailure(previewAssetGate, 'Preview asset validation failed')),
        started_at: startedAt,
        completed_at: new Date().toISOString()
      };
      await this.writeReport(input.projectId, input.runId, report);
      return report;
    }

    const browserResult = await this.browserRunner({ ...input, seed, screenshotPath: this.workspace.getQaScreenshotPath(input.projectId, input.runId) }, requiredEvents);
    const gateResult = this.gate.evaluate(browserResult.observed_events, requiredEvents);
    const visualGatePassed = browserResult.visual_ok;
    const serviceAssetFailure = buildMissingRuntimeAssetFailure(input.genre, browserResult);
    const interactionGatePassed = browserResult.interaction_ok && gateResult.passed && serviceAssetFailure === undefined;
    const status = visualGatePassed && interactionGatePassed ? 'PASSED' : 'QA_FAILED';
    const report: QaReport = {
      status,
      project_id: input.projectId,
      run_id: input.runId,
      genre: input.genre,
      preview_url: input.previewUrl,
      seed,
      required_events: requiredEvents,
      observed_events: browserResult.observed_events,
      missing_events: gateResult.missing_events,
      missing_any_groups: gateResult.missing_any_groups,
      console_errors: browserResult.console_errors,
      snapshot: browserResult.snapshot,
      code: status === 'QA_FAILED' ? serviceAssetFailure?.code ?? this.resolveFailureCode(browserResult.failure_code, gateResult.passed) : undefined,
      message: serviceAssetFailure?.message ?? browserResult.message,
      visual_status: visualGatePassed ? 'PASSED' : 'VISUAL_QA_FAILED',
      asset_manifest_summary: previewAssetGate.manifest.summary,
      asset_report: buildAssetReport(
        previewAssetGate.manifest,
        browserResult.asset_runtime,
        serviceAssetFailure ?? (status === 'QA_FAILED' && browserResult.failure_code === 'ASSET_LOAD_FAILED'
          ? buildRuntimeAssetFailure(browserResult.asset_runtime, browserResult.message)
          : undefined)
      ),
      screenshot_path: browserResult.screenshot_path,
      visual_metrics: browserResult.visual_metrics,
      started_at: startedAt,
      completed_at: new Date().toISOString()
    };

    await this.writeReport(input.projectId, input.runId, report);
    return report;
  }

  private resolveFailureCode(browserFailureCode: QaFailureCode | undefined, gatePassed: boolean): QaFailureCode {
    if (browserFailureCode !== undefined) {
      return browserFailureCode;
    }

    return gatePassed ? 'QA_BRIDGE_MISSING' : 'REQUIRED_TELEMETRY_MISSING';
  }

  private async writeReport(projectId: string, runId: string, report: QaReport): Promise<void> {
    const reportPath = this.workspace.getQaReportPath(projectId, runId);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
}

function buildAssetReport(manifest: AssetManifest | undefined, runtime: QaAssetRuntimeTelemetry | undefined, failure?: QaAssetFailure): QaAssetReport {
  const assets = manifest?.assets ?? [];
  return {
    manifest_summary: manifest?.summary,
    required: assets.filter((asset) => asset.required).map((asset) => asset.id),
    ready: assets.filter((asset) => asset.status === 'ready').map((asset) => asset.id),
    fallback_used: assets.filter((asset) => asset.status === 'fallback_used').map((asset) => asset.id),
    placeholder_used: assets.filter((asset) => asset.source === 'placeholder').map((asset) => asset.id),
    missing: assets.filter((asset) => asset.status === 'missing').map((asset) => asset.id),
    ...(runtime ? { runtime } : {}),
    sources: summarizeAssetSources(assets),
    failures: failure ? [failure] : []
  };
}

function summarizeAssetSources(assets: AssetManifest['assets']): QaAssetReport['sources'] {
  const sources = new Map<string, NonNullable<QaAssetReport['sources']>[number]>();

  for (const asset of assets) {
    if (
      asset.sourcePack === undefined ||
      asset.licenseId === undefined ||
      asset.licenseName === undefined ||
      asset.attribution === undefined ||
      asset.sourceUrl === undefined
    ) {
      continue;
    }

    sources.set(asset.sourcePack, {
      source_pack: asset.sourcePack,
      license_id: asset.licenseId,
      license_name: asset.licenseName,
      attribution: asset.attribution,
      source_url: asset.sourceUrl
    });
  }

  return [...sources.values()];
}

function buildAssetGateFailure(failure: AssetManifestValidationFailure, messagePrefix?: string): QaAssetFailure {
  return {
    code: failure.code,
    message: messagePrefix === undefined ? failure.message : `${messagePrefix}: ${failure.message}`,
    asset_ids: failure.assetId === undefined ? [] : [failure.assetId],
    roles: failure.role === undefined ? [] : [failure.role]
  };
}

function buildRuntimeAssetFailure(runtime: QaAssetRuntimeTelemetry | undefined, message: string | undefined): QaAssetFailure {
  if (runtime === undefined) {
    return {
      code: 'ASSET_LOAD_FAILED',
      message: message ?? 'Runtime asset validation failed.',
      asset_ids: [],
      roles: []
    };
  }

  const loaded = new Set(runtime.loaded);
  const notLoaded = runtime.required.filter((id) => !loaded.has(id));
  return {
    code: 'ASSET_LOAD_FAILED',
    message: message ?? 'Runtime asset validation failed.',
    asset_ids: uniqueStrings([...notLoaded, ...runtime.failed, ...runtime.missing]),
    roles: [...runtime.missing_required_roles]
  };
}

function buildMissingRuntimeAssetFailure(genre: RunQaInput['genre'], browserResult: { visual_ok: boolean; interaction_ok: boolean; asset_runtime?: QaAssetRuntimeTelemetry }): QaAssetFailure | undefined {
  if ((genre !== 'collector' && genre !== 'dodger') || !browserResult.visual_ok || !browserResult.interaction_ok || browserResult.asset_runtime !== undefined) {
    return undefined;
  }

  return {
    code: 'ASSET_LOAD_FAILED',
    message: `${qaGenreLabel(genre)} QA expected runtime asset telemetry in browser result.`,
    asset_ids: [],
    roles: []
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function qaGenreLabel(genre: RunQaInput['genre']): string {
  return `${genre.slice(0, 1).toUpperCase()}${genre.slice(1)}`;
}
