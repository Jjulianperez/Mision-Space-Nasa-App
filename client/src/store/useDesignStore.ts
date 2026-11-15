import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
  ModuleItem,
  MissionConfig,
  TelemetryMetrics,
  PrelaunchAudit,
  ActiveVote,
  DifficultyMode,
  GamePhase,
  RoleType,
  ModuleCategory,
  ModuleAction,
  AuditIssue,
} from '@shared/types';

// ---- Local fallback catalog (mirrors data/missions.json + data/modules.json) ----
const LOCAL_MISSION: MissionConfig = {
  id: 'leo-earth-observation',
  title: 'Observación de la Tierra',
  orbitType: 'LEO',
  budgetMillions: 1500,
  maxLauncherMassKg: 900,
  targetSciencePoints: 45,
  requiredDownlinkRatio: 0.75,
  groundStationId: 'leo-ground-station',
  realNasaReference: {
    missionName: 'PUNCH',
    summary: 'Misión de heliofísica que observa el viento solar desde una constelación en órbita terrestre baja.',
    engineeringLesson: 'Coordinar múltiples plataformas y combinar observaciones para estudiar un fenómeno a gran escala.',
    sourceUrl: 'https://science.nasa.gov/mission/punch/',
  },
};

const LOCAL_MODULES: ModuleItem[] = [
  { id: 'EST-01', name: 'Estructura compacta', category: 'EST', allowedRole: 'PROPULSION', costMillions: 90, massKg: 180, powerKw: 0, dataGenMbps: 0, dataDownlinkMbps: 0, sciencePoints: 0, riskModifier: -2, apprenticeTip: 'Una estructura ligera deja más margen de masa para los instrumentos.' },
  { id: 'EST-02', name: 'Estructura reforzada', category: 'EST', allowedRole: 'PROPULSION', costMillions: 150, massKg: 360, powerKw: 0, dataGenMbps: 0, dataDownlinkMbps: 0, sciencePoints: 0, riskModifier: -8, apprenticeTip: 'La estructura reforzada reduce el riesgo, pero usa más masa.' },
  { id: 'EST-03', name: 'Etapa de transferencia', category: 'EST', allowedRole: 'PROPULSION', costMillions: 240, massKg: 260, powerKw: 4, dataGenMbps: 0, dataDownlinkMbps: 0, sciencePoints: 0, riskModifier: 2, requiresModuleId: 'EST-01', apprenticeTip: 'Esta etapa ayuda a completar maniobras de transferencia, con consumo y masa adicionales.' },
  { id: 'SCI-01', name: 'Cámara multiespectral', category: 'SCI', allowedRole: 'SCIENCE', costMillions: 110, massKg: 45, powerKw: 3, dataGenMbps: 8, dataDownlinkMbps: 0, sciencePoints: 18, riskModifier: 1, apprenticeTip: 'La cámara obtiene imágenes en varias bandas para comparar regiones.' },
  { id: 'SCI-02', name: 'Magnetómetro', category: 'SCI', allowedRole: 'SCIENCE', costMillions: 85, massKg: 28, powerKw: 2, dataGenMbps: 3, dataDownlinkMbps: 0, sciencePoints: 14, riskModifier: -1, apprenticeTip: 'El magnetómetro mide el entorno magnético con bajo consumo de datos.' },
  { id: 'SCI-03', name: 'Espectrómetro', category: 'SCI', allowedRole: 'SCIENCE', costMillions: 160, massKg: 62, powerKw: 5, dataGenMbps: 16, dataDownlinkMbps: 0, sciencePoints: 24, riskModifier: 2, apprenticeTip: 'El espectrómetro revela la composición de materiales y genera más datos.' },
  { id: 'SCI-04', name: 'Sismómetro', category: 'SCI', allowedRole: 'SCIENCE', costMillions: 120, massKg: 54, powerKw: 4, dataGenMbps: 6, dataDownlinkMbps: 0, sciencePoints: 20, riskModifier: 1, requiresModuleId: 'EST-02', apprenticeTip: 'El sismómetro estudia vibraciones y requiere una estructura estable.' },
  { id: 'SCI-05', name: 'Telescopio infrarrojo', category: 'SCI', allowedRole: 'SCIENCE', costMillions: 280, massKg: 125, powerKw: 8, dataGenMbps: 20, dataDownlinkMbps: 0, sciencePoints: 34, riskModifier: 4, slotsRequired: 2, apprenticeTip: 'El telescopio aporta muchos puntos científicos y ocupa dos espacios.' },
  { id: 'COM-01', name: 'Panel solar desplegable', category: 'COM', allowedRole: 'COMMS', costMillions: 130, massKg: 70, powerKw: -18, dataGenMbps: 0, dataDownlinkMbps: 0, sciencePoints: 0, riskModifier: -1, apprenticeTip: 'Los paneles generan energía; su potencia aparece como un valor negativo.' },
  { id: 'COM-02', name: 'Antena de alta ganancia', category: 'COM', allowedRole: 'COMMS', costMillions: 100, massKg: 42, powerKw: 2, dataGenMbps: 0, dataDownlinkMbps: 18, sciencePoints: 0, riskModifier: 0, apprenticeTip: 'La antena aumenta la capacidad para enviar datos a las estaciones terrestres.' },
  { id: 'COM-03', name: 'Transmisor de banda profunda', category: 'COM', allowedRole: 'COMMS', costMillions: 175, massKg: 58, powerKw: 4, dataGenMbps: 0, dataDownlinkMbps: 30, sciencePoints: 0, riskModifier: 1, apprenticeTip: 'El transmisor aumenta la capacidad de bajada en misiones lejanas.' },
];

