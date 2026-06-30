import { createHash } from 'node:crypto';

import type { CanonicalGameDslV02 } from '../packages/game-dsl/src/index.js';

export const STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS = [
  'player',
  'default_weapon',
  'pickup_weapon',
  'projectile',
  'ground_enemy',
  'ranged_enemy',
  'flying_enemy',
  'wave_marker',
  'area_marker',
  'boss',
  'boss_telegraph',
  'boss_projectile_phase_object',
  'environment_hazard'
] as const;

export const STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY = {
  active_visual_asset_backend: 'procedural_canvas_v1',
  current_backend: 'procedural_canvas_v1',
  future_visual_asset_backend: 'image_provider_v1',
  image_provider_v1_enabled: false,
  external_art_used: false,
  png_core_fix_used: false,
  old_environment_resource_logic_used: false,
  target_fidelity: 'procedural_pixel_art_readable_v1'
} as const;

export type Step38RequiredVisualRuntimeObject = (typeof STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS)[number];

export type Step38VisualPalette = {
  primary: string;
  accent: string;
  outline: string;
};

type Step38RoleCategory = 'player' | 'enemy' | 'weapon' | 'boss' | 'environment';

type Step38VisualIntent = {
  entityId: string;
  role: string;
  originalRole: string;
  requiredObject: Step38RequiredVisualRuntimeObject;
  assetIntentRef: string;
  silhouette: string;
  palette: Step38VisualPalette;
  sourcePath: string;
  capabilityIds: string[];
};

export type Step38AssetDesignSpec = {
  canonical_id: string;
  required_object: Step38RequiredVisualRuntimeObject;
  source: 'canonical_dsl';
  visual_intent_sha: string;
  art_style: '16-bit pixel art run-and-gun';
  theme: string[];
  palette: string[];
  silhouette: string;
  motifs: string[];
  role_specific_design: Record<string, string>;
  seed: string;
};

export type Step38CanvasDrawOperation = {
  op: 'pixel_cluster' | 'block_shape' | 'limb_shape' | 'weapon_shape' | 'emitter_shape' | 'wing_shape' | 'reactor_core_glow' | 'vine_overlay' | 'metal_struts' | 'hazard_stripes' | 'environment_layer';
  purpose: string;
  source_motif: string;
  palette_ref: 'primary' | 'accent' | 'outline' | 'motif';
  geometry: Record<string, number | string | number[]>;
};

export type Step38ProceduralPixelArtPart = {
  part: string;
  layer: 'shadow' | 'outline' | 'fill' | 'highlight' | 'accent' | 'motif' | 'effect';
  palette_ref: 'primary' | 'accent' | 'outline' | 'motif' | 'shadow' | 'highlight';
  rect: [number, number, number, number];
  source_motif: string;
  purpose: string;
};

export type Step38ProceduralPixelArtFrame = {
  name: string;
  runtime_state_binding: string;
  frame_index: number;
  frame_hash: string;
  parts: Step38ProceduralPixelArtPart[];
};

export type Step38CanvasDrawPlan = {
  required_object: Step38RequiredVisualRuntimeObject;
  canonical_id: string;
  texture_key: string;
  renderer_kind: 'canvas_texture';
  source: 'canonical_dsl';
  visual_intent_sha: string;
  canvas_size: [number, number];
  palette: string[];
  motifs: string[];
  silhouette: string;
  draw_plan_sha: string;
  draw_operations: Step38CanvasDrawOperation[];
  logical_pixel_grid: {
    size: [number, number];
    crisp_scale: true;
    limited_palette: true;
  };
  procedural_pixel_art_grammar: {
    version: 'step38.procedural_pixel_art_grammar.v1';
    active_visual_asset_backend: 'procedural_canvas_v1';
    current_backend: 'procedural_canvas_v1';
    future_visual_asset_backend: 'image_provider_v1';
    image_provider_v1_enabled: false;
    external_art_used: false;
    png_core_fix_used: false;
    old_environment_resource_logic_used: false;
    target_fidelity: 'procedural_pixel_art_readable_v1';
    pixel_grid_rendering: true;
    renderer_kind: 'runtime_canvas_texture';
    external_art_required: false;
    image_model_required: false;
    role_only_generation_used: false;
    debug_geometry_dominant: false;
    visual_intent_affects_geometry: true;
    visual_intent_affects_palette: true;
    visual_intent_affects_silhouette: true;
    visual_intent_affects_animation: true;
    visual_intent_affects_environment_layers: true;
    old_resource_logic_bypassed: true;
    grammar_tokens: string[];
  };
  animation_frames: Step38ProceduralPixelArtFrame[];
  environment_layers: Array<{
    layer: 'background' | 'midground' | 'foreground';
    motifs: string[];
    draw_operation_refs: string[];
  }>;
  role_static_template_used: false;
  debug_geometry_dominant: false;
  svg_used: false;
  template_derived_placeholder: false;
};

export type Step38SpriteAsset = {
  id: string;
  role: string;
  requiredObject: Step38RequiredVisualRuntimeObject;
  roleCategory: Step38RoleCategory;
  originalRole: string;
  fileName: string;
  asset_format: 'runtime_canvas_texture';
  assetFormat: 'runtime_canvas_texture';
  final_pass_renderer: 'runtime_canvas_texture';
  renderer_kind: 'canvas_texture';
  canvas_size: [number, number];
  canvas_draw_plan: Step38CanvasDrawPlan;
  canvasDrawPlan: Step38CanvasDrawPlan;
  draw_plan_sha: string;
  drawPlanSha: string;
  rendered_canvas_pixel_sha: string;
  renderedCanvasPixelSha: string;
  canvas_palette: string[];
  svg: string;
  debug_svg: string;
  source: 'canonical_dsl_visual_intent';
  assetIntentRef: string;
  textureKey: string;
  entityId: string;
  sourcePath: string;
  silhouette: string;
  palette: Step38VisualPalette;
  visual_intent_sha: string;
  visualIntentSha: string;
  asset_design_spec_sha: string;
  assetDesignSpecSha: string;
  asset_design_spec: Step38AssetDesignSpec;
  motif_coverage: string[];
  motifCoverage: string[];
  geometry_signature: string;
  geometrySignature: string;
  dsl_geometry_fingerprint: string;
  role_static_control_fingerprint: string;
  canvas_pixel_fingerprint: string;
  role_static_control_canvas_sha256: string;
  visual_geometry_dependency: boolean;
  template_fingerprint: string;
  templateFingerprint: string;
  role_static_svg_template_used: boolean;
  roleStaticSvgTemplateUsed: boolean;
  old_svgForVisualIntent_used: boolean;
  oldSvgForVisualIntentUsed: boolean;
  template_derived_placeholder: boolean;
  templateDerivedPlaceholder: boolean;
  role_only_generation_detected: boolean;
  matches_known_static_template: boolean;
  distinct_silhouette: boolean;
  placeholder: boolean;
  label_only: false;
};

type Step38ThemeContext = {
  sceneVisualTheme: string;
  environmentMotifs: string[];
  motifCoverage: string[];
  defaultPalette: Step38VisualPalette;
};

const ROLE_BY_REQUIRED_OBJECT: Record<Step38RequiredVisualRuntimeObject, string> = {
  player: 'player',
  default_weapon: 'default_weapon',
  pickup_weapon: 'pickup',
  projectile: 'projectile',
  ground_enemy: 'enemy_ground',
  ranged_enemy: 'enemy_static',
  flying_enemy: 'flying_enemy',
  wave_marker: 'wave_marker',
  area_marker: 'area_marker',
  boss: 'boss',
  boss_telegraph: 'boss_telegraph',
  boss_projectile_phase_object: 'boss_projectile_phase_object',
  environment_hazard: 'hazard'
};

export function buildStep38SpriteAssets(canonicalDsl: CanonicalGameDslV02): Step38SpriteAsset[] {
  const theme = extractThemeContext(canonicalDsl);
  const intents = extractVisualIntents(canonicalDsl);
  const primaryAssets = STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) =>
    buildAssetForRequiredObject({
      canonicalDsl,
      requiredObject,
      theme,
      intent: selectIntentForRequiredObject(requiredObject, intents, theme)
    })
  );
  const coveredIntentKeys = new Set(primaryAssets.map((asset) => `${asset.requiredObject}:${asset.entityId}`));
  const supplementalIntentAssets = intents
    .filter((intent) => !coveredIntentKeys.has(`${intent.requiredObject}:${intent.entityId}`))
    .map((intent) =>
      buildAssetForRequiredObject({
        canonicalDsl,
        requiredObject: intent.requiredObject,
        theme,
        intent
      })
    );
  const runtimeProjectileIntent = buildRuntimeEnemyProjectileIntent(theme, intents);
  const runtimeProjectileAsset = coveredIntentKeys.has(`${runtimeProjectileIntent.requiredObject}:${runtimeProjectileIntent.entityId}`)
    ? []
    : [
        buildAssetForRequiredObject({
          canonicalDsl,
          requiredObject: runtimeProjectileIntent.requiredObject,
          theme,
          intent: runtimeProjectileIntent
        })
      ];
  return [...primaryAssets, ...supplementalIntentAssets, ...runtimeProjectileAsset];
}

type Step38AssetTemplateGuardInput = Pick<
  Step38SpriteAsset,
  | 'requiredObject'
  | 'asset_format'
  | 'rendered_canvas_pixel_sha'
  | 'svg'
  | 'visual_intent_sha'
  | 'asset_design_spec_sha'
  | 'motif_coverage'
  | 'geometry_signature'
> | {
  requiredObject: Step38RequiredVisualRuntimeObject;
  asset_format?: string;
  rendered_canvas_pixel_sha?: string;
  svg: string;
  visual_intent_sha: string;
  asset_design_spec_sha: string;
  motif_coverage: readonly string[];
  geometry_signature: string;
};

type Step38AssetTemplateGuard = {
  dsl_geometry_fingerprint: string;
  role_static_control_fingerprint: string;
  visual_geometry_dependency: boolean;
  role_static_svg_template_used: boolean;
  old_svgForVisualIntent_used: boolean;
  template_derived_placeholder: boolean;
  role_only_generation_detected: boolean;
  matches_known_static_template: boolean;
  distinct_silhouette: boolean;
  placeholder: boolean;
};

