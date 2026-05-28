'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom } from '@/lib/game';

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Check your Firebase config in .env.local')), ms)
      ),
    ]);
  }

  async function handleCreate() {
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    try {
      const { roomCode, playerId } = await withTimeout(createRoom(name.trim()));
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('playerName', name.trim());
      router.push(`/room/${roomCode}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name');
    if (!roomCode.trim()) return setError('Enter room code');
    setLoading(true);
    setError('');
    try {
      const result = await withTimeout(joinRoom(roomCode.trim().toUpperCase(), name.trim()));
      if ('error' in result) return setError(result.error);
      sessionStorage.setItem('playerId', result.playerId);
      sessionStorage.setItem('playerName', name.trim());
      router.push(`/room/${roomCode.trim().toUpperCase()}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 phase-night">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-6xl font-black tracking-widest text-red-500 drop-shadow-[0_0_30px_rgba(220,38,38,0.8)]">
          MAFIA
        </h1>
        <p className="text-gray-400 mt-2 text-sm tracking-widest uppercase">The Social Deduction Game</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-6 border border-white/10">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                tab === t ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
          />

          {tab === 'join' && (
            <input
              type="text"
              placeholder="Room code (e.g. AB12CD)"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition uppercase tracking-widest"
            />
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition glow-red mt-2"
          >
            {loading ? 'Loading...' : tab === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      </div>

      <p className="text-gray-600 text-xs mt-8">Up to 50 players per room</p>
    </main>
  );
}
