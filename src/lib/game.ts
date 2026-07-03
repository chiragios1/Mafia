import { ref, set, get, update, push, remove, onValue, off } from 'firebase/database';
import { db } from './firebase';
import { Room, Player, Role, Phase, GameEvent } from '@/types/game';

// Generate a 6-character room code
export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 12);
}

// Assign roles randomly based on player count
export interface RoleConfig {
  mafiaCount: number;
  policeCount: number;
  doctorCount: number;
}

export function assignRoles(playerIds: string[], godId: string, config?: RoleConfig): Record<string, Role> {
  const nonGodPlayers = playerIds.filter(id => id !== godId);
  const count = nonGodPlayers.length;

  // Role distribution
  const mafiaCount = config ? config.mafiaCount : Math.max(1, Math.floor(count / 5));
  const policeCount = config ? config.policeCount : 1;
  const doctorCount = config ? config.doctorCount : 1;
  const civilianCount = count - mafiaCount - policeCount - doctorCount;
  const roles: Role[] = [
    ...Array(mafiaCount).fill('mafia'),
    ...Array(policeCount).fill('police'),
    ...Array(doctorCount).fill('doctor'),
    ...Array(Math.max(0, civilianCount)).fill('civilian'),
  ];

  // Shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  const assigned: Record<string, Role> = { [godId]: 'god' };
  nonGodPlayers.forEach((id, i) => {
    assigned[id] = roles[i];
  });

  return assigned;
}

// Create a new room
export async function createRoom(hostName: string): Promise<{ roomCode: string; playerId: string }> {
  const roomCode = generateRoomCode();
  const playerId = generatePlayerId();

  const player: Player = {
    id: playerId,
    name: hostName,
    role: 'civilian', // will be reassigned when game starts
    isAlive: true,
    isGod: false,
  };

  const room: Room = {
    code: roomCode,
    hostId: playerId,
    phase: 'lobby',
    players: { [playerId]: player },
    mafiaVotes: {},
    dayVotes: {},
    doctorSave: null,
    policeChecks: null,
    nightKillTarget: null,
    events: [],
    winner: null,
    round: 0,
    createdAt: Date.now(),
  };

  await set(ref(db, `rooms/${roomCode}`), room);
  return { roomCode, playerId };
}