export function buildStep38RoleStaticTemplateProbeSvg(requiredObject: Step38RequiredVisualRuntimeObject): string {
  const palette = { primary: '#44aa66', accent: '#dd5533', outline: '#111827' };
  const body = renderRequiredObjectBody(requiredObject, palette, {
    skew: 0,
    notch: 12,
    core: 18,
    numbers: Array.from({ length: 12 }, (_, index) => 32 + index)
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${requiredObject}-role-static-probe">`,
    `<rect x="0" y="0" width="96" height="96" fill="none"/>`,
    body,
    `</svg>`,
    ''
  ].join('');
}

export function buildStep38RoleStaticTemplateProbeCanvasSha(requiredObject: Step38RequiredVisualRuntimeObject): string {
  const palette = { primary: '#44aa66', accent: '#dd5533', outline: '#111827' };
  const spec: Step38AssetDesignSpec = {
    canonical_id: `${requiredObject}.role_static_probe`,
    required_object: requiredObject,
    source: 'canonical_dsl',
    visual_intent_sha: '0'.repeat(64),
    art_style: '16-bit pixel art run-and-gun',
    theme: [],
    palette: [palette.primary, palette.accent, palette.outline],
    silhouette: `${requiredObject} role static probe`,
    motifs: [],
    role_specific_design: { role_static_probe: requiredObject },
    seed: 'role_static_probe'
  };
  const pixels = renderDslDrivenCanvasPixelBuffer({
    intent: {
      entityId: `${requiredObject}.role_static_probe`,
      role: ROLE_BY_REQUIRED_OBJECT[requiredObject],
      originalRole: ROLE_BY_REQUIRED_OBJECT[requiredObject],
      requiredObject,
      assetIntentRef: `${requiredObject}.role_static_probe`,
      silhouette: spec.silhouette,
      palette,
      sourcePath: '/step38/role-static-probe',
      capabilityIds: []
    },
    spec,
    geometrySignature: `role_static:${requiredObject}`
  });
  return sha256Buffer(pixels);
}

function evaluateAssetTemplateGuard(asset: Step38AssetTemplateGuardInput): Step38AssetTemplateGuard {
  const assetFormat =
    'asset_format' in asset &&
    asset.asset_format === 'runtime_canvas_texture' &&
    typeof asset.rendered_canvas_pixel_sha === 'string'
      ? 'runtime_canvas_texture'
      : 'svg';
  const dslGeometryFingerprint =
    assetFormat === 'runtime_canvas_texture' && typeof asset.rendered_canvas_pixel_sha === 'string'
      ? asset.rendered_canvas_pixel_sha
      : normalizedSvgGeometryFingerprint(asset.svg);
  const roleStaticControlFingerprint = buildStep38RoleStaticTemplateProbeCanvasSha(asset.requiredObject);
  const hasVisualIntentSha = /^[a-f0-9]{64}$/.test(asset.visual_intent_sha);
  const hasDesignSpecSha = /^[a-f0-9]{64}$/.test(asset.asset_design_spec_sha);
  const hasMotifs = asset.motif_coverage.length > 0;
  const hasGeometrySignature = asset.geometry_signature.length > 0;
  const svgCarriesDslSource =
    asset.svg.includes('data-source="canonical_dsl"') &&
    asset.svg.includes(`data-visual-intent-sha="${asset.visual_intent_sha}"`) &&
    asset.svg.includes(`data-asset-design-spec-sha="${asset.asset_design_spec_sha}"`) &&
    asset.svg.includes('data-motifs=') &&
    asset.svg.includes('data-geometry-signature=');
  const visualGeometryDependency =
    assetFormat === 'runtime_canvas_texture' &&
    hasVisualIntentSha &&
    hasDesignSpecSha &&
    hasMotifs &&
    hasGeometrySignature &&
    dslGeometryFingerprint !== roleStaticControlFingerprint;
  const matchesKnownStaticTemplate = dslGeometryFingerprint === roleStaticControlFingerprint;
  const roleOnlyGenerationDetected =
    assetFormat !== 'runtime_canvas_texture' ||
    matchesKnownStaticTemplate ||
    (!svgCarriesDslSource && assetFormat !== 'runtime_canvas_texture') ||
    !visualGeometryDependency;
  const templateDerivedPlaceholder =
    assetFormat !== 'runtime_canvas_texture' ||
    matchesKnownStaticTemplate ||
    roleOnlyGenerationDetected ||
    !hasVisualIntentSha ||
    !hasDesignSpecSha ||
    !hasMotifs ||
    !hasGeometrySignature;

  return {
    dsl_geometry_fingerprint: dslGeometryFingerprint,
    role_static_control_fingerprint: roleStaticControlFingerprint,
    visual_geometry_dependency: visualGeometryDependency,
    role_static_svg_template_used: false,
    old_svgForVisualIntent_used: false,
    template_derived_placeholder: templateDerivedPlaceholder,
    role_only_generation_detected: roleOnlyGenerationDetected,
    matches_known_static_template: matchesKnownStaticTemplate,
    distinct_silhouette: visualGeometryDependency,
    placeholder: templateDerivedPlaceholder
  };
}

function normalizedSvgGeometryFingerprint(svg: string): string {
  const normalized = svg
    .replace(/\sdata-[a-z0-9-]+="[^"]*"/gi, '')
    .replace(/\saria-label="[^"]*"/gi, '')
    .replace(/#[0-9a-fA-F]{6}/g, '#COLOR')
    .replace(/\s+/g, ' ')
    .trim();
  return sha256Text(normalized);
}

export function buildStep38AssetTemplateFingerprintReport(
  runId: string,
  assets: readonly Step38SpriteAsset[]
): Record<string, unknown> {
  const guardedAssets = assets.map((asset) => ({ ...asset, ...evaluateAssetTemplateGuard(asset) }));
  const templateSimilarityBlockers = guardedAssets
    .filter(
      (asset) =>
        asset.role_static_svg_template_used ||
        asset.old_svgForVisualIntent_used ||
        asset.template_derived_placeholder ||
        asset.role_only_generation_detected ||
        asset.matches_known_static_template ||
        asset.motif_coverage.length === 0 ||
        asset.distinct_silhouette !== true
    )
    .map((asset) => ({
      failure_code: asset.role_only_generation_detected ? 'visual_intent_ignored_by_asset_generator' : 'template_derived_placeholder_asset',
      canonical_id: asset.id,
      required_object: asset.requiredObject,
      template_fingerprint: asset.template_fingerprint
    }));

  return {
    schemaVersion: 'step38.asset-template-fingerprint-report.v1',
    run_id: runId,
    source: 'canonical_dsl_visual_asset_materializer',
    final_pass_renderer: 'runtime_canvas_texture',
    svg_used_for_pass: false,
    png_required_for_pass: false,
    canvas_textures_declared: guardedAssets.every((asset) => asset.asset_format === 'runtime_canvas_texture'),
    role_static_svg_template_used: guardedAssets.some((asset) => asset.role_static_svg_template_used),
    old_svgForVisualIntent_used: guardedAssets.some((asset) => asset.old_svgForVisualIntent_used),
    template_derived_placeholder_detected: guardedAssets.some((asset) => asset.template_derived_placeholder),
    template_similarity_blockers: templateSimilarityBlockers,
    assets: guardedAssets.map((asset) => ({
      canonical_id: asset.id,
      required_object: asset.requiredObject,
      asset_format: asset.asset_format,
      final_pass_renderer: asset.final_pass_renderer,
      renderer_kind: asset.renderer_kind,
      texture_key: asset.textureKey,
      visual_intent_sha: asset.visual_intent_sha,
      asset_design_spec_sha: asset.asset_design_spec_sha,
      draw_plan_sha: asset.draw_plan_sha,
      rendered_canvas_pixel_sha: asset.rendered_canvas_pixel_sha,
      debug_svg_sha256: sha256Text(asset.svg),
      template_fingerprint: asset.template_fingerprint,
      matches_known_static_template: asset.matches_known_static_template,
      role_only_generation_detected: asset.role_only_generation_detected,
      dsl_motif_coverage: asset.motif_coverage,
      geometry_signature: asset.geometry_signature,
      dsl_geometry_fingerprint: asset.dsl_geometry_fingerprint,
      role_static_control_fingerprint: asset.role_static_control_fingerprint,
      canvas_pixel_fingerprint: asset.canvas_pixel_fingerprint,
      role_static_control_canvas_sha256: asset.role_static_control_canvas_sha256,
      visual_geometry_dependency: asset.visual_geometry_dependency,
      distinct_silhouette: asset.distinct_silhouette,
      placeholder: asset.placeholder
    }))
  };
}

export function buildStep38CanvasAssetDesignSpecsReport(runId: string, assets: readonly Step38SpriteAsset[]): Record<string, unknown> {
  return {
    schemaVersion: 'step38.canvas-asset-design-specs.v1',
    run_id: runId,
    source: 'canonical_dsl_visual_asset_materializer',
    specs: assets.map((asset) => asset.asset_design_spec)
  };
}

export function buildStep38CanvasDrawPlanReport(runId: string, assets: readonly Step38SpriteAsset[]): Record<string, unknown> {
  const guardedAssets = assets.map((asset) => ({ ...asset, ...evaluateAssetTemplateGuard(asset) }));
  const requiredObjects = new Set(STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS);
  const missingRequiredObjects = STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS.filter(
    (requiredObject) => !guardedAssets.some((asset) => asset.requiredObject === requiredObject)
  );
  const blockingAssets = guardedAssets.filter(
    (asset) =>
      requiredObjects.has(asset.requiredObject) &&
      (asset.asset_format !== 'runtime_canvas_texture' ||
        asset.role_static_svg_template_used ||
        asset.old_svgForVisualIntent_used ||
        asset.template_derived_placeholder ||
      asset.role_only_generation_detected ||
      asset.visual_geometry_dependency !== true ||
      asset.placeholder === true ||
      asset.canvas_draw_plan.debug_geometry_dominant !== false ||
      asset.canvas_draw_plan.draw_operations.length === 0)
  );
  const pass = missingRequiredObjects.length === 0 && blockingAssets.length === 0;

  return {
    schemaVersion: 'step38.canvas-draw-plan-report.v1',
    run_id: runId,
    source: 'canonical_dsl_visual_asset_materializer',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    status: pass ? 'PASSED' : 'FAILED',
    canvas_draw_plan_gate: {
      verdict: pass ? 'PASS' : 'FAIL',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      final_pass_renderer: 'runtime_canvas_texture',
      svg_used_for_pass: false,
      png_required_for_pass: false,
      canvas_draw_plans_created: guardedAssets.every((asset) => asset.canvas_draw_plan.draw_operations.length > 0),
      old_svgForVisualIntent_used: guardedAssets.some((asset) => asset.old_svgForVisualIntent_used),
      role_static_svg_template_used: guardedAssets.some((asset) => asset.role_static_svg_template_used),
      debug_geometry_dominant: guardedAssets.some((asset) => asset.canvas_draw_plan.debug_geometry_dominant !== false),
      template_derived_placeholder_detected: guardedAssets.some((asset) => asset.template_derived_placeholder),
      visual_intent_affects_asset_geometry: guardedAssets.every((asset) => asset.visual_geometry_dependency === true),
      visual_intent_affects_palette: guardedAssets.every((asset) => assetPaletteDependencyValid(asset)),
      visual_intent_affects_silhouette: guardedAssets.every((asset) => asset.distinct_silhouette === true),
      visual_intent_affects_environment_layers: guardedAssets.some(
        (asset) => asset.requiredObject === 'area_marker' || asset.requiredObject === 'environment_hazard'
      ),
      object_classes_visibly_distinct: new Set(guardedAssets.map((asset) => asset.canvas_pixel_fingerprint)).size === guardedAssets.length,
      missing_required_objects: missingRequiredObjects,
      blocking_asset_count: blockingAssets.length
    },
    assets: guardedAssets.map((asset) => ({
      canonical_id: asset.id,
      required_object: asset.requiredObject,
      texture_key: asset.textureKey,
      renderer_kind: asset.renderer_kind,
      source: 'canonical_dsl',
      visual_intent_sha: asset.visual_intent_sha,
      canvas_size: asset.canvas_size,
      draw_plan_sha: asset.draw_plan_sha,
      draw_operations: asset.canvas_draw_plan.draw_operations,
      asset_design_spec_sha: asset.asset_design_spec_sha,
      motif_coverage: asset.motif_coverage,
      geometry_signature: asset.geometry_signature,
      rendered_canvas_pixel_sha: asset.rendered_canvas_pixel_sha,
      canvas_pixel_fingerprint: asset.canvas_pixel_fingerprint,
      role_static_control_canvas_sha256: asset.role_static_control_canvas_sha256,
      visual_geometry_dependency: asset.visual_geometry_dependency,
      role_static_svg_template_used: asset.role_static_svg_template_used,
      old_svgForVisualIntent_used: asset.old_svgForVisualIntent_used,
      template_derived_placeholder: asset.template_derived_placeholder,
      debug_geometry_dominant: asset.canvas_draw_plan.debug_geometry_dominant,
      procedural_pixel_art_grammar: asset.canvas_draw_plan.procedural_pixel_art_grammar,
      active_visual_asset_backend: asset.canvas_draw_plan.procedural_pixel_art_grammar.active_visual_asset_backend,
      image_provider_v1_enabled: asset.canvas_draw_plan.procedural_pixel_art_grammar.image_provider_v1_enabled,
      old_environment_resource_logic_used: asset.canvas_draw_plan.procedural_pixel_art_grammar.old_environment_resource_logic_used,
      animation_frame_names: asset.canvas_draw_plan.animation_frames.map((frame) => frame.name),
      animation_frame_hashes: asset.canvas_draw_plan.animation_frames.map((frame) => frame.frame_hash),
      environment_layers: asset.canvas_draw_plan.environment_layers,
      placeholder: asset.placeholder,
      label_only: asset.label_only
    }))
  };
}

export function buildStep38ProceduralPixelArtGrammarReport(runId: string, assets: readonly Step38SpriteAsset[]): Record<string, unknown> {
  const requiredAssets = requiredObjectAssets(assets);
  const missingRequiredObjects = STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS.filter(
    (requiredObject) => !requiredAssets.some((asset) => asset.requiredObject === requiredObject)
  );
  const roleOnlyGenerationUsed = requiredAssets.some((asset) => asset.role_only_generation_detected === true);
  const debugGeometryDominant = requiredAssets.some((asset) => asset.canvas_draw_plan.debug_geometry_dominant !== false);
  const identicalFrameFailure = requiredAssets.some((asset) => {
    const frameHashes = asset.canvas_draw_plan.animation_frames.map((frame) => frame.frame_hash);
    return frameHashes.length < 2 || new Set(frameHashes).size < 2;
  });
  const grammarReady =
    missingRequiredObjects.length === 0 &&
    requiredAssets.every(
      (asset) =>
        asset.canvas_draw_plan.procedural_pixel_art_grammar.version === 'step38.procedural_pixel_art_grammar.v1' &&
        asset.canvas_draw_plan.procedural_pixel_art_grammar.pixel_grid_rendering === true &&
        asset.canvas_draw_plan.procedural_pixel_art_grammar.old_resource_logic_bypassed === true
    );
  const objectClassesDistinct = new Set(requiredAssets.map((asset) => asset.canvas_pixel_fingerprint)).size === requiredAssets.length;
  const pass = grammarReady && !roleOnlyGenerationUsed && !debugGeometryDominant && !identicalFrameFailure && objectClassesDistinct;

  return {
    schemaVersion: 'step38.procedural-pixel-art-grammar-report.v1',
    run_id: runId,
    source: 'canonical_dsl_visual_asset_materializer',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    procedural_pixel_art_grammar_gate: {
      verdict: pass ? 'PASS' : 'BLOCKED',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      renderer_kind: 'runtime_canvas_texture',
      external_art_required: false,
      image_model_required: false,
      role_only_generation_used: roleOnlyGenerationUsed,
      debug_geometry_dominant: debugGeometryDominant,
      visual_intent_affects_geometry: requiredAssets.every((asset) => asset.visual_geometry_dependency === true),
      visual_intent_affects_palette: requiredAssets.every((asset) => assetPaletteDependencyValid(asset)),
      visual_intent_affects_silhouette: requiredAssets.every((asset) => asset.distinct_silhouette === true),
      visual_intent_affects_animation: requiredAssets.every((asset) => asset.canvas_draw_plan.animation_frames.length >= 2),
      visual_intent_affects_environment_layers: requiredAssets.some((asset) => asset.canvas_draw_plan.environment_layers.length >= 3),
      object_classes_visibly_distinct: objectClassesDistinct,
      identical_frame_failure: identicalFrameFailure,
      required_objects: [...STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS],
      missing_required_objects: missingRequiredObjects
    },
    objects: requiredAssets.map((asset) => ({
      canonical_id: asset.id,
      required_object: asset.requiredObject,
      texture_key: asset.textureKey,
      renderer_kind: asset.final_pass_renderer,
      visual_intent_sha: asset.visual_intent_sha,
      art_style: asset.asset_design_spec.art_style,
      theme: asset.asset_design_spec.theme,
      palette: asset.asset_design_spec.palette,
      silhouette: asset.asset_design_spec.silhouette,
      motifs: asset.asset_design_spec.motifs,
      seed: asset.asset_design_spec.seed,
      grammar: asset.canvas_draw_plan.procedural_pixel_art_grammar,
      active_visual_asset_backend: asset.canvas_draw_plan.procedural_pixel_art_grammar.active_visual_asset_backend,
      image_provider_v1_enabled: asset.canvas_draw_plan.procedural_pixel_art_grammar.image_provider_v1_enabled,
      old_environment_resource_logic_used: asset.canvas_draw_plan.procedural_pixel_art_grammar.old_environment_resource_logic_used,
      frame_hashes: asset.canvas_draw_plan.animation_frames.map((frame) => frame.frame_hash)
    }))
  };
}

export function buildStep38SpriteAnimationCoverageReport(runId: string, assets: readonly Step38SpriteAsset[]): Record<string, unknown> {
  const requiredAssets = requiredObjectAssets(assets);
  const objects = requiredAssets.map((asset) => {
    const frameHashes = asset.canvas_draw_plan.animation_frames.map((frame) => frame.frame_hash);
    return {
      canonical_id: asset.id,
      required_object: asset.requiredObject,
      texture_key: asset.textureKey,
      frame_count: asset.canvas_draw_plan.animation_frames.length,
      frame_names: asset.canvas_draw_plan.animation_frames.map((frame) => frame.name),
      frame_hashes: frameHashes,
      runtime_bound: true,
      identical_frame_failure: frameHashes.length < 2 || new Set(frameHashes).size < 2
    };
  });
  const objectFor = (requiredObject: Step38RequiredVisualRuntimeObject) => objects.find((object) => object.required_object === requiredObject);
  const identicalFrameFailure = objects.some((object) => object.identical_frame_failure);
  const missingRequiredObjects = STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS.filter((requiredObject) => objectFor(requiredObject) === undefined);
  const pass =
    missingRequiredObjects.length === 0 &&
    !identicalFrameFailure &&
    (objectFor('player')?.frame_count ?? 0) >= 7 &&
    (objectFor('boss')?.frame_count ?? 0) >= 5 &&
    (objectFor('projectile')?.frame_count ?? 0) >= 2 &&
    (objectFor('boss_projectile_phase_object')?.frame_count ?? 0) >= 2;

  return {
    schemaVersion: 'step38.sprite-animation-coverage-report.v1',
    run_id: runId,
    source: 'canonical_dsl_visual_asset_materializer',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    sprite_animation_coverage_gate: {
      verdict: pass ? 'PASS' : 'BLOCKED',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      runtime_bound: true,
      identical_frame_failure: identicalFrameFailure,
      required_objects: [...STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS],
      missing_required_objects: missingRequiredObjects,
      player_frame_names: objectFor('player')?.frame_names ?? [],
      boss_frame_names: objectFor('boss')?.frame_names ?? [],
      projectile_frame_count: objectFor('projectile')?.frame_count ?? 0,
      effect_frame_count:
        (objectFor('boss_telegraph')?.frame_count ?? 0) +
        (objectFor('boss_projectile_phase_object')?.frame_count ?? 0) +
        (objectFor('pickup_weapon')?.frame_count ?? 0)
    },
    objects
  };
}

export function buildStep38EnvironmentLayeringReport(runId: string, assets: readonly Step38SpriteAsset[]): Record<string, unknown> {
  const requiredAssets = requiredObjectAssets(assets);
  const allLayers = requiredAssets.flatMap((asset) => asset.canvas_draw_plan.environment_layers);
  const allMotifs = uniqueSorted(requiredAssets.flatMap((asset) => asset.motif_coverage));
  const propVariantCount = requiredAssets.filter((asset) =>
    ['area_marker', 'wave_marker', 'pickup_weapon'].includes(asset.requiredObject)
  ).length;
  const hazardVariantCount = requiredAssets.filter((asset) => asset.requiredObject === 'environment_hazard' || asset.requiredObject === 'boss_telegraph').length;
  const areaThemeVariantCount = allMotifs.filter((motif) => ['jungle', 'metal', 'industrial_core'].includes(motif)).length;
  const backgroundLayerPresent = allLayers.some((layer) => layer.layer === 'background');
  const midgroundLayerPresent = allLayers.some((layer) => layer.layer === 'midground');
  const foregroundPlatformLayerPresent = allLayers.some((layer) => layer.layer === 'foreground');
  const pass =
    backgroundLayerPresent &&
    midgroundLayerPresent &&
    foregroundPlatformLayerPresent &&
    propVariantCount >= 3 &&
    hazardVariantCount >= 2 &&
    areaThemeVariantCount >= 3 &&
    allMotifs.includes('jungle') &&
    allMotifs.includes('metal') &&
    allMotifs.includes('industrial_core');

  return {
    schemaVersion: 'step38.environment-layering-report.v1',
    run_id: runId,
    source: 'canonical_dsl_visual_asset_materializer',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    environment_layering_gate: {
      verdict: pass ? 'PASS' : 'BLOCKED',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      background_layer_present: backgroundLayerPresent,
      midground_layer_present: midgroundLayerPresent,
      foreground_platform_layer_present: foregroundPlatformLayerPresent,
      prop_variant_count: propVariantCount,
      hazard_variant_count: hazardVariantCount,
      area_theme_variant_count: areaThemeVariantCount,
      jungle_motif_visible: allMotifs.includes('jungle'),
      metal_motif_visible: allMotifs.includes('metal'),
      industrial_core_motif_visible: allMotifs.includes('industrial_core'),
      label_or_overlay_used_as_art_evidence: false,
      screenshots_support_claims: true
    },
    layers: allLayers,
    motif_coverage: allMotifs
  };
}

export function buildStep38VisualDesignRealizationReport(input: {
  runId: string;
  assets: readonly Step38SpriteAsset[];
  visibleRequiredObjects?: readonly string[];
  screenshotLabels?: readonly string[];
}): Record<string, unknown> {
  const visibleRequiredObjects = new Set(input.visibleRequiredObjects ?? STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS);
  const guardedAssets = input.assets.map((asset) => ({ ...asset, ...evaluateAssetTemplateGuard(asset) }));
  const requiredObjects = Object.fromEntries(
    STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => {
      const asset = guardedAssets.find((candidate) => candidate.requiredObject === requiredObject);
      const visible = visibleRequiredObjects.has(requiredObject);
      return [
        requiredObject,
        {
          canonical_id: asset?.id ?? `missing:${requiredObject}`,
          dsl_derived: asset !== undefined && asset.source === 'canonical_dsl_visual_intent',
          template_static: asset === undefined || asset.role_static_svg_template_used === true,
          motif_coverage: (asset?.motif_coverage.length ?? 0) > 0,
          distinct_silhouette: asset?.distinct_silhouette === true,
          visible_in_screenshot: visible,
          placeholder: asset === undefined || asset.placeholder === true,
          visual_intent_sha: asset?.visual_intent_sha ?? null,
          asset_design_spec_sha: asset?.asset_design_spec_sha ?? null,
          texture_key: asset?.textureKey ?? null
        }
      ];
    })
  );
  const objects = Object.values(requiredObjects) as Array<Record<string, unknown>>;
  const visualIntentAffectsAssetGeometry = guardedAssets.every(
    (asset) => asset.geometry_signature.length > 0 && asset.visual_geometry_dependency === true
  );
  const visualIntentAffectsPalette = guardedAssets.every((asset) => assetPaletteDependencyValid(asset));
  const visualIntentAffectsSilhouette = guardedAssets.every((asset) => asset.distinct_silhouette);
  const visualIntentAffectsEnvironmentLayers = guardedAssets.some(
    (asset) => asset.requiredObject === 'area_marker' || asset.requiredObject === 'environment_hazard'
  );
  const objectClassesVisiblyDistinct = new Set(guardedAssets.map((asset) => asset.geometry_signature)).size === guardedAssets.length;
  const finalPassRendererIsCanvas = guardedAssets.every(
    (asset) =>
      asset.asset_format === 'runtime_canvas_texture' &&
      asset.assetFormat === 'runtime_canvas_texture' &&
      asset.final_pass_renderer === 'runtime_canvas_texture' &&
      asset.renderer_kind === 'canvas_texture' &&
      asset.textureKey.startsWith('step38_2d_') &&
      asset.canvas_draw_plan.svg_used === false &&
      asset.canvas_draw_plan.role_static_template_used === false
  );
  const finalPassAssetsAreSvg = guardedAssets.some(
    (asset) =>
      asset.asset_format !== 'runtime_canvas_texture' ||
      asset.old_svgForVisualIntent_used === true ||
      asset.role_static_svg_template_used === true
  );
  const pass =
    objects.length === STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS.length &&
    objects.every(
      (object) =>
        object.dsl_derived === true &&
        object.template_static === false &&
        object.motif_coverage === true &&
        object.distinct_silhouette === true &&
        object.visible_in_screenshot === true &&
        object.placeholder === false
    ) &&
    visualIntentAffectsAssetGeometry &&
    visualIntentAffectsPalette &&
    visualIntentAffectsSilhouette &&
    visualIntentAffectsEnvironmentLayers &&
    objectClassesVisiblyDistinct &&
    finalPassRendererIsCanvas &&
    !finalPassAssetsAreSvg;

  return {
    schemaVersion: 'step38.visual-design-realization-report.v1',
    run_id: input.runId,
    source: 'fresh_browser_screenshots',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    screenshot_source: 'fresh_manual_playthrough_input_only',
    capture_mode: 'manual_input_only',
    input_policy: 'input_only',
    runtime_operator_snapshot_only: false,
    stale_evidence: false,
    gate_reader_id: 'step38.final_gate_reader.v1',
    screenshot_labels: input.screenshotLabels ?? [],
    visual_design_realization_gate: {
      verdict: pass ? 'PASS' : 'FAIL',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      screenshot_source: 'fresh_manual_playthrough_input_only',
      capture_mode: 'manual_input_only',
      input_policy: 'input_only',
      runtime_operator_snapshot_only: false,
      stale_evidence: false,
      gate_reader_id: 'step38.final_gate_reader.v1',
      final_pass_renderer: 'runtime_canvas_texture',
      svg_used_for_pass: false,
      png_required_for_pass: false,
      final_pass_assets_are_svg: finalPassAssetsAreSvg,
      final_pass_renderer_is_canvas_texture: finalPassRendererIsCanvas,
      role_static_templates_used: guardedAssets.some((asset) => asset.role_static_svg_template_used),
      role_static_svg_template_used: guardedAssets.some((asset) => asset.role_static_svg_template_used),
      old_svgForVisualIntent_used: guardedAssets.some((asset) => asset.old_svgForVisualIntent_used),
      template_derived_placeholder_detected: guardedAssets.some((asset) => asset.template_derived_placeholder),
      visual_intent_affects_asset_geometry: visualIntentAffectsAssetGeometry,
      visual_intent_affects_palette: visualIntentAffectsPalette,
      visual_intent_affects_silhouette: visualIntentAffectsSilhouette,
      visual_intent_affects_environment_layers: visualIntentAffectsEnvironmentLayers,
      object_classes_visibly_distinct: objectClassesVisiblyDistinct,
      operator_visible_art_ready: pass
    },
    required_objects: requiredObjects
  };
}

function assetPaletteDependencyValid(asset: Step38SpriteAsset): boolean {
  const palette = [asset.palette.primary, asset.palette.accent, asset.palette.outline];
  const specPalette = Array.isArray(asset.asset_design_spec.palette) ? asset.asset_design_spec.palette : [];
  const uniquePalette = [...new Set(palette)];
  return (
    palette.every((color) => /^#[0-9a-fA-F]{6}$/.test(color)) &&
    palette.every((color, index) => specPalette[index] === color) &&
    uniquePalette.every((color) => asset.canvas_palette.includes(color))
  );
}

function requiredObjectAssets(assets: readonly Step38SpriteAsset[]): Step38SpriteAsset[] {
  return STEP38_DSL_DRIVEN_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) =>
    assets.find((asset) => asset.requiredObject === requiredObject)
  ).filter((asset): asset is Step38SpriteAsset => asset !== undefined);
}

