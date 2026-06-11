import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Injectable } from '@nestjs/common';

import { validateGeneratedProjectAssets } from '../../../../packages/asset-pipeline/src/index.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { PlayableQaGateService } from './playable-qa-gate.service.js';
import { runPlaywrightQaBrowser } from './playwright-browser-runner.js';
import type { QaBrowserRunner, QaFailureCode, QaReport, RunQaInput } from './qa.types.js';

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
        started_at: startedAt,
        completed_at: new Date().toISOString()
      };
      await this.writeReport(input.projectId, input.runId, report);
      return report;
    }

    const browserResult = await this.browserRunner({ ...input, seed, screenshotPath: this.workspace.getQaScreenshotPath(input.projectId, input.runId) }, requiredEvents);
    const gateResult = this.gate.evaluate(browserResult.observed_events, requiredEvents);
    const visualGatePassed = browserResult.visual_ok;
    const interactionGatePassed = browserResult.interaction_ok && gateResult.passed;
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
      code: status === 'QA_FAILED' ? this.resolveFailureCode(browserResult.failure_code, gateResult.passed) : undefined,
      message: browserResult.message,
      visual_status: visualGatePassed ? 'PASSED' : 'VISUAL_QA_FAILED',
      asset_manifest_summary: previewAssetGate.manifest.summary,
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
