import type Phaser from 'phaser';

type AssetManifest = {
  version: string;
  assets: Array<{
    id: string;
    role: string;
    loadKey: string;
    path: string;
    format?: 'svg' | 'png';
    size?: { w: number; h: number };
    status?: 'ready' | 'fallback_used' | 'missing';
    required: boolean;
  }>;
};

export type SideScrollingArtRuntime = {
  preload(scene: Phaser.Scene): void;
  drawBackground(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Image | undefined;
  addImage(scene: Phaser.Scene, id: string, x: number, y: number): Phaser.GameObjects.Image | undefined;
  telemetry(): Record<string, unknown>;
};

export function createSideScrollingArtRuntime(manifest: AssetManifest): SideScrollingArtRuntime {
  const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  const loaded: string[] = [];
  const failed: string[] = [];
  const missing: string[] = [];

  return {
    preload(scene) {
      const loadKeyToId = new Map<string, string>();
      for (const asset of assets.values()) {
        if (asset.status === 'missing') {
          addUnique(missing, asset.id);
          continue;
        }
        loadKeyToId.set(asset.loadKey, asset.id);
        if (asset.format === 'svg') {
          scene.load.svg(asset.loadKey, `./${asset.path}`, { width: asset.size?.w ?? 64, height: asset.size?.h ?? 64 });
        } else {
          scene.load.image(asset.loadKey, `./${asset.path}`);
        }
      }
      scene.load.on('filecomplete', (key: string) => {
        const id = loadKeyToId.get(key);
        if (id !== undefined) {
          addUnique(loaded, id);
        }
      });
      scene.load.on('loaderror', (file: { key?: string }) => {
        const id = file.key === undefined ? undefined : loadKeyToId.get(file.key);
        if (id !== undefined) {
          addUnique(failed, id);
        }
      });
    },
    drawBackground(scene, width, height) {
      const background = assets.get('background_main');
      if (background === undefined) {
        return undefined;
      }

      const image = scene.add.image(width / 2, height / 2, background.loadKey);
      image.setDisplaySize(width, height);
      return image;
    },
    addImage(scene, id, x, y) {
      const asset = assets.get(id);
      if (asset === undefined) {
        addUnique(missing, id);
        return undefined;
      }

      addUnique(loaded, asset.id);
      return scene.add.image(x, y, asset.loadKey);
    },
    telemetry() {
      return {
        manifestLoaded: manifest.version === 'asset-manifest-v0.1',
        required: manifest.assets.filter((asset) => asset.required).map((asset) => asset.id),
        loaded: [...loaded],
        failed: [...failed],
        fallbackUsed: manifest.assets.filter((asset) => asset.status === 'fallback_used').map((asset) => asset.id),
        placeholderUsed: [],
        missing: [...missing],
        missingRequiredRoles: []
      };
    }
  };
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}
