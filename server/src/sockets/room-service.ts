import { randomUUID } from 'node:crypto';
import type {
  ActiveVote,
  DifficultyMode,
  ModuleAction,
  ModuleItem,
  Player,
  RoleType,
  RoomState,
} from '../../../shared/types.js';
import { getMissionById, getModuleById, listMissions, listModules } from '../catalog.js';
import { auditPreLaunch, validateModuleProposal } from '../engine/audit.js';
import { calculateTelemetryMetrics } from '../engine/calculator.js';

const MAX_PLAYERS_PER_ROOM = 4;
const DEFAULT_VOTE_DURATION_MS = 30_000;

export class RoomServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RoomServiceError';
  }
}

export interface CreateRoomInput {
  roomId?: string;
  playerName: string;
  difficulty: DifficultyMode;
  missionId?: string;
}

export interface JoinRoomInput {
  roomId: string;
  playerName: string;
}

export interface ProposalResult {
  state: RoomState;
  vote: ActiveVote | null;
  advisorFeedback: string[];
}

export interface VoteResult {
  state: RoomState;
  resolved: boolean;
  accepted: boolean;
  expired: boolean;
}

function normalizePlayerName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RoomServiceError('INVALID_PLAYER_NAME', 'El nombre debe ser texto.');
  }
  const name = value.trim();
  if (name.length < 1 || name.length > 24) {
    throw new RoomServiceError('INVALID_PLAYER_NAME', 'El nombre debe tener entre 1 y 24 caracteres.');
  }
  return name;
}

function normalizeRoomId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RoomServiceError('INVALID_ROOM_ID', 'El código de sala debe ser texto.');
  }
  const roomId = value.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,12}$/.test(roomId)) {
    throw new RoomServiceError('INVALID_ROOM_ID', 'El código de sala debe tener entre 4 y 12 caracteres.');
  }
  return roomId;
}

function cloneState(state: RoomState): RoomState {
  return structuredClone(state);
}

function createPlayer(id: string, name: string): Player {
  return { id, name: normalizePlayerName(name), role: null, ready: false };
}

export class RoomService {
  private readonly rooms = new Map<string, RoomState>();

  constructor(private readonly voteDurationMs = DEFAULT_VOTE_DURATION_MS) {}

  createRoom(
    playerId: string,
    input: CreateRoomInput,
  ): RoomState {
    if (input.difficulty !== 'APPRENTICE' && input.difficulty !== 'ENGINEER') {
      throw new RoomServiceError('INVALID_DIFFICULTY', 'La dificultad seleccionada no es válida.');
    }
    const roomId = input.roomId
      ? normalizeRoomId(input.roomId)
      : randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
    if (this.rooms.has(roomId)) {
      throw new RoomServiceError('ROOM_ALREADY_EXISTS', `La sala "${roomId}" ya existe.`);
    }

    const mission = input.missionId
      ? getMissionById(input.missionId)
      : listMissions()[0];
    if (!mission) {
      throw new RoomServiceError('NO_MISSIONS_AVAILABLE', 'No hay escenarios de misión configurados.');
    }

    const selectedModules: ModuleItem[] = [];
    const state: RoomState = {
      roomId,
      hostId: playerId,
      difficulty: input.difficulty,
      phase: 'LOBBY',
      mission,
      players: [createPlayer(playerId, input.playerName)],
      selectedModules,
      telemetry: calculateTelemetryMetrics(mission, selectedModules),
      activeVote: null,
      audit: auditPreLaunch(mission, selectedModules),
    };
    this.rooms.set(roomId, state);
    return cloneState(state);
  }

