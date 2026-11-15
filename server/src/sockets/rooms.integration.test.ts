import { afterEach, describe, expect, it } from 'vitest';
import { io as createSocketClient } from 'socket.io-client';
import type { AsymmetricFlightPayload, RoomState, SocketError } from '../../../shared/types.js';
import { createBackend } from '../index.js';

type TestSocket = ReturnType<typeof createSocketClient>;

function waitForError(socket: TestSocket): Promise<SocketError> {
  return new Promise((resolve) =>
    socket.once('server:error', (error: SocketError) => resolve(error)),
  );
}

function waitForState(socket: TestSocket): Promise<RoomState> {
  return new Promise((resolve) =>
    socket.once('room:state_update', (state: RoomState) => resolve(state)),
  );
}

function waitForFlightTick(socket: TestSocket): Promise<AsymmetricFlightPayload> {
  return new Promise((resolve) =>
    socket.once('flight:tick_asym', (payload: AsymmetricFlightPayload) => resolve(payload)),
  );
}

function waitForFlightRole(socket: TestSocket, role: AsymmetricFlightPayload['role']) {
  return new Promise<AsymmetricFlightPayload>((resolve) => {
    const listener = (payload: AsymmetricFlightPayload): void => {
      if (payload.role === role) {
        socket.off('flight:tick_asym', listener);
        resolve(payload);
      }
    };
    socket.on('flight:tick_asym', listener);
  });
}

