import type {
  FlightAct,
  FlightActionType,
  FlightEventDefinition,
  MissionConfig,
  ModuleItem,
  RoleType,
  TelemetryMetrics,
} from '../../../shared/types.js';
import { flightConfig, selectFlightEvent } from '../catalog.js';

export interface FlightRuntimeState {
  roomId: string;
  startedAt: number;
  durationMs: number;
  progress: number;
  act: FlightAct;
  activeEvent: FlightEventDefinition;
  crisisTriggered: boolean;
  crisisResolved: boolean;
  activeSensorIds: string[];
  disabledExperimentIds: string[];
  decisions: string[];
}

export interface FlightAdvanceResult {
  state: FlightRuntimeState;
  crisisStarted: boolean;
  completed: boolean;
}

export interface FlightLoopCallbacks {
  onTick: (roomId: string, state: FlightRuntimeState) => void;
  onCrisis: (roomId: string, state: FlightRuntimeState) => void;
  onComplete: (roomId: string, state: FlightRuntimeState) => void;
}

export function createFlightRuntime(
  roomId: string,
  startedAt: number,
  mission: MissionConfig,
  modules: ModuleItem[],
  telemetry: TelemetryMetrics,
): FlightRuntimeState {
  const activeEvent = selectFlightEvent(telemetry, mission);
  return {
    roomId,
    startedAt,
    durationMs: flightConfig.durationSeconds * 1000,
    progress: 0,
    act: 'ASCENT_INSERTION',
    activeEvent,
    crisisTriggered: false,
    crisisResolved: false,
    activeSensorIds: modules
      .filter((module) => module.category === 'SCI')
      .map((module) => module.id),
    disabledExperimentIds: [],
    decisions: [],
  };
}

export function advanceFlightRuntime(
  current: FlightRuntimeState,
  now: number,
): FlightAdvanceResult {
  const elapsedMs = Math.max(0, now - current.startedAt);
  const progress = Math.min(100, (elapsedMs / current.durationMs) * 100);
  const act: FlightAct =
    progress < flightConfig.crisisProgressPercent
      ? 'ASCENT_INSERTION'
      : progress < flightConfig.crisisActEndPercent
        ? 'CRISIS'
        : 'OPERATIONS';
  const crisisStarted =
    !current.crisisTriggered && progress >= flightConfig.crisisProgressPercent;
  const state: FlightRuntimeState = {
    ...current,
    progress,
    act,
    crisisTriggered: current.crisisTriggered || crisisStarted,
  };
  return { state, crisisStarted, completed: progress >= 100 };
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`La acción de vuelo requiere el campo "${key}".`);
  }
  return value.trim();
}

export function applyFlightAction(
  current: FlightRuntimeState,
  role: RoleType,
  actionType: FlightActionType,
  payload: Record<string, unknown>,
  selectedModules: ModuleItem[],
): FlightRuntimeState {
  if (actionType === 'SOLVE_PUZZLE') {
    if (!current.crisisTriggered) {
      throw new Error('El acertijo estará disponible al comenzar la fase crítica.');
    }
    if (!current.activeEvent.puzzle) {
      throw new Error('No hay un acertijo de crisis activo.');
    }
    if (role !== current.activeEvent.puzzle.role) {
      throw new Error('El acertijo solo puede resolverlo el rol asignado.');
    }
    const puzzleId = readString(payload, 'puzzleId');
    const answer = readString(payload, 'answer').toUpperCase();
    if (puzzleId !== current.activeEvent.puzzle.id || answer !== current.activeEvent.puzzle.answer) {
      throw new Error('La respuesta del acertijo no es correcta.');
    }
    return { ...current, crisisResolved: true };
  }

  if (actionType === 'TOGGLE_SENSOR') {
    if (role !== 'SCIENCE') {
      throw new Error('Solo SCIENCE puede cambiar el estado de los sensores.');
    }
    const moduleId = readString(payload, 'moduleId');
    const enabled = payload.enabled;
    if (typeof enabled !== 'boolean') {
      throw new Error('La acción del sensor requiere un valor enabled booleano.');
    }
    const sensor = selectedModules.find(
      (module) => module.id === moduleId && module.category === 'SCI',
    );
    if (!sensor) {
      throw new Error('El sensor indicado no está instalado en esta nave.');
    }
    const activeSensorIds = enabled
      ? [...new Set([...current.activeSensorIds, moduleId])]
      : current.activeSensorIds.filter((id) => id !== moduleId);
    const disabledExperimentIds = enabled
      ? current.disabledExperimentIds.filter((id) => id !== moduleId)
      : [...new Set([...current.disabledExperimentIds, moduleId])];
    return { ...current, activeSensorIds, disabledExperimentIds };
  }

  if (role !== 'DIRECTOR') {
    throw new Error('Solo DIRECTOR puede tomar decisiones ejecutivas.');
  }
  if (!current.crisisTriggered) {
    throw new Error('La decisión ejecutiva estará disponible al comenzar la fase crítica.');
  }
  if (payload.decision !== 'SACRIFICE_EXPERIMENT') {
    throw new Error('La decisión ejecutiva solicitada no es válida.');
  }
  const moduleId = readString(payload, 'moduleId');
  const experiment = selectedModules.find(
    (module) => module.id === moduleId && module.category === 'SCI',
  );
  if (!experiment || current.disabledExperimentIds.includes(moduleId)) {
    throw new Error('El experimento no está activo o ya fue sacrificado.');
  }
  return {
    ...current,
    activeSensorIds: current.activeSensorIds.filter((id) => id !== moduleId),
    disabledExperimentIds: [...current.disabledExperimentIds, moduleId],
    decisions: [...current.decisions, `SACRIFICE_EXPERIMENT:${moduleId}`],
    crisisResolved: true,
  };
}