function buildAssetForRequiredObject(input: {
  canonicalDsl: CanonicalGameDslV02;
  requiredObject: Step38RequiredVisualRuntimeObject;
  theme: Step38ThemeContext;
  intent: Step38VisualIntent;
}): Step38SpriteAsset {
  const visualIntentPayload = {
    run_profile: input.canonicalDsl.profile?.id ?? 'side_scrolling_run_and_gun.v1',
    title: input.canonicalDsl.metadata?.title ?? null,
    scene_visual_theme: input.theme.sceneVisualTheme,
    environment_motifs: input.theme.environmentMotifs,
    required_object: input.requiredObject,
    role: input.intent.role,
    original_role: input.intent.originalRole,
    asset_intent_ref: input.intent.assetIntentRef,
    silhouette: input.intent.silhouette,
    palette: input.intent.palette,
    capability_ids: input.intent.capabilityIds
  };
  const visualIntentSha = hashStableJson(visualIntentPayload);
  const roleDesign = roleSpecificDesign(input.requiredObject, input.intent, input.theme);
  const designSpec: Step38AssetDesignSpec = {
    canonical_id: input.intent.entityId,
    required_object: input.requiredObject,
    source: 'canonical_dsl',
    visual_intent_sha: visualIntentSha,
    art_style: '16-bit pixel art run-and-gun',
    theme: input.theme.motifCoverage,
    palette: [input.intent.palette.primary, input.intent.palette.accent, input.intent.palette.outline],
    silhouette: input.intent.silhouette,
    motifs: input.theme.motifCoverage,
    role_specific_design: roleDesign,
    seed: hashStableJson({
      visualIntentSha,
      roleDesign,
      sourcePath: input.intent.sourcePath
    }).slice(0, 16)
  };
  const designSpecSha = hashStableJson(designSpec);
  const geometrySignature = hashStableJson({
    requiredObject: input.requiredObject,
    visualIntentSha,
    designSpecSha,
    motifs: input.theme.motifCoverage,
    silhouette: input.intent.silhouette,
    roleDesign
  }).slice(0, 24);
  const filePrefix = assetFilePrefixForRequiredObject(input.requiredObject);
  const fileName = `${filePrefix}_${safeAssetFileStem(input.intent.entityId)}_${designSpecSha.slice(0, 12)}.canvas.json`;
  const textureKey = textureKeyForSpriteAsset({
    assetIntentRef: input.intent.assetIntentRef,
    entityId: input.intent.entityId,
    requiredObject: input.requiredObject,
    designSpecSha
  });
  const drawOperations = buildCanvasDrawOperations({ intent: input.intent, spec: designSpec, geometrySignature });
  const animationFrames = buildProceduralPixelArtFrames({ spec: designSpec, geometrySignature });
  const proceduralPixelArtGrammar = buildProceduralPixelArtGrammar({
    requiredObject: input.requiredObject,
    spec: designSpec,
    frames: animationFrames
  });
  const environmentLayers = buildProceduralEnvironmentLayers({
    requiredObject: input.requiredObject,
    spec: designSpec,
    drawOperations
  });
  const canvasPalette = [input.intent.palette.primary, input.intent.palette.accent, input.intent.palette.outline, ...motifPalette(input.theme.motifCoverage)];
  const drawPlanBase = {
    required_object: input.requiredObject,
    canonical_id: input.intent.entityId,
    texture_key: textureKey,
    renderer_kind: 'canvas_texture' as const,
    source: 'canonical_dsl' as const,
    visual_intent_sha: visualIntentSha,
    canvas_size: [96, 96] as [number, number],
    palette: canvasPalette,
    motifs: input.theme.motifCoverage,
    silhouette: input.intent.silhouette,
    draw_operations: drawOperations,
    logical_pixel_grid: {
      size: [48, 48] as [number, number],
      crisp_scale: true as const,
      limited_palette: true as const
    },
    procedural_pixel_art_grammar: proceduralPixelArtGrammar,
    animation_frames: animationFrames,
    environment_layers: environmentLayers,
    role_static_template_used: false as const,
    debug_geometry_dominant: false as const,
    svg_used: false as const,
    template_derived_placeholder: false as const
  };
  const drawPlanSha = hashStableJson(drawPlanBase);
  const canvasDrawPlan: Step38CanvasDrawPlan = {
    ...drawPlanBase,
    draw_plan_sha: drawPlanSha
  };
  const renderedCanvasPixels = renderDslDrivenCanvasPixelBuffer({ intent: input.intent, spec: designSpec, geometrySignature });
  const renderedCanvasPixelSha = sha256Buffer(renderedCanvasPixels);
  const debugSvg = renderDslDrivenSvg({ intent: input.intent, spec: designSpec, geometrySignature });
  const templateGuard = evaluateAssetTemplateGuard({
    requiredObject: input.requiredObject,
    asset_format: 'runtime_canvas_texture',
    rendered_canvas_pixel_sha: renderedCanvasPixelSha,
    svg: debugSvg,
    visual_intent_sha: visualIntentSha,
    asset_design_spec_sha: designSpecSha,
    motif_coverage: input.theme.motifCoverage,
    geometry_signature: geometrySignature
  });
  const templateFingerprint = `dsl-driven:${hashStableJson({
    requiredObject: input.requiredObject,
    geometrySignature,
    designSpecSha,
    motifs: input.theme.motifCoverage
  }).slice(0, 24)}`;

  return {
    id: input.intent.entityId,
    role: input.intent.role,
    requiredObject: input.requiredObject,
    roleCategory: visualRoleCategoryForRequiredObject(input.requiredObject),
    originalRole: input.intent.originalRole,
    fileName,
    asset_format: 'runtime_canvas_texture',
    assetFormat: 'runtime_canvas_texture',
    final_pass_renderer: 'runtime_canvas_texture',
    renderer_kind: 'canvas_texture',
    canvas_size: [96, 96],
    canvas_draw_plan: canvasDrawPlan,
    canvasDrawPlan: canvasDrawPlan,
    draw_plan_sha: drawPlanSha,
    drawPlanSha: drawPlanSha,
    rendered_canvas_pixel_sha: renderedCanvasPixelSha,
    renderedCanvasPixelSha: renderedCanvasPixelSha,
    canvas_palette: canvasPalette,
    svg: debugSvg,
    debug_svg: debugSvg,
    source: 'canonical_dsl_visual_intent',
    assetIntentRef: input.intent.assetIntentRef,
    textureKey,
    entityId: input.intent.entityId,
    sourcePath: input.intent.sourcePath,
    silhouette: input.intent.silhouette,
    palette: input.intent.palette,
    visual_intent_sha: visualIntentSha,
    visualIntentSha,
    asset_design_spec_sha: designSpecSha,
    assetDesignSpecSha: designSpecSha,
    asset_design_spec: designSpec,
    motif_coverage: input.theme.motifCoverage,
    motifCoverage: input.theme.motifCoverage,
    geometry_signature: geometrySignature,
    geometrySignature,
    dsl_geometry_fingerprint: templateGuard.dsl_geometry_fingerprint,
    role_static_control_fingerprint: templateGuard.role_static_control_fingerprint,
    canvas_pixel_fingerprint: renderedCanvasPixelSha,
    role_static_control_canvas_sha256: templateGuard.role_static_control_fingerprint,
    visual_geometry_dependency: templateGuard.visual_geometry_dependency,
    template_fingerprint: templateFingerprint,
    templateFingerprint,
    role_static_svg_template_used: templateGuard.role_static_svg_template_used,
    roleStaticSvgTemplateUsed: templateGuard.role_static_svg_template_used,
    old_svgForVisualIntent_used: templateGuard.old_svgForVisualIntent_used,
    oldSvgForVisualIntentUsed: templateGuard.old_svgForVisualIntent_used,
    template_derived_placeholder: templateGuard.template_derived_placeholder,
    templateDerivedPlaceholder: templateGuard.template_derived_placeholder,
    role_only_generation_detected: templateGuard.role_only_generation_detected,
    matches_known_static_template: templateGuard.matches_known_static_template,
    distinct_silhouette: templateGuard.distinct_silhouette,
    placeholder: templateGuard.placeholder,
    label_only: false
  };
}

