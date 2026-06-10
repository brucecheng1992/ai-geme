import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';

export class JsonFileStore {
  constructor(private readonly workspace: LocalWorkspaceService) {}

  async readJson(path: string): Promise<unknown> {
    this.workspace.assertInsideWorkspace(path);
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  }

  async writeJson(path: string, value: unknown): Promise<void> {
    this.workspace.assertInsideWorkspace(path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }
}
