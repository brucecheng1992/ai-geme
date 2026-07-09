# Batch 002d Plan

Batch 002d should not be another prompt-only cleanup rerun.

Batch 002c showed that prompt and manifest compliance can pass while image content still fails human production review. Batch 002d must split the production strategy by asset type before any live generation.

## Proposed Tracks

### 002d Character / Enemy Isolated Sprite Candidates

- Continue using image provider only for candidate generation.
- Target isolated side-view sprite-candidate concepts, not poster art.
- Require full-body side-view / side-on pose.
- Require gameplay-scale readable silhouette.
- Require animation-ready proportions.
- Forbid concept sheet, poster layout, card layout, text, footer, corner mark, logo, watermark, and signature.
- Reduce repeated negative terms in the positive prompt to avoid reinforcing forbidden visual motifs.

### 002d Icons Vector / Glyph

- Prefer deterministic SVG/vector glyph production.
- Do not rely on image provider output for final skill icons.
- If image provider is used for exploration, require isolated glyph only, no frame, no card, no badge, no character, no letters, no numbers, no logo, and no watermark.

### 002d HUD Deterministic Layout

- Do not use MiniMax or other image providers to generate final HUD output.
- Use deterministic SVG/HTML/React layout for HUD bars, skill slots, boss bar, progress indicator, and icon placeholders.
- Image provider output may be used only as moodboard reference and cannot be production-approved directly.

## Required Preflight

Any Batch 002d live generation must first pass a no-provider audit with:

- `ProductionCleanSideRunnerV1`
- prompt gate status `pass`
- image content gate status `manual_review_required`
- production approval status `pending_human_review`
- no auto selection
- no auto approval

The audit must not read API keys or call providers.

## Production Approval Rule

Any actual text, fake text, logo, watermark, signature, corner mark, footer, fake UI label, non-strict side-view, non-gameplay-scale result, card frame, or poster layout blocks approval until a human reviewer explicitly marks a corrected asset as approved.
