import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';

import {
  buildRuntimeCapabilityReport,
  DslPatchV1Schema,
  GameDslArtifactSchema,
  LiveUpdatePlanSchema,
  RuntimeApplyReportSchema,
  validateAndPlanDslPatch,
  type DslPatchV1,
  type DslValidationReport,
  type GameDslArtifact,
  type LiveUpdatePlan,
  type PatchValidationReport,
  type RuntimeApplyReport
} from '../../../../packages/game-dsl/src/index.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';

export type LiveVersionRecord = {
  versionId: string;
  baseVersionId?: string;
  dslId: string;
  dslArtifactPath: string;
  updatedAt: string;
};

const LiveVersionRecordSchema = z.strictObject({
  versionId: z.string().min(1),
  baseVersionId: z.string().min(1).optional(),
  dslId: z.string().min(1),
  dslArtifactPath: z.string().min(1),
  updatedAt: z.string().min(1)
});

/**
 * `patch_history.jsonl` is applied-version history only. It is the replay/undo/redo/export-folding log,
 * so failed, unsupported, and pending rebuild attempts live only in `edit_audit_log.jsonl`.
 */
export type PatchHistoryRecord = {
  patchId: string;
  versionId: string;
  baseVersionId: string;
  status: 'applied';
  ops: DslPatchV1['ops'];
  artifactRefs: Record<string, string>;
};

export type EditAuditRecord = {
  patchId: string;
  baseVersionId: string;
  status: 'invalid' | 'unsupported' | 'warm_restart_required' | 'rebuild_required' | 'failed_runtime_apply' | 'applied';
  applyMode: LiveUpdatePlan['applyMode'];
  ops?: DslPatchV1['ops'];
  artifactRefs: Record<string, string>;
  createdAt: string;
};

export type PrepareLiveEditPatchResult = {
  patchId: string;
  status: LiveUpdatePlan['status'];
  applyMode: LiveUpdatePlan['applyMode'];
  runtimePatch?: NonNullable<LiveUpdatePlan['runtimePatch']>;
  validationReport: PatchValidationReport;
  liveUpdatePlan: LiveUpdatePlan;
  artifactRefs: Record<string, string>;
};

export type RuntimeApplyRecordResult = {
  patchId: string;
  status: RuntimeApplyReport['status'];
  applyMode: RuntimeApplyReport['applyMode'];
  versionId?: string;
  runtimeApplyReport: RuntimeApplyReport;
};

type ApplyDslPatchInput = {
  projectId: string;
  runId: string;
  patch: unknown;
};

type RecordRuntimeApplyResultInput = {
  projectId: string;
  runId: string;
  patchId: string;
  report: unknown;
};

type InitializeLiveVersionInput = {
  projectId: string;
  runId: string;
  artifact: GameDslArtifact;
};

export class DslLiveEditService {
  constructor(private readonly workspace: LocalWorkspaceService) {}

  async initializeLiveVersion(input: InitializeLiveVersionInput): Promise<LiveVersionRecord> {
    const gameDslPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'game_dsl.json');
    const version: LiveVersionRecord = {
      versionId: 'v_initial',
      dslId: input.artifact.dslId,
      dslArtifactPath: gameDslPath,
      updatedAt: new Date().toISOString()
    };

