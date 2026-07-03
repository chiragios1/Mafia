'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { joinRoom } from '@/lib/game';

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    try {
      const result = await joinRoom(code.toUpperCase(), name.trim());
      if ('error' in result) return setError(result.error);
      sessionStorage.setItem('playerId', result.playerId);
      sessionStorage.setItem('playerName', name.trim());
      router.push(`/room/${code.toUpperCase()}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 phase-night">
      <div className="text-center mb-8 animate-fade-in-down">
        <h1 className="font-display text-7xl text-red-500 animate-flicker">MAFIA</h1>
        <p className="text-gray-500 mt-1 text-xs tracking-[0.25em] uppercase">You&apos;ve been invited to join a room</p>
      </div>

      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
        <div className="text-center mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Room Code</p>
          <span className="text-white font-mono font-bold tracking-[0.3em] text-2xl">{code.toUpperCase()}</span>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={20}
            autoFocus
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition glow-red"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    </main>
  );
}
