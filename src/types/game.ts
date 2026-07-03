export type Role = 'god' | 'mafia' | 'police' | 'doctor' | 'civilian';

export type Phase =
  | 'lobby'
  | 'night'
  | 'mafia_wake'
  | 'police_wake'
  | 'doctor_wake'
  | 'day'
  | 'vote'
  | 'revote'
  | 'game_over';

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isGod: boolean;
}

export interface MafiaVote {
  voterId: string;
  targetId: string;
}

export interface DayVote {
  voterId: string;
  targetId: string;
}

export interface GameEvent {
  type: 'killed' | 'saved' | 'eliminated' | 'no_kill' | 'tie';
  playerId?: string;
  playerName?: string;
  message: string;
  timestamp: number;
}

export interface PoliceCheck {
  suspectId: string;
  result: 'yes' | 'no' | 'pending';
}

export interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  players: Record<string, Player>;
  mafiaVotes: Record<string, string>; // voterId -> targetId
  dayVotes: Record<string, string>;   // voterId -> targetId
  doctorSave: string | null;          // playerId being saved
  policeCheck: PoliceCheck | null;
  nightKillTarget: string | null;
  tiedPlayers?: string[] | null;
  events: GameEvent[];
  winner: 'mafia' | 'town' | null;
  round: number;
  createdAt: number;
}