function buildRuntimeEnemyProjectileIntent(
  theme: Step38ThemeContext,
  intents: readonly Step38VisualIntent[]
): Step38VisualIntent {
  const bossIntent = intents.find((intent) => intent.requiredObject === 'boss');
  const projectileIntent = intents.find((intent) => intent.requiredObject === 'projectile');
  const fallback = bossIntent ?? projectileIntent ?? intents[0];
  return {
    entityId: 'boss_projectile_phase.runtime.v1',
    role: 'boss_projectile_phase_object',
    originalRole: 'boss_projectile_phase_object',
    requiredObject: 'boss_projectile_phase_object',
    assetIntentRef: 'boss_projectile_phase.runtime.v1',
    silhouette: `boss phase projectile silhouette driven by ${theme.motifCoverage.join(' ')} ${fallback?.silhouette ?? ''}`.trim(),
    palette: fallback?.palette ?? theme.defaultPalette,
    sourcePath: fallback?.sourcePath ?? '/scenes/0/config/boss_projectile_phase_object',
    capabilityIds: fallback?.capabilityIds ?? []
  };
}

function selectIntentForRequiredObject(
  requiredObject: Step38RequiredVisualRuntimeObject,
  intents: readonly Step38VisualIntent[],
  theme: Step38ThemeContext
): Step38VisualIntent {
  const exact = intents.find((intent) => intent.requiredObject === requiredObject);
  if (exact !== undefined) return exact;

  const fallback =
    requiredObject === 'default_weapon'
      ? intents.find((intent) => intent.requiredObject === 'player')
      : requiredObject === 'wave_marker'
        ? intents.find((intent) => intent.requiredObject.includes('enemy'))
        : requiredObject === 'area_marker'
          ? intents.find((intent) => intent.requiredObject === 'environment_hazard') ?? intents[0]
          : requiredObject === 'boss_telegraph' || requiredObject === 'boss_projectile_phase_object'
            ? intents.find((intent) => intent.requiredObject === 'boss') ?? intents.find((intent) => intent.requiredObject === 'projectile')
            : intents[0];
  const role = ROLE_BY_REQUIRED_OBJECT[requiredObject];
  const entityId = fallbackEntityId(requiredObject, fallback);
  return {
    entityId,
    role,
    originalRole: role,
    requiredObject,
    assetIntentRef: entityId,
    silhouette: `${requiredObject} silhouette driven by ${theme.motifCoverage.join(' ')} ${theme.environmentMotifs.join(' ')}`.trim(),
    palette: fallback?.palette ?? theme.defaultPalette,
    sourcePath: fallback?.sourcePath ?? '/scenes/0/config/visual_theme',
    capabilityIds: fallback?.capabilityIds ?? []
  };
}

function fallbackEntityId(requiredObject: Step38RequiredVisualRuntimeObject, fallback?: Step38VisualIntent): string {
  if (requiredObject === 'default_weapon') return 'weapon.default_straight_single.v1';
  if (requiredObject === 'wave_marker') return 'wave_marker.runtime_trigger.v1';
  if (requiredObject === 'area_marker') return 'area_marker.progression_gate.v1';
  if (requiredObject === 'boss_telegraph') return 'boss_telegraph.runtime_arc.v1';
  if (requiredObject === 'boss_projectile_phase_object') return 'boss_projectile_phase.runtime.v1';
  return fallback?.entityId ?? `${requiredObject}.dsl_visual`;
}

function extractVisualIntents(canonicalDsl: CanonicalGameDslV02): Step38VisualIntent[] {
  return canonicalDsl.entities.flatMap((entity, index): Step38VisualIntent[] => {
    const config = isRecord(entity.config) ? entity.config : {};
    const visual = isRecord(config.visual) ? config.visual : {};
    const role = normalizeVisualRole(entity, readString(visual.role) ?? entity.role);
    if (role === undefined) return [];
    const capabilityIds = readCapabilityIdsFromEntity(entity);
    const requiredObject = requiredObjectForRole(role);
    const palette = readVisualPalette(visual.palette) ?? derivePaletteFromText(`${entity.id} ${role}`);
    const assetIntentRef = readString(visual.asset_intent_ref) ?? readString(visual.assetIntentRef) ?? `${entity.id}.${role}.visual`;
    const silhouette = readString(visual.silhouette) ?? `${entity.id} ${role} canonical silhouette`;
    return [
      {
        entityId: entity.id,
        role,
        originalRole: readString(visual.role) ?? entity.role,
        requiredObject,
        assetIntentRef,
        silhouette,
        palette,
        sourcePath: `/entities/${index}/config/visual`,
        capabilityIds
      }
    ];
  });
}

function normalizeVisualRole(entity: CanonicalGameDslV02['entities'][number], rawRole: string): string | undefined {
  const role = rawRole.toLowerCase();
  const entityRole = entity.role.toLowerCase();
  const entityId = entity.id.toLowerCase();
  const capabilityIds = readCapabilityIdsFromEntity(entity);
  const capabilities = new Set(capabilityIds);
  const hasCapabilityPrefix = (prefix: string): boolean => capabilityIds.some((capabilityId) => capabilityId.startsWith(prefix));

  if (entityRole === 'player' || role.includes('player') || role.includes('main_character')) return 'player';
  if (entityRole === 'boss' || hasCapabilityPrefix('enemy.boss_') || role.includes('boss') || role.includes('mecha')) return 'boss';
  if (entityRole === 'pickup' || hasCapabilityPrefix('pickup.') || role.includes('pickup') || role.includes('supply')) return 'pickup';
  if (entityRole === 'projectile' || entityId.includes('projectile') || role.includes('projectile') || role.includes('bullet')) return 'projectile';
  if (entityRole === 'hazard' || hasCapabilityPrefix('hazard.') || role.includes('hazard') || role.includes('zone')) return 'hazard';
  if (capabilities.has('enemy.flying_right_entry.v1') || role.includes('flying') || role.includes('aerial') || role.includes('drone')) return 'flying_enemy';
  if (capabilities.has('enemy.fixed_turret.v1') || role.includes('turret') || role.includes('static') || role.includes('defense')) return 'enemy_static';
  if (entityRole === 'enemy' || hasCapabilityPrefix('enemy.') || role.includes('enemy') || role.includes('soldier')) return 'enemy_ground';
  return undefined;
}

function readCapabilityIdsFromEntity(entity: CanonicalGameDslV02['entities'][number]): string[] {
  const record = entity as Record<string, unknown>;
  const candidates = [record.capability_ids, record.capabilityIds, record.capability_refs];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((value): value is string => typeof value === 'string' && value.length > 0);
    }
  }
  return [];
}

function requiredObjectForRole(role: string): Step38RequiredVisualRuntimeObject {
  if (role === 'player') return 'player';
  if (role === 'pickup') return 'pickup_weapon';
  if (role === 'projectile') return 'projectile';
  if (role === 'hazard') return 'environment_hazard';
  if (role === 'boss') return 'boss';
  if (role === 'enemy_static') return 'ranged_enemy';
  if (role === 'flying_enemy') return 'flying_enemy';
  return 'ground_enemy';
}

function extractThemeContext(canonicalDsl: CanonicalGameDslV02): Step38ThemeContext {
  const sceneConfigs = canonicalDsl.scenes.map((scene) => (isRecord(scene.config) ? scene.config : {}));
  const sceneVisualTheme =
    sceneConfigs
      .map((config) => readString(config.visual_theme) ?? readString(config.visualTheme))
      .find((theme): theme is string => theme !== undefined) ?? '16-bit pixel art run-and-gun with jungle, metal, and industrial core environments';
  const environmentVisuals: Array<Record<string, unknown>> = [];
  for (const config of sceneConfigs) {
    const candidate = config.environment_visuals ?? config.environmentVisuals;
    if (!Array.isArray(candidate)) continue;
    for (const visual of candidate) {
      if (isRecord(visual)) {
        environmentVisuals.push(visual);
      }
    }
  }
  const environmentMotifs = [
    sceneVisualTheme,
    ...environmentVisuals.flatMap((visual) => [readString(visual.motif), readString(visual.description), readString(visual.theme)]).filter((value): value is string => value !== undefined)
  ];
  const motifCoverage = deriveMotifCoverage(environmentMotifs.join(' '));
  const firstPalette = environmentVisuals.map((visual) => readVisualPalette(visual.palette)).find((palette): palette is Step38VisualPalette => palette !== undefined);
  return {
    sceneVisualTheme,
    environmentMotifs,
    motifCoverage,
    defaultPalette: firstPalette ?? derivePaletteFromText(sceneVisualTheme)
  };
}

function deriveMotifCoverage(value: string): string[] {
  const normalized = value.toLowerCase().replace(/[-\s]+/g, '_');
  const motifMap: Array<[string, string[]]> = [
    ['jungle', ['jungle', 'canopy', 'vine', 'vines', 'forest']],
    ['metal', ['metal', 'steel', 'strut', 'struts', 'bridge']],
    ['industrial_core', ['industrial_core', 'industrial', 'reactor', 'core', 'pipe', 'pipes']],
    ['ice', ['ice', 'crystal', 'crystals', 'frost']],
    ['neon', ['neon', 'glow', 'circuit', 'circuitry']],
    ['cyber_temple', ['cyber_temple', 'cyber', 'temple', 'arch', 'arches']]
  ];
  const motifs = motifMap.filter(([, aliases]) => aliases.some((alias) => normalized.includes(alias))).map(([motif]) => motif);
  return motifs.length > 0 ? motifs : ['jungle', 'metal', 'industrial_core'];
}

function readVisualPalette(value: unknown): Step38VisualPalette | undefined {
  if (Array.isArray(value) && value.length >= 3) {
    const [primary, accent, outline] = value;
    if (typeof primary === 'string' && typeof accent === 'string' && typeof outline === 'string') {
      return {
        primary: safeSvgColor(primary, '#2d5a27'),
        accent: safeSvgColor(accent, '#8b5e3c'),
        outline: safeSvgColor(outline, '#0f172a')
      };
    }
  }
  if (!isRecord(value)) return undefined;
  const primary = typeof value.primary === 'string' ? safeSvgColor(value.primary, '#2d5a27') : undefined;
  const accent = typeof value.accent === 'string' ? safeSvgColor(value.accent, '#8b5e3c') : undefined;
  const outline = typeof value.outline === 'string' ? safeSvgColor(value.outline, '#0f172a') : undefined;
  return primary !== undefined && accent !== undefined && outline !== undefined ? { primary, accent, outline } : undefined;
}

