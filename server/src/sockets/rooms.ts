import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from '../../../shared/types.js';
import { getGroundStationForMission } from '../catalog.js';
import { FlightLoop, applyFlightAction } from '../flight/loop.js';
import { generateMissionReport } from '../flight/report.js';
import {
  buildAsymmetricFlightPayload,
  selectCrisisAlertRecipients,
  toCrisisAlert,
} from './asymmetry.js';
import { RoomService, RoomServiceError, toRoomKey } from './room-service.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

function emitError(socket: GameSocket, error: unknown): void {
  if (error instanceof RoomServiceError) {
    socket.emit('server:error', { code: error.code, message: error.message });
    return;
  }
  // El motor y el vuelo lanzan `Error` planos con mensajes pensados para el jugador.
  // Cualquier subclase (TypeError, RangeError…) es un fallo interno y no se filtra.
  if (error instanceof Error && error.constructor === Error) {
    socket.emit('server:error', { code: 'INVALID_REQUEST', message: error.message });
    return;
  }
  console.error('Error inesperado en un evento Socket.io:', error);
  socket.emit('server:error', {
    code: 'INTERNAL_ERROR',
    message: 'Ocurrió un error interno al procesar el evento.',
  });
}

function handle(socket: GameSocket, action: () => void | Promise<void>): void {
  void (async () => {
    try {
      await action();
    } catch (error) {
      emitError(socket, error);
    }
  })();
}

/** Los eventos llegan de la red: un cliente puede enviar cualquier cosa como payload. */
function requirePayload<T>(payload: T): T {
  if (typeof payload !== 'object' || payload === null) {
    throw new RoomServiceError('INVALID_PAYLOAD', 'El evento requiere un objeto con datos.');
  }
  return payload;
}

function publishRoomState(io: GameServer, state: RoomState): void {
  // La telemetría completa se comparte en diseño, pero el vuelo usa payloads por rol.
  if (state.phase !== 'FLIGHT') {
    io.to(state.roomId).emit('room:state_update', state);
  }
}