export class FlightLoop {
  private readonly runtimeByRoom = new Map<string, FlightRuntimeState>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly callbacks: FlightLoopCallbacks,
    private readonly tickIntervalMs = flightConfig.tickIntervalMs,
  ) {}

  start(
    roomId: string,
    mission: MissionConfig,
    modules: ModuleItem[],
    telemetry: TelemetryMetrics,
    startedAt = Date.now(),
  ): FlightRuntimeState {
    if (this.runtimeByRoom.has(roomId)) {
      throw new Error(`La simulación de vuelo para "${roomId}" ya está activa.`);
    }
    const runtime = createFlightRuntime(roomId, startedAt, mission, modules, telemetry);
    this.runtimeByRoom.set(roomId, runtime);
    this.callbacks.onTick(roomId, structuredClone(runtime));
    const timer = setInterval(() => this.tick(roomId, Date.now()), this.tickIntervalMs);
    this.timers.set(roomId, timer);
    return structuredClone(runtime);
  }

  getRuntime(roomId: string): FlightRuntimeState {
    const runtime = this.runtimeByRoom.get(roomId);
    if (!runtime) {
      throw new Error(`No hay una simulación de vuelo activa para "${roomId}".`);
    }
    return structuredClone(runtime);
  }

  updateRuntime(
    roomId: string,
    updater: (state: FlightRuntimeState) => FlightRuntimeState,
  ): FlightRuntimeState {
    const current = this.getRuntime(roomId);
    const updated = updater(current);
    this.runtimeByRoom.set(roomId, updated);
    this.callbacks.onTick(roomId, structuredClone(updated));
    return structuredClone(updated);
  }

  stop(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(roomId);
    }
    this.runtimeByRoom.delete(roomId);
  }

  stopAll(): void {
    for (const roomId of [...this.runtimeByRoom.keys()]) {
      this.stop(roomId);
    }
  }

  private tick(roomId: string, now: number): void {
    const current = this.runtimeByRoom.get(roomId);
    if (!current) {
      return;
    }
    try {
      const result = advanceFlightRuntime(current, now);
      this.runtimeByRoom.set(roomId, result.state);
      if (result.crisisStarted) {
        this.callbacks.onCrisis(roomId, structuredClone(result.state));
      }
      this.callbacks.onTick(roomId, structuredClone(result.state));
      if (result.completed) {
        this.stop(roomId);
        this.callbacks.onComplete(roomId, structuredClone(result.state));
      }
    } catch (error) {
      // Este método corre dentro de un temporizador: una excepción sin capturar
      // tumbaría el proceso y, con él, las partidas de todas las demás salas.
      this.stop(roomId);
      console.error(`La simulación de vuelo de "${roomId}" se detuvo por un error:`, error);
    }
  }
}