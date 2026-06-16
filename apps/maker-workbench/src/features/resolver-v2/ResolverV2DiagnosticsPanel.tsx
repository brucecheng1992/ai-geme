import type { ResolverV2DiagnosticsViewModel } from '@ai-game-maker/game-dsl';

import {
  ResolverV2CompactList,
  ResolverV2Metric,
  ResolverV2Table,
  resolverV2StatusClass
} from './ResolverV2DiagnosticsPanelParts.js';

export type ResolverV2DiagnosticsPanelProps = {
  viewModel: ResolverV2DiagnosticsViewModel;
  title?: string;
  compact?: boolean;
};

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const sectionHeadingClass = 'm-0 text-[12px] font-black uppercase text-[#6f6558]';

export function ResolverV2DiagnosticsPanel({
  viewModel,
  title = 'Resolver V2 Diagnostics',
  compact = false
}: ResolverV2DiagnosticsPanelProps) {
  return (
    <article className={`${panelClass} ${compact ? 'grid gap-3' : 'grid gap-4'}`} aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className={eyebrowClass}>Resolver V2</p>
          <h2 className={headingClass}>{title}</h2>
        </div>
        <span className={resolverV2StatusClass(viewModel.summary.gateStatus ?? (viewModel.summary.resolverOk === false ? 'blocked' : 'ready'))}>
          {viewModel.summary.gateStatus ?? (viewModel.summary.resolverOk === false ? 'blocked' : 'ready')}
        </span>
      </header>

      {renderSummary(viewModel.summary)}
      {renderDiagnostics(viewModel.diagnostics)}
      {renderBlockers(viewModel.blockers)}
      {renderReferences(viewModel.references)}
      {renderAssets(viewModel.assets)}
      {renderSceneGraph(viewModel.sceneGraph)}
      {renderTrace(viewModel.traceEvents)}
      {renderWarnings(viewModel.warnings)}
    </article>
  );
}

function renderSummary(summary: ResolverV2DiagnosticsViewModel['summary']) {
  return (
    <section className="grid gap-2" aria-labelledby="resolver-v2-summary">
      <h3 className={sectionHeadingClass} id="resolver-v2-summary">
        Summary
      </h3>
      <dl className="m-0 grid gap-2 md:grid-cols-3">
        {renderMetric('Resolver OK', summary.resolverOk === undefined ? 'unknown' : String(summary.resolverOk))}
        {renderMetric('Gate Status', summary.gateStatus ?? 'unknown')}
        {renderMetric('References', String(summary.referenceCount))}
        {renderMetric('Unresolved', String(summary.unresolvedReferenceCount))}
        {renderMetric('Diagnostic Errors', String(summary.diagnosticErrorCount))}
        {renderMetric('Diagnostic Warnings', String(summary.diagnosticWarningCount))}
        {renderMetric('Blockers', String(summary.blockerCount))}
        {renderMetric('Gate Warnings', String(summary.warningCount))}
        {renderMetric('Assets', summary.assetCount === undefined ? 'unknown' : String(summary.assetCount))}
        {renderMetric('Scenes', summary.sceneCount === undefined ? 'unknown' : String(summary.sceneCount))}
        {renderMetric('Entities', summary.entityCount === undefined ? 'unknown' : String(summary.entityCount))}
      </dl>
    </section>
  );
}

function renderMetric(label: string, value: string) {
  return <ResolverV2Metric label={label} value={value} key={label} />;
}

function renderDiagnostics(diagnostics: ResolverV2DiagnosticsViewModel['diagnostics']) {
  return ResolverV2Table({
    title: 'Diagnostics',
    headers: ['Severity', 'Code', 'Message', 'Field', 'Target'],
    rows: diagnostics.map((diagnostic) => [
      <span className={resolverV2StatusClass(diagnostic.severity)}>{diagnostic.severity}</span>,
      diagnostic.code,
      diagnostic.message,
      diagnostic.fieldPath ?? diagnostic.sourcePath ?? 'none',
      diagnostic.targetId ?? 'none'
    ]),
    empty: 'No resolver diagnostics.'
  });
}

function renderBlockers(blockers: ResolverV2DiagnosticsViewModel['blockers']) {
  return ResolverV2Table({
    title: 'Blockers',
    headers: ['Code', 'Diagnostic', 'Field', 'Target'],
    rows: blockers.map((blocker) => [
      blocker.code,
      blocker.diagnosticCode ?? 'none',
      blocker.fieldPath ?? blocker.sourcePath ?? blocker.nodeId ?? 'none',
      blocker.targetId ?? 'none'
    ]),
    empty: 'No IR gate blockers.'
  });
}

function renderReferences(references: ResolverV2DiagnosticsViewModel['references']) {
  return ResolverV2Table({
    title: 'References',
    headers: ['Kind', 'Status', 'Field', 'Target'],
    rows: references.map((reference) => [
      reference.kind,
      <span className={resolverV2StatusClass(reference.status)}>{reference.status}</span>,
      reference.fieldPath,
      reference.targetId
    ]),
    empty: 'No resolver references.'
  });
}

function renderAssets(assets: ResolverV2DiagnosticsViewModel['assets']) {
  return ResolverV2Table({
    title: 'Assets',
    headers: ['ID', 'Kind', 'Source Kind', 'Path'],
    rows: assets.map((asset) => [asset.id, asset.kind, asset.sourceKind, asset.path]),
    empty: 'No safe asset summaries.'
  });
}

function renderSceneGraph(sceneGraph: ResolverV2DiagnosticsViewModel['sceneGraph']) {
  if (sceneGraph === undefined) {
    return null;
  }

  return (
    <section className="grid gap-2" aria-labelledby="resolver-v2-scene-graph">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={sectionHeadingClass} id="resolver-v2-scene-graph">
          Scene Graph
        </h3>
        <span className="text-xs font-bold text-[#69645d]">
          {sceneGraph.nodeCount} nodes / {sceneGraph.edgeCount} edges
        </span>
      </div>
      <ResolverV2CompactList title="Scenes" items={sceneGraph.scenes.map((scene) => `${scene.semanticId ?? scene.id} · ${scene.path}`)} />
      <ResolverV2CompactList
        title="Entities"
        items={sceneGraph.entities.map((entity) => `${entity.semanticId ?? entity.id} · ${entity.path} · visible ${String(entity.visible ?? 'unknown')}`)}
      />
      <ResolverV2CompactList title="Cameras" items={sceneGraph.cameras.map((camera) => `${camera.semanticId ?? camera.id} · ${camera.path}`)} />
      <ResolverV2CompactList title="Spawns" items={sceneGraph.spawns.map((spawn) => `${spawn.semanticId ?? spawn.id} · ${spawn.path}`)} />
    </section>
  );
}

function renderTrace(traceEvents: ResolverV2DiagnosticsViewModel['traceEvents']) {
  return ResolverV2Table({
    title: 'Trace',
    headers: ['Type', 'Severity', 'At'],
    rows: traceEvents.map((event) => [event.type, <span className={resolverV2StatusClass(event.severity)}>{event.severity}</span>, event.at]),
    empty: 'No resolver trace events.'
  });
}

function renderWarnings(warnings: string[]) {
  return <ResolverV2CompactList title="Warnings" items={warnings} />;
}
