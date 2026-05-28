'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { startGame } from '@/lib/game';
import GameScreen from '@/components/GameScreen';
import LobbyScreen from '@/components/LobbyScreen';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const { room, loading } = useRoom(code);
  const [playerId, setPlayerId] = useState('');

  useEffect(() => {
    const id = sessionStorage.getItem('playerId') || '';
    setPlayerId(id);
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center phase-night">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌙</div>
          <p className="text-gray-400">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-dvh flex items-center justify-center phase-night">
        <p className="text-red-400">Room not found.</p>
      </div>
    );
  }

  const player = room.players?.[playerId];

  if (!player) {
    return (
      <div className="min-h-dvh flex items-center justify-center phase-night">
        <p className="text-red-400">You are not in this room.</p>
      </div>
    );
  }

  if (room.phase === 'lobby') {
    return (
      <LobbyScreen
        room={room}
        playerId={playerId}
        onStartGame={async (godId: string) => {
          await startGame(code, godId);
        }}
      />
    );
  }

  return <GameScreen room={room} playerId={playerId} roomCode={code} />;
}
