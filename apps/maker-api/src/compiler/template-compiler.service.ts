import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';

import { writeAssetArtifacts } from '../../../../packages/asset-pipeline/src/index.js';
import { NormalizedGameIrSchema } from '../../../../packages/game-dsl/src/index.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import type { RuntimeCompileInput, RuntimeCompileResult } from './compiler.types.js';

const templateGenreById = {
  collector_v1: 'collector',
  dodger_v1: 'dodger',
  shooter_v1: 'shooter'
} as const;

@Injectable()
export class TemplateCompilerService {
  private readonly templateRoot: string;

  constructor(
    private readonly workspace: LocalWorkspaceService,
    templateRoot?: string
  ) {
    this.templateRoot = templateRoot ?? join(this.workspace.getRootDir(), 'templates', 'phaser');
  }

  async compile(input: RuntimeCompileInput): Promise<RuntimeCompileResult> {
    const ir = NormalizedGameIrSchema.parse(input.ir);
    const templateId = ir.template_params.template_id;
    const genre = templateGenreById[templateId];
    const outputDir = this.workspace.getGeneratedProjectDir(input.projectId);
    const distDir = this.workspace.getGeneratedProjectDistDir(input.projectId);
    const files = [
      'package.json',
      'index.html',
      'vite.config.ts',
      'src/main.ts',
      `${genre}/src/main.ts`,
      `${genre}/src/GameScene.ts`,
      ...(genre === 'collector' ? [`${genre}/src/collector-art-library.ts`] : []),
      ...(genre === 'dodger' ? [`${genre}/src/dodger-art-library.ts`] : []),
      ...(genre === 'dodger' ? [`${genre}/src/dodger-runtime-plan.ts`] : []),
      ...(genre === 'shooter' ? [`${genre}/src/shooter-runtime.ts`] : []),
      ...(genre === 'shooter' ? [`${genre}/src/shooter-runtime-plan.ts`] : []),
      ...(genre === 'shooter' ? [`${genre}/src/shooter-renderer.ts`] : []),
      ...(genre === 'shooter' ? [`${genre}/src/shooter-art-library.ts`] : []),
      ...(genre === 'shooter' ? [`${genre}/src/template-visuals.ts`] : []),
      `${genre}/src/template-params.ts`,
      'shared/kernel.ts',
      ...(genre === 'collector' || genre === 'dodger' || genre === 'shooter' ? [`${genre}/src/asset-manifest.generated.json`] : []),
      ...(genre === 'dodger' || genre === 'shooter' ? [`${genre}/src/runtime-plan.generated.json`] : []),
      `${genre}/src/template-params.generated.json`
    ];

    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
    await cp(join(this.templateRoot, genre), join(outputDir, genre), { recursive: true });
    await cp(join(this.templateRoot, 'shared'), join(outputDir, 'shared'), { recursive: true });
    await mkdir(join(outputDir, 'src'), { recursive: true });
    const assetArtifacts = await writeAssetArtifacts({
      projectId: input.projectId,
      projectDir: outputDir,
      ir,
      assetPacksDir: join(this.templateRoot, '..', '..', 'assets', 'asset-packs')
    });
    await writeFile(join(outputDir, 'game.ir.json'), `${JSON.stringify(ir, null, 2)}\n`, 'utf8');
    await writeFile(join(outputDir, `${genre}`, 'src', 'template-params.generated.json'), JSON.stringify(ir.template_params.params, null, 2));
    if (genre === 'collector' || genre === 'dodger' || genre === 'shooter') {
      await writeFile(join(outputDir, `${genre}`, 'src', 'asset-manifest.generated.json'), JSON.stringify(assetArtifacts.manifest, null, 2));
    }
    if (genre === 'dodger' || genre === 'shooter') {
      await writeFile(join(outputDir, `${genre}`, 'src', 'runtime-plan.generated.json'), JSON.stringify(ir.runtime_plan, null, 2));
    }
    await writeFile(join(outputDir, 'package.json'), this.renderPackageJson(input.projectId));
    await writeFile(join(outputDir, 'index.html'), this.renderIndexHtml());
    await writeFile(join(outputDir, 'src', 'main.ts'), this.renderMainEntry(genre));
    await writeFile(join(outputDir, 'vite.config.ts'), this.renderViteConfig());

    return {
      ok: true,
      projectId: input.projectId,
      outputDir,
      distDir,
      templateId,
      files: [...files, 'game.ir.json', ...assetArtifacts.files]
    };
  }

  private renderPackageJson(projectId: string): string {
    return `${JSON.stringify(
      {
        name: projectId,
        private: true,
        type: 'module',
        scripts: { build: 'vite build' },
        dependencies: {
          phaser: '^3.90.0'
        },
        devDependencies: {
          vite: '^5.0.0',
          typescript: '^5.8.0'
        }
      },
      null,
      2
    )}\n`;
  }

  private renderIndexHtml(): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Game Maker Preview</title>
    <style>
      html,
      body,
      #game {
        width: 100%;
        height: 100%;
        margin: 0;
        background: #07111f;
      }

      body {
        display: grid;
        place-items: center;
        overflow: hidden;
      }

      canvas {
        max-width: 100vw;
        max-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
`;
  }

  private renderMainEntry(genre: string): string {
    return `import '../${genre}/src/main.js';
`;
  }

  private renderViteConfig(): string {
    return `import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
`;
  }
}
