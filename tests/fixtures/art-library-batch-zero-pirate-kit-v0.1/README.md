# Large Art Library Batch Zero: Kenney Pirate Kit v0.1

Step 13C-B imports the first large-library metadata batch-zero fixture from the Step 13C-A approved Kenney Pirate Kit archive.

## Source

- Source page: https://kenney.nl/assets/pirate-kit
- Archive URL: https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip
- Source package: Pirate Kit by Kenney
- License: Creative Commons Zero, CC0

`source/` contains provenance and license evidence only. It is not a production source-art directory.

## Selected Batch

This fixture imports exactly the 10 GLB model candidates and matching existing preview PNGs approved in Step 13C-A:

- `barrel`
- `chest`
- `crate`
- `cannon`
- `flag-pirate`
- `palm-straight`
- `rocks-a`
- `ship-pirate-small`
- `tower-complete-small`
- `boat-row-small`

Imported files:

- `assets/*.glb`
- `thumbnails/*.png`
- `metadata/*.asset.json`
- `source/LICENSE.txt`

Excluded on purpose:

- The remaining Pirate Kit assets.
- FBX, OBJ and MTL variants.
- Package overview, sample, URL helper and unselected preview files.
- The downloaded zip archive.
- Any runtime export artifact.

## Size Policy

- Step 13C-A general target: 10 to 30 assets.
- Step 13C-A hard max: 50 assets.
- This Pirate Kit batch-zero fixture imports 10 assets.
- Total committed fixture payload must remain below 30 MB.
- Each imported source asset must remain below 5 MB.
- Each thumbnail must remain below 512 KB.
- Allowed fixture extensions: `.glb`, `.png`, `.json`, `.txt`, `.md`.

## Boundary

This fixture is not wired into production/default runtime behavior.

Step 13C-B does not change:

- Runtime/default asset loading.
- Resolver selection.
- QA aggregation.
- Workbench UI.
- Phaser loading.
- Repair-enabled defaults.
- Production asset packs.
- Production rollout.
