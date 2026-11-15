import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type {
  ActiveVote,
  AsymmetricFlightPayload,
  ClientToServerEvents,
  DifficultyMode,
  FlightActionType,
  FlightCrisisAlert,
  GameMode,
  GamePhase,
  MissionConfig,
  MissionReport,
  ModuleAction,
  ModuleItem,
  Player,
  PrelaunchAudit,
  RoleType,
  RoomState,
  ServerToClientEvents,
  TelemetryMetrics,
} from '@shared/types';
import { CATALOG_MISSIONS, CATALOG_MODULES } from '../data/catalogs';
import { auditPreLaunch, getAdvisorFeedback, getProposalBlocker } from '../lib/localEngine';
import {
  advanceLocalFlight,
  applyLocalAction,
  buildCrisisAlert,
  buildLocalPayload,
  buildLocalReport,
  createLocalFlight,
  type LocalFlightState,
} from '../lib/localFlight';

export type ToastTone = 'success' | 'warning' | 'error' | 'info';
export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

/** Estado del enlace con el backend, independiente de si la partida actual es local. */
export type LinkStatus = 'connecting' | 'online' | 'offline';

export interface StartMissionInput {
  playerName: string;
  difficulty: DifficultyMode;
  missionId: string;
  role: RoleType;
  gameMode?: GameMode;
}

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const LOCAL_ROOM_ID = 'LOCAL-ROOM';
const LOCAL_PLAYER_ID = 'local';
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';
const CONNECT_TIMEOUT_MS = 3000;
const TOAST_DURATION_MS = 5200;
const DEFAULT_MISSION_ID = CATALOG_MISSIONS[0]?.id ?? 'leo-earth-observation';

function makeLocalRoom(
  mission: MissionConfig,
  difficulty: DifficultyMode,
  playerName: string,
  role: RoleType,
): RoomState {
  const selectedModules: ModuleItem[] = [];
  const audit = auditPreLaunch(mission, selectedModules);
  const player: Player = { id: LOCAL_PLAYER_ID, name: playerName, role, ready: true };
  return {
    roomId: LOCAL_ROOM_ID,
    hostId: LOCAL_PLAYER_ID,
    difficulty,
    phase: 'LOBBY',
    mission,
    players: [player],
    selectedModules,
    telemetry: audit.telemetry,
    activeVote: null,
    audit,
  };
}

/** Avisos derivados de cómo cambia la consola de un rol entre dos ticks de vuelo. */
function describeFlightTransition(
  previous: AsymmetricFlightPayload | null,
  next: AsymmetricFlightPayload,
): { message: string; tone: ToastTone; resolved: boolean } | null {
  // Al cambiar de consola el payload es de otro rol: comparar no tendría sentido.
  if (!previous || previous.role !== next.role) return null;

  const hadTask =
    previous.role === 'PROPULSION'
      ? previous.repairPuzzle !== null
      : previous.role === 'SCIENCE'
        ? previous.calibrationPuzzle !== null
        : previous.role === 'DIRECTOR'
          ? previous.crisisDecisionAvailable
          : false;
  const hasTask =
    next.role === 'PROPULSION'
      ? next.repairPuzzle !== null
      : next.role === 'SCIENCE'
        ? next.calibrationPuzzle !== null
        : next.role === 'DIRECTOR'
          ? next.crisisDecisionAvailable
          : false;

  if (!hadTask && hasTask) {
    return {
      message:
        next.role === 'DIRECTOR'
          ? 'Decisión ejecutiva disponible en tu consola.'
          : 'Tarea crítica asignada a tu consola: resuelve el acertijo.',
      tone: 'warning',
      resolved: false,
    };
  }
  if (hadTask && !hasTask) {
    return { message: 'Crisis controlada: la nave vuelve a estar estable.', tone: 'success', resolved: true };
  }
  return null;
}

let localFlightState: LocalFlightState | null = null;
let localFlightTimer: number | null = null;
let offlineNotified = false;
/** Invalida los arranques de misión que seguían esperando al enlace. */
let startRequestId = 0;

function clearLocalFlight(): void {
  if (localFlightTimer !== null) {
    window.clearInterval(localFlightTimer);
    localFlightTimer = null;
  }
  localFlightState = null;
}

