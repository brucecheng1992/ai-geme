import type Phaser from 'phaser';

import type { ShooterEntityVisualParams, ShooterProjectileVisualParams } from './template-params.js';

export function drawShooterPlayer(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  drawEntity(scene, x, y, label, visual);
}

export function drawShooterEnemy(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  drawEntity(scene, x, y, label, visual);
}

function drawEntity(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  if (visual.kind === 'tank') {
    drawTank(scene, x, y, label, visual);
    return;
  }

  if (visual.kind === 'alien') {
    drawAlien(scene, x, y, label, visual);
    return;
  }

  if (visual.kind === 'cat') {
    drawCat(scene, x, y, label, visual);
    return;
  }

  if (visual.kind === 'ship') {
    drawShip(scene, x, y, label, visual);
    return;
  }

  drawCircleEntity(scene, x, y, label, visual);
}

export function drawShooterProjectile(scene: Phaser.Scene, x: number, y: number, length: number, visual: ShooterProjectileVisualParams): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();

  if (visual.kind === 'shell') {
    graphics
      .lineStyle(6, visual.fillColor, 1)
      .lineBetween(x, y, x + length - 40, y)
      .fillStyle(visual.fillColor, 1)
      .fillEllipse(x + length, y, 42, 20)
      .fillStyle(visual.accentColor, 1)
      .fillCircle(x + length + 16, y, 6);
    return graphics;
  }

  if (visual.kind === 'beam') {
    graphics
      .fillStyle(visual.fillColor, 0.8)
      .fillRoundedRect(x, y - 8, length, 16, 8)
      .fillStyle(visual.accentColor, 1)
      .fillRoundedRect(x, y - 3, length, 6, 3);
    return graphics;
  }

  graphics
    .fillStyle(visual.fillColor, 1)
    .fillRoundedRect(x, y - 8, length, 16, 8)
    .fillStyle(visual.accentColor, 1)
    .fillCircle(x + length, y, 14);
  return graphics;
}

function drawTank(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  const graphics = scene.add.graphics();
  graphics
    .fillStyle(visual.accentColor, 1)
    .fillRoundedRect(x - 58, y + 18, 116, 26, 12)
    .fillStyle(visual.fillColor, 1)
    .fillRoundedRect(x - 52, y - 22, 104, 58, 12)
    .fillRoundedRect(x - 22, y - 46, 44, 36, 12)
    .fillRect(x + 18, y - 36, 62, 12)
    .lineStyle(4, visual.accentColor, 1)
    .strokeRoundedRect(x - 52, y - 22, 104, 58, 12)
    .fillStyle(0x10151d, 1)
    .fillCircle(x - 34, y + 32, 8)
    .fillCircle(x, y + 32, 8)
    .fillCircle(x + 34, y + 32, 8);
  addLabel(scene, x - 48, y + 56, label, 0xe6f0c5);
}

function drawShip(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  scene.add
    .graphics()
    .fillStyle(visual.fillColor, 1)
    .fillTriangle(x - 54, y + 38, x + 62, y, x - 54, y - 38)
    .fillStyle(visual.accentColor, 1)
    .fillCircle(x - 8, y, 14)
    .lineStyle(4, visual.accentColor, 1)
    .lineBetween(x - 36, y - 26, x - 58, y - 52)
    .lineBetween(x - 36, y + 26, x - 58, y + 52);
  addLabel(scene, x - 48, y + 56, label, 0xd6ecff);
}

function drawCat(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  scene.add
    .graphics()
    .fillStyle(visual.accentColor, 1)
    .fillTriangle(x - 34, y - 38, x - 16, y - 72, x + 2, y - 36)
    .fillTriangle(x + 34, y - 38, x + 16, y - 72, x - 2, y - 36)
    .fillStyle(visual.fillColor, 1)
    .fillCircle(x, y, 44)
    .fillStyle(0xffffff, 1)
    .fillCircle(x - 15, y - 8, 8)
    .fillCircle(x + 15, y - 8, 8)
    .fillStyle(0x122033, 1)
    .fillCircle(x - 15, y - 8, 4)
    .fillCircle(x + 15, y - 8, 4)
    .fillStyle(0xff7aa7, 1)
    .fillTriangle(x - 6, y + 8, x + 6, y + 8, x, y + 18)
    .lineStyle(4, visual.fillColor, 1)
    .strokeCircle(x - 42, y + 24, 16);
  addLabel(scene, x - 48, y + 56, label, 0xffe8bc);
}

function drawAlien(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  scene.add
    .graphics()
    .lineStyle(5, visual.accentColor, 1)
    .lineBetween(x - 22, y - 42, x - 50, y - 74)
    .lineBetween(x + 22, y - 42, x + 50, y - 74)
    .fillStyle(visual.fillColor, 1)
    .fillCircle(x - 54, y - 78, 8)
    .fillCircle(x + 54, y - 78, 8)
    .fillRoundedRect(x - 54, y - 42, 108, 86, 34)
    .fillStyle(0x102334, 1)
    .fillCircle(x - 20, y - 8, 10)
    .fillCircle(x + 20, y - 8, 10)
    .lineStyle(4, 0x102334, 1)
    .lineBetween(x - 20, y + 22, x + 20, y + 22);
  addLabel(scene, x - 42, y + 56, label, 0xc9ffd7);
}

function drawCircleEntity(scene: Phaser.Scene, x: number, y: number, label: string, visual: ShooterEntityVisualParams): void {
  scene.add
    .graphics()
    .fillStyle(visual.fillColor, 1)
    .fillCircle(x, y, 44)
    .lineStyle(4, visual.accentColor, 1)
    .strokeCircle(x, y, 48);
  addLabel(scene, x - 44, y + 56, label, 0xf8fbff);
}

function addLabel(scene: Phaser.Scene, x: number, y: number, label: string, color: number): void {
  scene.add.text(x, y, label, {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    color: `#${color.toString(16).padStart(6, '0')}`
  });
}
