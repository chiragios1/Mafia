'use client';
import { useEffect, useRef } from 'react';
import { Room } from '@/types/game';
import GodPanel from './GodPanel';
import RoleScreen from './RoleScreen';
import { playKillSound, playSaveSound } from '@/lib/sounds';

interface Props {
  room: Room;
  playerId: string;
  roomCode: string;
}

export default function GameScreen({ room, playerId, roomCode }: Props) {
  const player = room.players?.[playerId];
  const prevEventCount = useRef(room.events?.length ?? 0);

  useEffect(() => {
    const events = room.events || [];
    if (events.length > prevEventCount.current) {
      const latest = events[events.length - 1];
      if (latest.type === 'killed') playKillSound();
      if (latest.type === 'saved') playSaveSound();
    }
    prevEventCount.current = events.length;
  }, [room.events?.length]);

  if (!player) return null;

  if (player.isGod) {
    return <GodPanel room={room} playerId={playerId} roomCode={roomCode} />;
  }

  return <RoleScreen room={room} playerId={playerId} roomCode={roomCode} />;
}