/** Campos que describen la partida en curso; se limpian al salir de ella. */
const EMPTY_SESSION = {
  hasRoom: false,
  localMode: false,
  roomId: LOCAL_ROOM_ID,
  roomState: null,
  phase: 'LOBBY' as GamePhase,
  myRole: null,
  autoRolePending: false,
  autoStartDesignPending: false,
  mission: null,
  selectedModules: [] as ModuleItem[],
  telemetry: null,
  audit: null,
  activeVote: null,
  advisorFeedback: [] as string[],
  flight: null,
  crisisAlert: null,
  crisisResolved: false,
  report: null,
};

interface DesignStore {
  // connection
  socket: GameSocket | null;
  linkStatus: LinkStatus;
  /** La partida en curso se simula en este navegador, sin backend. */
  localMode: boolean;
  gameMode: GameMode;
  // flow
  showHome: boolean;
  hasRoom: boolean;
  /** Aumenta cuando el servidor rechaza una petición; permite a las vistas dejar de esperar. */
  sessionErrorSeq: number;
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
  crisisResolved: boolean;
  report: MissionReport | null;
  // ui
  myRole: RoleType | null;
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
  advisorFeedback: string[];
  // navigation
  openHome: () => void;
  openLobby: () => void;
  // session
  connect: () => void;
  retryConnection: () => void;
  startMission: (input: StartMissionInput) => void;
  joinRoom: (roomId: string, playerName?: string) => void;
  leaveRoom: () => void;
  beginDesign: () => void;
  repeatMission: () => void;
  selectRole: (role: RoleType) => void;
  // design
  proposeModule: (moduleId: string, action: ModuleAction) => void;
  vote: (voteId: string, approve: boolean) => void;
  launch: () => void;
  // flight
  solvePuzzle: (puzzleId: string, answer: string) => void;
  toggleSensor: (moduleId: string, enabled: boolean) => void;
  execDecision: (moduleId: string) => void;
  // ui
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

export const useDesignStore = create<DesignStore>()((set, get) => {
  /** Socket utilizable para la partida en curso (o para crear una nueva). */
  const onlineSocket = (): GameSocket | null => {
    const { socket, linkStatus, localMode } = get();
    return socket && linkStatus === 'online' && !localMode ? socket : null;
  };

  const isSoloSession = (): boolean => {
    const { localMode, roomState } = get();
    return localMode || (roomState?.players.length ?? 1) <= 1;
  };

  const applyRoomState = (state: RoomState): void => {
    const myId = get().localMode ? LOCAL_PLAYER_ID : get().socket?.id;
    const me = state.players.find((player) => player.id === myId);
    set({
      roomState: state,
      phase: state.phase,
      hasRoom: true,
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
  };

  /** Publica un tick de vuelo y avisa de las tareas que aparecen o se resuelven. */
  const applyFlightPayload = (payload: AsymmetricFlightPayload): void => {
    const startingFlight = get().phase !== 'FLIGHT';
    const transition = describeFlightTransition(startingFlight ? null : get().flight, payload);
    set({
      flight: payload,
      phase: 'FLIGHT',
      hasRoom: true,
      myRole: payload.role,
      ...(startingFlight ? { crisisAlert: null, crisisResolved: false, report: null } : {}),
      ...(transition?.resolved ? { crisisResolved: true } : {}),
    });
    // Quien recibió la alerta de crisis ya sabe que hay una tarea: no se le repite el aviso.
    if (transition && (transition.resolved || !get().crisisAlert)) {
      get().notify(transition.message, transition.tone);
    }
  };

  /** Abandona la partida en curso avisando al servidor si era una sala online. */
  const detachSession = (): void => {
    const socket = onlineSocket();
    if (socket && get().hasRoom) {
      socket.emit('room:leave', { roomId: get().roomId });
    }
    clearLocalFlight();
    set(EMPTY_SESSION);
  };

  /** Ejecuta `action` cuando el enlace deja de estar en «conectando». */
  const whenLinkSettles = (action: () => void): void => {
    if (get().linkStatus !== 'connecting') {
      action();
      return;
    }
    const unsubscribe = useDesignStore.subscribe((state) => {
      if (state.linkStatus !== 'connecting') {
        unsubscribe();
        action();
      }
    });
  };

  const startLocalSession = (input: StartMissionInput, mission: MissionConfig): void => {
    set({ localMode: true });
    applyRoomState(makeLocalRoom(mission, input.difficulty, input.playerName, input.role));
    get().beginDesign();
    get().notify('Sin centro de control: la misión se simula en este navegador.', 'info');
  };

  const runLocalFlightTick = (): void => {
    if (!localFlightState) return;
    const result = advanceLocalFlight(localFlightState, Date.now());
    localFlightState = result.state;
    if (result.crisisStarted) {
      const alert = buildCrisisAlert(localFlightState);
      if (alert) set({ crisisAlert: alert });
    }
    applyFlightPayload(buildLocalPayload(localFlightState));
    if (result.completed) {
      const report = buildLocalReport(localFlightState, get().roomId);
      const currentRoom = get().roomState;
      clearLocalFlight();
      if (currentRoom) applyRoomState({ ...currentRoom, phase: 'REPORT' });
      set({ report, phase: 'REPORT' });
      get().notify('Informe de auditoría post-misión listo.', 'success');
    }
  };

  /** Aplica una acción de vuelo en la simulación local o la envía al servidor. */
  const sendFlightAction = (
    actionType: FlightActionType,
    payload: Record<string, unknown>,
  ): void => {
    if (localFlightState) {
      try {
        localFlightState = applyLocalAction(localFlightState, actionType, payload);
        applyFlightPayload(buildLocalPayload(localFlightState));
      } catch (error) {
        get().notify(error instanceof Error ? error.message : 'Acción no válida.', 'error');
      }
      return;
    }
    onlineSocket()?.emit('flight:action', { roomId: get().roomId, actionType, payload });
  };

  return {
    socket: null,
    linkStatus: 'connecting',
    gameMode: 'SOLO',

    showHome: true,
    sessionErrorSeq: 0,

    playerName: '',
    difficulty: 'APPRENTICE',
    missionId: DEFAULT_MISSION_ID,
    desiredRole: 'PROPULSION',

    toasts: [],
    toastSeq: 0,

    missions: CATALOG_MISSIONS,
    modules: CATALOG_MODULES,

    ...EMPTY_SESSION,

    openHome: () => set({ showHome: true }),
    openLobby: () => set({ showHome: false }),

    notify: (message, tone = 'info') => {
      const id = get().toastSeq + 1;
      set({
        toastSeq: id,
        toasts: [...get().toasts.slice(-3), { id, message, tone }],
      });
      window.setTimeout(() => get().dismissToast(id), TOAST_DURATION_MS);
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),

    connect: () => {
      if (get().socket) return;
      const socket: GameSocket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        timeout: CONNECT_TIMEOUT_MS,
        reconnectionAttempts: 2,
      });
      set({ socket, linkStatus: 'connecting' });

      socket.on('connect', () => {
        const recovered = offlineNotified;
        offlineNotified = false;
        set({ linkStatus: 'online' });
        if (recovered) {
          get().notify('Enlace con el centro de control restablecido.', 'success');
        }
        fetch(`${SERVER_URL}/api/catalogs`)
          .then((response) => (response.ok ? response.json() : null))
          .then((data: { missions?: MissionConfig[]; modules?: ModuleItem[] } | null) => {
            if (data?.missions?.length) set({ missions: data.missions });
            if (data?.modules?.length) set({ modules: data.modules });
          })
          .catch(() => {
            /* se mantienen los catálogos locales de /data */
          });
      });

      socket.on('connect_error', () => {
        set({ linkStatus: 'offline' });
        if (!offlineNotified) {
          offlineNotified = true;
          get().notify(
            'Centro de control no disponible: puedes jugar en solitario con la simulación local.',
            'warning',
          );
        }
      });

      socket.on('disconnect', () => {
        // `active` indica que socket.io seguirá intentando reconectar por su cuenta.
        set({ linkStatus: socket.active ? 'connecting' : 'offline' });
        offlineNotified = true;
        const { hasRoom, localMode, phase } = get();
        if (!hasRoom || localMode) {
          get().notify('Se perdió el enlace con el centro de control.', 'warning');
          return;
        }
        // El servidor retira de la sala a quien se desconecta: la partida online terminó.
        if (phase === 'REPORT') {
          // El informe ya está completo en el cliente y no necesita al servidor.
          set({ localMode: true });
          return;
        }
        clearLocalFlight();
        set({ ...EMPTY_SESSION, showHome: false });
        get().notify(
          'Se perdió el enlace con el centro de control y la sala se cerró. Registra la misión de nuevo.',
          'error',
        );
      });

      socket.on('room:state_update', (state: RoomState) => {
        // Una partida local no debe verse alterada por estados que lleguen del servidor.
        if (get().localMode) return;
        applyRoomState(state);

        const me = state.players.find((player) => player.id === socket.id);
        if (state.phase !== 'LOBBY' || !me) {
          if (get().autoStartDesignPending) set({ autoStartDesignPending: false });
          return;
        }
        if (me.role === null && get().autoRolePending) {
          set({ autoRolePending: false });
          socket.emit('role:select', { roomId: state.roomId, role: get().desiredRole });
          return;
        }
        if (me.role && me.ready && get().autoStartDesignPending && state.hostId === socket.id) {
          socket.emit('room:start', { roomId: state.roomId });
        }
      });

      socket.on('design:advisor_feedback', (messages: string[]) => {
        set({ advisorFeedback: messages });
      });

      // Un evento de vuelo que seguía en tránsito al salir de la sala no debe reabrirla.
      const inOnlineRoom = (): boolean => get().hasRoom && !get().localMode;

      socket.on('flight:tick_asym', (payload: AsymmetricFlightPayload) => {
        if (inOnlineRoom()) applyFlightPayload(payload);
      });

      socket.on('flight:crisis_alert', (alert: FlightCrisisAlert) => {
        if (inOnlineRoom()) set({ crisisAlert: alert });
      });

      socket.on('mission:report_ready', (report: MissionReport) => {
        if (!inOnlineRoom()) return;
        set({ report, phase: 'REPORT' });
        get().notify('Informe de auditoría post-misión listo.', 'success');
      });

      socket.on('server:error', (error) => {
        set({
          sessionErrorSeq: get().sessionErrorSeq + 1,
          autoRolePending: false,
          autoStartDesignPending: false,
        });
        get().notify(error.message, 'error');
      });
    },

    retryConnection: () => {
      const socket = get().socket;
      if (!socket) {
        get().connect();
        return;
      }
      if (socket.connected) return;
      set({ linkStatus: 'connecting' });
      socket.connect();
    },

    startMission: (input) => {
      const mission = get().missions.find((item) => item.id === input.missionId);
      if (!mission) {
        get().notify('El escenario seleccionado ya no está disponible. Elige otra misión antes de continuar.', 'error');
        return;
      }
      const gameMode = input.gameMode ?? 'SOLO';
      const requestId = ++startRequestId;

      if (!get().socket) get().connect();
      detachSession();
      set({
        playerName: input.playerName,
        difficulty: input.difficulty,
        missionId: mission.id,
        desiredRole: input.role,
        gameMode,
        showHome: false,
      });

      whenLinkSettles(() => {
        // El usuario pudo iniciar otra misión o unirse a una sala mientras esperaba.
        if (requestId !== startRequestId) return;

        if (get().linkStatus === 'online') {
          set({ autoRolePending: true, autoStartDesignPending: gameMode === 'SOLO' });
          get().socket?.emit('room:create', {
            playerName: input.playerName,
            difficulty: input.difficulty,
            missionId: mission.id,
          });
          return;
        }
        if (gameMode === 'TEAM') {
          set({ sessionErrorSeq: get().sessionErrorSeq + 1 });
          get().notify(
            'El modo equipo necesita conexión con el centro de control. Reintenta la conexión o juega en solitario.',
            'error',
          );
          return;
        }
        startLocalSession(input, mission);
      });
    },

    joinRoom: (roomId, playerName) => {
      const name = (playerName ?? get().playerName).trim();
      if (!name) {
        get().notify('Escribe tu nombre antes de unirte a una sala.', 'error');
        return;
      }
      const requestId = ++startRequestId;

      if (!get().socket) get().connect();
      detachSession();
      set({ playerName: name, gameMode: 'TEAM', showHome: false });

      whenLinkSettles(() => {
        if (requestId !== startRequestId) return;
        if (get().linkStatus !== 'online') {
          set({ sessionErrorSeq: get().sessionErrorSeq + 1 });
          get().notify(
            'Para unirte a una sala necesitas conexión con el centro de control.',
            'error',
          );
          return;
        }
        get().socket?.emit('room:join', { roomId, playerName: name });
      });
    },

    leaveRoom: () => {
      startRequestId += 1;
      detachSession();
    },

    beginDesign: () => {
      const roomState = get().roomState;
      if (!roomState) return;
      const socket = onlineSocket();
      if (socket) {
        socket.emit('room:start', { roomId: roomState.roomId });
        return;
      }
      applyRoomState({ ...roomState, phase: 'DESIGN' });
    },

    repeatMission: () => {
      const state = get();
      state.startMission({
        playerName: state.playerName || 'Operador',
        difficulty: state.difficulty,
        missionId: state.missionId,
        role: state.desiredRole,
        gameMode: state.gameMode,
      });
    },

    selectRole: (role) => {
      set({ desiredRole: role });
      const socket = onlineSocket();
      if (socket && get().hasRoom) {
        // El rol activo lo confirma el servidor: puede rechazarlo si ya está ocupado.
        socket.emit('role:select', { roomId: get().roomId, role });
        return;
      }
      const roomState = get().roomState;
      if (!roomState) return;
      const players = roomState.players.map((player) =>
        player.id === LOCAL_PLAYER_ID ? { ...player, role, ready: true } : player,
      );
      applyRoomState({ ...roomState, players });
      if (localFlightState) {
        localFlightState = { ...localFlightState, role };
        applyFlightPayload(buildLocalPayload(localFlightState));
      }
    },

    proposeModule: (moduleId, action) => {
      const module = get().modules.find((item) => item.id === moduleId);
      if (!module) return;
      const myRole = get().myRole;
      const needsRoleSwitch = module.allowedRole !== myRole;
      if (needsRoleSwitch && !isSoloSession()) {
        get().notify(
          'Ese módulo pertenece a otro segmento: solo su responsable puede proponerlo.',
          'warning',
        );
        return;
      }

      const socket = onlineSocket();
      if (socket) {
        // En solitario el operador cubre los cuatro segmentos: se cambia de consola por él.
        if (needsRoleSwitch) {
          socket.emit('role:select', { roomId: get().roomId, role: module.allowedRole });
        }
        socket.emit('design:propose_module', { roomId: get().roomId, moduleId, action });
        return;
      }

      const roomState = get().roomState;
      if (!roomState) return;
      const blocker = getProposalBlocker(
        roomState.mission,
        roomState.selectedModules,
        module,
        action,
      );
      if (blocker) {
        get().notify(blocker, 'error');
        return;
      }
      const selectedModules =
        action === 'ADD'
          ? [...roomState.selectedModules, module]
          : roomState.selectedModules.filter((item) => item.id !== moduleId);
      const audit = auditPreLaunch(roomState.mission, selectedModules);
      applyRoomState({
        ...roomState,
        players: roomState.players.map((player) =>
          player.id === LOCAL_PLAYER_ID ? { ...player, role: module.allowedRole } : player,
        ),
        selectedModules,
        telemetry: audit.telemetry,
        audit,
        activeVote: null,
      });
      set({
        desiredRole: module.allowedRole,
        advisorFeedback: getAdvisorFeedback(audit, selectedModules, get().modules),
      });
    },

    vote: (voteId, approve) => {
      onlineSocket()?.emit('design:vote', { roomId: get().roomId, voteId, approve });
    },

    launch: () => {
      const socket = onlineSocket();
      if (socket) {
        // La fase cambia cuando llega el primer tick: el servidor puede rechazar el lanzamiento.
        socket.emit('mission:launch', { roomId: get().roomId });
        return;
      }

      const roomState = get().roomState;
      if (!roomState) return;
      if (!roomState.audit.canLaunch) {
        get().notify(
          roomState.audit.blocks.map((block) => block.message).join(' '),
          'error',
        );
        return;
      }
      clearLocalFlight();
      const role = get().myRole ?? roomState.players[0]?.role ?? 'PROPULSION';
      localFlightState = createLocalFlight({
        mission: roomState.mission,
        modules: roomState.selectedModules,
        telemetry: roomState.telemetry,
        auditWarnings: roomState.audit.warnings,
        role,
      });
      applyFlightPayload(buildLocalPayload(localFlightState));
      localFlightTimer = window.setInterval(runLocalFlightTick, 1000);
    },

    solvePuzzle: (puzzleId, answer) => sendFlightAction('SOLVE_PUZZLE', { puzzleId, answer }),
    toggleSensor: (moduleId, enabled) => sendFlightAction('TOGGLE_SENSOR', { moduleId, enabled }),
    execDecision: (moduleId) =>
      sendFlightAction('EXEC_DECISION', { decision: 'SACRIFICE_EXPERIMENT', moduleId }),
  };
});