// Join an existing room
export async function joinRoom(roomCode: string, playerName: string): Promise<{ playerId: string } | { error: string }> {
  const roomRef = ref(db, `rooms/${roomCode}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return { error: 'Room not found' };

  const room: Room = snapshot.val();
  if (room.phase !== 'lobby') return { error: 'Game already started' };

  const playerCount = Object.keys(room.players).length;
  if (playerCount >= 50) return { error: 'Room is full (max 50)' };

  const playerId = generatePlayerId();
  const player: Player = {
    id: playerId,
    name: playerName,
    role: 'civilian',
    isAlive: true,
    isGod: false,
  };

  await update(ref(db, `rooms/${roomCode}/players`), { [playerId]: player });
  return { playerId };
}

// Start game — assign roles, set god
export async function startGame(roomCode: string, godPlayerId: string, config?: RoleConfig): Promise<void> {
  const snapshot = await get(ref(db, `rooms/${roomCode}/players`));
  const players: Record<string, Player> = snapshot.val();
  const playerIds = Object.keys(players);

  if (playerIds.length < 4) throw new Error('Need at least 4 players to start');

  const roleMap = assignRoles(playerIds, godPlayerId, config);

  const updates: Record<string, unknown> = {};
  playerIds.forEach(id => {
    updates[`rooms/${roomCode}/players/${id}/role`] = roleMap[id];
    updates[`rooms/${roomCode}/players/${id}/isGod`] = id === godPlayerId;
  });
  updates[`rooms/${roomCode}/phase`] = 'night';
  updates[`rooms/${roomCode}/round`] = 1;

  await update(ref(db), updates);
}

// God advances the phase
export async function setPhase(roomCode: string, phase: Phase): Promise<void> {
  await update(ref(db, `rooms/${roomCode}`), { phase });
}

// Mafia casts vote
export async function castMafiaVote(roomCode: string, voterId: string, targetId: string): Promise<void> {
  await update(ref(db, `rooms/${roomCode}/mafiaVotes`), { [voterId]: targetId });
}

// Doctor saves a player
export async function doctorSave(roomCode: string, targetId: string): Promise<void> {
  await update(ref(db, `rooms/${roomCode}`), { doctorSave: targetId });
}

// Police checks a suspect — system auto-resolves from actual role
export async function policeCheck(roomCode: string, policePlayerId: string, suspectId: string): Promise<void> {
  const snapshot = await get(ref(db, `rooms/${roomCode}/players/${suspectId}`));
  const suspect: Player = snapshot.val();
  const result = suspect.role === 'mafia' ? 'yes' : 'no';
  await update(ref(db, `rooms/${roomCode}/policeChecks/${policePlayerId}`), { suspectId, result });
}

// Resolve night — apply kills/saves, move to day
export async function resolveNight(roomCode: string): Promise<void> {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  const room: Room = snapshot.val();

  const mafiaVotes = room.mafiaVotes || {};
  const voteCounts: Record<string, number> = {};
  Object.values(mafiaVotes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });

  // Find most voted target
  let killTarget: string | null = null;
  let maxVotes = 0;
  Object.entries(voteCounts).forEach(([id, count]) => {
    if (count > maxVotes) { maxVotes = count; killTarget = id; }
  });

  const saved = room.doctorSave;
  const updates: Record<string, unknown> = {};
  const events: GameEvent[] = [...(room.events || [])];

  if (killTarget && killTarget !== saved) {
    updates[`rooms/${roomCode}/players/${killTarget}/isAlive`] = false;
    events.push({
      type: 'killed',
      playerId: killTarget,
      playerName: room.players[killTarget]?.name,
      message: `${room.players[killTarget]?.name} was killed by the Mafia last night.`,
      timestamp: Date.now(),
    });
  } else if (killTarget && killTarget === saved) {
    events.push({
      type: 'saved',
      playerId: killTarget,
      playerName: room.players[killTarget]?.name,
      message: `The Doctor saved someone last night. No one died.`,
      timestamp: Date.now(),
    });
  } else {
    events.push({
      type: 'no_kill',
      message: 'The Mafia could not agree. No one died last night.',
      timestamp: Date.now(),
    });
  }

  updates[`rooms/${roomCode}/events`] = events;
  updates[`rooms/${roomCode}/phase`] = 'day';
  updates[`rooms/${roomCode}/mafiaVotes`] = {};
  updates[`rooms/${roomCode}/doctorSave`] = null;
  updates[`rooms/${roomCode}/policeChecks`] = null;
  updates[`rooms/${roomCode}/nightKillTarget`] = killTarget;

  await update(ref(db), updates);
  await checkWinCondition(roomCode);
}

// Cast day elimination vote
export async function castDayVote(roomCode: string, voterId: string, targetId: string): Promise<void> {
  await update(ref(db, `rooms/${roomCode}/dayVotes`), { [voterId]: targetId });
}

// Resolve day vote — eliminate most voted, or trigger re-vote on tie
export async function resolveDay(roomCode: string): Promise<void> {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  const room: Room = snapshot.val();

  const dayVotes = room.dayVotes || {};
  const voteCounts: Record<string, number> = {};
  Object.values(dayVotes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });

  let eliminateTarget: string | null = null;
  let maxVotes = 0;
  Object.entries(voteCounts).forEach(([id, count]) => {
    if (count > maxVotes) { maxVotes = count; eliminateTarget = id; }
  });

  // Check for tie — multiple players share the max vote count
  const tied = Object.entries(voteCounts)
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);

  const isTie = tied.length > 1;
  const isRevote = room.phase === 'revote';

  const updates: Record<string, unknown> = {};
  const events: GameEvent[] = [...(room.events || [])];

  if (isTie && !isRevote) {
    // First tie — move to re-vote with only tied players
    const tiedNames = tied.map(id => room.players[id]?.name).join(' & ');
    events.push({
      type: 'tie',
      message: `Vote tied between ${tiedNames}! Discuss again and re-vote.`,
      timestamp: Date.now(),
    });
    updates[`rooms/${roomCode}/events`] = events;
    updates[`rooms/${roomCode}/phase`] = 'revote';
    updates[`rooms/${roomCode}/tiedPlayers`] = tied;
    updates[`rooms/${roomCode}/dayVotes`] = {};
  } else if (isTie && isRevote) {
    // Second tie — no elimination, move to next night
    events.push({
      type: 'no_kill',
      message: 'Vote tied again — no one was eliminated. Night falls...',
      timestamp: Date.now(),
    });
    updates[`rooms/${roomCode}/events`] = events;
    updates[`rooms/${roomCode}/phase`] = 'night';
    updates[`rooms/${roomCode}/tiedPlayers`] = null;
    updates[`rooms/${roomCode}/dayVotes`] = {};
    updates[`rooms/${roomCode}/round`] = (room.round || 1) + 1;
  } else if (eliminateTarget) {
    updates[`rooms/${roomCode}/players/${eliminateTarget}/isAlive`] = false;
    events.push({
      type: 'eliminated',
      playerId: eliminateTarget,
      playerName: room.players[eliminateTarget]?.name,
      message: `${room.players[eliminateTarget]?.name} was eliminated by town vote.`,
      timestamp: Date.now(),
    });
    updates[`rooms/${roomCode}/events`] = events;
    updates[`rooms/${roomCode}/phase`] = 'night';
    updates[`rooms/${roomCode}/tiedPlayers`] = null;
    updates[`rooms/${roomCode}/dayVotes`] = {};
    updates[`rooms/${roomCode}/round`] = (room.round || 1) + 1;
  }

  await update(ref(db), updates);
  await checkWinCondition(roomCode);
}

// Check if game is over
export async function checkWinCondition(roomCode: string): Promise<void> {
  const snapshot = await get(ref(db, `rooms/${roomCode}/players`));
  const players: Record<string, Player> = snapshot.val();

  const alive = Object.values(players).filter(p => p.isAlive && !p.isGod);
  const aliveMafia = alive.filter(p => p.role === 'mafia');
  const aliveTown = alive.filter(p => p.role !== 'mafia');

  if (aliveMafia.length === 0) {
    await update(ref(db, `rooms/${roomCode}`), { phase: 'game_over', winner: 'town' });
  } else if (aliveMafia.length >= aliveTown.length) {
    await update(ref(db, `rooms/${roomCode}`), { phase: 'game_over', winner: 'mafia' });
  }
}

// Remove a player from the room (kick by host, or self-leave)
export async function removePlayer(roomCode: string, playerId: string): Promise<void> {
  await remove(ref(db, `rooms/${roomCode}/players/${playerId}`));
}

// Cancel and delete the entire room
export async function cancelRoom(roomCode: string): Promise<void> {
  await remove(ref(db, `rooms/${roomCode}`));
}

// Restart game — reset all players to alive, clear game state, return to lobby
export async function restartGame(roomCode: string): Promise<void> {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  const room: Room = snapshot.val();

  const updates: Record<string, unknown> = {};
  Object.keys(room.players).forEach(id => {
    updates[`rooms/${roomCode}/players/${id}/isAlive`] = true;
    updates[`rooms/${roomCode}/players/${id}/role`] = 'civilian';
    updates[`rooms/${roomCode}/players/${id}/isGod`] = false;
  });
  updates[`rooms/${roomCode}/phase`] = 'lobby';
  updates[`rooms/${roomCode}/winner`] = null;
  updates[`rooms/${roomCode}/events`] = [];
  updates[`rooms/${roomCode}/mafiaVotes`] = {};
  updates[`rooms/${roomCode}/dayVotes`] = {};
  updates[`rooms/${roomCode}/doctorSave`] = null;
  updates[`rooms/${roomCode}/policeChecks`] = null;
  updates[`rooms/${roomCode}/nightKillTarget`] = null;
  updates[`rooms/${roomCode}/tiedPlayers`] = null;
  updates[`rooms/${roomCode}/round`] = 1;

  await update(ref(db), updates);
}

// Subscribe to room changes
export function subscribeToRoom(roomCode: string, callback: (room: Room) => void) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  onValue(roomRef, snapshot => {
    if (snapshot.exists()) callback(snapshot.val());
  });
  return () => off(roomRef);
}
