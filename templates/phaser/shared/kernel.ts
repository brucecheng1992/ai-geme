export type GameStatus = 'READY' | 'PLAYING' | 'WON' | 'LOST';

export type TelemetryEvent = {
  type: string;
  timestamp_ms: number;
  frame: number;
  payload?: Record<string, unknown>;
};

export type GameSnapshot = {
  gameStatus: GameStatus;
  score: number;
  health: number;
  frame: number;
} & Record<string, unknown>;

export type GameTelemetryExtras = Record<string, unknown>;

export type RuntimeState = GameSnapshot & {
  maxHealth: number;
  events: TelemetryEvent[];
};

export type RuntimeInput = 'start' | 'restart' | 'move' | 'fire';

export function createRuntimeState(health = 3): RuntimeState {
  return {
    gameStatus: 'READY',
    score: 0,
    health,
    maxHealth: health,
    frame: 0,
    events: []
  };
}

export class TelemetrySystem {
  constructor(private readonly state: RuntimeState) {}

  emit(type: string, payload?: Record<string, unknown>): void {
    this.state.events.push({
      type,
      timestamp_ms: Date.now(),
      frame: this.state.frame,
      payload
    });
  }
}

export class GameStateSystem {
  constructor(
    private readonly state: RuntimeState,
    private readonly telemetry: TelemetrySystem
  ) {}

  ready(): void {
    this.state.gameStatus = 'READY';
    this.telemetry.emit('game.ready');
  }

  start(): void {
    this.state.gameStatus = 'PLAYING';
    this.telemetry.emit('game.started');
  }

  restart(): void {
    this.state.gameStatus = 'READY';
    this.state.score = 0;
    this.state.health = this.state.maxHealth;
    this.state.frame = 0;
    this.telemetry.emit('game.restarted');
  }

  win(): void {
    this.state.gameStatus = 'WON';
    this.telemetry.emit('objective.completed');
    this.telemetry.emit('game.won');
  }

  lose(): void {
    this.state.gameStatus = 'LOST';
    this.telemetry.emit('game.lost');
  }
}

export class InputSystem {
  constructor(private readonly telemetry: TelemetrySystem) {}

  receive(input: RuntimeInput): void {
    this.telemetry.emit('input.received', { input });
  }
}

export class MovementSystem {
  constructor(private readonly telemetry: TelemetrySystem) {}

  move(payload?: Record<string, unknown>): void {
    this.telemetry.emit('player.moved', payload);
  }
}

export class SpawnSystem {
  constructor(private readonly telemetry: TelemetrySystem) {}

  spawn(type: 'enemy' | 'item' | 'hazard' | 'projectile', payload?: Record<string, unknown>): void {
    const eventByType: Partial<Record<typeof type, string>> = {
      item: 'item.spawned',
      hazard: 'hazard.spawned',
      projectile: 'projectile.spawned'
    };
    const event = eventByType[type];

    if (event !== undefined) {
      this.telemetry.emit(event, payload);
    }
  }
}

export class CollisionSystem {
  constructor(private readonly telemetry: TelemetrySystem) {}

  collide(payload?: Record<string, unknown>): void {
    this.telemetry.emit('collision.detected', payload);
  }
}

export class ScoreSystem {
  constructor(
    private readonly state: RuntimeState,
    private readonly telemetry: TelemetrySystem
  ) {}

  add(value: number): void {
    this.state.score += value;
    this.telemetry.emit('score.changed', { score: this.state.score });
  }
}

export class ObjectiveSystem {
  constructor(
    private readonly state: RuntimeState,
    private readonly gameState: GameStateSystem
  ) {}

  completeWhen(condition: boolean): void {
    if (condition && this.state.gameStatus === 'PLAYING') {
      this.gameState.win();
    }
  }

  loseWhen(condition: boolean): void {
    if (condition && this.state.gameStatus === 'PLAYING') {
      this.gameState.lose();
    }
  }
}

export class QaBridge {
  constructor(
    private readonly state: RuntimeState,
    private readonly onStart: () => void,
    private readonly onRestart: () => void,
    private readonly getSnapshotExtras: () => Record<string, unknown> = () => ({})
  ) {}

  start(): void {
    this.onStart();
  }

  restart(): void {
    this.onRestart();
  }

  snapshot(): GameSnapshot {
    const { gameStatus, score, health, frame } = this.state;
    return { gameStatus, score, health, frame, ...this.getSnapshotExtras() };
  }

  telemetry(): TelemetryEvent[] {
    return cloneTelemetry(this.state.events);
  }
}

export function exposeRuntime(state: RuntimeState, qa: QaBridge, getTelemetryExtras: () => GameTelemetryExtras = () => ({})): void {
  const target = globalThis as typeof globalThis & {
    __GAME_TELEMETRY__?: { readonly events: TelemetryEvent[]; readonly state: GameSnapshot } & GameTelemetryExtras;
    __GAME_QA__?: QaBridge;
  };

  target.__GAME_TELEMETRY__ = Object.freeze({
    get events() {
      return cloneTelemetry(state.events);
    },
    get state() {
      const { gameStatus, score, health, frame } = state;
      return { gameStatus, score, health, frame };
    },
    get assets() {
      return getTelemetryExtras().assets;
    }
  });
  target.__GAME_QA__ = qa;
}

function cloneTelemetry(events: TelemetryEvent[]): TelemetryEvent[] {
  return events.map((event) => ({
    type: event.type,
    timestamp_ms: event.timestamp_ms,
    frame: event.frame,
    payload: event.payload === undefined ? undefined : { ...event.payload }
  }));
}