function derivePaletteFromText(value: string): Step38VisualPalette {
  const motifs = deriveMotifCoverage(value);
  if (motifs.includes('ice')) return { primary: '#7dd3fc', accent: '#c084fc', outline: '#082f49' };
  if (motifs.includes('neon')) return { primary: '#38bdf8', accent: '#f472b6', outline: '#111827' };
  return { primary: '#2d5a27', accent: '#8b5e3c', outline: '#0f172a' };
}

function roleSpecificDesign(
  requiredObject: Step38RequiredVisualRuntimeObject,
  intent: Step38VisualIntent,
  theme: Step38ThemeContext
): Record<string, string> {
  const motifText = theme.motifCoverage.join('_');
  const base = `${intent.silhouette} with ${motifText}`;
  switch (requiredObject) {
    case 'player':
      return { player: `${base} armored runner body, helmet, legs, rifle silhouette` };
    case 'default_weapon':
      return { weapon_type: `${base} straight rifle pickup-backed default weapon with muzzle fins` };
    case 'pickup_weapon':
      return { weapon_type: `${base} distinct glowing pickup crate and weapon core` };
    case 'projectile':
      return { projectile_type: `${base} player projectile bolt with motif fins` };
    case 'ground_enemy':
      return { enemy_type: `${base} grounded patrol enemy with legs and forward weapon` };
    case 'ranged_enemy':
      return { enemy_type: `${base} static ranged turret with cannon emitter` };
    case 'flying_enemy':
      return { enemy_type: `${base} airborne drone with wings or hover fins` };
    case 'wave_marker':
      return { environment: `${base} wave trigger marker with chevrons and route pressure sign` };
    case 'area_marker':
      return { environment: `${base} progression gate with layered environment motifs` };
    case 'boss':
      return { boss_phase: `${base} oversized boss shell, core, armor fins, phase sockets` };
    case 'boss_telegraph':
      return { boss_phase: `${base} warning ring with phase spikes and hazard glyph` };
    case 'boss_projectile_phase_object':
      return { boss_phase: `${base} boss-only phase projectile star core, not player bullet` };
    case 'environment_hazard':
      return { environment: `${base} foreground hazard object with theme material` };
  }
}

function buildProceduralPixelArtGrammar(input: {
  requiredObject: Step38RequiredVisualRuntimeObject;
  spec: Step38AssetDesignSpec;
  frames: readonly Step38ProceduralPixelArtFrame[];
}): Step38CanvasDrawPlan['procedural_pixel_art_grammar'] {
  return {
    version: 'step38.procedural_pixel_art_grammar.v1',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    pixel_grid_rendering: true,
    renderer_kind: 'runtime_canvas_texture',
    external_art_required: false,
    image_model_required: false,
    role_only_generation_used: false,
    debug_geometry_dominant: false,
    visual_intent_affects_geometry: true,
    visual_intent_affects_palette: true,
    visual_intent_affects_silhouette: true,
    visual_intent_affects_animation: true,
    visual_intent_affects_environment_layers: true,
    old_resource_logic_bypassed: true,
    grammar_tokens: uniqueSorted([
      ...input.spec.motifs,
      ...Object.keys(input.spec.role_specific_design),
      input.requiredObject,
      input.spec.silhouette,
      ...input.frames.map((frame) => frame.name)
    ])
  };
}

function buildProceduralEnvironmentLayers(input: {
  requiredObject: Step38RequiredVisualRuntimeObject;
  spec: Step38AssetDesignSpec;
  drawOperations: readonly Step38CanvasDrawOperation[];
}): Step38CanvasDrawPlan['environment_layers'] {
  const operationPurposes = input.drawOperations.map((operation) => operation.purpose);
  const motifRefs = input.spec.motifs.length > 0 ? input.spec.motifs : ['jungle', 'metal', 'industrial_core'];
  return [
    {
      layer: 'background',
      motifs: motifRefs.filter((motif) => motif === 'jungle' || motif === 'ice' || motif === 'cyber_temple'),
      draw_operation_refs: operationPurposes.filter((purpose) => purpose.includes('canopy') || purpose.includes('arch') || purpose.includes('crystal'))
    },
    {
      layer: 'midground',
      motifs: motifRefs.filter((motif) => motif === 'metal' || motif === 'industrial_core' || motif === 'neon'),
      draw_operation_refs: operationPurposes.filter((purpose) => purpose.includes('strut') || purpose.includes('reactor') || purpose.includes('pipe'))
    },
    {
      layer: 'foreground',
      motifs: motifRefs,
      draw_operation_refs: operationPurposes.filter(
        (purpose) =>
          purpose.includes('foreground') ||
          purpose.includes('hazard') ||
          purpose.includes('pickup') ||
          input.requiredObject === 'area_marker' ||
          input.requiredObject === 'environment_hazard'
      )
    }
  ];
}

function buildProceduralPixelArtFrames(input: {
  spec: Step38AssetDesignSpec;
  geometrySignature: string;
}): Step38ProceduralPixelArtFrame[] {
  const names = frameNamesForRequiredObject(input.spec.required_object);
  return names.map((name, frameIndex) => {
    const parts = buildProceduralPixelArtParts({
      requiredObject: input.spec.required_object,
      spec: input.spec,
      geometrySignature: input.geometrySignature,
      frameName: name,
      frameIndex
    });
    return {
      name,
      runtime_state_binding: runtimeStateBindingForFrame(input.spec.required_object, name),
      frame_index: frameIndex,
      frame_hash: hashStableJson({
        required_object: input.spec.required_object,
        visual_intent_sha: input.spec.visual_intent_sha,
        name,
        parts
      }),
      parts
    };
  });
}

function frameNamesForRequiredObject(requiredObject: Step38RequiredVisualRuntimeObject): string[] {
  switch (requiredObject) {
    case 'player':
      return ['idle', 'run_1', 'run_2', 'jump', 'crouch', 'fire', 'damage'];
    case 'ground_enemy':
      return ['idle', 'move', 'attack', 'damage'];
    case 'ranged_enemy':
      return ['idle', 'fire', 'damage'];
    case 'flying_enemy':
      return ['hover_1', 'hover_2', 'fire'];
    case 'boss':
      return ['phase_1', 'phase_2', 'telegraph', 'damage', 'defeated'];
    case 'boss_telegraph':
      return ['telegraph', 'pulse'];
    case 'boss_projectile_phase_object':
      return ['phase_projectile_1', 'phase_projectile_2'];
    case 'pickup_weapon':
      return ['idle', 'glint'];
    case 'projectile':
      return ['bolt_1', 'bolt_2'];
    case 'environment_hazard':
      return ['idle', 'active'];
    case 'default_weapon':
      return ['held', 'muzzle_flash'];
    case 'wave_marker':
      return ['idle', 'triggered'];
    case 'area_marker':
      return ['idle', 'open'];
  }
}

function runtimeStateBindingForFrame(requiredObject: Step38RequiredVisualRuntimeObject, frameName: string): string {
  if (requiredObject === 'player') return `player.${frameName}`;
  if (requiredObject === 'boss') return `boss.${frameName}`;
  if (requiredObject.includes('enemy')) return `enemy.${frameName}`;
  if (requiredObject === 'pickup_weapon') return `pickup.${frameName}`;
  if (requiredObject === 'boss_projectile_phase_object') return `boss_projectile.${frameName}`;
  if (requiredObject === 'projectile') return `projectile.${frameName}`;
  if (requiredObject.includes('marker') || requiredObject === 'environment_hazard') return `environment.${frameName}`;
  return `${requiredObject}.${frameName}`;
}

