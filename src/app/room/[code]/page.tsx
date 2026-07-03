'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/hooks/useRoom';
import { startGame, removePlayer } from '@/lib/game';
import GameScreen from '@/components/GameScreen';
import LobbyScreen from '@/components/LobbyScreen';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
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
    // Kicked or left — send back to home
    router.replace('/');
    return null;
  }

  if (room.phase === 'lobby') {
    return (
      <LobbyScreen
        room={room}
        playerId={playerId}
        onStartGame={async (godId, config) => {
          await startGame(code, godId, config);
        }}
        onKick={async (targetId) => {
          await removePlayer(code, targetId);
        }}
        onLeave={async () => {
          await removePlayer(code, playerId);
          router.replace('/');
        }}
      />
    );
  }

  return <GameScreen room={room} playerId={playerId} roomCode={code} />;
}