// ---- Helpers ----
export type ToastTone = 'success' | 'warning' | 'error' | 'info';
export interface ToastItem { id: number; message: string; tone: ToastTone; }

function computeTelemetry(selected: ModuleItem[], mission: MissionConfig): TelemetryMetrics {
  const budgetSpent = selected.reduce((s, m) => s + m.costMillions, 0);
  const budgetRemaining = mission.budgetMillions - budgetSpent;
  const totalMassKg = selected.reduce((s, m) => s + m.massKg, 0);
  const massPercentage = (totalMassKg / mission.maxLauncherMassKg) * 100;
  const powerConsumedKw = selected.filter(m => m.powerKw > 0).reduce((s, m) => s + m.powerKw, 0);
  const powerGeneratedKw = Math.abs(selected.filter(m => m.powerKw < 0).reduce((s, m) => s + m.powerKw, 0));
  const propulsiveEfficiency = 100 - (totalMassKg / mission.maxLauncherMassKg) * 25;
  const totalDataGenerated = selected.reduce((s, m) => s + m.dataGenMbps, 0);
  const totalDownlinkCapacity = selected.reduce((s, m) => s + m.dataDownlinkMbps, 0);
  const riskBase = selected.reduce((s, m) => s + m.riskModifier, 0);
  const structuralRisk = Math.max(0, Math.min(100, riskBase + (massPercentage > 90 ? 12 : 0) + (massPercentage > 95 ? 5 : 0)));
  const projectedSciencePoints = selected.reduce((s, m) => s + m.sciencePoints, 0);
  const warnings: string[] = [];
  if (totalMassKg > mission.maxLauncherMassKg) warnings.push('Masa supera el límite del lanzador');
  else if (massPercentage > 90) warnings.push('Masa >90%: riesgo en Max-Q');
  if (budgetRemaining < 0) warnings.push('Presupuesto excedido');
  if (powerConsumedKw > powerGeneratedKw && powerGeneratedKw > 0) warnings.push('Déficit de energía');
  if (totalDataGenerated > totalDownlinkCapacity && totalDownlinkCapacity > 0) warnings.push('Ancho de banda saturado');
  if (projectedSciencePoints < mission.targetSciencePoints) warnings.push('Objetivo científico insuficiente');
  return {
    budgetSpent, budgetRemaining, totalMassKg, massPercentage,
    powerGeneratedKw, powerConsumedKw, propulsiveEfficiency,
    totalDataGenerated, totalDownlinkCapacity, structuralRisk,
    projectedSciencePoints, warnings,
  };
}

function computeAudit(selected: ModuleItem[], mission: MissionConfig, telemetry: TelemetryMetrics): PrelaunchAudit {
  const warnings: AuditIssue[] = [];
  const blocks: AuditIssue[] = [];
  if (telemetry.budgetRemaining < 0) blocks.push({ code: 'BUDGET', message: 'Presupuesto excedido', severity: 'BLOCK' });
  if (telemetry.totalMassKg > mission.maxLauncherMassKg) blocks.push({ code: 'MASS', message: 'Masa supera el límite del lanzador', severity: 'BLOCK' });
  if (telemetry.massPercentage > 90 && telemetry.totalMassKg <= mission.maxLauncherMassKg) warnings.push({ code: 'MASS_TIGHT', message: 'Masa >90%: riesgo en Max-Q', severity: 'WARNING' });
  if (telemetry.powerConsumedKw > telemetry.powerGeneratedKw) warnings.push({ code: 'POWER', message: 'Déficit de energía', severity: 'WARNING' });
  if (telemetry.totalDataGenerated > telemetry.totalDownlinkCapacity) warnings.push({ code: 'BANDWIDTH', message: 'Ancho de banda saturado', severity: 'WARNING' });
  if (telemetry.projectedSciencePoints < mission.targetSciencePoints) warnings.push({ code: 'SCIENCE', message: 'Objetivo científico insuficiente', severity: 'WARNING' });
  const scienceBaySlotsUsed = selected.filter(m => m.category === 'SCI').reduce((s, m) => s + (m.slotsRequired ?? 1), 0);
  return { canLaunch: blocks.length === 0, warnings, blocks, telemetry, scienceBaySlotsUsed };
}