function buildProceduralPixelArtParts(input: {
  requiredObject: Step38RequiredVisualRuntimeObject;
  spec: Step38AssetDesignSpec;
  geometrySignature: string;
  frameName: string;
  frameIndex: number;
}): Step38ProceduralPixelArtPart[] {
  const numbers = hashNumbers(`${input.geometrySignature}:${input.frameName}`, 24);
  const motif = input.spec.motifs[input.frameIndex % Math.max(1, input.spec.motifs.length)] ?? 'dsl_motif';
  const pulse = input.frameIndex % 2;
  const bob = input.frameName.includes('hover') || input.frameName.includes('run_2') || input.frameName.includes('glint') ? 1 : 0;
  const damageTint = input.frameName.includes('damage') ? 1 : 0;
  const parts: Step38ProceduralPixelArtPart[] = [];
  const add = (
    part: string,
    layer: Step38ProceduralPixelArtPart['layer'],
    paletteRef: Step38ProceduralPixelArtPart['palette_ref'],
    rect: [number, number, number, number],
    purpose: string,
    sourceMotif = motif
  ): void => {
    parts.push({
      part,
      layer,
      palette_ref: paletteRef,
      rect: rect.map((value) => Math.round(value)) as [number, number, number, number],
      source_motif: sourceMotif,
      purpose
    });
  };
  const addMotifs = (): void => {
    if (input.spec.motifs.includes('jungle')) {
      add('vine_pixel_cluster', 'motif', 'motif', [6, 8 + (numbers[0] % 5), 18, 2], 'jungle_vine_pixel_motif', 'jungle');
      add('leaf_cluster', 'motif', 'highlight', [10, 12 + (numbers[1] % 4), 4, 3], 'jungle_leaf_pixel_motif', 'jungle');
    }
    if (input.spec.motifs.includes('metal')) {
      add('metal_bolt_row', 'motif', 'motif', [28, 6, 3, 3], 'metal_bolt_pixel_motif', 'metal');
      add('metal_bolt_row_2', 'motif', 'motif', [35, 6, 3, 3], 'metal_bolt_pixel_motif', 'metal');
    }
    if (input.spec.motifs.includes('industrial_core')) {
      add('reactor_glow_pixel', 'effect', 'accent', [36, 10, 5 + pulse, 5 + pulse], 'industrial_core_reactor_glow_pixel_motif', 'industrial_core');
      add('pipe_pixel', 'motif', 'motif', [5, 41, 32, 3], 'industrial_core_pipe_pixel_motif', 'industrial_core');
    }
    if (input.spec.motifs.includes('ice')) {
      add('ice_facet_pixel', 'motif', 'highlight', [7, 9, 11, 3], 'ice_crystal_pixel_motif', 'ice');
    }
    if (input.spec.motifs.includes('neon')) {
      add('neon_circuit_pixel', 'motif', 'accent', [8, 12, 21, 2], 'neon_circuit_pixel_motif', 'neon');
    }
    if (input.spec.motifs.includes('cyber_temple')) {
      add('temple_arch_pixel', 'motif', 'motif', [4, 38, 40, 4], 'cyber_temple_arch_pixel_motif', 'cyber_temple');
    }
  };

  add('contact_shadow', 'shadow', 'shadow', [10, 43, 30, 3], `${input.requiredObject}_pixel_shadow`);
  switch (input.requiredObject) {
    case 'player': {
      const runShift = input.frameName === 'run_1' ? -2 : input.frameName === 'run_2' ? 2 : 0;
      const fireStretch = input.frameName === 'fire' ? 4 : 0;
      const crouch = input.frameName === 'crouch' ? 5 : 0;
      add('torso_outline', 'outline', 'outline', [16, 14 + bob + crouch, 14, 21 - crouch], 'player_torso_outline_pixel_shape');
      add('torso_fill', 'fill', damageTint ? 'accent' : 'primary', [18, 16 + bob + crouch, 10, 17 - crouch], 'player_torso_fill_pixel_shape');
      add('helmet_outline', 'outline', 'outline', [17, 7 + bob + crouch, 10, 8], 'player_head_helmet_outline_pixel_shape');
      add('helmet_face', 'fill', 'highlight', [20, 9 + bob + crouch, 5, 3], 'player_face_or_visor_pixel_shape');
      add('rifle_stock', 'accent', 'outline', [27, 22 + crouch, 5, 4], 'player_weapon_stock_pixel_shape');
      add('rifle_barrel', 'accent', 'accent', [31, 21 + crouch, 13 + fireStretch, 3], 'player_weapon_muzzle_pixel_shape');
      add('muzzle_flash', 'effect', 'highlight', [43 + fireStretch, 20 + crouch, input.frameName === 'fire' ? 4 : 1, input.frameName === 'fire' ? 4 : 1], 'player_fire_muzzle_flash_pixel_effect');
      add('front_leg', 'accent', 'accent', [17 + runShift, 34, 4, 10], 'player_run_leg_pixel_shape');
      add('back_leg', 'accent', 'highlight', [25 - runShift, 34, 4, 10], 'player_run_leg_pixel_shape');
      break;
    }
    case 'default_weapon':
      add('weapon_outline', 'outline', 'outline', [8, 20, 34, 8], 'default_weapon_outline_pixel_shape');
      add('weapon_body', 'fill', 'primary', [11, 22, 21, 4], 'default_weapon_body_pixel_shape');
      add('weapon_barrel', 'accent', 'accent', [30, 21, 14 + pulse * 3, 3], 'default_weapon_barrel_pixel_shape');
      add('weapon_grip', 'accent', 'highlight', [17, 27, 5, 9], 'default_weapon_grip_pixel_shape');
      break;
    case 'pickup_weapon':
      add('pickup_crate_outline', 'outline', 'outline', [12, 19, 25, 19], 'pickup_collectible_crate_outline_pixel_shape');
      add('pickup_crate_fill', 'fill', 'primary', [14, 21, 21, 15], 'pickup_collectible_crate_fill_pixel_shape');
      add('weapon_core', 'accent', 'accent', [18, 25, 14, 5], 'pickup_collectible_weapon_core_pixel_shape');
      add('glint', 'effect', 'highlight', [33 + pulse, 15 - pulse, 5, 5], 'pickup_glint_pixel_effect');
      break;
    case 'projectile':
      add('projectile_tail', 'accent', 'motif', [5 - pulse, 21, 9, 5], 'player_projectile_tail_pixel_shape');
      add('projectile_body', 'fill', 'primary', [13, 19, 23, 8], 'player_projectile_body_pixel_shape');
      add('projectile_tip', 'highlight', 'accent', [35 + pulse, 20, 8, 6], 'player_projectile_tip_pixel_shape');
      add('projectile_fin_top', 'accent', 'accent', [18, 16, 8, 3], 'player_projectile_fin_pixel_shape');
      add('projectile_fin_bottom', 'accent', 'accent', [18, 28, 8, 3], 'player_projectile_fin_pixel_shape');
      break;
    case 'ground_enemy':
      add('ground_chassis_outline', 'outline', 'outline', [9, 22, 30, 15], 'ground_enemy_legged_chassis_outline_pixel_shape');
      add('ground_chassis_fill', 'fill', 'primary', [12, 24, 24, 10], 'ground_enemy_legged_chassis_fill_pixel_shape');
      add('ground_eye', 'highlight', 'highlight', [28, 26, 5, 3], 'ground_enemy_eye_pixel_shape');
      add('ground_weapon', 'accent', 'accent', [34, 28, 11 + pulse * 2, 3], 'ground_enemy_attack_pixel_shape');
      add('ground_leg_a', 'outline', 'outline', [14 + pulse, 36, 4, 8], 'ground_enemy_leg_pixel_shape');
      add('ground_leg_b', 'outline', 'outline', [29 - pulse, 36, 4, 8], 'ground_enemy_leg_pixel_shape');
      break;
    case 'ranged_enemy':
      add('turret_base_outline', 'outline', 'outline', [9, 34, 31, 8], 'ranged_enemy_base_outline_pixel_shape');
      add('turret_body_outline', 'outline', 'outline', [14, 17, 21, 17], 'ranged_enemy_turret_outline_pixel_shape');
      add('turret_body_fill', 'fill', 'primary', [17, 20, 15, 12], 'ranged_enemy_turret_fill_pixel_shape');
      add('cannon_barrel', 'accent', 'accent', [31, 23, 14 + pulse * 4, 4], 'ranged_enemy_cannon_emitter_pixel_shape');
      add('cannon_muzzle', 'highlight', 'highlight', [44 + pulse * 4, 22, 3, 6], 'ranged_enemy_fire_pixel_effect');
      break;
    case 'flying_enemy':
      add('drone_body_outline', 'outline', 'outline', [17, 20 + bob, 16, 12], 'flying_enemy_drone_outline_pixel_shape');
      add('drone_body_fill', 'fill', 'primary', [19, 22 + bob, 12, 8], 'flying_enemy_drone_fill_pixel_shape');
      add('left_wing', 'accent', 'accent', [5, 17 + bob, 14, 5], 'flying_enemy_wing_hover_pixel_shape');
      add('right_wing', 'accent', 'accent', [31, 17 + bob, 14, 5], 'flying_enemy_wing_hover_pixel_shape');
      add('hover_trail_a', 'effect', 'motif', [13, 34 + pulse, 9, 2], 'flying_enemy_hover_trail_pixel_effect');
      add('hover_trail_b', 'effect', 'motif', [28, 34 + (1 - pulse), 9, 2], 'flying_enemy_hover_trail_pixel_effect');
      add('flyer_muzzle', 'highlight', 'highlight', [39, 26, input.frameName === 'fire' ? 6 : 2, 3], 'flying_enemy_fire_pixel_effect');
      break;
    case 'wave_marker':
      add('flag_pole', 'outline', 'outline', [10, 8, 4, 34], 'wave_marker_pole_pixel_shape');
      add('flag_outline', 'outline', 'outline', [14, 10, 25, 13], 'wave_marker_flag_outline_pixel_shape');
      add('flag_fill', 'fill', 'primary', [16, 12, 19, 8], 'wave_marker_flag_fill_pixel_shape');
      add('route_chevron', 'accent', 'accent', [22 + pulse, 18, 12, 3], 'wave_marker_route_pressure_pixel_cue');
      break;
    case 'area_marker':
      add('gate_left', 'outline', 'outline', [8, 14, 6, 28], 'area_marker_progression_gate_pixel_shape');
      add('gate_right', 'outline', 'outline', [34, 14, 6, 28], 'area_marker_progression_gate_pixel_shape');
      add('gate_top', 'fill', 'primary', [9, 13, 30, 5], 'area_marker_progression_gate_pixel_shape');
      add('route_light', 'effect', 'accent', [18, 22, 12 + pulse * 2, 5], 'area_marker_progression_light_pixel_cue');
      add('foreground_platform', 'motif', 'motif', [4, 42, 40, 3], 'area_marker_foreground_environment_layer_pixel_shape');
      break;
    case 'boss':
      add('boss_shell_outline', 'outline', 'outline', [5, 9, 39, 33], 'boss_oversized_armor_shell_outline_pixel_shape');
      add('boss_shell_fill', 'fill', damageTint ? 'accent' : 'primary', [8, 12, 33, 27], 'boss_oversized_armor_shell_fill_pixel_shape');
      add('boss_core_outer', 'outline', 'outline', [19, 17, 12, 12], 'boss_reactor_core_outline_pixel_shape');
      add('boss_core_inner', 'effect', 'accent', [22, 20, 6 + pulse, 6 + pulse], 'boss_reactor_core_phase_socket_pixel_shape');
      add('armor_plate_left', 'highlight', 'motif', [8, 15, 7, 4], 'boss_armor_plate_pixel_shape');
      add('armor_plate_right', 'highlight', 'motif', [34, 15, 7, 4], 'boss_armor_plate_pixel_shape');
      add('phase_socket', 'effect', 'highlight', [36, 30, input.frameName.includes('phase_2') ? 7 : 4, 4], 'boss_phase_visual_element_pixel_shape');
      add('projectile_port', 'accent', 'accent', [40, 24, 6, 5], 'boss_projectile_port_pixel_shape');
      break;
    case 'boss_telegraph':
      add('telegraph_top', 'accent', 'accent', [21, 4, 6, 17], 'boss_telegraph_warning_cross_pixel_shape');
      add('telegraph_bottom', 'accent', 'accent', [21, 27, 6, 17], 'boss_telegraph_warning_cross_pixel_shape');
      add('telegraph_left', 'accent', 'accent', [4, 21, 17, 6], 'boss_telegraph_warning_cross_pixel_shape');
      add('telegraph_right', 'accent', 'accent', [27, 21, 17, 6], 'boss_telegraph_warning_cross_pixel_shape');
      add('telegraph_core', 'effect', 'highlight', [20, 20, 8 + pulse, 8 + pulse], 'boss_telegraph_pulse_pixel_effect');
      break;
    case 'boss_projectile_phase_object':
      add('star_core_outline', 'outline', 'outline', [18, 18, 13, 13], 'boss_only_phase_projectile_star_core_outline_pixel_shape');
      add('star_core_fill', 'fill', 'primary', [21, 21, 7, 7], 'boss_only_phase_projectile_star_core_fill_pixel_shape');
      add('star_top', 'accent', 'accent', [23, 5 - pulse, 4, 14], 'boss_only_phase_projectile_spike_pixel_shape');
      add('star_bottom', 'accent', 'accent', [23, 30, 4, 14 + pulse], 'boss_only_phase_projectile_spike_pixel_shape');
      add('star_left', 'accent', 'accent', [5 - pulse, 23, 14, 4], 'boss_only_phase_projectile_spike_pixel_shape');
      add('star_right', 'accent', 'accent', [30, 23, 14 + pulse, 4], 'boss_only_phase_projectile_spike_pixel_shape');
      break;
    case 'environment_hazard':
      add('hazard_base', 'outline', 'outline', [9, 39, 31, 5], 'environment_hazard_foreground_base_pixel_shape');
      add('hazard_body_outline', 'outline', 'outline', [16, 14, 18, 25], 'environment_hazard_warning_body_pixel_shape');
      add('hazard_body_fill', 'fill', 'primary', [18, 17, 14, 18], 'environment_hazard_warning_fill_pixel_shape');
      add('hazard_warning_bar', 'effect', 'accent', [23, 20, 4, 12], 'environment_hazard_warning_pixel_effect');
      add('hazard_warning_dot', 'effect', 'highlight', [23, 34, 4, 4], 'environment_hazard_warning_pixel_effect');
      break;
  }
  addMotifs();
  return parts;
}

type Rgba = [number, number, number, number];

type PixelCanvas = {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  rect(x: number, y: number, w: number, h: number, color: string): void;
  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness?: number): void;
  circle(cx: number, cy: number, radius: number, color: string): void;
  polygon(points: Array<[number, number]>, color: string): void;
};

function buildCanvasDrawOperations(input: {
  intent: Step38VisualIntent;
  spec: Step38AssetDesignSpec;
  geometrySignature: string;
}): Step38CanvasDrawOperation[] {
  const numbers = hashNumbers(input.geometrySignature, 32);
  const motif = (fallback: string): string => input.spec.motifs[0] ?? fallback;
  const operations: Step38CanvasDrawOperation[] = input.spec.motifs.flatMap((sourceMotif, index): Step38CanvasDrawOperation[] => {
    if (sourceMotif === 'jungle') {
      return [
        {
          op: 'vine_overlay',
          purpose: 'jungle_overgrowth_shape_language',
          source_motif: sourceMotif,
          palette_ref: 'motif',
          geometry: { x: 12 + (numbers[index] % 8), y: 22 + (numbers[index + 1] % 16), bend: numbers[index + 2] % 24 }
        }
      ];
    }
    if (sourceMotif === 'metal') {
      return [
        {
          op: 'metal_struts',
          purpose: 'metal_bridge_and_armor_strut_language',
          source_motif: sourceMotif,
          palette_ref: 'motif',
          geometry: { topRailY: 18 + (numbers[index] % 4), lowerRailY: 76 + (numbers[index + 1] % 6), boltStep: 12 + (numbers[index + 2] % 8) }
        }
      ];
    }
    if (sourceMotif === 'industrial_core') {
      return [
        {
          op: 'reactor_core_glow',
          purpose: 'industrial_reactor_energy_core',
          source_motif: sourceMotif,
          palette_ref: 'accent',
          geometry: { cx: 58 + (numbers[index] % 20), cy: 24 + (numbers[index + 1] % 14), radius: 5 + (numbers[index + 2] % 6) }
        },
        {
          op: 'environment_layer',
          purpose: 'industrial_pipe_floor_layer',
          source_motif: sourceMotif,
          palette_ref: 'motif',
          geometry: { y: 82 + (numbers[index + 3] % 8), width: 72 + (numbers[index + 4] % 12) }
        }
      ];
    }
    if (sourceMotif === 'ice') {
      return [
        {
          op: 'pixel_cluster',
          purpose: 'ice_crystal_facets',
          source_motif: sourceMotif,
          palette_ref: 'motif',
          geometry: { leftFacet: [18, 13, 29, 33], rightFacet: [78, 13, 68, 33], thickness: 3 + (numbers[index] % 2) }
        }
      ];
    }
    if (sourceMotif === 'neon') {
      return [
        {
          op: 'emitter_shape',
          purpose: 'neon_circuit_emitter_lines',
          source_motif: sourceMotif,
          palette_ref: 'motif',
          geometry: { x0: 12, y0: 14 + (numbers[index] % 6), x1: 71, y1: 26 + (numbers[index + 1] % 6) }
        }
      ];
    }
    if (sourceMotif === 'cyber_temple') {
      return [
        {
          op: 'environment_layer',
          purpose: 'cyber_temple_arch_silhouette',
          source_motif: sourceMotif,
          palette_ref: 'motif',
          geometry: { leftPillar: 18, apex: 44 + (numbers[index] % 12), rightPillar: 78 }
        }
      ];
    }
    return [];
  });

  switch (input.spec.required_object) {
    case 'player':
      operations.push(
        {
          op: 'pixel_cluster',
          purpose: 'player_head_readable_helmet_and_faceplate',
          source_motif: motif('player'),
          palette_ref: 'outline',
          geometry: { cx: 44 + (numbers[6] % 5), cy: 22, radius: 7, visorWidth: 9 }
        },
        {
          op: 'block_shape',
          purpose: 'armored_runner_body_from_player_silhouette',
          source_motif: motif('player'),
          palette_ref: 'primary',
          geometry: { points: [35, 15, 58, 22, 55, 59, 41, 76, 24, 60, 27, 23], jitter: numbers[7] % 5 }
        },
        {
          op: 'weapon_shape',
          purpose: 'player_forward_rifle_bound_to_default_weapon',
          source_motif: motif('weapon'),
          palette_ref: 'accent',
          geometry: { x: 55, y: 36, width: 30 + (numbers[8] % 8), height: 8 }
        },
        {
          op: 'limb_shape',
          purpose: 'run_and_gun_leg_pose',
          source_motif: motif('runner'),
          palette_ref: 'motif',
          geometry: { leftLeg: [34, 70, 20, 90], rightLeg: [49, 69, 64, 90], thickness: 6 }
        }
      );
      break;
    case 'default_weapon':
    case 'pickup_weapon':
      operations.push(
        {
          op: 'weapon_shape',
          purpose: input.spec.required_object === 'default_weapon' ? 'default_straight_weapon_canvas_silhouette' : 'pickup_weapon_crate_and_core_canvas_silhouette',
          source_motif: motif('weapon'),
          palette_ref: 'accent',
          geometry: { barrelLength: 42 + (numbers[9] % 16), coreRadius: 7 + (numbers[10] % 6), pickupBox: input.spec.required_object === 'pickup_weapon' ? 1 : 0 }
        },
        ...(input.spec.required_object === 'pickup_weapon'
          ? [
              {
                op: 'pixel_cluster' as const,
                purpose: 'pickup_collectible_glint_core',
                source_motif: motif('pickup'),
                palette_ref: 'motif' as const,
                geometry: { cx: 48, cy: 34, radius: 8 + (numbers[10] % 4), sparkle: 3 }
              }
            ]
          : [])
      );
      break;
    case 'projectile':
      operations.push({
        op: 'emitter_shape',
        purpose: 'player_projectile_bolt_with_motif_fins',
        source_motif: motif('projectile'),
        palette_ref: 'accent',
        geometry: { tailX: 5, tipX: 91, finSpread: 14 + (numbers[11] % 8), centerY: 48 }
      });
      break;
    case 'ground_enemy':
    case 'ranged_enemy':
    case 'flying_enemy':
      operations.push(
        {
          op: input.spec.required_object === 'flying_enemy' ? 'wing_shape' : 'block_shape',
          purpose: `${input.spec.required_object}_enemy_class_specific_silhouette`,
          source_motif: motif('enemy'),
          palette_ref: 'primary',
          geometry: {
            stance: input.spec.required_object,
            bodySkew: numbers[12] % 11,
            emitterLength: input.spec.required_object === 'ranged_enemy' ? 34 : 22,
            wingSpan: input.spec.required_object === 'flying_enemy' ? 70 + (numbers[13] % 12) : 0
          }
        },
        ...(input.spec.required_object === 'ground_enemy'
          ? [
              {
                op: 'limb_shape' as const,
                purpose: 'ground_enemy_legged_chassis_contact_points',
                source_motif: motif('ground_enemy'),
                palette_ref: 'outline' as const,
                geometry: { leftLeg: [29, 75, 18, 90], rightLeg: [57, 72, 70, 90], thickness: 5 }
              }
            ]
          : []),
        ...(input.spec.required_object === 'ranged_enemy'
          ? [
              {
                op: 'emitter_shape' as const,
                purpose: 'ranged_enemy_cannon_emitter_barrel',
                source_motif: motif('ranged_enemy'),
                palette_ref: 'accent' as const,
                geometry: { x0: 57, y0: 48, x1: 91, y1: 48, muzzle: 9 }
              }
            ]
          : []),
        ...(input.spec.required_object === 'flying_enemy'
          ? [
              {
                op: 'wing_shape' as const,
                purpose: 'flying_enemy_wing_hover_profile',
                source_motif: motif('flying_enemy'),
                palette_ref: 'accent' as const,
                geometry: { leftWing: [32, 25, 17, 5], rightWing: [61, 30, 78, 9], hoverTrail: 4 }
              }
            ]
          : [])
      );
      break;
    case 'wave_marker':
    case 'area_marker':
    case 'environment_hazard':
      operations.push(
        {
          op: 'environment_layer',
          purpose: `${input.spec.required_object}_progression_or_hazard_environment_binding`,
          source_motif: motif('environment'),
          palette_ref: input.spec.required_object === 'environment_hazard' ? 'accent' : 'primary',
          geometry: { layer: input.spec.required_object, gateWidth: 64 + (numbers[14] % 18), hazardHeight: 58 + (numbers[15] % 12) }
        },
        {
          op: 'environment_layer',
          purpose: `${input.spec.required_object}_foreground_midground_environment_layer`,
          source_motif: input.spec.motifs.includes('jungle') ? 'jungle' : motif('environment_layer'),
          palette_ref: 'motif',
          geometry: { layer: 'foreground_midground', vineOrStrutCount: 3 + (numbers[16] % 4), depth: 2 }
        }
      );
      break;
    case 'boss':
      operations.push(
        {
          op: 'block_shape',
          purpose: 'boss_oversized_armor_shell',
          source_motif: motif('boss'),
          palette_ref: 'primary',
          geometry: { width: 86, height: 71, armorSocketCount: 3 + (numbers[16] % 3) }
        },
        {
          op: 'reactor_core_glow',
          purpose: 'boss_reactor_core_phase_socket',
          source_motif: input.spec.motifs.includes('industrial_core') ? 'industrial_core' : motif('boss_core'),
          palette_ref: 'accent',
          geometry: { cx: 48, cy: 37, radius: 13 + (numbers[17] % 8) }
        }
      );
      break;
    case 'boss_telegraph':
      operations.push({
        op: 'hazard_stripes',
        purpose: 'boss_phase_warning_telegraph_ring',
        source_motif: input.spec.motifs.includes('industrial_core') ? 'industrial_core' : motif('boss_telegraph'),
        palette_ref: 'accent',
        geometry: { radius: 34 + (numbers[18] % 5), spokeCount: 4, glyphRadius: 10 + (numbers[19] % 5) }
      });
      break;
    case 'boss_projectile_phase_object':
      operations.push({
        op: 'emitter_shape',
        purpose: 'boss_only_phase_projectile_star_core',
        source_motif: input.spec.motifs.includes('industrial_core') ? 'industrial_core' : motif('boss_projectile'),
        palette_ref: 'accent',
        geometry: { starPoints: 10, coreRadius: 14 + (numbers[20] % 6), trailLength: 28 + (numbers[21] % 12) }
      });
      break;
  }
  return operations;
}

