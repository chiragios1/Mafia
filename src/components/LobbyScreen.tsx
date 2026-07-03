'use client';
import { useState } from 'react';
import { Room } from '@/types/game';
import { RoleConfig } from '@/lib/game';

interface Props {
  room: Room;
  playerId: string;
  onStartGame: (godId: string, config: RoleConfig) => Promise<void>;
  onKick: (targetId: string) => Promise<void>;
  onLeave: () => Promise<void>;
}

export default function LobbyScreen({ room, playerId, onStartGame, onKick, onLeave }: Props) {
  const [selectedGod, setSelectedGod] = useState(playerId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleConfig, setRoleConfig] = useState<RoleConfig>({ mafiaCount: 1, policeCount: 1, doctorCount: 1 });

  function adjust(role: keyof RoleConfig, delta: number) {
    setRoleConfig(prev => ({ ...prev, [role]: Math.max(0, prev[role] + delta) }));
  }

  const players = Object.values(room.players || {});
  const isHost = room.hostId === playerId;
  const roomCode = room.code;

  const nonGodCount = players.length - 1;
  const assignedCount = roleConfig.mafiaCount + roleConfig.policeCount + roleConfig.doctorCount;
  const civilianCount = nonGodCount - assignedCount;
  const roleConfigValid = roleConfig.mafiaCount >= 1 && civilianCount >= 0;

  async function handleStart() {
    if (players.length < 4) return setError('Need at least 4 players to start');
    if (!roleConfigValid) return setError('Invalid role setup — check your role counts');
    setLoading(true);
    try {
      await onStartGame(selectedGod, roleConfig);
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
              {/* Host sees kick button on everyone except themselves */}
              {isHost && p.id !== playerId && (
                <button
                  onClick={() => onKick(p.id)}
                  className="text-xs text-gray-500 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  Kick
                </button>
              )}
              {/* Non-host sees leave button only on their own row */}
              {!isHost && p.id === playerId && (
                <button
                  onClick={onLeave}
                  className="text-xs text-gray-500 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10"
                >
                  Leave
                </button>
              )}
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

          {/* Role Setup */}
          <div className="mt-6">
            <h3 className="text-gray-300 text-sm uppercase tracking-wider font-semibold mb-3">
              Role Setup
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              {(
                [
                  { key: 'mafiaCount', label: 'Mafia', color: 'text-red-400' },
                  { key: 'policeCount', label: 'Police', color: 'text-blue-400' },
                  { key: 'doctorCount', label: 'Doctor', color: 'text-green-400' },
                ] as const
              ).map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`font-medium ${color}`}>{label}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjust(key, -1)}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-white font-bold">{roleConfig[key]}</span>
                    <button
                      onClick={() => adjust(key, 1)}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="border-t border-white/10 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Civilians</span>
                  <span className={civilianCount < 0 ? 'text-red-400 font-bold' : 'text-gray-300'}>
                    {civilianCount < 0 ? `${civilianCount} (too many roles!)` : civilianCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Non-god players</span>
                  <span className="text-gray-300">{nonGodCount}</span>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}

          <button
            onClick={handleStart}
            disabled={loading || players.length < 4 || !roleConfigValid}
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