function makeLocalRoom(mission: MissionConfig, modules: ModuleItem[]): RoomState {
  const selected: ModuleItem[] = [];
  return {
    roomId: 'LOCAL-ROOM',
    hostId: 'local',
    difficulty: 'APPRENTICE',
    phase: 'DESIGN',
    mission,
    players: [{ id: 'local', name: 'Operador local', role: 'PROPULSION', ready: true }],
    selectedModules: selected,
    telemetry: computeTelemetry(selected, mission),
    activeVote: null,
    audit: computeAudit(selected, mission, computeTelemetry(selected, mission)),
  };
}

let designStartEmitted = false;
let roleSelectEmitted = false;

// ---- Store ----
interface DesignStore {
  // connection
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;
  localMode: boolean;
  // room
  roomId: string;
  playerName: string;
  difficulty: DifficultyMode;
  phase: GamePhase;
  roomState: RoomState | null;
  // ui
  myRole: RoleType | null;
  viewTab: 'EST' | 'SCI' | 'COM' | 'debate';
  blueprintView: number; // 0 VAB, 1 payload, 2 conops
  toasts: ToastItem[];
  toastSeq: number;
  // derived helpers
  mission: MissionConfig | null;
  modules: ModuleItem[];
  selectedModules: ModuleItem[];
  telemetry: TelemetryMetrics | null;
  audit: PrelaunchAudit | null;
  activeVote: ActiveVote | null;
  // actions
  connect: () => void;
  createRoom: (playerName?: string, difficulty?: DifficultyMode, missionId?: string) => void;
  joinRoom: (roomId: string, playerName?: string) => void;
  selectRole: (role: RoleType) => void;
  setDifficulty: (d: DifficultyMode) => void;
  proposeModule: (moduleId: string, action: ModuleAction) => void;
  vote: (voteId: string, approve: boolean) => void;
  launch: () => void;
  setViewTab: (t: 'EST' | 'SCI' | 'COM' | 'debate') => void;
  setBlueprintView: (v: number) => void;
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  // local apply
  _applyRoomState: (state: RoomState) => void;
  _recalcLocal: () => void;
}

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';