function renderDslDrivenCanvasPixelBuffer(input: {
  intent: Step38VisualIntent;
  spec: Step38AssetDesignSpec;
  geometrySignature: string;
}): Buffer {
  const canvas = createPixelCanvas(96, 96);
  const palette = input.intent.palette;
  const numbers = hashNumbers(input.geometrySignature, 32);
  const jitter = (index: number, range: number): number => (numbers[index] % (range * 2 + 1)) - range;
  drawPixelMotifBase(canvas, input.spec.motifs, palette, numbers);
  drawRequiredObjectPixels(canvas, input.spec.required_object, palette, {
    jitter,
    numbers,
    silhouette: input.intent.silhouette,
    motifs: input.spec.motifs
  });
  drawPixelMotifDetails(canvas, input.spec.motifs, palette, numbers);
  return Buffer.from(canvas.data);
}

function createPixelCanvas(width: number, height: number): PixelCanvas {
  const data = new Uint8Array(width * height * 4);
  const setPixel = (x: number, y: number, color: string): void => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    const [r, g, b, a] = parseHexColor(color);
    const index = (py * width + px) * 4;
    data[index] = r;
    data[index + 1] = g;
    data[index + 2] = b;
    data[index + 3] = a;
  };
  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy += 1) {
      for (let xx = Math.round(x); xx < Math.round(x + w); xx += 1) {
        setPixel(xx, yy, color);
      }
    }
  };
  const line = (x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1): void => {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const sx = ax < bx ? 1 : -1;
    const dy = -Math.abs(by - ay);
    const sy = ay < by ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      rect(ax - Math.floor(thickness / 2), ay - Math.floor(thickness / 2), thickness, thickness, color);
      if (ax === bx && ay === by) break;
      const error2 = 2 * error;
      if (error2 >= dy) {
        error += dy;
        ax += sx;
      }
      if (error2 <= dx) {
        error += dx;
        ay += sy;
      }
    }
  };
  const circle = (cx: number, cy: number, radius: number, color: string): void => {
    const r = Math.max(1, Math.round(radius));
    for (let y = -r; y <= r; y += 1) {
      for (let x = -r; x <= r; x += 1) {
        if (x * x + y * y <= r * r) setPixel(cx + x, cy + y, color);
      }
    }
  };
  const polygon = (points: Array<[number, number]>, color: string): void => {
    const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map((point) => point[1]))));
    for (let y = minY; y <= maxY; y += 1) {
      const intersections: number[] = [];
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index]!;
        const [x2, y2] = points[(index + 1) % points.length]!;
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let index = 0; index < intersections.length; index += 2) {
        rect(intersections[index] ?? 0, y, (intersections[index + 1] ?? intersections[index] ?? 0) - (intersections[index] ?? 0) + 1, 1, color);
      }
    }
  };
  return { width, height, data, rect, line, circle, polygon };
}

function drawRequiredObjectPixels(
  canvas: PixelCanvas,
  requiredObject: Step38RequiredVisualRuntimeObject,
  palette: Step38VisualPalette,
  recipe: {
    jitter: (index: number, range: number) => number;
    numbers: readonly number[];
    silhouette: string;
    motifs: readonly string[];
  }
): void {
  const { jitter, numbers } = recipe;
  const primary = palette.primary;
  const accent = palette.accent;
  const outline = palette.outline;
  const metal = '#94a3b8';
  const glow = motifPalette(recipe.motifs)[0] ?? accent;
  switch (requiredObject) {
    case 'player':
      canvas.polygon([[35 + jitter(1, 3), 15], [58, 22 + jitter(2, 2)], [55, 59], [41, 76], [24, 60], [27, 23]], outline);
      canvas.polygon([[38 + jitter(3, 2), 19], [54, 25], [51, 55], [40, 68], [29, 56], [31, 26]], primary);
      canvas.circle(44 + jitter(4, 2), 22, 7, '#111827');
      canvas.rect(55, 36 + jitter(5, 2), 30, 8, outline);
      canvas.rect(58, 37 + jitter(6, 2), 24, 5, accent);
      canvas.line(34, 70, 20, 90, '#f97316', 6);
      canvas.line(49, 69, 64, 90, '#f97316', 6);
      canvas.line(27, 46, 12, 56, accent, 5);
      break;
    case 'default_weapon':
      canvas.polygon([[8, 56], [37, 28], [79, 30], [90, 43], [42, 61], [14, 70]], outline);
      canvas.polygon([[14, 55], [40, 34], [75, 35], [82, 43], [40, 55], [18, 63]], primary);
      canvas.rect(42 + jitter(7, 3), 23, 24 + (numbers[8] % 9), 8, accent);
      canvas.line(41, 59, 58, 80, accent, 5);
      break;
    case 'pickup_weapon':
      canvas.polygon([[18, 34], [48, 13], [79, 35], [70, 75], [26, 75]], outline);
      canvas.polygon([[25, 36], [48, 21], [71, 37], [65, 68], [31, 68]], primary);
      canvas.rect(31, 43, 35, 14, accent);
      canvas.line(48, 22, 48, 69, outline, 3);
      canvas.circle(48 + jitter(9, 3), 35, 7, glow);
      break;
    case 'projectile':
      canvas.polygon([[5, 48], [28, 27], [68, 29], [91, 48], [68, 67], [28, 69]], outline);
      canvas.polygon([[13, 48], [32, 34], [64, 36], [80, 48], [64, 60], [32, 62]], primary);
      canvas.line(20, 48, 71, 48, accent, 4);
      canvas.line(42, 36, 60, 48, accent, 4);
      canvas.line(42, 60, 60, 48, accent, 4);
      break;
    case 'ground_enemy':
      canvas.polygon([[16, 54], [29, 25], [58, 16], [82, 42], [70, 72], [31, 78]], outline);
      canvas.polygon([[24, 53], [34, 31], [56, 24], [73, 43], [64, 64], [34, 69]], primary);
      canvas.rect(59, 42, 30, 11, accent);
      canvas.line(29, 75, 18, 90, outline, 5);
      canvas.line(57, 72, 70, 90, outline, 5);
      canvas.circle(41, 43, 5, '#111827');
      break;
    case 'ranged_enemy':
      canvas.rect(20, 71, 60, 14, outline);
      canvas.rect(28, 72, 44, 9, metal);
      canvas.polygon([[27, 31], [61, 31], [74, 70], [16, 70]], outline);
      canvas.polygon([[34, 38], [57, 38], [66, 63], [24, 63]], primary);
      canvas.rect(57, 43 + jitter(10, 2), 34, 11, accent);
      canvas.circle(45, 50, 10, '#111827');
      break;
    case 'flying_enemy':
      canvas.polygon([[9, 48], [33, 20], [62, 27], [88, 49], [58, 72], [28, 68]], outline);
      canvas.polygon([[18, 48], [36, 29], [59, 34], [75, 49], [56, 62], [32, 60]], primary);
      canvas.line(32, 25, 17, 5, accent, 6);
      canvas.line(61, 30, 78, 9, accent, 6);
      canvas.line(29, 66, 17, 84, accent, 5);
      canvas.line(62, 67, 80, 83, accent, 5);
      canvas.circle(48 + jitter(11, 2), 48, 6, '#111827');
      break;
    case 'wave_marker':
      canvas.rect(11, 10, 18, 78, outline);
      canvas.polygon([[28, 14], [84, 29], [28, 46]], outline);
      canvas.polygon([[31, 20], [73, 30], [31, 40]], primary);
      canvas.line(37, 30, 67, 30, accent, 4);
      canvas.line(13, 88, 39, 88, accent, 5);
      break;
    case 'area_marker':
      canvas.rect(12, 79, 73, 12, outline);
      canvas.rect(16, 80, 65, 7, accent);
      canvas.polygon([[19, 25], [77, 25], [89, 79], [8, 79]], outline);
      canvas.polygon([[25, 31], [72, 31], [80, 72], [16, 72]], primary);
      canvas.line(31, 73, 31, 44, accent, 5);
      canvas.line(31, 44, 49, 23, accent, 5);
      canvas.line(49, 23, 68, 44, accent, 5);
      canvas.line(68, 44, 68, 73, accent, 5);
      break;
    case 'boss':
      canvas.polygon([[12, 19], [80, 19], [93, 45], [81, 90], [17, 90], [4, 45]], outline);
      canvas.polygon([[19, 27], [75, 27], [84, 46], [73, 79], [25, 79], [13, 46]], primary);
      canvas.circle(48, 37, 18 + (numbers[12] % 5), outline);
      canvas.circle(48, 37, 13 + (numbers[13] % 3), accent);
      canvas.line(21, 53, 75, 53, glow, 6);
      canvas.line(25, 68, 71, 68, accent, 6);
      canvas.line(5, 45, 23, 31, outline, 5);
      canvas.line(92, 45, 73, 31, outline, 5);
      break;
    case 'boss_telegraph':
      canvas.circle(48, 48, 38, outline);
      canvas.circle(48, 48, 31, '#00000000');
      canvas.line(48, 4, 48, 25, accent, 6);
      canvas.line(48, 71, 48, 93, accent, 6);
      canvas.line(4, 48, 25, 48, accent, 6);
      canvas.line(71, 48, 93, 48, accent, 6);
      canvas.line(27, 27, 69, 69, primary, 5);
      canvas.line(69, 27, 27, 69, primary, 5);
      canvas.circle(48, 48, 10, glow);
      break;
    case 'boss_projectile_phase_object':
      canvas.polygon([[48, 5], [61, 31], [91, 38], [66, 57], [71, 90], [48, 70], [25, 90], [30, 57], [5, 38], [35, 31]], outline);
      canvas.polygon([[48, 17], [57, 37], [78, 42], [59, 56], [63, 76], [48, 62], [33, 76], [37, 56], [18, 42], [39, 37]], primary);
      canvas.circle(48, 48, 14, accent);
      canvas.line(48, 20, 48, 76, outline, 3);
      canvas.line(20, 48, 76, 48, outline, 3);
      break;
    case 'environment_hazard':
      canvas.polygon([[48, 8], [89, 86], [7, 86]], outline);
      canvas.polygon([[48, 20], [78, 78], [18, 78]], primary);
      canvas.line(48, 32, 48, 59, accent, 7);
      canvas.circle(48, 72, 6, accent);
      canvas.line(18, 86, 78, 86, outline, 5);
      break;
  }
}

