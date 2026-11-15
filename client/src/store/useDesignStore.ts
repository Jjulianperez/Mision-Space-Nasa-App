import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type {
  ActiveVote,
  AsymmetricFlightPayload,
  AuditIssue,
  ClientToServerEvents,
  DifficultyMode,
  FlightActionType,
  FlightCrisisAlert,
  GameMode,
  GamePhase,
  MissionConfig,
  MissionReport,
  ModuleAction,
  ModuleCategory,
  ModuleItem,
  Player,
  PrelaunchAudit,
  RoleType,
  RoomState,
  ServerToClientEvents,
  TelemetryMetrics,
} from '@shared/types';
import { CATALOG_MISSIONS, CATALOG_MODULES, getCatalogMission } from '../data/catalogs';
import {
  advanceLocalFlight,
  applyLocalAction,
  buildCrisisAlert,
  buildLocalPayload,
  buildLocalReport,
  createLocalFlight,
  type LocalFlightState,
} from '../lib/localFlight';

// ---- Helpers ----
export type ToastTone = 'success' | 'warning' | 'error' | 'info';
export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const BASE_POWER_CONSUMPTION_KW = 15;
const BASE_POWER_GENERATION_KW = 30;

function computeTelemetry(
  selected: ModuleItem[],
  mission: MissionConfig,
): TelemetryMetrics {
  const budgetSpent = selected.reduce((sum, module) => sum + module.costMillions, 0);
  const budgetRemaining = mission.budgetMillions - budgetSpent;
  const totalMassKg = selected.reduce((sum, module) => sum + module.massKg, 0);
  const massPercentage = (totalMassKg / mission.maxLauncherMassKg) * 100;
  const powerConsumedKw =
    BASE_POWER_CONSUMPTION_KW +
    selected.filter((module) => module.powerKw > 0).reduce((sum, module) => sum + module.powerKw, 0);
  const powerGeneratedKw =
    BASE_POWER_GENERATION_KW +
    Math.abs(
      selected
        .filter((module) => module.powerKw < 0)
        .reduce((sum, module) => sum + module.powerKw, 0),
    );
  const propulsiveEfficiency = 100 - (totalMassKg / mission.maxLauncherMassKg) * 25;
  const totalDataGenerated = selected.reduce((sum, module) => sum + module.dataGenMbps, 0);
  const totalDownlinkCapacity = selected.reduce(
    (sum, module) => sum + module.dataDownlinkMbps,
    0,
  );
  const riskBase = selected.reduce((sum, module) => sum + module.riskModifier, 0);
  const structuralRisk = Math.max(
    0,
    Math.min(
      100,
      riskBase + (massPercentage > 90 ? 12 : 0) + (massPercentage > 95 ? 5 : 0),
    ),
  );
  const projectedSciencePoints = selected.reduce(
    (sum, module) => sum + module.sciencePoints,
    0,
  );
  const warnings: string[] = [];
  if (totalMassKg > mission.maxLauncherMassKg) {
    warnings.push('Masa supera el límite del lanzador');
  } else if (massPercentage > 90) {
    warnings.push('Masa >90%: riesgo en Max-Q');
  }
  if (budgetRemaining < 0) warnings.push('Presupuesto excedido');
  if (powerConsumedKw > powerGeneratedKw) warnings.push('Déficit de energía');
  if (totalDataGenerated > totalDownlinkCapacity && totalDownlinkCapacity > 0) {
    warnings.push('Ancho de banda saturado');
  }
  if (projectedSciencePoints < mission.targetSciencePoints) {
    warnings.push('Objetivo científico insuficiente');
  }
  return {
    budgetSpent,
    budgetRemaining,
    totalMassKg,
    massPercentage,
    powerGeneratedKw,
    powerConsumedKw,
    propulsiveEfficiency,
    totalDataGenerated,
    totalDownlinkCapacity,
    structuralRisk,
    projectedSciencePoints,
    warnings,
  };
}

