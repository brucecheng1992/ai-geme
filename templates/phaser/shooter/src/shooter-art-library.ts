import type Phaser from 'phaser';

type ShooterAssetRole = 'background' | 'player_character' | 'enemy' | 'projectile';

type ManifestAsset = {
  id: string;
  loadKey: string;
  role: ShooterAssetRole;
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

export type ShooterAssetTelemetry = {
  manifestLoaded: boolean;
  required: string[];
  loaded: string[];
  failed: string[];
  fallbackUsed: string[];
  placeholderUsed: string[];
  missing: string[];
  missingRequiredRoles: string[];
};

export type ShooterArtRuntime = ReturnType<typeof createShooterArtRuntime>;

export function createShooterArtRuntime(manifest: GameAssetManifest): {
  preload(scene: Phaser.Scene): void;
  addImage(scene: Phaser.Scene, role: ShooterAssetRole, x: number, y: number, displayWidth: number, displayHeight: number): Phaser.GameObjects.Image | undefined;
  drawBackground(scene: Phaser.Scene, width: number, height: number): boolean;
  telemetry(): ShooterAssetTelemetry;
} {
  const roleToAsset = new Map<ShooterAssetRole, ManifestAsset>();
  for (const asset of manifest.assets) {
    if (!roleToAsset.has(asset.role)) {
      roleToAsset.set(asset.role, asset);
    }
  }

  const telemetryState: ShooterAssetTelemetry = {
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
    role: ShooterAssetRole,
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
    preload(scene) {
      const roles = requiredShooterRoles();
      const requiredAssets = roles.map((role) => roleToAsset.get(role)).filter((asset): asset is ManifestAsset => asset?.required === true);
      telemetryState.required = requiredAssets.map((asset) => asset.id);
      telemetryState.missing = requiredAssets.filter((asset) => asset.status !== 'ready').map((asset) => asset.id);
      telemetryState.missingRequiredRoles = roles.filter((role) => roleToAsset.get(role)?.required !== true);

      const loadKeyToId = new Map<string, string>();
      for (const asset of requiredAssets) {
        if (asset.status !== 'ready') {
          continue;
        }

        loadKeyToId.set(asset.loadKey, asset.id);
        scene.load.svg(asset.loadKey, `./${asset.path}`, { width: asset.size.w, height: asset.size.h });
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

function requiredShooterRoles(): ShooterAssetRole[] {
  return ['background', 'player_character', 'enemy', 'projectile'];
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function hasTexture(scene: Phaser.Scene, key: string): boolean {
  return (scene as Phaser.Scene & { textures?: { exists(key: string): boolean } }).textures?.exists(key) === true;
}