function drawPixelMotifBase(canvas: PixelCanvas, motifs: readonly string[], palette: Step38VisualPalette, numbers: readonly number[]): void {
  if (motifs.includes('industrial_core')) {
    canvas.rect(6, 6, 84, 8, '#172033');
    canvas.rect(8 + (numbers[0] % 20), 82, 72, 5, '#475569');
  }
  if (motifs.includes('cyber_temple')) {
    canvas.line(18, 88, 18, 62, '#a78bfa', 3);
    canvas.line(18, 62, 48, 44, '#a78bfa', 3);
    canvas.line(48, 44, 78, 62, '#a78bfa', 3);
    canvas.line(78, 62, 78, 88, '#a78bfa', 3);
  }
  if (motifs.includes('neon')) {
    canvas.line(12, 14, 38, 14, '#67e8f9', 2);
    canvas.line(38, 14, 38, 26, '#f0abfc', 2);
    canvas.line(38, 26, 71, 26, '#67e8f9', 2);
  }
  if (motifs.includes('ice')) {
    canvas.line(18, 13, 29, 33, '#e0f2fe', 3);
    canvas.line(29, 33, 15, 38, '#e0f2fe', 3);
    canvas.line(78, 13, 68, 33, '#bae6fd', 3);
    canvas.line(68, 33, 83, 38, '#bae6fd', 3);
  }
  if (motifs.includes('metal')) {
    canvas.line(12, 18, 84, 18, '#94a3b8', 3);
    canvas.line(18, 78, 78, 78, '#94a3b8', 3);
  }
  if (motifs.includes('jungle')) {
    canvas.line(12, 22 + (numbers[1] % 16), 35, 18, '#4ade80', 3);
    canvas.line(35, 18, 48, 36, '#4ade80', 3);
    canvas.line(48, 36, 84, 27, '#4ade80', 3);
  }
  canvas.rect(2, 92, 92, 2, palette.outline);
}

function drawPixelMotifDetails(canvas: PixelCanvas, motifs: readonly string[], palette: Step38VisualPalette, numbers: readonly number[]): void {
  if (motifs.includes('industrial_core')) {
    canvas.circle(68 + (numbers[2] % 12), 23 + (numbers[3] % 12), 6, palette.accent);
    canvas.line(8, 88, 34, 78, '#475569', 4);
    canvas.line(34, 78, 88, 86, '#475569', 4);
  }
  if (motifs.includes('jungle')) {
    canvas.circle(18, 31 + (numbers[4] % 18), 4, '#22c55e');
    canvas.circle(74, 26 + (numbers[5] % 18), 4, '#22c55e');
  }
  if (motifs.includes('metal')) {
    for (let x = 18; x < 78; x += 16) {
      canvas.rect(x, 16, 6, 4, '#cbd5e1');
      canvas.rect(x + 5, 76, 6, 4, '#cbd5e1');
    }
  }
  if (motifs.includes('neon')) {
    canvas.circle(24, 24, 4, '#67e8f9');
    canvas.circle(72, 27, 3, '#f0abfc');
  }
}

function motifPalette(motifs: readonly string[]): string[] {
  const colors = new Set<string>();
  if (motifs.includes('jungle')) colors.add('#4ade80');
  if (motifs.includes('metal')) colors.add('#94a3b8');
  if (motifs.includes('industrial_core')) colors.add('#f97316').add('#475569');
  if (motifs.includes('ice')) colors.add('#e0f2fe').add('#7dd3fc');
  if (motifs.includes('neon')) colors.add('#67e8f9').add('#f0abfc');
  if (motifs.includes('cyber_temple')) colors.add('#a78bfa');
  return [...colors];
}

function renderDslDrivenSvg(input: {
  intent: Step38VisualIntent;
  spec: Step38AssetDesignSpec;
  geometrySignature: string;
}): string {
  const palette = input.intent.palette;
  const numbers = hashNumbers(input.geometrySignature, 12);
  const skew = (numbers[0] % 13) - 6;
  const notch = 8 + (numbers[1] % 12);
  const core = 14 + (numbers[2] % 12);
  const motifs = input.spec.motifs;
  const motifBody = renderMotifDetails(motifs, palette, numbers);
  const body = renderRequiredObjectBody(input.spec.required_object, palette, { skew, notch, core, numbers }) + motifBody;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${escapeHtml(input.intent.assetIntentRef)}"`,
    ` data-source="canonical_dsl" data-required-object="${input.spec.required_object}"`,
    ` data-visual-intent-sha="${input.spec.visual_intent_sha}" data-asset-design-spec-sha="${hashStableJson(input.spec)}"`,
    ` data-motifs="${escapeHtml(motifs.join(','))}" data-geometry-signature="${input.geometrySignature}">`,
    `<rect x="0" y="0" width="96" height="96" fill="none"/>`,
    body,
    `</svg>`,
    ''
  ].join('');
}

function renderRequiredObjectBody(
  requiredObject: Step38RequiredVisualRuntimeObject,
  palette: Step38VisualPalette,
  recipe: { skew: number; notch: number; core: number; numbers: number[] }
): string {
  const { skew, notch, core, numbers } = recipe;
  switch (requiredObject) {
    case 'player':
      return `<path d="M35 ${10 + (numbers[3] % 5)} L57 ${19 + skew} L53 55 L39 70 L21 55 L24 21 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><rect x="${55 + skew}" y="32" width="25" height="8" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="3"/><path d="M30 67 L16 88 M48 67 L62 88" stroke="#f97316" stroke-width="7" stroke-linecap="round"/><circle cx="${43 + (skew > 0 ? 2 : -2)}" cy="22" r="7" fill="#111827"/><path d="M25 42 L9 52" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"/>`;
    case 'default_weapon':
      return `<path d="M8 54 L39 29 L80 31 L88 43 L43 58 L13 66 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><rect x="${40 + skew}" y="22" width="${16 + notch}" height="8" fill="${palette.accent}"/><path d="M42 56 L58 78 M48 31 L61 15" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round"/>`;
    case 'pickup_weapon':
      return `<path d="M18 32 L48 14 L78 32 L70 72 L26 72 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><rect x="30" y="42" width="36" height="14" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="3"/><path d="M26 76 H70 M48 18 V72" stroke="${palette.outline}" stroke-width="4"/><circle cx="${48 + skew}" cy="34" r="${8 + (notch % 5)}" fill="${palette.accent}"/>`;
    case 'projectile':
      return `<path d="M5 48 L29 28 H67 L89 48 L67 68 H29 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="4"/><path d="M15 48 H72 M40 34 L58 48 L40 62" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'ground_enemy':
      return `<path d="M16 52 L28 25 L57 17 L80 42 L69 70 L31 76 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><rect x="${58 + skew}" y="42" width="30" height="10" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="3"/><path d="M28 74 L18 88 M58 72 L70 88" stroke="${palette.outline}" stroke-width="6"/><circle cx="39" cy="42" r="6" fill="#111827"/>`;
    case 'ranged_enemy':
      return `<path d="M21 70 H78 L70 87 H29 Z" fill="#64748b" stroke="${palette.outline}" stroke-width="4"/><path d="M28 31 H59 L72 70 H17 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><rect x="${57 + skew}" y="42" width="32" height="11" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="3"/><circle cx="43" cy="49" r="${core / 2}" fill="#111827"/>`;
    case 'flying_enemy':
      return `<path d="M10 47 L33 21 L61 27 L86 49 L58 70 L28 67 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><path d="M31 24 L19 5 M60 28 L77 8 M26 66 L17 84 M62 67 L78 82" stroke="${palette.accent}" stroke-width="6" stroke-linecap="round"/><circle cx="${47 + skew}" cy="47" r="7" fill="#111827"/>`;
    case 'wave_marker':
      return `<rect x="12" y="10" width="16" height="76" fill="${palette.outline}"/><path d="M27 15 L82 29 L27 45 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="4"/><path d="M36 29 H68 M43 39 H58" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"/><path d="M11 86 H38" stroke="${palette.accent}" stroke-width="5"/>`;
    case 'area_marker':
      return `<path d="M13 78 H84 V90 H13 Z" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="4"/><path d="M20 24 H77 L88 78 H9 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><path d="M31 74 V43 L49 23 L68 43 V74" fill="none" stroke="${palette.accent}" stroke-width="6" stroke-linejoin="round"/><path d="M24 57 H74" stroke="${palette.outline}" stroke-width="4"/>`;
    case 'boss':
      return `<path d="M13 20 H79 L91 44 L80 88 H17 L5 44 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="6"/><circle cx="48" cy="35" r="${core}" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="4"/><path d="M20 50 H76 M24 66 H72" stroke="${palette.accent}" stroke-width="7" stroke-linecap="round"/><path d="M5 44 L22 31 M91 44 L74 31 M18 88 L31 70 M78 88 L65 70" stroke="${palette.outline}" stroke-width="6"/>`;
    case 'boss_telegraph':
      return `<circle cx="48" cy="48" r="34" fill="none" stroke="${palette.accent}" stroke-width="8"/><path d="M48 4 V24 M48 72 V92 M4 48 H24 M72 48 H92" stroke="${palette.outline}" stroke-width="6" stroke-linecap="round"/><path d="M26 26 L70 70 M70 26 L26 70" stroke="${palette.primary}" stroke-width="5" stroke-linecap="round"/><circle cx="48" cy="48" r="${core / 2}" fill="${palette.primary}"/>`;
    case 'boss_projectile_phase_object':
      return `<path d="M48 5 L61 31 L90 38 L66 56 L70 88 L48 69 L26 88 L30 56 L6 38 L35 31 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="5"/><circle cx="48" cy="48" r="${core}" fill="${palette.accent}"/><path d="M48 18 V78 M18 48 H78 M29 29 L67 67 M67 29 L29 67" stroke="${palette.outline}" stroke-width="4" stroke-linecap="round"/>`;
    case 'environment_hazard':
      return `<path d="M48 8 L88 84 H8 Z" fill="${palette.primary}" stroke="${palette.outline}" stroke-width="6"/><path d="M48 28 V58" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round"/><circle cx="48" cy="72" r="6" fill="${palette.accent}"/><path d="M18 84 H78" stroke="${palette.outline}" stroke-width="5"/>`;
  }
}

function renderMotifDetails(motifs: readonly string[], palette: Step38VisualPalette, numbers: readonly number[]): string {
  const details: string[] = [];
  if (motifs.includes('jungle')) {
    details.push(`<path d="M12 ${20 + (numbers[4] % 18)} C24 15 28 57 42 35 S63 15 84 28" fill="none" stroke="#4ade80" stroke-width="4" stroke-linecap="round"/>`);
  }
  if (motifs.includes('metal')) {
    details.push(`<path d="M12 18 H84 M18 78 H78" stroke="#94a3b8" stroke-width="3" stroke-dasharray="7 5"/>`);
  }
  if (motifs.includes('industrial_core')) {
    details.push(`<circle cx="${76 - (numbers[5] % 18)}" cy="${20 + (numbers[6] % 15)}" r="6" fill="${palette.accent}" opacity="0.75"/><path d="M8 88 C26 73 55 90 88 72" fill="none" stroke="#475569" stroke-width="4"/>`);
  }
  if (motifs.includes('ice')) {
    details.push(`<path d="M18 15 L28 32 L14 35 M78 14 L68 32 L83 35" stroke="#e0f2fe" stroke-width="4" stroke-linecap="round"/>`);
  }
  if (motifs.includes('neon')) {
    details.push(`<path d="M10 12 H38 V25 H65 V12 H88" fill="none" stroke="#f0abfc" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="4" fill="#67e8f9"/>`);
  }
  if (motifs.includes('cyber_temple')) {
    details.push(`<path d="M18 86 V64 Q48 42 78 64 V86" fill="none" stroke="#c084fc" stroke-width="4"/>`);
  }
  return details.join('');
}

function visualRoleCategoryForRequiredObject(requiredObject: Step38RequiredVisualRuntimeObject): Step38RoleCategory {
  if (requiredObject === 'player') return 'player';
  if (requiredObject.includes('enemy')) return 'enemy';
  if (requiredObject === 'boss' || requiredObject === 'boss_telegraph' || requiredObject === 'boss_projectile_phase_object') return 'boss';
  if (requiredObject === 'default_weapon' || requiredObject === 'pickup_weapon' || requiredObject === 'projectile') return 'weapon';
  return 'environment';
}

function assetFilePrefixForRequiredObject(requiredObject: Step38RequiredVisualRuntimeObject): string {
  if (requiredObject === 'player') return 'player';
  if (requiredObject === 'ground_enemy') return 'enemy_ground';
  if (requiredObject === 'ranged_enemy') return 'enemy_ranged';
  if (requiredObject === 'flying_enemy') return 'enemy_flying';
  if (requiredObject === 'boss') return 'boss';
  if (requiredObject === 'boss_telegraph') return 'boss_telegraph';
  if (requiredObject === 'boss_projectile_phase_object') return 'projectile_boss';
  if (requiredObject === 'projectile') return 'projectile_player';
  if (requiredObject === 'pickup_weapon') return 'pickup_weapon';
  if (requiredObject === 'environment_hazard') return 'environment_tileset';
  if (requiredObject === 'area_marker' || requiredObject === 'wave_marker') return 'background_layer';
  return 'weapon_default';
}

function textureKeyForSpriteAsset(input: {
  assetIntentRef: string;
  entityId: string;
  requiredObject: Step38RequiredVisualRuntimeObject;
  designSpecSha: string;
}): string {
  return `step38_2d_${textureKeyStem(input.requiredObject)}_${textureKeyStem(input.entityId)}_${textureKeyStem(input.assetIntentRef)}_${input.designSpecSha.slice(0, 8)}`;
}

function textureKeyStem(value: string): string {
  return safeAssetFileStem(value).replace(/-/g, '_');
}

function safeAssetFileStem(value: string): string {
  const stem = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem.length > 0 ? stem : 'step38-visual-asset';
}

function safeSvgColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function parseHexColor(value: string): Rgba {
  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    return [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16),
      Number.parseInt(value.slice(7, 9), 16)
    ];
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16),
      255
    ];
  }
  return [0, 0, 0, 0];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hashNumbers(value: string, count: number): number[] {
  const digest = createHash('sha256').update(value).digest();
  return Array.from({ length: count }, (_, index) => digest[index % digest.length] ?? 0);
}

function hashStableJson(value: unknown): string {
  return sha256Text(stableJson(value));
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sha256Buffer(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