    await mkdir(this.workspace.getLiveDir(input.projectId, input.runId), { recursive: true });
    await writeJson(gameDslPath, input.artifact);
    await writeJson(this.workspace.getLiveCurrentVersionPath(input.projectId, input.runId), version);
    return version;
  }

  async ensureLiveVersion(input: { projectId: string; runId: string }): Promise<LiveVersionRecord> {
    try {
      return await this.readCurrentVersion(input.projectId, input.runId);
    } catch (error) {
      if (!isNodeErrorCode(error, 'ENOENT')) {
        throw error;
      }
      const artifact = GameDslArtifactSchema.parse(
        JSON.parse(await readFile(this.workspace.getModelOutputPath(input.projectId, input.runId, 'game_dsl.json'), 'utf8'))
      );
      return await this.initializeLiveVersion({ ...input, artifact });
    }
  }

  async applyPatch(input: ApplyDslPatchInput): Promise<PrepareLiveEditPatchResult> {
    return this.prepareLiveEditPatch(input);
  }

  async prepareLiveEditPatch(input: ApplyDslPatchInput): Promise<PrepareLiveEditPatchResult> {
    const current = await this.readCurrentVersion(input.projectId, input.runId);
    const baseDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(current.dslArtifactPath, 'utf8')));
    const capabilityReport = buildRuntimeCapabilityReport({ runId: input.runId, validatedDsl: baseDsl });
    const validation = validateAndPlanDslPatch({
      baseDsl,
      patch: input.patch,
      baseVersionId: current.versionId,
      capabilityReport
    });
    const patchId = validation.patch?.patchId ?? validation.report.patchId;
    const artifactRefs = await this.writePatchArtifacts(input.projectId, input.runId, patchId, validation.patch ?? input.patch, validation.report, validation.plan);

    if (!validation.ok) {
      await this.appendEditAudit(input.projectId, input.runId, {
        patchId,
        baseVersionId: current.versionId,
        status: 'invalid',
        applyMode: validation.plan.applyMode,
        ops: validation.patch?.ops,
        artifactRefs,
        createdAt: new Date().toISOString()
      });
      return {
        patchId,
        status: validation.plan.status,
        applyMode: validation.plan.applyMode,
        validationReport: validation.report,
        liveUpdatePlan: validation.plan,
        artifactRefs
      };
    }

    const pendingRefs = await this.writePendingPatchArtifacts(
      input.projectId,
      input.runId,
      patchId,
      validation.candidateDsl,
      validation.candidateDslValidationReport,
      validation.plan
    );

    if (validation.plan.applyMode !== 'hot') {
      await this.appendEditAudit(input.projectId, input.runId, {
        patchId,
        baseVersionId: current.versionId,
        status: auditStatusForPlan(validation.plan),
        applyMode: validation.plan.applyMode,
        ops: validation.patch.ops,
        artifactRefs: { ...artifactRefs, ...pendingRefs },
        createdAt: new Date().toISOString()
      });
      return {
        patchId,
        status: validation.plan.status,
        applyMode: validation.plan.applyMode,
        validationReport: validation.report,
        liveUpdatePlan: validation.plan,
        artifactRefs: { ...artifactRefs, ...pendingRefs }
      };
    }

    return {
      patchId,
      status: validation.plan.status,
      applyMode: validation.plan.applyMode,
      runtimePatch: validation.plan.runtimePatch,
      validationReport: validation.report,
      liveUpdatePlan: validation.plan,
      artifactRefs: { ...artifactRefs, ...pendingRefs }
    };
  }

  async recordRuntimeApplyResult(input: RecordRuntimeApplyResultInput): Promise<RuntimeApplyRecordResult> {
    const report = RuntimeApplyReportSchema.parse(input.report);
    if (report.runId !== input.runId || report.patchId !== input.patchId) {
      throw new Error(`Runtime apply report does not match run ${input.runId} patch ${input.patchId}.`);
    }

    const current = await this.readCurrentVersion(input.projectId, input.runId);
    const patch = await this.readPreparedPatch(input.projectId, input.runId, input.patchId);
    const liveUpdatePlan = await this.readLiveUpdatePlan(input.projectId, input.runId, input.patchId);
    const patchRefs = this.patchArtifactRefs(input.projectId, input.runId, input.patchId);
    const runtimeApplyReportPath = this.workspace.getLiveArtifactPath(input.projectId, input.runId, `${input.patchId}.runtime_apply_report.json`);
    const reportFailure = runtimeReportFailure(report, liveUpdatePlan, patch, current);
    const persistedReport = reportFailure === undefined ? report : buildFailedRuntimeReport(report, reportFailure);
    await writeJson(runtimeApplyReportPath, persistedReport);
    const artifactRefs = { ...patchRefs, runtimeApplyReport: runtimeApplyReportPath };

    if (persistedReport.status !== 'applied_hot' && persistedReport.status !== 'applied_warm_restart') {
      await this.appendEditAudit(input.projectId, input.runId, {
        patchId: input.patchId,
        baseVersionId: current.versionId,
        status: auditStatusForRuntimeReport(persistedReport),
        applyMode: persistedReport.applyMode,
        ops: patch.ops,
        artifactRefs,
        createdAt: new Date().toISOString()
      });

      return {
        patchId: input.patchId,
        status: persistedReport.status,
        applyMode: persistedReport.applyMode,
        runtimeApplyReport: persistedReport
      };
    }

    const candidatePath = this.workspace.getLivePendingArtifactPath(input.projectId, input.runId, input.patchId, 'game_dsl.candidate.json');
    const appliedDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(candidatePath, 'utf8')));
    const versionId = `v_${input.patchId}`;
    const dslArtifactPath = this.workspace.getLiveArtifactPath(input.projectId, input.runId, `${versionId}.game_dsl.json`);
    const nextVersion: LiveVersionRecord = {
      versionId,
      baseVersionId: current.versionId,
      dslId: appliedDsl.dslId,
      dslArtifactPath,
      updatedAt: new Date().toISOString()
    };

    await writeJson(dslArtifactPath, appliedDsl);
    await writeJson(this.workspace.getLiveCurrentVersionPath(input.projectId, input.runId), nextVersion);
    const historyRecord: PatchHistoryRecord = {
      patchId: input.patchId,
      versionId,
      baseVersionId: current.versionId,
      status: 'applied',
      ops: patch.ops,
      artifactRefs: { ...artifactRefs, dsl: dslArtifactPath }
    };
    await appendJsonLine(this.workspace.getLivePatchHistoryPath(input.projectId, input.runId), historyRecord);
    await this.appendEditAudit(input.projectId, input.runId, {
      patchId: input.patchId,
      baseVersionId: current.versionId,
      status: 'applied',
      applyMode: persistedReport.applyMode,
      ops: patch.ops,
      artifactRefs: historyRecord.artifactRefs,
      createdAt: new Date().toISOString()
    });

    return {
      patchId: input.patchId,
      status: persistedReport.status,
      applyMode: persistedReport.applyMode,
      versionId,
      runtimeApplyReport: persistedReport
    };
  }

  private async readCurrentVersion(projectId: string, runId: string): Promise<LiveVersionRecord> {
    return LiveVersionRecordSchema.parse(JSON.parse(await readFile(this.workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')));
  }

  private async writePatchArtifacts(
    projectId: string,
    runId: string,
    patchId: string,
    patch: DslPatchV1 | unknown,
    validationReport: PatchValidationReport,
    liveUpdatePlan: LiveUpdatePlan
  ): Promise<{ patch: string; validationReport: string; liveUpdatePlan: string }> {
    const patchArtifactName = DslPatchV1Schema.safeParse(patch).success ? `${patchId}.dsl_patch.json` : `${patchId}.dsl_patch.candidate.json`;
    const patchPath = this.workspace.getLiveArtifactPath(projectId, runId, patchArtifactName);
    const validationPath = this.workspace.getLiveArtifactPath(projectId, runId, `${patchId}.patch_validation_report.json`);
    const planPath = this.workspace.getLiveArtifactPath(projectId, runId, `${patchId}.live_update_plan.json`);

    await mkdir(this.workspace.getLiveDir(projectId, runId), { recursive: true });
    await writeJson(patchPath, patch);
    await writeJson(validationPath, validationReport);
    await writeJson(planPath, liveUpdatePlan);

    return { patch: patchPath, validationReport: validationPath, liveUpdatePlan: planPath };
  }

  private patchArtifactRefs(projectId: string, runId: string, patchId: string): Record<string, string> {
    return {
      patch: this.workspace.getLiveArtifactPath(projectId, runId, `${patchId}.dsl_patch.json`),
      validationReport: this.workspace.getLiveArtifactPath(projectId, runId, `${patchId}.patch_validation_report.json`),
      liveUpdatePlan: this.workspace.getLiveArtifactPath(projectId, runId, `${patchId}.live_update_plan.json`)
    };
  }

  private async readPreparedPatch(projectId: string, runId: string, patchId: string): Promise<DslPatchV1> {
    const patchPath = this.workspace.getLiveArtifactPath(projectId, runId, `${patchId}.dsl_patch.json`);
    return DslPatchV1Schema.parse(JSON.parse(await readFile(patchPath, 'utf8')));
  }

  private async readLiveUpdatePlan(projectId: string, runId: string, patchId: string): Promise<LiveUpdatePlan> {
    const planPath = this.workspace.getLiveArtifactPath(projectId, runId, `${patchId}.live_update_plan.json`);
    return LiveUpdatePlanSchema.parse(JSON.parse(await readFile(planPath, 'utf8')));
  }

  private async writePendingPatchArtifacts(
    projectId: string,
    runId: string,
    patchId: string,
    candidateDsl: unknown,
    dslValidationReport: DslValidationReport,
    liveUpdatePlan: LiveUpdatePlan
  ): Promise<{ pendingDslCandidate: string; pendingDslValidationReport: string; pendingLiveUpdatePlan: string }> {
    const candidatePath = this.workspace.getLivePendingArtifactPath(projectId, runId, patchId, 'game_dsl.candidate.json');
    const validationPath = this.workspace.getLivePendingArtifactPath(projectId, runId, patchId, 'dsl_validation_report.json');
    const planPath = this.workspace.getLivePendingArtifactPath(projectId, runId, patchId, 'live_update_plan.json');

    await mkdir(this.workspace.getLivePendingDir(projectId, runId, patchId), { recursive: true });
    await writeJson(candidatePath, candidateDsl);
    await writeJson(validationPath, dslValidationReport);
    await writeJson(planPath, liveUpdatePlan);

    return { pendingDslCandidate: candidatePath, pendingDslValidationReport: validationPath, pendingLiveUpdatePlan: planPath };
  }

  private async appendEditAudit(projectId: string, runId: string, record: EditAuditRecord): Promise<void> {
    await appendJsonLine(this.workspace.getLiveEditAuditLogPath(projectId, runId), record);
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function appendJsonLine(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(value)}\n`, 'utf8');
}

function auditStatusForPlan(plan: LiveUpdatePlan): EditAuditRecord['status'] {
  if (plan.status === 'unsupported') {
    return 'unsupported';
  }
  if (plan.status === 'rebuild_required') {
    return 'rebuild_required';
  }
  if (plan.status === 'warm_restart_required') {
    return 'warm_restart_required';
  }
  return 'invalid';
}

function auditStatusForRuntimeReport(report: RuntimeApplyReport): EditAuditRecord['status'] {
  if (report.status === 'failed_runtime_apply') {
    return 'failed_runtime_apply';
  }
  if (report.status === 'unsupported') {
    return 'unsupported';
  }
  if (report.status === 'requires_rebuild') {
    return 'rebuild_required';
  }
  return 'applied';
}

function runtimeReportFailure(
  report: RuntimeApplyReport,
  plan: LiveUpdatePlan,
  patch: DslPatchV1,
  current: LiveVersionRecord
): { code: string; path: string; message: string } | undefined {
  if (report.liveUpdatePlanRef.patchId !== patch.patchId || plan.patchId !== patch.patchId) {
    return { code: 'RUNTIME_PLAN_MISMATCH', path: 'liveUpdatePlanRef.patchId', message: 'Runtime report does not reference the prepared live update plan.' };
  }
  if (report.liveUpdatePlanRef.artifact !== `${patch.patchId}.live_update_plan.json`) {
    return { code: 'RUNTIME_PLAN_ARTIFACT_MISMATCH', path: 'liveUpdatePlanRef.artifact', message: 'Runtime report references an unexpected live update plan artifact.' };
  }
  if (patch.baseVersionId !== current.versionId) {
    return { code: 'STALE_PATCH_VERSION', path: 'baseVersionId', message: 'Patch baseVersionId no longer matches current live version.' };
  }
  if (report.status !== 'applied_hot' && report.status !== 'applied_warm_restart') {
    return undefined;
  }
  if (report.errors.length > 0) {
    return { code: 'RUNTIME_SUCCESS_WITH_ERRORS', path: 'errors', message: 'Successful runtime apply reports must not include errors.' };
  }
  if (report.applyMode !== plan.applyMode) {
    return { code: 'RUNTIME_APPLY_MODE_MISMATCH', path: 'applyMode', message: 'Runtime report applyMode does not match the live update plan.' };
  }
  const missingPath = plan.affectedPaths.find((path) => !report.appliedPaths.includes(path));
  if (missingPath !== undefined) {
    return { code: 'RUNTIME_APPLIED_PATH_MISSING', path: missingPath, message: 'Runtime report did not confirm every affected path.' };
  }
  const extraPath = report.appliedPaths.find((path) => !plan.affectedPaths.includes(path));
  if (extraPath !== undefined) {
    return { code: 'RUNTIME_APPLIED_PATH_UNEXPECTED', path: extraPath, message: 'Runtime report included an applied path outside the live update plan.' };
  }

  return undefined;
}

function buildFailedRuntimeReport(report: RuntimeApplyReport, failure: { code: string; path: string; message: string }): RuntimeApplyReport {
  return RuntimeApplyReportSchema.parse({
    ...report,
    status: failure.code === 'RUNTIME_PLAN_MISMATCH' ? 'unsupported' : 'failed_runtime_apply',
    appliedPaths: [],
    errors: [...report.errors, failure]
  });
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}
