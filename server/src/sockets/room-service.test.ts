import { describe, expect, it } from 'vitest';
import { RoomService, RoomServiceError } from './room-service.js';

describe('RoomService', () => {
  it('creates a solo room, applies proposals directly and permits role switching in design', () => {
    const rooms = new RoomService();
    rooms.createRoom('player-1', {
      roomId: 'SOLO1',
      playerName: 'Ada',
      difficulty: 'APPRENTICE',
    });
    rooms.selectRole('SOLO1', 'player-1', 'COMMS');
    rooms.startDesign('SOLO1', 'player-1');

    const proposal = rooms.proposeModule('SOLO1', 'player-1', 'COM-02', 'ADD');
    expect(proposal.vote).toBeNull();
    expect(proposal.state.selectedModules.map((module) => module.id)).toEqual(['COM-02']);
    expect(proposal.advisorFeedback.length).toBeGreaterThan(0);
    expect(proposal.advisorFeedback.some((message) => message.includes('recomienda evaluar SCI-'))).toBe(
      true,
    );

    rooms.selectRole('SOLO1', 'player-1', 'SCIENCE');
    expect(rooms.getState('SOLO1').players[0].role).toBe('SCIENCE');
  });

  it('resolves a multiplayer proposal only after a majority approves it', () => {
    const rooms = new RoomService();
    rooms.createRoom('host', {
      roomId: 'TEAM1',
      playerName: 'Host',
      difficulty: 'ENGINEER',
    });
    rooms.joinRoom('player-2', { roomId: 'TEAM1', playerName: 'Pilot' });
    rooms.selectRole('TEAM1', 'host', 'PROPULSION');
    rooms.selectRole('TEAM1', 'player-2', 'SCIENCE');
    rooms.startDesign('TEAM1', 'host');

    const proposal = rooms.proposeModule('TEAM1', 'host', 'EST-01', 'ADD', 1000);
    expect(proposal.vote?.approvals).toEqual(['host']);
    const result = rooms.castVote('TEAM1', 'player-2', proposal.vote!.voteId, true, 1001);

    expect(result.resolved).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.state.activeVote).toBeNull();
    expect(result.state.selectedModules.map((module) => module.id)).toEqual(['EST-01']);
  });

  it('rejects duplicate roles and rooms above four players', () => {
    const rooms = new RoomService();
    rooms.createRoom('host', {
      roomId: 'TEAM2',
      playerName: 'Host',
      difficulty: 'APPRENTICE',
    });
    rooms.joinRoom('p2', { roomId: 'TEAM2', playerName: 'P2' });
    rooms.joinRoom('p3', { roomId: 'TEAM2', playerName: 'P3' });
    rooms.joinRoom('p4', { roomId: 'TEAM2', playerName: 'P4' });
    expect(() => rooms.joinRoom('p5', { roomId: 'TEAM2', playerName: 'P5' })).toThrow(
      'máximo de 4 jugadores',
    );

    rooms.selectRole('TEAM2', 'host', 'COMMS');
    expect(() => rooms.selectRole('TEAM2', 'p2', 'COMMS')).toThrow(RoomServiceError);
  });

  it('does not let a non-host move the room out of the lobby', () => {
    const rooms = new RoomService();
    rooms.createRoom('host', {
      roomId: 'TEAM3',
      playerName: 'Host',
      difficulty: 'APPRENTICE',
    });
    rooms.joinRoom('guest', { roomId: 'TEAM3', playerName: 'Guest' });
    rooms.selectRole('TEAM3', 'host', 'DIRECTOR');
    rooms.selectRole('TEAM3', 'guest', 'SCIENCE');

    expect(() => rooms.startDesign('TEAM3', 'guest')).toThrow('Solo quien creó la sala');
  });

  it('expires a vote rather than accepting a late ballot', () => {
    const rooms = new RoomService(100);
    rooms.createRoom('host', {
      roomId: 'TEAM4',
      playerName: 'Host',
      difficulty: 'APPRENTICE',
    });
    rooms.joinRoom('guest', { roomId: 'TEAM4', playerName: 'Guest' });
    rooms.selectRole('TEAM4', 'host', 'PROPULSION');
    rooms.selectRole('TEAM4', 'guest', 'SCIENCE');
    rooms.startDesign('TEAM4', 'host');
    const proposal = rooms.proposeModule('TEAM4', 'host', 'EST-01', 'ADD', 1000);

    const result = rooms.castVote('TEAM4', 'guest', proposal.vote!.voteId, true, 1100);

    expect(result.expired).toBe(true);
    expect(result.accepted).toBe(false);
    expect(result.state.activeVote).toBeNull();
    expect(result.state.selectedModules).toHaveLength(0);
  });

  it('allows a solo player to change specialist roles during flight', () => {
    const rooms = new RoomService();
    rooms.createRoom('solo', {
      roomId: 'SOLO2',
      playerName: 'Solo',
      difficulty: 'APPRENTICE',
    });
    rooms.selectRole('SOLO2', 'solo', 'COMMS');
    rooms.startDesign('SOLO2', 'solo');
    rooms.startFlight('SOLO2');

    const state = rooms.selectRole('SOLO2', 'solo', 'PROPULSION');

    expect(state.phase).toBe('FLIGHT');
    expect(state.players[0].role).toBe('PROPULSION');
  });

  it('keeps role changes closed for multiplayer rooms during flight', () => {
    const rooms = new RoomService();
    rooms.createRoom('host', {
      roomId: 'TEAM5',
      playerName: 'Host',
      difficulty: 'APPRENTICE',
    });
    rooms.joinRoom('guest', { roomId: 'TEAM5', playerName: 'Guest' });
    rooms.selectRole('TEAM5', 'host', 'PROPULSION');
    rooms.selectRole('TEAM5', 'guest', 'SCIENCE');
    rooms.startDesign('TEAM5', 'host');
    rooms.startFlight('TEAM5');

    expect(() => rooms.selectRole('TEAM5', 'host', 'COMMS')).toThrow(RoomServiceError);
  });
});
