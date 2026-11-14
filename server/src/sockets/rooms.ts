import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from '../../../shared/types.js';
import { getGroundStationForMission } from '../catalog.js';
import { FlightLoop, applyFlightAction } from '../flight/loop.js';
import { generateMissionReport } from '../flight/report.js';
import { buildAsymmetricFlightPayload, toCrisisAlert } from './asymmetry.js';
import { RoomService, RoomServiceError } from './room-service.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;

function emitError(socket: GameSocket, error: unknown): void {
  if (error instanceof RoomServiceError) {
    socket.emit('server:error', { code: error.code, message: error.message });
    return;
  }
  if (error instanceof Error) {
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
    const timer = voteTimers.get(roomId.trim().toUpperCase());
    if (timer) {
      clearTimeout(timer);
      voteTimers.delete(roomId.trim().toUpperCase());
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
      // La alerta con amenaza y trayectoria se entrega únicamente a Comunicaciones.
      for (const player of state.players) {
        if (player.role === 'COMMS') {
          io.to(player.id).emit('flight:crisis_alert', alert);
        }
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
    flightLoop.stop(roomId);
  };

  io.on('connection', (socket) => {
    socket.on('room:create', (payload) =>
      handle(socket, async () => {
        const state = roomService.createRoom(socket.id, payload);
        await socket.join(state.roomId);
        publishRoomState(io, state);
      }),
    );

    socket.on('room:join', (payload) =>
      handle(socket, async () => {
        const state = roomService.joinRoom(socket.id, payload);
        await socket.join(state.roomId);
        publishRoomState(io, state);
      }),
    );

    socket.on('room:leave', (payload) =>
      handle(socket, async () => {
        const state = roomService.leaveRoom(payload.roomId, socket.id);
        await socket.leave(payload.roomId.trim().toUpperCase());
        stopVoteTimer(payload.roomId);
        if (state) {
          publishRoomState(io, state);
        } else {
          flightLoop.stop(payload.roomId.trim().toUpperCase());
        }
      }),
    );

    socket.on('room:start', (payload) =>
      handle(socket, () => {
        publishRoomState(io, roomService.startDesign(payload.roomId, socket.id));
      }),
    );

    socket.on('role:select', (payload) =>
      handle(socket, () => {
        const state = roomService.selectRole(payload.roomId, socket.id, payload.role);
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
        const result = roomService.proposeModule(
          payload.roomId,
          socket.id,
          payload.moduleId,
          payload.action,
        );
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
        const result = roomService.castVote(
          payload.roomId,
          socket.id,
          payload.voteId,
          payload.approve,
        );
        if (result.resolved) {
          stopVoteTimer(payload.roomId);
        }
        publishRoomState(io, result.state);
      }),
    );

    socket.on('mission:launch', (payload) =>
      handle(socket, () => {
        const { state } = roomService.startFlight(payload.roomId);
        flightLoop.start(state.roomId, state.mission, state.selectedModules, state.telemetry);
      }),
    );

    socket.on('flight:action', (payload) =>
      handle(socket, () => {
        const state = roomService.getState(payload.roomId);
        const role = state.players.find((candidate) => candidate.id === socket.id)?.role;
        if (!role) {
          throw new RoomServiceError('ROLE_REQUIRED', 'El jugador debe tener un rol para actuar.');
        }
        if (state.phase !== 'FLIGHT') {
          throw new RoomServiceError('INVALID_PHASE', 'Las acciones solo están disponibles durante el vuelo.');
        }
        flightLoop.updateRuntime(payload.roomId, (runtime) =>
          applyFlightAction(
            runtime,
            role,
            payload.actionType,
            payload.payload,
            state.selectedModules,
          ),
        );
      }),
    );

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) {
          continue;
        }
        try {
          const state = roomService.leaveRoom(roomId, socket.id);
          if (state) {
            stopVoteTimer(roomId);
            publishRoomState(io, state);
          } else {
            clearRoomTimers(roomId);
          }
        } catch (error) {
          if (!(error instanceof RoomServiceError) || error.code !== 'ROOM_NOT_FOUND') {
            emitError(socket, error);
          }
        }
      }
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