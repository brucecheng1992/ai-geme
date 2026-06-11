import type Phaser from 'phaser';

type CollectorAssetRole = 'background' | 'player_character' | 'collectible';

type ManifestAsset = {
  id: string;
  loadKey: string;
  role: CollectorAssetRole;
  path: string;
  required: boolean;
  status: 'ready' | 'fallback_used' | 'missing';
  source: 'local_asset_pack' | 'template_svg' | 'placeholder';
};

type GameAssetManifest = {
  assets: ManifestAsset[];
};

export type CollectorAssetTelemetry = {
  manifestLoaded: boolean;
  required: string[];
  loaded: string[];
  failed: string[];
  fallbackUsed: string[];
  placeholderUsed: string[];
  missing: string[];
  missingRequiredRoles: string[];
};

export function createCollectorArtRuntime(manifest: GameAssetManifest): {
  preload(scene: Phaser.Scene): void;
  addImage(scene: Phaser.Scene, role: CollectorAssetRole, x: number, y: number, displayWidth: number, displayHeight: number): Phaser.GameObjects.Image | undefined;
  telemetry(): CollectorAssetTelemetry;
} {
  const roleToAsset = new Map<CollectorAssetRole, ManifestAsset>();
  for (const asset of manifest.assets) {
    if (!roleToAsset.has(asset.role)) {
      roleToAsset.set(asset.role, asset);
    }
  }

  const telemetryState: CollectorAssetTelemetry = {
    manifestLoaded: false,
    required: [],
    loaded: [],
    failed: [],
    fallbackUsed: [],
    placeholderUsed: [],
    missing: [],
    missingRequiredRoles: []
  };

  return {
    preload(scene) {
      const roles = requiredCollectorRoles();
      const requiredAssets = roles.map((role) => roleToAsset.get(role)).filter((asset): asset is ManifestAsset => asset?.required === true);
      telemetryState.manifestLoaded = true;
      telemetryState.required = requiredAssets.map((asset) => asset.id);
      telemetryState.missing = requiredAssets.filter((asset) => asset.status !== 'ready').map((asset) => asset.id);
      telemetryState.missingRequiredRoles = roles.filter((role) => roleToAsset.get(role)?.required !== true);
      telemetryState.fallbackUsed = manifest.assets.filter((asset) => asset.status === 'fallback_used').map((asset) => asset.id);
      telemetryState.placeholderUsed = manifest.assets.filter((asset) => asset.source === 'placeholder').map((asset) => asset.id);

      for (const asset of requiredAssets) {
        if (asset.status === 'ready') {
          scene.load.image(asset.loadKey, asset.path);
        }
      }
    },

    addImage(scene, role, x, y, displayWidth, displayHeight) {
      const asset = roleToAsset.get(role);
      if (asset === undefined || asset.status !== 'ready') {
        return undefined;
      }

      if (!scene.textures.exists(asset.loadKey)) {
        addUnique(telemetryState.failed, asset.id);
        return undefined;
      }

      addUnique(telemetryState.loaded, asset.id);
      return scene.add.image(x, y, asset.loadKey).setDisplaySize(displayWidth, displayHeight);
    },

    telemetry() {
      return {
        manifestLoaded: telemetryState.manifestLoaded,
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

function requiredCollectorRoles(): CollectorAssetRole[] {
  return ['background', 'player_character', 'collectible'];
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}
