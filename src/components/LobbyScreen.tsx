'use client';
import { useState } from 'react';
import { Room } from '@/types/game';

interface Props {
  room: Room;
  playerId: string;
  onStartGame: (godId: string) => Promise<void>;
}

export default function LobbyScreen({ room, playerId, onStartGame }: Props) {
  const [selectedGod, setSelectedGod] = useState(playerId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const players = Object.values(room.players || {});
  const isHost = room.hostId === playerId;
  const roomCode = room.code;

  async function handleStart() {
    if (players.length < 4) return setError('Need at least 4 players to start');
    setLoading(true);
    try {
      await onStartGame(selectedGod);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh phase-night p-4 flex flex-col items-center">
      {/* Header */}
      <div className="text-center mt-8 mb-6">
        <h2 className="text-2xl font-black text-red-500 tracking-widest">MAFIA</h2>
        <p className="text-gray-400 text-sm mt-1">Waiting for players...</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-gray-500 text-xs uppercase tracking-wider">Room Code</span>
          <span className="bg-white/10 border border-white/20 rounded-lg px-4 py-1.5 text-white font-mono font-bold tracking-[0.3em] text-lg">
            {roomCode}
          </span>
        </div>
      </div>

      {/* Player List */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-300 text-sm uppercase tracking-wider font-semibold">
            Players ({players.length}/50)
          </h3>
          <span className="text-gray-500 text-xs">Share the code above</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {players.map(p => (
            <div
              key={p.id}
              className={`flex items-center justify-between bg-white/5 border rounded-xl px-4 py-3 ${
                p.id === playerId ? 'border-red-500/40' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-gray-300">
                  {p.name[0]?.toUpperCase()}
                </div>
                <span className="text-white font-medium">{p.name}</span>
                {p.id === playerId && <span className="text-xs text-red-400">(you)</span>}
                {p.id === room.hostId && <span className="text-xs text-yellow-400">host</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* God Selection — only host sees this */}
      {isHost && (
        <div className="w-full max-w-sm mt-6">
          <h3 className="text-gray-300 text-sm uppercase tracking-wider font-semibold mb-3">
            Select God (Narrator)
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedGod(p.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition ${
                  selectedGod === p.id
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <span className="text-lg">{selectedGod === p.id ? '👑' : '○'}</span>
                <span className="font-medium">{p.name}</span>
                {p.id === playerId && <span className="text-xs text-gray-500">(you)</span>}
              </button>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading || players.length < 4}
            className="w-full mt-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl glow-red transition"
          >
            {loading ? 'Starting...' : players.length < 4 ? `Need ${4 - players.length} more player(s)` : 'Start Game'}
          </button>
        </div>
      )}

      {!isHost && (
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Waiting for the host to start the game...</p>
        </div>
      )}
    </main>
  );
}