export function registerRoomHandlers(
  io: GameServer,
  roomService = new RoomService(),
): { roomService: RoomService; stop: () => void } {
  const voteTimers = new Map<string, NodeJS.Timeout>();
  const stopVoteTimer = (roomId: string): void => {
    const roomKey = toRoomKey(roomId);
    const timer = voteTimers.get(roomKey);
    if (timer) {
      clearTimeout(timer);
      voteTimers.delete(roomKey);
    }
  };

  const flightLoop = new FlightLoop({
    onTick: (roomId, flight) => {
      const state = roomService.getState(roomId);
      const station = getGroundStationForMission(state.mission);
      for (const player of state.players) {
        if (player.role) {
          io.to(player.id).emit(
            'flight:tick_asym',
            buildAsymmetricFlightPayload(
              player.role,
              state.mission,
              state.telemetry,
              state.selectedModules,
              station,
              flight,
            ),
          );
        }
      }
    },
    onCrisis: (roomId, flight) => {
      const state = roomService.getState(roomId);
      const alert = toCrisisAlert(flight);
      for (const player of selectCrisisAlertRecipients(state.players)) {
        io.to(player.id).emit('flight:crisis_alert', alert);
      }
    },
    onComplete: (roomId, flight) => {
      const state = roomService.getState(roomId);
      const report = generateMissionReport(state, flight);
      const reportState = roomService.finishFlight(roomId);
      io.to(roomId).emit('mission:report_ready', report);
      publishRoomState(io, reportState);
    },
  });

  const clearRoomTimers = (roomId: string): void => {
    stopVoteTimer(roomId);
    flightLoop.stop(toRoomKey(roomId));
  };

  /**
   * Saca al socket de las salas en las que participa (salvo `keepRoomKey`).
   * Un jugador solo puede estar en una partida: sin esto, repetir misión o
   * desconectarse dejaría salas huérfanas que siguen enviándole su estado.
   */
  const detachFromRooms = (socket: GameSocket, keepRoomKey?: string): void => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id || roomId === keepRoomKey) {
        continue;
      }
      try {
        const state = roomService.leaveRoom(roomId, socket.id);
        void socket.leave(roomId);
        if (state) {
          stopVoteTimer(roomId);
          publishRoomState(io, state);
        } else {
          clearRoomTimers(roomId);
        }
      } catch (error) {
        const expected =
          error instanceof RoomServiceError &&
          (error.code === 'ROOM_NOT_FOUND' || error.code === 'PLAYER_NOT_IN_ROOM');
        if (!expected) {
          emitError(socket, error);
        }
      }
    }
  };

  io.on('connection', (socket) => {
    socket.on('room:create', (payload) =>
      handle(socket, async () => {
        const input = requirePayload(payload);
        detachFromRooms(socket);
        const state = roomService.createRoom(socket.id, input);
        await socket.join(state.roomId);
        publishRoomState(io, state);
      }),
    );

    socket.on('room:join', (payload) =>
      handle(socket, async () => {
        const input = requirePayload(payload);
        detachFromRooms(socket, toRoomKey(input.roomId));
        const state = roomService.joinRoom(socket.id, input);
        await socket.join(state.roomId);
        publishRoomState(io, state);
      }),
    );

    socket.on('room:leave', (payload) =>
      handle(socket, async () => {
        const roomKey = toRoomKey(requirePayload(payload).roomId);
        const state = roomService.leaveRoom(roomKey, socket.id);
        await socket.leave(roomKey);
        if (state) {
          stopVoteTimer(roomKey);
          publishRoomState(io, state);
        } else {
          clearRoomTimers(roomKey);
        }
      }),
    );

    socket.on('room:start', (payload) =>
      handle(socket, () => {
        const { roomId } = requirePayload(payload);
        publishRoomState(io, roomService.startDesign(roomId, socket.id));
      }),
    );

    socket.on('role:select', (payload) =>
      handle(socket, () => {
        const { roomId, role } = requirePayload(payload);
        const state = roomService.selectRole(roomId, socket.id, role);
        publishRoomState(io, state);
        if (state.phase === 'FLIGHT') {
          const player = state.players.find((candidate) => candidate.id === socket.id);
          if (player?.role) {
            socket.emit(
              'flight:tick_asym',
              buildAsymmetricFlightPayload(
                player.role,
                state.mission,
                state.telemetry,
                state.selectedModules,
                getGroundStationForMission(state.mission),
                flightLoop.getRuntime(state.roomId),
              ),
            );
          }
        }
      }),
    );

    socket.on('design:propose_module', (payload) =>
      handle(socket, () => {
        const { roomId: requestedRoomId, moduleId, action } = requirePayload(payload);
        const result = roomService.proposeModule(requestedRoomId, socket.id, moduleId, action);
        publishRoomState(io, result.state);
        if (result.vote) {
          const roomId = result.state.roomId;
          const vote = result.vote;
          stopVoteTimer(roomId);
          const delay = Math.max(0, vote.expiresAt - Date.now());
          const timer = setTimeout(() => {
            const expired = roomService.expireVote(roomId, vote.voteId);
            voteTimers.delete(roomId);
            if (expired) {
              publishRoomState(io, expired);
            }
          }, delay);
          timer.unref();
          voteTimers.set(roomId, timer);
        } else if (result.advisorFeedback.length > 0) {
          io.to(socket.id).emit('design:advisor_feedback', result.advisorFeedback);
        }
      }),
    );

    socket.on('design:vote', (payload) =>
      handle(socket, () => {
        const { roomId, voteId, approve } = requirePayload(payload);
        const result = roomService.castVote(roomId, socket.id, voteId, approve);
        if (result.resolved) {
          stopVoteTimer(result.state.roomId);
        }
        publishRoomState(io, result.state);
      }),
    );

    socket.on('mission:launch', (payload) =>
      handle(socket, () => {
        const { roomId } = requirePayload(payload);
        const { state } = roomService.startFlight(roomId, socket.id);
        flightLoop.start(state.roomId, state.mission, state.selectedModules, state.telemetry);
      }),
    );

    socket.on('flight:action', (payload) =>
      handle(socket, () => {
        const input = requirePayload(payload);
        const state = roomService.getState(input.roomId);
        const role = state.players.find((candidate) => candidate.id === socket.id)?.role;
        if (!role) {
          throw new RoomServiceError('ROLE_REQUIRED', 'El jugador debe tener un rol para actuar.');
        }
        if (state.phase !== 'FLIGHT') {
          throw new RoomServiceError('INVALID_PHASE', 'Las acciones solo están disponibles durante el vuelo.');
        }
        // El bucle de vuelo se indexa por el código normalizado de la sala, no por el recibido.
        flightLoop.updateRuntime(state.roomId, (runtime) =>
          applyFlightAction(
            runtime,
            role,
            input.actionType,
            requirePayload(input.payload),
            state.selectedModules,
          ),
        );
      }),
    );

    socket.on('disconnecting', () => {
      detachFromRooms(socket);
    });
  });

  return {
    roomService,
    stop: () => {
      for (const timer of voteTimers.values()) {
        clearTimeout(timer);
      }
      voteTimers.clear();
      flightLoop.stopAll();
    },
  };
}
