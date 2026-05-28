'use client';
import { Room, Player, Phase } from '@/types/game';
import GodPanel from './GodPanel';
import RoleScreen from './RoleScreen';

interface Props {
  room: Room;
  playerId: string;
  roomCode: string;
}

export default function GameScreen({ room, playerId, roomCode }: Props) {
  const player = room.players?.[playerId];
  if (!player) return null;

  if (player.isGod) {
    return <GodPanel room={room} playerId={playerId} roomCode={roomCode} />;
  }

  return <RoleScreen room={room} playerId={playerId} roomCode={roomCode} />;
}
