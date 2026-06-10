import type Phaser from 'phaser';

import type { ShooterEntityVisualParams, ShooterProjectileVisualParams } from './template-params.js';

export function drawShooterPlayer(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  visual: ShooterEntityVisualParams
): Phaser.GameObjects.Container {
  return drawEntity(scene, x, y, label, visual);
}

export function drawShooterEnemy(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  visual: ShooterEntityVisualParams
): Phaser.GameObjects.Container {
  return drawEntity(scene, x, y, label, visual);
}

function drawEntity(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  container.add(graphics);

  if (visual.kind === 'tank') {
    drawTank(scene, container, graphics, label, visual);
    return container;
  }

  if (visual.kind === 'alien') {
    drawAlien(scene, container, graphics, label, visual);
    return container;
  }

  if (visual.kind === 'cat') {
    drawCat(scene, container, graphics, label, visual);
    return container;
  }

  if (visual.kind === 'ship') {
    drawShip(scene, container, graphics, label, visual);
    return container;
  }

  drawCircleEntity(scene, container, graphics, label, visual);
  return container;
}

export function drawShooterProjectile(scene: Phaser.Scene, x: number, y: number, length: number, visual: ShooterProjectileVisualParams): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.setPosition(x, y);

  if (visual.kind === 'shell') {
    graphics
      .lineStyle(6, visual.fillColor, 1)
      .lineBetween(0, 0, length - 40, 0)
      .fillStyle(visual.fillColor, 1)
      .fillEllipse(length, 0, 42, 20)
      .fillStyle(visual.accentColor, 1)
      .fillCircle(length + 16, 0, 6);
    return graphics;
  }

  if (visual.kind === 'beam') {
    graphics
      .fillStyle(visual.fillColor, 0.8)
      .fillRoundedRect(0, -8, length, 16, 8)
      .fillStyle(visual.accentColor, 1)
      .fillRoundedRect(0, -3, length, 6, 3);
    return graphics;
  }

  graphics
    .fillStyle(visual.fillColor, 1)
    .fillRoundedRect(0, -8, length, 16, 8)
    .fillStyle(visual.accentColor, 1)
    .fillCircle(length, 0, 14);
  return graphics;
}

function drawTank(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  label: string,
  visual: ShooterEntityVisualParams
): void {
  graphics
    .fillStyle(visual.accentColor, 1)
    .fillRoundedRect(-58, 18, 116, 26, 12)
    .fillStyle(visual.fillColor, 1)
    .fillRoundedRect(-52, -22, 104, 58, 12)
    .fillRoundedRect(-22, -46, 44, 36, 12)
    .fillRect(18, -36, 62, 12)
    .lineStyle(4, visual.accentColor, 1)
    .strokeRoundedRect(-52, -22, 104, 58, 12)
    .fillStyle(0x10151d, 1)
    .fillCircle(-34, 32, 8)
    .fillCircle(0, 32, 8)
    .fillCircle(34, 32, 8);
  addLabel(scene, container, -48, 56, label, 0xe6f0c5);
}

function drawShip(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  label: string,
  visual: ShooterEntityVisualParams
): void {
  graphics
    .fillStyle(visual.fillColor, 1)
    .fillTriangle(-54, 38, 62, 0, -54, -38)
    .fillStyle(visual.accentColor, 1)
    .fillCircle(-8, 0, 14)
    .lineStyle(4, visual.accentColor, 1)
    .lineBetween(-36, -26, -58, -52)
    .lineBetween(-36, 26, -58, 52);
  addLabel(scene, container, -48, 56, label, 0xd6ecff);
}

function drawCat(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  label: string,
  visual: ShooterEntityVisualParams
): void {
  graphics
    .fillStyle(visual.accentColor, 1)
    .fillTriangle(-34, -38, -16, -72, 2, -36)
    .fillTriangle(34, -38, 16, -72, -2, -36)
    .fillStyle(visual.fillColor, 1)
    .fillCircle(0, 0, 44)
    .fillStyle(0xffffff, 1)
    .fillCircle(-15, -8, 8)
    .fillCircle(15, -8, 8)
    .fillStyle(0x122033, 1)
    .fillCircle(-15, -8, 4)
    .fillCircle(15, -8, 4)
    .fillStyle(0xff7aa7, 1)
    .fillTriangle(-6, 8, 6, 8, 0, 18)
    .lineStyle(4, visual.fillColor, 1)
    .strokeCircle(-42, 24, 16);
  addLabel(scene, container, -48, 56, label, 0xffe8bc);
}

function drawAlien(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  label: string,
  visual: ShooterEntityVisualParams
): void {
  graphics
    .lineStyle(5, visual.accentColor, 1)
    .lineBetween(-22, -42, -50, -74)
    .lineBetween(22, -42, 50, -74)
    .fillStyle(visual.fillColor, 1)
    .fillCircle(-54, -78, 8)
    .fillCircle(54, -78, 8)
    .fillRoundedRect(-54, -42, 108, 86, 34)
    .fillStyle(0x102334, 1)
    .fillCircle(-20, -8, 10)
    .fillCircle(20, -8, 10)
    .lineStyle(4, 0x102334, 1)
    .lineBetween(-20, 22, 20, 22);
  addLabel(scene, container, -42, 56, label, 0xc9ffd7);
}

function drawCircleEntity(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  graphics: Phaser.GameObjects.Graphics,
  label: string,
  visual: ShooterEntityVisualParams
): void {
  graphics
    .fillStyle(visual.fillColor, 1)
    .fillCircle(0, 0, 44)
    .lineStyle(4, visual.accentColor, 1)
    .strokeCircle(0, 0, 48);
  addLabel(scene, container, -44, 56, label, 0xf8fbff);
}

function addLabel(scene: Phaser.Scene, container: Phaser.GameObjects.Container, x: number, y: number, label: string, color: number): void {
  const text = scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    color: `#${color.toString(16).padStart(6, '0')}`
  });
  container.add(text);
}