function computeAudit(
  selected: ModuleItem[],
  mission: MissionConfig,
  telemetry: TelemetryMetrics,
): PrelaunchAudit {
  const warnings: AuditIssue[] = [];
  const blocks: AuditIssue[] = [];
  if (telemetry.budgetRemaining < 0) {
    blocks.push({ code: 'BUDGET', message: 'Presupuesto excedido', severity: 'BLOCK' });
  }
  if (telemetry.totalMassKg > mission.maxLauncherMassKg) {
    blocks.push({
      code: 'MASS',
      message: 'Masa supera el límite del lanzador',
      severity: 'BLOCK',
    });
  }
  if (telemetry.massPercentage > 90 && telemetry.totalMassKg <= mission.maxLauncherMassKg) {
    warnings.push({
      code: 'MASS_TIGHT',
      message: 'Masa >90%: riesgo en Max-Q',
      severity: 'WARNING',
    });
  }
  if (telemetry.powerConsumedKw > telemetry.powerGeneratedKw) {
    warnings.push({ code: 'POWER', message: 'Déficit de energía', severity: 'WARNING' });
  }
  if (telemetry.totalDataGenerated > telemetry.totalDownlinkCapacity) {
    warnings.push({
      code: 'BANDWIDTH',
      message: 'Ancho de banda saturado',
      severity: 'WARNING',
    });
  }
  if (telemetry.projectedSciencePoints < mission.targetSciencePoints) {
    warnings.push({
      code: 'SCIENCE',
      message: 'Objetivo científico insuficiente',
      severity: 'WARNING',
    });
  }
  const scienceBaySlotsUsed = selected
    .filter((module) => module.category === 'SCI')
    .reduce((sum, module) => sum + (module.slotsRequired ?? 1), 0);
  return {
    canLaunch: blocks.length === 0,
    warnings,
    blocks,
    telemetry,
    scienceBaySlotsUsed,
  };
}

function makeLocalRoom(
  mission: MissionConfig,
  difficulty: DifficultyMode,
  playerName: string,
  role: RoleType,
): RoomState {
  const selected: ModuleItem[] = [];
  const telemetry = computeTelemetry(selected, mission);
  const player: Player = { id: 'local', name: playerName, role, ready: true };
  return {
    roomId: 'LOCAL-ROOM',
    hostId: 'local',
    difficulty,
    phase: 'LOBBY',
    mission,
    players: [player],
    selectedModules: selected,
    telemetry,
    activeVote: null,
    audit: computeAudit(selected, mission, telemetry),
  };
}

let localFlightState: LocalFlightState | null = null;
let localFlightTimer: number | null = null;
let offlineNotified = false;

function clearLocalFlight(): void {
  if (localFlightTimer !== null) {
    window.clearInterval(localFlightTimer);
    localFlightTimer = null;
  }
  localFlightState = null;
}

export interface StartMissionInput {
  playerName: string;
  difficulty: DifficultyMode;
  missionId: string;
  role: RoleType;
  gameMode?: GameMode;
}

// ---- Store ----
interface DesignStore {
  // connection
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;
  localMode: boolean;
  gameMode: GameMode;
  // flow
  showHome: boolean;
  hasRoom: boolean;
  // room
  roomId: string;
  playerName: string;
  difficulty: DifficultyMode;
  missionId: string;
  desiredRole: RoleType;
  autoRolePending: boolean;
  autoStartDesignPending: boolean;
  phase: GamePhase;
  roomState: RoomState | null;
  // flight / report
  flight: AsymmetricFlightPayload | null;
  crisisAlert: FlightCrisisAlert | null;
  report: MissionReport | null;
  // ui
  myRole: RoleType | null;
  viewTab: 'EST' | 'SCI' | 'COM' | 'debate';
  blueprintView: number;
  toasts: ToastItem[];
  toastSeq: number;
  // catalogs / derived
  missions: MissionConfig[];
  mission: MissionConfig | null;
  modules: ModuleItem[];
  selectedModules: ModuleItem[];
  telemetry: TelemetryMetrics | null;
  audit: PrelaunchAudit | null;
  activeVote: ActiveVote | null;
  // navigation
  openHome: () => void;
  openLobby: () => void;
  // session
  connect: () => void;
  startMission: (input: StartMissionInput) => void;
  joinRoom: (roomId: string, playerName?: string) => void;
  leaveRoom: () => void;
  beginDesign: () => void;
  repeatMission: () => void;
  resetSession: () => void;
  selectRole: (role: RoleType) => void;
  setDifficulty: (difficulty: DifficultyMode) => void;
  // design
  proposeModule: (moduleId: string, action: ModuleAction) => void;
  vote: (voteId: string, approve: boolean) => void;
  launch: () => void;
  // flight
  solvePuzzle: (puzzleId: string, answer: string) => void;
  toggleSensor: (moduleId: string, enabled: boolean) => void;
  execDecision: (moduleId: string) => void;
  // ui
  setViewTab: (tab: 'EST' | 'SCI' | 'COM' | 'debate') => void;
  setBlueprintView: (view: number) => void;
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  // local helpers
  _applyRoomState: (state: RoomState) => void;
  _recalcLocal: () => void;
}

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';

