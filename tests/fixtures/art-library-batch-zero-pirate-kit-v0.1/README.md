# Large Art Library Batch Zero: Kenney Pirate Kit v0.1

Step 13C-B imported the first large-library metadata batch-zero fixture from the Step 13C-A approved Kenney Pirate Kit archive.

Step 13E-B extends the same fixture with a controlled 10-asset expansion from the same approved Kenney Pirate Kit archive. The expanded fixture remains metadata-only / test-only and is not wired into runtime/default behavior or production asset packs.

## Source

- Source page: https://kenney.nl/assets/pirate-kit
- Archive URL: https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip
- Source package: Pirate Kit by Kenney
- License: Creative Commons Zero, CC0

`source/` contains provenance and license evidence only. It is not a production source-art directory.

## Selected Batch

This fixture imports exactly 20 GLB model candidates and matching existing preview PNGs:

- `barrel`
- `boat-row-small`
- `bottle`
- `cannon`
- `cannon-ball`
- `cannon-mobile`
- `chest`
- `crate`
- `crate-bottles`
- `flag-pirate`
- `mast`
- `palm-straight`
- `patch-sand`
- `rocks-a`
- `rocks-b`
- `rocks-c`
- `ship-pirate-small`
- `structure-platform-dock-small`
- `tool-paddle`
- `tower-complete-small`

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

## Step 13E-B 100% Additional-Asset Review Evidence

Every newly added Step 13E-B asset is covered here. File sizes are archive uncompressed byte sizes from the approved Kenney Pirate Kit zip.

| Basename | Asset ID | Source GLB path | Thumbnail path | File size | Category / rationale | Metadata sidecar | Validation status |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| `bottle` | `pirate_kit_bottle_001` | `Models/GLB format/bottle.glb` | `Previews/bottle.png` | 13796 | supply prop / collectible coverage | `metadata/bottle.asset.json` | validated by Step 13E-B gates |
| `cannon-ball` | `pirate_kit_cannon_ball_001` | `Models/GLB format/cannon-ball.glb` | `Previews/cannon-ball.png` | 7192 | projectile / ammunition coverage | `metadata/cannon-ball.asset.json` | validated by Step 13E-B gates |
| `cannon-mobile` | `pirate_kit_cannon_mobile_001` | `Models/GLB format/cannon-mobile.glb` | `Previews/cannon-mobile.png` | 43824 | wheeled weapon / cover variant coverage | `metadata/cannon-mobile.asset.json` | validated by Step 13E-B gates |
| `crate-bottles` | `pirate_kit_crate_bottles_001` | `Models/GLB format/crate-bottles.glb` | `Previews/crate-bottles.png` | 58588 | supply container variant coverage | `metadata/crate-bottles.asset.json` | validated by Step 13E-B gates |
| `rocks-b` | `pirate_kit_rocks_b_001` | `Models/GLB format/rocks-b.glb` | `Previews/rocks-b.png` | 31316 | island cover variant coverage | `metadata/rocks-b.asset.json` | validated by Step 13E-B gates |
| `rocks-c` | `pirate_kit_rocks_c_001` | `Models/GLB format/rocks-c.glb` | `Previews/rocks-c.png` | 24572 | island cover variant coverage | `metadata/rocks-c.asset.json` | validated by Step 13E-B gates |
| `patch-sand` | `pirate_kit_patch_sand_001` | `Models/GLB format/patch-sand.glb` | `Previews/patch-sand.png` | 10212 | beach / island ground coverage | `metadata/patch-sand.asset.json` | validated by Step 13E-B gates |
| `structure-platform-dock-small` | `pirate_kit_structure_platform_dock_small_001` | `Models/GLB format/structure-platform-dock-small.glb` | `Previews/structure-platform-dock-small.png` | 32156 | dock / walkable structure coverage | `metadata/structure-platform-dock-small.asset.json` | validated by Step 13E-B gates |
| `mast` | `pirate_kit_mast_001` | `Models/GLB format/mast.glb` | `Previews/mast.png` | 30816 | ship structure / nautical prop coverage | `metadata/mast.asset.json` | validated by Step 13E-B gates |
| `tool-paddle` | `pirate_kit_tool_paddle_001` | `Models/GLB format/tool-paddle.glb` | `Previews/tool-paddle.png` | 6864 | nautical tool / collectible coverage | `metadata/tool-paddle.asset.json` | validated by Step 13E-B gates |

## Size Policy

- Step 13C-A general target: 10 to 30 assets.
- Step 13C-A hard max: 50 assets.
- Step 13E-A approved at most 10 additional assets.
- This Pirate Kit batch-zero fixture imports 20 assets after Step 13E-B.
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