function connectClient(url: string): Promise<TestSocket> {
  return new Promise((resolve, reject) => {
    const socket = createSocketClient(url, {
      transports: ['websocket'],
      forceNew: true,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

describe('Socket.io room and flight protocol', () => {
  let backend: ReturnType<typeof createBackend> | undefined;
  const clients: TestSocket[] = [];

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    if (backend) {
      await backend.close();
      backend = undefined;
    }
  });

  async function startBackend(): Promise<string> {
    const testBackend = createBackend();
    backend = testBackend;
    await new Promise<void>((resolve, reject) => {
      testBackend.httpServer.once('error', reject);
      testBackend.httpServer.listen(0, '127.0.0.1', resolve);
    });
    const address = testBackend.httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('No se pudo determinar el puerto de prueba.');
    }
    return `http://127.0.0.1:${address.port}`;
  }

  it('rejects a launch from a socket that is not in the room', async () => {
    const url = await startBackend();
    const host = await connectClient(url);
    const intruder = await connectClient(url);
    clients.push(host, intruder);

    const created = waitForState(host);
    host.emit('room:create', { roomId: 'SOCK3', playerName: 'Host', difficulty: 'APPRENTICE' });
    await created;
    const selectedRole = waitForState(host);
    host.emit('role:select', { roomId: 'SOCK3', role: 'PROPULSION' });
    await selectedRole;
    const designStarted = waitForState(host);
    host.emit('room:start', { roomId: 'SOCK3' });
    await designStarted;

    const rejected = waitForError(intruder);
    intruder.emit('mission:launch', { roomId: 'SOCK3' });
    expect((await rejected).code).toBe('PLAYER_NOT_IN_ROOM');

    // La sala sigue en diseño: el anfitrión todavía puede proponer módulos.
    const proposal = waitForState(host);
    host.emit('design:propose_module', { roomId: 'SOCK3', moduleId: 'EST-01', action: 'ADD' });
    expect((await proposal).phase).toBe('DESIGN');
  });

  it('moves a player out of the previous room when they create a new one', async () => {
    const url = await startBackend();
    const host = await connectClient(url);
    const guest = await connectClient(url);
    clients.push(host, guest);

    const created = waitForState(host);
    host.emit('room:create', { roomId: 'SOCK4', playerName: 'Host', difficulty: 'APPRENTICE' });
    await created;
    const hostSawGuest = waitForState(host);
    const guestJoined = waitForState(guest);
    guest.emit('room:join', { roomId: 'SOCK4', playerName: 'Guest' });
    await Promise.all([hostSawGuest, guestJoined]);

    const guestSawHostLeave = waitForState(guest);
    host.emit('room:create', { roomId: 'SOCK5', playerName: 'Host', difficulty: 'APPRENTICE' });
    const remaining = await guestSawHostLeave;

    expect(remaining.roomId).toBe('SOCK4');
    expect(remaining.players.map((player) => player.name)).toEqual(['Guest']);
    expect(remaining.hostId).toBe(guest.id);
  });

  it('answers a malformed payload with a validation error', async () => {
    const url = await startBackend();
    const client = await connectClient(url);
    clients.push(client);

    const rejected = waitForError(client);
    client.emit('room:create', null);

    expect((await rejected).code).toBe('INVALID_PAYLOAD');
  });

  it('synchronizes a room vote then emits role-filtered flight telemetry', async () => {
    const testBackend = createBackend();
    backend = testBackend;
    await new Promise<void>((resolve, reject) => {
      testBackend.httpServer.once('error', reject);
      testBackend.httpServer.listen(0, '127.0.0.1', resolve);
    });
    const address = testBackend.httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('No se pudo determinar el puerto de prueba.');
    }
    const url = `http://127.0.0.1:${address.port}`;
    const host = await connectClient(url);
    const guest = await connectClient(url);
    clients.push(host, guest);

    const hostCreated = waitForState(host);
    host.emit('room:create', {
      roomId: 'SOCK1',
      playerName: 'Host',
      difficulty: 'APPRENTICE',
    });
    await hostCreated;

    const hostJoined = waitForState(host);
    const guestJoined = waitForState(guest);
    guest.emit('room:join', { roomId: 'SOCK1', playerName: 'Guest' });
    await Promise.all([hostJoined, guestJoined]);

    const hostRole = waitForState(host);
    const guestRole = waitForState(guest);
    host.emit('role:select', { roomId: 'SOCK1', role: 'PROPULSION' });
    await Promise.all([hostRole, guestRole]);

    const hostSecondRole = waitForState(host);
    const guestSecondRole = waitForState(guest);
    guest.emit('role:select', { roomId: 'SOCK1', role: 'SCIENCE' });
    await Promise.all([hostSecondRole, guestSecondRole]);

    const hostDesign = waitForState(host);
    const guestDesign = waitForState(guest);
    host.emit('room:start', { roomId: 'SOCK1' });
    await Promise.all([hostDesign, guestDesign]);

    const hostProposal = waitForState(host);
    const guestProposal = waitForState(guest);
    host.emit('design:propose_module', {
      roomId: 'SOCK1',
      moduleId: 'EST-01',
      action: 'ADD',
    });
    const proposedState = await Promise.all([hostProposal, guestProposal]);
    const voteId = proposedState[0].activeVote?.voteId;
    if (!voteId) {
      throw new Error('La propuesta no abrió una votación.');
    }

    const hostApproved = waitForState(host);
    const guestApproved = waitForState(guest);
    guest.emit('design:vote', { roomId: 'SOCK1', voteId, approve: true });
    const approvedState = await Promise.all([hostApproved, guestApproved]);
    expect(approvedState[0].selectedModules.map((module) => module.id)).toEqual(['EST-01']);

    const hostFlightTick = waitForFlightTick(host);
    const guestFlightTick = waitForFlightTick(guest);
    host.emit('mission:launch', { roomId: 'SOCK1' });
    const [hostPayload, guestPayload] = await Promise.all([hostFlightTick, guestFlightTick]);

    expect(hostPayload.role).toBe('PROPULSION');
    expect(hostPayload).toHaveProperty('internal');
    expect(hostPayload).not.toHaveProperty('trajectory');
    expect(guestPayload.role).toBe('SCIENCE');
    expect(guestPayload).toHaveProperty('sensors');
    expect(guestPayload).not.toHaveProperty('internal');
    expect(guestPayload).not.toHaveProperty('trajectory');
  });

  it('immediately sends solo flight telemetry after a role switch', async () => {
    const testBackend = createBackend();
    backend = testBackend;
    await new Promise<void>((resolve, reject) => {
      testBackend.httpServer.once('error', reject);
      testBackend.httpServer.listen(0, '127.0.0.1', resolve);
    });
    const address = testBackend.httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('No se pudo determinar el puerto de prueba.');
    }
    const host = await connectClient(`http://127.0.0.1:${address.port}`);
    clients.push(host);

    const created = waitForState(host);
    host.emit('room:create', {
      roomId: 'SOCK2',
      playerName: 'Solo',
      difficulty: 'APPRENTICE',
    });
    await created;

    const selectedRole = waitForState(host);
    host.emit('role:select', { roomId: 'SOCK2', role: 'COMMS' });
    await selectedRole;
    const designStarted = waitForState(host);
    host.emit('room:start', { roomId: 'SOCK2' });
    await designStarted;

    const commsPayloadPromise = waitForFlightTick(host);
    host.emit('mission:launch', { roomId: 'SOCK2' });
    const commsPayload = await commsPayloadPromise;
    expect(commsPayload.role).toBe('COMMS');

    const propulsionPayloadPromise = waitForFlightRole(host, 'PROPULSION');
    host.emit('role:select', { roomId: 'SOCK2', role: 'PROPULSION' });
    const propulsionPayload = await propulsionPayloadPromise;
    expect(propulsionPayload).toHaveProperty('internal');
    expect(propulsionPayload).not.toHaveProperty('trajectory');
  });
});