export const useDesignStore = create<DesignStore>()((set, get) => ({
  socket: null,
  connected: false,
  localMode: false,
  gameMode: 'SOLO',

  showHome: true,
  hasRoom: false,

  roomId: 'LOCAL-ROOM',
  playerName: '',
  difficulty: 'APPRENTICE',
  missionId: CATALOG_MISSIONS[0]?.id ?? 'leo-earth-observation',
  desiredRole: 'PROPULSION',
  autoRolePending: false,
  autoStartDesignPending: false,
  phase: 'LOBBY',
  roomState: null,

  flight: null,
  crisisAlert: null,
  report: null,

  myRole: null,
  viewTab: 'EST',
  blueprintView: 0,
  toasts: [],
  toastSeq: 0,

  missions: CATALOG_MISSIONS,
  mission: null,
  modules: CATALOG_MODULES,
  selectedModules: [],
  telemetry: null,
  audit: null,
  activeVote: null,

  openHome: () => set({ showHome: true }),
  openLobby: () => set({ showHome: false }),

  notify: (message, tone = 'info') => {
    const id = get().toastSeq + 1;
    set({
      toastSeq: id,
      toasts: [...get().toasts.slice(-3), { id, message, tone }],
    });
    window.setTimeout(() => get().dismissToast(id), 5200);
  },
  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),

  _applyRoomState: (state) => {
    const socketId = get().socket?.id ?? 'local';
    const me =
      state.players.find((player) => player.id === socketId) ?? state.players[0];
    set({
      roomState: state,
      phase: state.phase,
      hasRoom: true,
      showHome: false,
      difficulty: state.difficulty,
      roomId: state.roomId,
      mission: state.mission,
      missionId: state.mission.id,
      selectedModules: state.selectedModules,
      telemetry: state.telemetry,
      activeVote: state.activeVote,
      audit: state.audit,
      myRole: me?.role ?? null,
    });
  },

  _recalcLocal: () => {
    const roomState = get().roomState;
    if (!roomState) return;
    const telemetry = computeTelemetry(roomState.selectedModules, roomState.mission);
    const audit = computeAudit(roomState.selectedModules, roomState.mission, telemetry);
    get()._applyRoomState({ ...roomState, telemetry, audit });
  },

  connect: () => {
    if (get().socket) return;
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 3000,
      reconnectionAttempts: 2,
    });
    set({ socket });

    socket.on('connect', () => {
      set({ connected: true, localMode: false });
      get().notify('Enlace con el centro de control establecido.', 'success');
      fetch('/api/catalogs')
        .then((response) => response.json())
        .then((data: { missions?: MissionConfig[]; modules?: ModuleItem[] }) => {
          if (data?.missions?.length) {
            set({ missions: data.missions });
          }
          if (data?.modules?.length) {
            set({ modules: data.modules });
          }
        })
        .catch(() => {
          /* se mantienen los catálogos locales de /data */
        });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
      get().notify('Se perdió el enlace con el centro de control.', 'warning');
    });

    socket.on('room:state_update', (state: RoomState) => {
      get()._applyRoomState(state);

      const me = state.players.find((player) => player.id === socket.id);
      if (
        state.phase === 'LOBBY' &&
        me &&
        me.role === null &&
        get().autoRolePending
      ) {
        set({ autoRolePending: false });
        socket.emit('role:select', { roomId: state.roomId, role: get().desiredRole });
      }

      if (
        state.phase === 'LOBBY' &&
        me?.role &&
        me.ready &&
        get().autoStartDesignPending &&
        state.hostId === socket.id
      ) {
        set({ autoStartDesignPending: false });
        socket.emit('room:start', { roomId: state.roomId });
      }
    });

    socket.on('design:advisor_feedback', (messages: string[]) => {
      for (const message of messages.slice(0, 3)) {
        get().notify(message, 'info');
      }
    });

    socket.on('flight:tick_asym', (payload: AsymmetricFlightPayload) => {
      set({
        flight: payload,
        phase: 'FLIGHT',
        hasRoom: true,
        myRole: payload.role,
      });
    });

    socket.on('flight:crisis_alert', (alert: FlightCrisisAlert) => {
      set({ crisisAlert: alert });
      get().notify(`Crisis en vuelo: ${alert.title}`, 'warning');
    });

    socket.on('mission:report_ready', (report: MissionReport) => {
      set({ report, phase: 'REPORT', hasRoom: true });
      get().notify('Informe de auditoría post-misión listo.', 'success');
    });

    socket.on('server:error', (error) => {
      get().notify(error.message, 'error');
      if (get().phase === 'FLIGHT' && !get().flight) {
        set({ phase: 'DESIGN' });
      }
    });

    socket.on('connect_error', () => {
      if (!get().localMode) {
        set({ localMode: true, connected: false });
        if (!offlineNotified) {
          offlineNotified = true;
          get().notify(
            'Centro de control no disponible: catálogos locales y simulación offline activos.',
            'warning',
          );
        }
      }
    });

    window.setTimeout(() => {
      if (!get().connected) {
        set({ localMode: true });
      }
    }, 3000);
  },

  startMission: (input) => {
    const mission =
      getCatalogMission(input.missionId) ?? get().missions[0] ?? CATALOG_MISSIONS[0];
    if (!mission) {
      get().notify('No hay escenarios de misión disponibles.', 'error');
      return;
    }
    clearLocalFlight();
    const soloMode = (input.gameMode ?? 'SOLO') === 'SOLO';
    const socket = get().socket;
    set({
      playerName: input.playerName,
      difficulty: input.difficulty,
      missionId: mission.id,
      desiredRole: input.role,
      myRole: input.role,
      autoRolePending: true,
      autoStartDesignPending: Boolean(
        soloMode && socket && get().connected && !get().localMode,
      ),
      hasRoom: false,
      showHome: false,
      phase: 'LOBBY',
      roomState: null,
      flight: null,
      crisisAlert: null,
      report: null,
      gameMode: input.gameMode ?? 'SOLO',
    });

    if (socket && get().connected && !get().localMode) {
      socket.emit('room:create', {
        playerName: input.playerName,
        difficulty: input.difficulty,
        missionId: mission.id,
      });
      return;
    }

    if (socket && !get().localMode && !get().connected) {
      get().notify('Conectando con el centro de control…', 'info');
      window.setTimeout(() => get().startMission(input), 900);
      return;
    }

    const room = makeLocalRoom(
      mission,
      input.difficulty,
      input.playerName,
      input.role,
    );
    get()._applyRoomState(room);
    set({ localMode: true, autoRolePending: false });
    if (soloMode) get().beginDesign();
    get().notify('Sesión local iniciada con los catálogos de /data.', 'info');
  },

  joinRoom: (roomId, playerName) => {
    const name = playerName ?? get().playerName;
    if (!name.trim()) {
      get().notify('Introduce tu nombre antes de unirte a una sala.', 'error');
      return;
    }
    const socket = get().socket;
    if (!socket || !get().connected || get().localMode) {
      get().notify(
        'Para unirte a una sala necesitas conexión con el centro de control.',
        'error',
      );
      return;
    }
    set({
      playerName: name,
      autoRolePending: false,
      autoStartDesignPending: false,
      showHome: false,
      flight: null,
      crisisAlert: null,
      report: null,
    });
    socket.emit('room:join', { roomId, playerName: name });
  },

  leaveRoom: () => {
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode && get().hasRoom) {
      socket.emit('room:leave', { roomId });
    }
    clearLocalFlight();
    set({
      hasRoom: false,
      roomState: null,
      phase: 'LOBBY',
      myRole: null,
      autoStartDesignPending: false,
      selectedModules: [],
      telemetry: null,
      audit: null,
      activeVote: null,
      flight: null,
      crisisAlert: null,
      report: null,
      gameMode: 'SOLO',
    });
  },

  beginDesign: () => {
    const roomState = get().roomState;
    if (!roomState) return;
    const socket = get().socket;
    if (socket && get().connected && !get().localMode) {
      socket.emit('room:start', { roomId: roomState.roomId });
      return;
    }
    get()._applyRoomState({ ...roomState, phase: 'DESIGN' });
    get().notify('Mesa de diseño MDL abierta.', 'success');
  },

  repeatMission: () => {
    const state = get();
    state.startMission({
      playerName: state.playerName || 'Operador local',
      difficulty: state.difficulty,
      missionId: state.missionId,
      role: state.desiredRole,
    });
  },

  resetSession: () => {
    clearLocalFlight();
    set({
      showHome: false,
      hasRoom: false,
      roomId: 'LOCAL-ROOM',
      playerName: '',
      missionId: CATALOG_MISSIONS[0]?.id ?? 'leo-earth-observation',
      desiredRole: 'PROPULSION',
      autoRolePending: false,
      autoStartDesignPending: false,
      phase: 'LOBBY',
      roomState: null,
      myRole: null,
      flight: null,
      crisisAlert: null,
      report: null,
      selectedModules: [],
      telemetry: null,
      audit: null,
      activeVote: null,
      mission: null,
      gameMode: 'SOLO',
    });
  },

  selectRole: (role) => {
    set({ myRole: role, desiredRole: role });
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode && get().hasRoom) {
      socket.emit('role:select', { roomId, role });
      return;
    }
    const roomState = get().roomState;
    if (!roomState) return;
    const players = roomState.players.map((player) =>
      player.id === 'local' ? { ...player, role, ready: true } : player,
    );
    get()._applyRoomState({ ...roomState, players });
    if (localFlightState) {
      localFlightState = { ...localFlightState, role };
      set({ flight: buildLocalPayload(localFlightState) });
    }
  },

  setDifficulty: (difficulty) => {
    set({ difficulty });
    const roomState = get().roomState;
    if (roomState && get().localMode) {
      get()._applyRoomState({ ...roomState, difficulty });
    }
  },

  proposeModule: (moduleId, action) => {
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode) {
      socket.emit('design:propose_module', { roomId, moduleId, action });
      return;
    }
    const roomState = get().roomState;
    if (!roomState) return;
    const catalog = get().modules.length ? get().modules : CATALOG_MODULES;
    const module = catalog.find((item) => item.id === moduleId);
    if (!module) return;
    let selected = [...roomState.selectedModules];
    if (action === 'ADD') {
      if (selected.some((item) => item.id === moduleId)) return;
      selected.push(module);
    } else {
      selected = selected.filter((item) => item.id !== moduleId);
    }
    get()._applyRoomState({ ...roomState, selectedModules: selected, activeVote: null });
    get()._recalcLocal();
    get().notify(
      `${module.name} ${action === 'ADD' ? 'añadido' : 'retirado'} (modo local).`,
      'info',
    );
  },

  vote: (voteId, approve) => {
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode) {
      socket.emit('design:vote', { roomId, voteId, approve });
      return;
    }
    const roomState = get().roomState;
    if (roomState) get()._applyRoomState({ ...roomState, activeVote: null });
  },

  launch: () => {
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode) {
      set({ phase: 'FLIGHT', flight: null, crisisAlert: null, report: null });
      socket.emit('mission:launch', { roomId });
      return;
    }

    const roomState = get().roomState;
    if (!roomState) return;
    if (!roomState.audit.canLaunch) {
      get().notify('Lanzamiento bloqueado: corrige los bloqueos duros.', 'error');
      return;
    }
    clearLocalFlight();
    const role = get().myRole ?? roomState.players[0]?.role ?? 'PROPULSION';
    localFlightState = createLocalFlight({
      mission: roomState.mission,
      modules: roomState.selectedModules,
      telemetry: roomState.telemetry,
      role,
    });
    set({
      phase: 'FLIGHT',
      flight: null,
      crisisAlert: null,
      report: null,
      myRole: role,
    });
    if (localFlightState) {
      set({ flight: buildLocalPayload(localFlightState) });
    }
    get().notify('Secuencia de lanzamiento validada (modo offline).', 'success');

    localFlightTimer = window.setInterval(() => {
      if (!localFlightState) return;
      const result = advanceLocalFlight(localFlightState, Date.now());
      localFlightState = result.state;
      if (result.crisisStarted) {
        const alert = buildCrisisAlert(localFlightState);
        if (alert) {
          set({ crisisAlert: alert });
          get().notify(`Crisis en vuelo: ${alert.title}`, 'warning');
        }
      }
      const payload = buildLocalPayload(localFlightState);
      set({ flight: payload });
      if (result.completed) {
        const report = buildLocalReport(localFlightState, get().roomId);
        const currentRoom = get().roomState;
        clearLocalFlight();
        if (currentRoom) {
          get()._applyRoomState({ ...currentRoom, phase: 'REPORT' });
        }
        set({ report, phase: 'REPORT' });
        get().notify('Informe de auditoría post-misión listo.', 'success');
      }
    }, 1000);
  },

  solvePuzzle: (puzzleId, answer) => {
    const actionType: FlightActionType = 'SOLVE_PUZZLE';
    if (localFlightState) {
      try {
        localFlightState = applyLocalAction(localFlightState, actionType, {
          puzzleId,
          answer,
        });
        set({ flight: buildLocalPayload(localFlightState) });
        get().notify('Acertijo resuelto: la crisis queda controlada.', 'success');
      } catch (error) {
        get().notify(error instanceof Error ? error.message : 'Acción no válida.', 'error');
      }
      return;
    }
    const socket = get().socket;
    if (socket && get().connected) {
      socket.emit('flight:action', {
        roomId: get().roomId,
        actionType,
        payload: { puzzleId, answer },
      });
    }
  },

  toggleSensor: (moduleId, enabled) => {
    const actionType: FlightActionType = 'TOGGLE_SENSOR';
    if (localFlightState) {
      try {
        localFlightState = applyLocalAction(localFlightState, actionType, {
          moduleId,
          enabled,
        });
        set({ flight: buildLocalPayload(localFlightState) });
        get().notify(
          `${moduleId} ${enabled ? 'activado' : 'en espera'}.`,
          enabled ? 'success' : 'warning',
        );
      } catch (error) {
        get().notify(error instanceof Error ? error.message : 'Acción no válida.', 'error');
      }
      return;
    }
    const socket = get().socket;
    if (socket && get().connected) {
      socket.emit('flight:action', {
        roomId: get().roomId,
        actionType,
        payload: { moduleId, enabled },
      });
    }
  },

  execDecision: (moduleId) => {
    const actionType: FlightActionType = 'EXEC_DECISION';
    if (localFlightState) {
      try {
        localFlightState = applyLocalAction(localFlightState, actionType, {
          decision: 'SACRIFICE_EXPERIMENT',
          moduleId,
        });
        set({ flight: buildLocalPayload(localFlightState) });
        get().notify('Experimento sacrificado para salvar la nave.', 'warning');
      } catch (error) {
        get().notify(error instanceof Error ? error.message : 'Acción no válida.', 'error');
      }
      return;
    }
    const socket = get().socket;
    if (socket && get().connected) {
      socket.emit('flight:action', {
        roomId: get().roomId,
        actionType,
        payload: { decision: 'SACRIFICE_EXPERIMENT', moduleId },
      });
    }
  },

  setViewTab: (tab) => set({ viewTab: tab }),
  setBlueprintView: (view) => set({ blueprintView: view }),
}));
