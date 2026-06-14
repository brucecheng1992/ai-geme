import type Phaser from 'phaser';

export type EndScreenCopy = {
  title: string;
  subtitle: string;
};

export type EndScreenConfig = {
  win: EndScreenCopy;
  lose: EndScreenCopy;
};

export type EndScreenWorld = {
  width: number;
  height: number;
};

type EndScreenState = keyof EndScreenConfig;
type EndScreenObject = Phaser.GameObjects.Graphics | Phaser.GameObjects.Text;

const fallbackEndScreens: EndScreenConfig = {
  win: { title: 'VICTORY', subtitle: 'Objective complete' },
  lose: { title: 'DEFEAT', subtitle: 'Try again' }
};

export class EndScreenRenderer {
  private objects: EndScreenObject[] = [];
  private visibleState?: EndScreenState;

  constructor(
    private readonly world: EndScreenWorld,
    private readonly copy: EndScreenConfig = fallbackEndScreens
  ) {}

  show(scene: Phaser.Scene, state: EndScreenState): void {
    if (this.visibleState === state) {
      return;
    }

    this.clear();
    const content = this.copy[state];
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;
    const tint = state === 'win' ? 0x208a4d : 0xc93d35;
    const overlay = scene.add
      .graphics()
      .fillStyle(0x07111f, 0.84)
      .fillRect(0, 0, this.world.width, this.world.height)
      .fillStyle(tint, 0.96)
      .fillRoundedRect(centerX - 232, centerY - 122, 464, 244, 18)
      .lineStyle(4, 0xf8fbff, 0.78)
      .strokeRoundedRect(centerX - 232, centerY - 122, 464, 244, 18);
    const title = scene.add
      .text(centerX, centerY - 56, content.title, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '44px',
        color: '#f8fbff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(centerX, centerY + 2, content.subtitle, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#f8fbff'
      })
      .setOrigin(0.5);
    const restart = scene.add
      .text(centerX, centerY + 54, 'Press R to restart', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#d6ecff'
      })
      .setOrigin(0.5);

    this.objects = [overlay, title, subtitle, restart];
    this.visibleState = state;
  }

  clear(): void {
    for (const object of this.objects) {
      object.destroy();
    }
    this.objects = [];
    this.visibleState = undefined;
  }
}
