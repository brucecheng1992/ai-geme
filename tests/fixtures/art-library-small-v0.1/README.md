# Small Art Library Fixture v0.1

Step 9B imports a deliberately small metadata fixture from Kenney Cube Pets for validation/export dry-runs only.

## Source

- Source page: https://kenney.nl/assets/cube-pets
- Download package: https://kenney.nl/media/pages/assets/cube-pets/44e58e945f-1774520254/kenney_cube-pets_1.0.zip
- Source package: Cube Pets 2.0 by Kenney
- License: Creative Commons Zero, CC0
- Import date: 2026-06-13

`source/` contains provenance and license evidence only. It is not a source production-art directory.

## Selected Subset

The source package contains 24 cube pet assets plus alternate formats. Step 9B imports exactly 10 GLB models and their matching preview thumbnails:

- `animal-bee`
- `animal-bunny`
- `animal-cat`
- `animal-crab`
- `animal-dog`
- `animal-fish`
- `animal-fox`
- `animal-lion`
- `animal-penguin`
- `animal-tiger`

Imported files:

- `assets/*.glb`
- `thumbnails/*.png`
- `metadata/*.asset.json`
- `source/LICENSE.txt`

Excluded on purpose:

- The remaining 14 Cube Pets assets.
- FBX and OBJ variants.
- Package overview / preview / URL helper files.
- The downloaded zip archive.
- Any runtime export artifact.

## Size Policy

- Target asset count: 10 to 30.
- Maximum asset count: 50.
- Preferred total fixture size: 5 MB or less.
- Hard total fixture size: 10 MB or less.
- Preferred per-file size: 512 KB or less.
- Hard per-file size: 1 MB or less.
- Thumbnail files count toward the total fixture size and must remain 256 KB or less each.
- Allowed fixture extensions: `.glb`, `.png`, `.json`, `.txt`, `.md`.

Initial imported binary subset:

- 10 GLB assets.
- 10 thumbnails.
- Binary subset size before README / metadata sidecars: 1,460,927 bytes.
- Largest imported binary file: 172,936 bytes.

The contract test traverses the full fixture directory, including README, license, metadata, thumbnails, and GLB files.

## Boundary

This fixture is not wired into production/default runtime behavior.

Step 9B does not change:

- Runtime/default asset loading.
- Resolver selection.
- QA aggregation.
- Workbench UI.
- Phaser loading.
- Repair-enabled defaults.
- Metadata Step 4A.
- Large asset library rollout.