export const useDesignStore = create<DesignStore>()((set, get) => ({
  socket: null,
  connected: false,
  localMode: false,
  roomId: 'LOCAL-ROOM',
  playerName: 'Operador local',
  difficulty: 'APPRENTICE',
  phase: 'DESIGN',
  roomState: null,
  myRole: null,
  viewTab: 'EST',
  blueprintView: 0,
  toasts: [],
  toastSeq: 0,
  mission: null,
  modules: LOCAL_MODULES,
  selectedModules: [],
  telemetry: null,
  audit: null,
  activeVote: null,

  notify: (message, tone = 'info') => {
    const id = get().toastSeq + 1;
    set({ toastSeq: id, toasts: [...get().toasts.slice(-3), { id, message, tone }] });
    window.setTimeout(() => get().dismissToast(id), 4600);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),

  _applyRoomState: (state) => {
    set({
      roomState: state,
      phase: state.phase,
      difficulty: state.difficulty,
      roomId: state.roomId,
      mission: state.mission,
      selectedModules: state.selectedModules,
      telemetry: state.telemetry,
      activeVote: state.activeVote,
      audit: state.audit,
      myRole: state.players.find(p => p.id === state.hostId)?.role ?? state.players[0]?.role ?? null,
    });
  },

  _recalcLocal: () => {
    const rs = get().roomState;
    if (!rs) return;
    const telemetry = computeTelemetry(rs.selectedModules, rs.mission);
    const audit = computeAudit(rs.selectedModules, rs.mission, telemetry);
    const next: RoomState = { ...rs, telemetry, audit };
    get()._applyRoomState(next);
  },

  connect: () => {
    if (get().socket) return;
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'], timeout: 3000, reconnectionAttempts: 2 });
    set({ socket });

    socket.on('connect', () => {
      set({ connected: true });
      get().notify('Conectado al servidor de misión.', 'success');
      get().createRoom();
      fetch('/api/catalogs')
        .then(r => r.json())
        .then((data: { modules?: ModuleItem[] }) => {
          if (data?.modules?.length) set({ modules: data.modules });
        })
        .catch(() => { /* keep local modules */ });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('room:state_update', (state: RoomState) => {
      get()._applyRoomState(state);
      const me = state.players.find(p => p.id === socket.id);
      if (state.phase === 'LOBBY' && me && me.role === null && !roleSelectEmitted) {
        roleSelectEmitted = true;
        socket.emit('role:select', { roomId: state.roomId, role: 'PROPULSION' });
      }
      if (state.phase === 'LOBBY' && me && me.role !== null && me.ready && !designStartEmitted) {
        designStartEmitted = true;
        socket.emit('room:start', { roomId: state.roomId });
      }
    });

    socket.on('server:error', (err) => {
      get().notify(err.message, 'error');
    });

    socket.on('connect_error', (err) => {
      if (!get().localMode && !get().roomState) {
        set({ localMode: true, connected: false });
        const rs = makeLocalRoom(LOCAL_MISSION, LOCAL_MODULES);
        get()._applyRoomState(rs);
        get().notify('Servidor no disponible: modo local activo con datos de demostración.', 'warning');
      }
    });

    window.setTimeout(() => {
      if (!get().connected && !get().roomState) {
        set({ localMode: true });
        const rs = makeLocalRoom(LOCAL_MISSION, LOCAL_MODULES);
        get()._applyRoomState(rs);
        get().notify('Modo local activo (sin backend).', 'info');
      }
    }, 3000);
  },

  createRoom: (playerName, difficulty, missionId) => {
    const name = playerName ?? get().playerName;
    const diff = difficulty ?? get().difficulty;
    const mid = missionId ?? 'leo-earth-observation';
    set({ playerName: name, difficulty: diff });
    const socket = get().socket;
    if (socket && get().connected) {
      socket.emit('room:create', { roomId: undefined as unknown as string, playerName: name, difficulty: diff, missionId: mid });
    } else {
      // local
      const mission = LOCAL_MISSION;
      const rs = makeLocalRoom(mission, LOCAL_MODULES);
      rs.difficulty = diff;
      rs.players = [{ id: 'local', name, role: 'PROPULSION', ready: true }];
      get()._applyRoomState(rs);
      get().notify('Sala local creada.', 'info');
    }
  },

  joinRoom: (roomId, playerName) => {
    const name = playerName ?? get().playerName;
    set({ playerName: name, roomId });
    const socket = get().socket;
    if (socket && get().connected) {
      socket.emit('room:join', { roomId, playerName: name });
    } else {
      const rs = makeLocalRoom(LOCAL_MISSION, LOCAL_MODULES);
      rs.roomId = roomId;
      rs.players = [{ id: 'local', name, role: 'PROPULSION', ready: true }];
      get()._applyRoomState(rs);
    }
  },

  selectRole: (role) => {
    set({ myRole: role });
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode) {
      socket.emit('role:select', { roomId, role });
    } else {
      const rs = get().roomState;
      if (!rs) return;
      const players = rs.players.map(p => p.id === 'local' ? { ...p, role } : p);
      get()._applyRoomState({ ...rs, players });
    }
  },

  setDifficulty: (d) => {
    set({ difficulty: d });
    const rs = get().roomState;
    if (rs && get().localMode) {
      get()._applyRoomState({ ...rs, difficulty: d });
    }
  },

  proposeModule: (moduleId, action) => {
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode) {
      socket.emit('design:propose_module', { roomId, moduleId, action });
    } else {
      // local: apply directly
      const rs = get().roomState;
      if (!rs) return;
      const mod = (get().modules.length ? get().modules : LOCAL_MODULES).find(m => m.id === moduleId);
      if (!mod) return;
      let selected = [...rs.selectedModules];
      if (action === 'ADD') {
        if (selected.some(m => m.id === moduleId)) return;
        selected.push(mod);
      } else {
        selected = selected.filter(m => m.id !== moduleId);
      }
      get()._applyRoomState({ ...rs, selectedModules: selected, activeVote: null });
      get()._recalcLocal();
      get().notify(`${mod.name} ${action === 'ADD' ? 'añadido' : 'retirado'} (modo local).`, 'info');
    }
  },

  vote: (voteId, approve) => {
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode) {
      socket.emit('design:vote', { roomId, voteId, approve });
    } else {
      // local: clear active vote
      const rs = get().roomState;
      if (rs) get()._applyRoomState({ ...rs, activeVote: null });
    }
  },

  launch: () => {
    const socket = get().socket;
    const roomId = get().roomId;
    if (socket && get().connected && !get().localMode) {
      socket.emit('mission:launch', { roomId });
    } else {
      const audit = get().audit;
      if (audit && !audit.canLaunch) {
        get().notify('Lanzamiento bloqueado: corrige los bloqueos duros.', 'error');
        return;
      }
      set({ phase: 'FLIGHT' });
      get().notify('Secuencia de lanzamiento validada (modo local).', 'success');
    }
  },

  setViewTab: (t) => set({ viewTab: t }),
  setBlueprintView: (v) => set({ blueprintView: v }),
}));

// auto-connect on import
if (typeof window !== 'undefined') {
  setTimeout(() => useDesignStore.getState().connect(), 0);
}
