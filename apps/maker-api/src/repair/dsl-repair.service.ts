import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Injectable } from '@nestjs/common';

import { validateAndNormalizeRawGameDsl } from '../../../../packages/game-dsl/src/index.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { applyDslPatch } from './dsl-patch-apply.js';
import { createDslRepairPatch } from './dsl-repair-recipes.js';
import { MAX_REPAIR_ATTEMPTS, type DslRepairInput, type DslRepairReport } from './dsl-repair.types.js';

@Injectable()
export class DslRepairService {
  constructor(private readonly workspace: LocalWorkspaceService) {}

  async repair(input: DslRepairInput): Promise<DslRepairReport> {
    if (!Number.isInteger(input.attempt) || input.attempt < 1 || input.attempt > MAX_REPAIR_ATTEMPTS) {
      return await this.writeReport(input, {
        status: 'REPAIR_FAILED',
        project_id: input.projectId,
        run_id: input.runId,
        max_attempts: MAX_REPAIR_ATTEMPTS,
        attempts: [],
        message: `Repair attempt must be an integer between 1 and ${MAX_REPAIR_ATTEMPTS}.`
      });
    }

    const patch = createDslRepairPatch(input);
    if (!patch) {
      return await this.writeReport(input, {
        status: 'NOT_REPAIRABLE',
        project_id: input.projectId,
        run_id: input.runId,
        max_attempts: MAX_REPAIR_ATTEMPTS,
        attempts: [],
        message: 'No safe DSL repair patch could be generated.'
      });
    }

    const repaired = applyDslPatch(input.rawDsl, patch);
    const validation = validateAndNormalizeRawGameDsl(repaired);
    const report: DslRepairReport = {
      status: validation.ok ? 'REPAIRED' : 'NOT_REPAIRABLE',
      project_id: input.projectId,
      run_id: input.runId,
      max_attempts: MAX_REPAIR_ATTEMPTS,
      attempts: [{ attempt: input.attempt, source: input.source, reason: patch.reason, patch, validation }],
      repaired_dsl: validation.ok ? validation.rawDsl : undefined,
      message: validation.ok ? undefined : 'Generated repair patch did not pass DSL validation.'
    };

    return await this.writeReport(input, report);
  }

  private async writeReport(input: DslRepairInput, report: DslRepairReport): Promise<DslRepairReport> {
    const reportPath = this.workspace.getRepairReportPath(input.projectId, input.runId);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return report;
  }
}
