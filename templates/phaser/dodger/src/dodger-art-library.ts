import type Phaser from 'phaser';

type DodgerAssetRole = 'background' | 'player_character' | 'hazard' | 'collectible';

type ManifestAsset = {
  id: string;
  loadKey: string;
  role: DodgerAssetRole;
  type: 'image';
  format: 'svg';
  path: string;
  source: string;
  required: boolean;
  status: 'ready' | 'fallback_used' | 'missing';
  size: { w: number; h: number };
};

type GameAssetManifest = {
  version: 'asset-manifest-v0.1';
  assets: ManifestAsset[];
};

export type DodgerAssetTelemetry = {
  manifestLoaded: boolean;
  required: string[];
  loaded: string[];
  failed: string[];
  fallbackUsed: string[];
  placeholderUsed: string[];
  missing: string[];
  missingRequiredRoles: string[];
};

export type DodgerArtRuntime = ReturnType<typeof createDodgerArtRuntime>;

export function createDodgerArtRuntime(manifest: GameAssetManifest): {
  preload(scene: Phaser.Scene, options: { collectible: boolean }): void;
  addImage(scene: Phaser.Scene, role: DodgerAssetRole, x: number, y: number, displayWidth: number, displayHeight: number): Phaser.GameObjects.Image | undefined;
  drawBackground(scene: Phaser.Scene, width: number, height: number): boolean;
  telemetry(): DodgerAssetTelemetry;
} {
  const roleToAsset = new Map<DodgerAssetRole, ManifestAsset>();
  for (const asset of manifest.assets) {
    if (!roleToAsset.has(asset.role)) {
      roleToAsset.set(asset.role, asset);
    }
  }

  const telemetryState: DodgerAssetTelemetry = {
    manifestLoaded: manifest.version === 'asset-manifest-v0.1',
    required: [],
    loaded: [],
    failed: [],
    fallbackUsed: manifest.assets.filter((asset) => asset.status === 'fallback_used' || asset.source === 'template_svg').map((asset) => asset.id),
    placeholderUsed: manifest.assets.filter((asset) => asset.source === 'placeholder').map((asset) => asset.id),
    missing: [],
    missingRequiredRoles: []
  };

  const addImage = (
    scene: Phaser.Scene,
    role: DodgerAssetRole,
    x: number,
    y: number,
    displayWidth: number,
    displayHeight: number
  ): Phaser.GameObjects.Image | undefined => {
    const asset = roleToAsset.get(role);
    if (asset === undefined || !hasTexture(scene, asset.loadKey)) {
      return undefined;
    }

    addUnique(telemetryState.loaded, asset.id);
    return scene.add.image(x, y, asset.loadKey).setDisplaySize(displayWidth, displayHeight);
  };

  return {
    preload(scene, options) {
      const roles = requiredDodgerRoles(options.collectible);
      const requiredAssets = roles.map((role) => roleToAsset.get(role)).filter((asset): asset is ManifestAsset => asset?.required === true);
      telemetryState.required = requiredAssets.map((asset) => asset.id);
      telemetryState.missing = requiredAssets.filter((asset) => asset.status !== 'ready').map((asset) => asset.id);
      telemetryState.missingRequiredRoles = roles.filter((role) => roleToAsset.get(role)?.required !== true);

      const loadKeyToId = new Map<string, string>();
      for (const role of roles) {
        const asset = roleToAsset.get(role);
        if (asset === undefined || asset.status !== 'ready') {
          continue;
        }

        loadKeyToId.set(asset.loadKey, asset.id);
        if (asset.format === 'svg') {
          scene.load.svg(asset.loadKey, `./${asset.path}`, { width: asset.size.w, height: asset.size.h });
        } else {
          scene.load.image(asset.loadKey, `./${asset.path}`);
        }
      }

      scene.load.on('filecomplete', (key: string) => {
        const id = loadKeyToId.get(key);
        if (id !== undefined) {
          addUnique(telemetryState.loaded, id);
        }
      });
      scene.load.on('loaderror', (file: { key?: string }) => {
        const id = file.key === undefined ? undefined : loadKeyToId.get(file.key);
        if (id !== undefined) {
          addUnique(telemetryState.failed, id);
        }
      });
    },

    addImage,

    drawBackground(scene, width, height) {
      const image = addImage(scene, 'background', width / 2, height / 2, width, height);
      if (image !== undefined) {
        image.setDepth(-10);
        return true;
      }
      return false;
    },

    telemetry() {
      return {
        ...telemetryState,
        required: [...telemetryState.required],
        loaded: [...telemetryState.loaded],
        failed: [...telemetryState.failed],
        fallbackUsed: [...telemetryState.fallbackUsed],
        placeholderUsed: [...telemetryState.placeholderUsed],
        missing: [...telemetryState.missing],
        missingRequiredRoles: [...telemetryState.missingRequiredRoles]
      };
    }
  };
}

export function emitCoinSpark(scene: Phaser.Scene | undefined, x: number, y: number): void {
  if (scene === undefined) {
    return;
  }

  const spark = scene.add
    .graphics()
    .lineStyle(3, 0xfff0a3, 0.9)
    .strokeCircle(x, y, 34)
    .fillStyle(0xffffff, 0.9)
    .fillCircle(x - 24, y - 18, 4)
    .fillCircle(x + 28, y - 10, 3)
    .fillCircle(x + 12, y + 24, 3);

  scene.tweens.add({
    targets: spark,
    alpha: 0,
    scale: 1.45,
    duration: 260,
    onComplete: () => spark.destroy()
  });
}

export function emitClearBurst(scene: Phaser.Scene | undefined, width: number, height: number): void {
  if (scene === undefined) {
    return;
  }

  const burst = scene.add.graphics();
  const centerX = width / 2;
  const centerY = height / 2;
  burst.lineStyle(4, 0xfff0a3, 0.85);
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    const inner = 72;
    const outer = 132;
    burst.lineBetween(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner, centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
  }

  scene.tweens.add({
    targets: burst,
    alpha: 0,
    duration: 620,
    onComplete: () => burst.destroy()
  });
}

function requiredDodgerRoles(collectible: boolean): DodgerAssetRole[] {
  return ['background', 'player_character', 'hazard', ...(collectible ? (['collectible'] as const) : [])];
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function hasTexture(scene: Phaser.Scene, key: string): boolean {
  return (scene as Phaser.Scene & { textures?: { exists(key: string): boolean } }).textures?.exists(key) === true;
}