  joinRoom(playerId: string, input: JoinRoomInput): RoomState {
    const room = this.getMutableRoom(input.roomId);
    if (room.phase !== 'LOBBY') {
      throw new RoomServiceError('ROOM_ALREADY_STARTED', 'No se puede entrar a una sala que ya comenzó.');
    }
    if (room.players.some((player) => player.id === playerId)) {
      return cloneState(room);
    }
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      throw new RoomServiceError('ROOM_FULL', 'La sala ya tiene el máximo de 4 jugadores.');
    }
    room.players.push(createPlayer(playerId, input.playerName));
    return cloneState(room);
  }

  leaveRoom(roomId: string, playerId: string): RoomState | null {
    const room = this.getMutableRoom(roomId);
    this.getPlayer(room, playerId);
    room.players = room.players.filter((player) => player.id !== playerId);
    room.activeVote = null;
    if (room.players.length === 0) {
      this.rooms.delete(room.roomId);
      return null;
    }
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
    }
    return cloneState(room);
  }

  selectRole(roomId: string, playerId: string, role: RoleType): RoomState {
    const room = this.getMutableRoom(roomId);
    if (!['DIRECTOR', 'PROPULSION', 'SCIENCE', 'COMMS'].includes(role)) {
      throw new RoomServiceError('INVALID_ROLE', 'El rol seleccionado no es válido.');
    }
    // En solitario, cambiar de consola permite resolver las tareas de cada especialista.
    const soloFlightRoleSwitch = room.phase === 'FLIGHT' && room.players.length === 1;
    if (room.phase !== 'LOBBY' && room.phase !== 'DESIGN' && !soloFlightRoleSwitch) {
      throw new RoomServiceError(
        'ROLE_SELECTION_CLOSED',
        'Durante el vuelo solo una partida en solitario puede cambiar de rol.',
      );
    }
    const player = this.getPlayer(room, playerId);
    const roleOwner = room.players.find(
      (candidate) => candidate.id !== playerId && candidate.role === role,
    );
    if (roleOwner) {
      throw new RoomServiceError('ROLE_ALREADY_TAKEN', `El rol ${role} ya está ocupado.`);
    }
    player.role = role;
    player.ready = true;
    return cloneState(room);
  }

  startDesign(roomId: string, playerId: string): RoomState {
    const room = this.getMutableRoom(roomId);
    if (room.phase !== 'LOBBY') {
      throw new RoomServiceError('INVALID_PHASE', 'La sala ya salió del lobby.');
    }
    this.getPlayer(room, playerId);
    if (room.hostId !== playerId) {
      throw new RoomServiceError('HOST_REQUIRED', 'Solo quien creó la sala puede iniciar el diseño.');
    }
    if (room.players.some((player) => player.role === null || !player.ready)) {
      throw new RoomServiceError('PLAYERS_NOT_READY', 'Todos los jugadores deben elegir un rol.');
    }
    room.phase = 'DESIGN';
    return cloneState(room);
  }

  getState(roomId: string): RoomState {
    return cloneState(this.getMutableRoom(roomId));
  }

  listStates(): RoomState[] {
    return [...this.rooms.values()].map(cloneState);
  }

  proposeModule(
    roomId: string,
    playerId: string,
    moduleId: string,
    action: ModuleAction,
    now = Date.now(),
  ): ProposalResult {
    const room = this.getMutableRoom(roomId);
    this.assertPhase(room, 'DESIGN');
    const player = this.getPlayer(room, playerId);
    if (!player.role) {
      throw new RoomServiceError('ROLE_REQUIRED', 'Elige un rol antes de proponer módulos.');
    }
    if (action !== 'ADD' && action !== 'REMOVE') {
      throw new RoomServiceError('INVALID_MODULE_ACTION', 'La acción del módulo no es válida.');
    }
    if (room.activeVote) {
      throw new RoomServiceError('VOTE_IN_PROGRESS', 'Hay otra propuesta esperando votación.');
    }

    const module = getModuleById(moduleId);
    if (module.allowedRole !== player.role) {
      throw new RoomServiceError(
        'ROLE_CANNOT_PROPOSE_MODULE',
        `El rol ${player.role} no puede proponer módulos ${module.category}.`,
      );
    }
    validateModuleProposal(room.mission, room.selectedModules, module, action);

    if (room.players.length === 1) {
      // En solitario, el asesor valida y aplica la propuesta sin abrir una votación imposible.
      this.applyModule(room, module, action);
      return {
        state: cloneState(room),
        vote: null,
        advisorFeedback: this.getAdvisorFeedback(room),
      };
    }

    const vote: ActiveVote = {
      voteId: randomUUID(),
      proposedBy: player.role,
      module,
      action,
      approvals: [playerId],
      rejections: [],
      expiresAt: now + this.voteDurationMs,
    };
    room.activeVote = vote;
    return { state: cloneState(room), vote: structuredClone(vote), advisorFeedback: [] };
  }

  castVote(
    roomId: string,
    playerId: string,
    voteId: string,
    approve: boolean,
    now = Date.now(),
  ): VoteResult {
    const room = this.getMutableRoom(roomId);
    this.assertPhase(room, 'DESIGN');
    this.getPlayer(room, playerId);
    const vote = room.activeVote;
    if (!vote || vote.voteId !== voteId) {
      throw new RoomServiceError('VOTE_NOT_FOUND', 'La votación ya no está activa.');
    }
    if (typeof approve !== 'boolean') {
      throw new RoomServiceError('INVALID_VOTE', 'El voto debe ser aprobar o rechazar.');
    }
    if (now >= vote.expiresAt) {
      room.activeVote = null;
      return { state: cloneState(room), resolved: true, accepted: false, expired: true };
    }
    if (vote.approvals.includes(playerId) || vote.rejections.includes(playerId)) {
      throw new RoomServiceError('VOTE_ALREADY_CAST', 'Ya registraste tu voto.');
    }

    (approve ? vote.approvals : vote.rejections).push(playerId);
    // La mayoría cuenta a quien propuso el módulo, que ya registró su aprobación.
    const majority = Math.floor(room.players.length / 2) + 1;
    const allVoted = vote.approvals.length + vote.rejections.length === room.players.length;
    const accepted = vote.approvals.length >= majority;
    const rejected = vote.rejections.length >= majority || (allVoted && !accepted);

    if (!accepted && !rejected) {
      return { state: cloneState(room), resolved: false, accepted: false, expired: false };
    }

    if (accepted) {
      this.applyModule(room, vote.module, vote.action);
    }
    room.activeVote = null;
    return { state: cloneState(room), resolved: true, accepted, expired: false };
  }

  expireVote(roomId: string, voteId: string): RoomState | null {
    const room = this.rooms.get(roomId.trim().toUpperCase());
    if (!room || room.activeVote?.voteId !== voteId) {
      return null;
    }
    room.activeVote = null;
    return cloneState(room);
  }

  startFlight(roomId: string): { state: RoomState; audit: RoomState['audit'] } {
    const room = this.getMutableRoom(roomId);
    this.assertPhase(room, 'DESIGN');
    if (room.activeVote) {
      throw new RoomServiceError('VOTE_IN_PROGRESS', 'Resuelve la votación antes del lanzamiento.');
    }
    const audit = auditPreLaunch(room.mission, room.selectedModules);
    room.audit = audit;
    room.telemetry = audit.telemetry;
    if (!audit.canLaunch) {
      throw new RoomServiceError(
        'LAUNCH_BLOCKED',
        audit.blocks.map((block) => block.message).join(' '),
      );
    }
    room.phase = 'FLIGHT';
    return { state: cloneState(room), audit: structuredClone(audit) };
  }

  finishFlight(roomId: string): RoomState {
    const room = this.getMutableRoom(roomId);
    this.assertPhase(room, 'FLIGHT');
    room.phase = 'REPORT';
    return cloneState(room);
  }

  private applyModule(room: RoomState, module: ModuleItem, action: ModuleAction): void {
    validateModuleProposal(room.mission, room.selectedModules, module, action);
    room.selectedModules =
      action === 'ADD'
        ? [...room.selectedModules, module]
        : room.selectedModules.filter((selected) => selected.id !== module.id);
    room.telemetry = calculateTelemetryMetrics(room.mission, room.selectedModules);
    room.audit = auditPreLaunch(room.mission, room.selectedModules);
  }

  private getAdvisorFeedback(room: RoomState): string[] {
    const messages = room.audit.warnings.map((warning) => `Asesor virtual: ${warning.message}`);
    const selectedIds = new Set(room.selectedModules.map((module) => module.id));
    for (const warning of room.audit.warnings) {
      const candidates = listModules().filter((module) => !selectedIds.has(module.id));
      const candidate =
        warning.code === 'POWER_DEFICIT'
          ? candidates
              .filter((module) => module.category === 'COM' && module.powerKw < 0)
              .sort((left, right) => left.powerKw - right.powerKw)[0]
          : warning.code === 'LOW_DOWNLINK'
            ? candidates
                .filter(
                  (module) => module.category === 'COM' && module.dataDownlinkMbps > 0,
                )
                .sort((left, right) => right.dataDownlinkMbps - left.dataDownlinkMbps)[0]
            : warning.code === 'SCIENCE_TARGET'
              ? candidates
                  .filter((module) => module.category === 'SCI' && module.sciencePoints > 0)
                  .sort((left, right) => right.sciencePoints - left.sciencePoints)[0]
              : undefined;
      if (candidate) {
        messages.push(
          `Asesor virtual recomienda evaluar ${candidate.id} (${candidate.name}): ${candidate.apprenticeTip}`,
        );
      }
    }
    if (messages.length === 0) {
      messages.push('Asesores virtuales: el diseño mantiene los márgenes de advertencia actuales.');
    }
    return messages;
  }

  private getMutableRoom(roomId: string): RoomState {
    const normalizedRoomId = roomId.trim().toUpperCase();
    const room = this.rooms.get(normalizedRoomId);
    if (!room) {
      throw new RoomServiceError('ROOM_NOT_FOUND', `No existe la sala "${normalizedRoomId}".`);
    }
    return room;
  }

  private getPlayer(room: RoomState, playerId: string): Player {
    const player = room.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      throw new RoomServiceError('PLAYER_NOT_IN_ROOM', 'El jugador no pertenece a esta sala.');
    }
    return player;
  }

  private assertPhase(room: RoomState, phase: RoomState['phase']): void {
    if (room.phase !== phase) {
      throw new RoomServiceError(
        'INVALID_PHASE',
        `Esta acción requiere la fase ${phase}; la sala está en ${room.phase}.`,
      );
    }
  }
}
