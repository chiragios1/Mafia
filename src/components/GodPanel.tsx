'use client';
import { Room, Phase } from '@/types/game';
import { setPhase, resolveNight, resolveDay, cancelRoom, restartGame } from '@/lib/game';

interface Props {
  room: Room;
  playerId: string;
  roomCode: string;
}

const PHASE_LABELS: Record<Phase, string> = {
  lobby: 'Lobby',
  night: 'Night — City Sleeping',
  mafia_wake: 'Mafia is Awake',
  police_wake: 'Police is Awake',
  doctor_wake: 'Doctor is Awake',
  day: 'Day — Discussion',
  vote: 'Day Vote',
  revote: 'Re-vote — Tie Breaker',
  game_over: 'Game Over',
};

const PHASE_COLORS: Record<Phase, string> = {
  lobby: 'text-gray-400',
  night: 'text-indigo-400',
  mafia_wake: 'text-red-400',
  police_wake: 'text-blue-400',
  doctor_wake: 'text-green-400',
  day: 'text-yellow-400',
  vote: 'text-orange-400',
  revote: 'text-pink-400',
  game_over: 'text-purple-400',
};

export default function GodPanel({ room, playerId, roomCode }: Props) {
  const phase = room.phase;
  const players = Object.values(room.players || {});
  const alivePlayers = players.filter(p => p.isAlive && !p.isGod);
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
  const aliveTown = alivePlayers.filter(p => p.role !== 'mafia');
  const events = room.events || [];

  const mafiaVoteCount = Object.keys(room.mafiaVotes || {}).length;
  const totalMafia = aliveMafia.length;
  const policeCheck = room.policeCheck;

  async function advance(next: Phase) {
    await setPhase(roomCode, next);
  }

  return (
    <main className="min-h-dvh bg-[#0d0d1a] p-4 pb-8">
      {/* Header */}
      <div className="text-center pt-6 pb-4 animate-fade-in-down">
        <div className="text-xs text-gray-600 uppercase tracking-[0.3em] mb-1">God Panel</div>
        <div className={`font-display text-4xl ${PHASE_COLORS[phase]}`}>{PHASE_LABELS[phase]}</div>
        <div className="text-gray-600 text-xs uppercase tracking-widest mt-1">Round {room.round}</div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{alivePlayers.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Alive</div>
        </div>
        <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{aliveMafia.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Mafia</div>
        </div>
        <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{aliveTown.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Town</div>
        </div>
      </div>

      {/* Phase Controls */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Game Controls</h3>

        {/* NIGHT phase — advance to mafia wake */}
        {phase === 'night' && (
          <div className="space-y-2">
            <p className="text-gray-400 text-sm mb-3">Say: <span className="text-white italic">"Everyone close your eyes, the city is sleeping..."</span></p>
            <button onClick={() => advance('mafia_wake')} className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition glow-red">
              🔪 Wake Mafia
            </button>
          </div>
        )}

        {/* MAFIA WAKE */}
        {phase === 'mafia_wake' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Say: <span className="text-white italic">"Mafia, open your eyes and choose your victim."</span></p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <span className="text-red-400 text-sm">{mafiaVoteCount}/{totalMafia} mafia voted</span>
            </div>
            <button onClick={() => advance('police_wake')} className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition glow-blue">
              🔍 Wake Police
            </button>
          </div>
        )}

        {/* POLICE WAKE */}
        {phase === 'police_wake' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Say: <span className="text-white italic">"Police, open your eyes. Point to who you suspect."</span></p>

            {policeCheck ? (
              <div className={`rounded-xl p-4 border ${policeCheck.result === 'yes' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 text-center">Police identified</p>
                <p className="text-white font-bold text-center text-lg">{room.players?.[policeCheck.suspectId]?.name}</p>
                <p className={`text-center text-sm font-bold mt-1 ${policeCheck.result === 'yes' ? 'text-red-400' : 'text-green-400'}`}>
                  {policeCheck.result === 'yes' ? '🔴 Is Mafia' : '🟢 Is not Mafia'}
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                <p className="text-blue-300 text-sm animate-pulse">Waiting for police to identify a suspect...</p>
              </div>
            )}

            <button onClick={() => advance('doctor_wake')} className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition glow-green">
              💊 Wake Doctor
            </button>
          </div>
        )}

        {/* DOCTOR WAKE */}
        {phase === 'doctor_wake' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Say: <span className="text-white italic">"Doctor, open your eyes. Choose who to save tonight."</span></p>
            {room.doctorSave && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <span className="text-green-400 text-sm">Doctor chose to save someone ✓</span>
              </div>
            )}
            <button
              onClick={async () => { await resolveNight(roomCode); }}
              className="w-full bg-yellow-700 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl transition glow-yellow"
            >
              🌅 End Night — Reveal Results
            </button>
          </div>
        )}

        {/* DAY */}
        {phase === 'day' && (
          <div className="space-y-3">
            {events.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-yellow-300 text-sm font-medium">{events[events.length - 1]?.message}</p>
              </div>
            )}
            <p className="text-gray-400 text-sm">Let players discuss. When ready, start the vote.</p>
            <button onClick={() => advance('vote')} className="w-full bg-orange-700 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition">
              🗳️ Start Elimination Vote
            </button>
          </div>
        )}

        {/* VOTE */}
        {phase === 'vote' && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Players are voting to eliminate a suspect.</p>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
              <span className="text-orange-400 text-sm">
                {Object.keys(room.dayVotes || {}).length}/{alivePlayers.length} voted
              </span>
            </div>
            <button
              onClick={async () => { await resolveDay(roomCode); }}
              className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition glow-red"
            >
              ⚖️ Resolve Vote & Start New Night
            </button>
          </div>
        )}

        {/* REVOTE */}
        {phase === 'revote' && (
          <div className="space-y-3">
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3">
              <p className="text-pink-300 text-sm font-semibold mb-1 text-center">Tie — Re-vote</p>
              <p className="text-gray-400 text-xs text-center mb-2">Only these players can be voted on:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {(room.tiedPlayers || []).map(id => (
                  <span key={id} className="bg-pink-500/20 text-pink-300 text-xs font-bold px-3 py-1 rounded-full">
                    {room.players?.[id]?.name}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-gray-400 text-sm text-center">
              {Object.keys(room.dayVotes || {}).length}/{alivePlayers.length} voted
            </p>
            <button
              onClick={async () => { await resolveDay(roomCode); }}
              className="w-full bg-pink-700 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition"
            >
              ⚖️ Resolve Re-vote
            </button>
          </div>
        )}

        {/* GAME OVER */}
        {phase === 'game_over' && (
          <div className="text-center py-4 space-y-4">
            <div>
              <div className="text-4xl mb-3">{room.winner === 'mafia' ? '🔪' : '🏛️'}</div>
              <h2 className="text-2xl font-black text-white mb-1">
                {room.winner === 'mafia' ? 'Mafia Wins!' : 'Town Wins!'}
              </h2>
              <p className="text-gray-400 text-sm">The game is over.</p>
            </div>
            <button
              onClick={async () => { await restartGame(roomCode); }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition"
            >
              🔄 Restart Game
            </button>
          </div>
        )}
      </div>

      {/* Danger zone — always visible to god */}
      <div className="mt-4 text-center">
        <button
          onClick={async () => { await cancelRoom(roomCode); }}
          className="text-gray-600 hover:text-red-400 text-sm transition"
        >
          Cancel &amp; Delete Room
        </button>
      </div>

      {/* All Players Overview */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">All Players & Roles</h3>
        <div className="space-y-2">
          {players.filter(p => !p.isGod).map(p => (
            <div key={p.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${p.isAlive ? 'bg-white/5' : 'bg-white/2 opacity-40'}`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{p.isAlive ? '🟢' : '💀'}</span>
                <span className={`font-medium ${p.isAlive ? 'text-white' : 'text-gray-500 line-through'}`}>{p.name}</span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                p.role === 'mafia' ? 'bg-red-500/20 text-red-400' :
                p.role === 'police' ? 'bg-blue-500/20 text-blue-400' :
                p.role === 'doctor' ? 'bg-green-500/20 text-green-400' :
                'bg-white/10 text-gray-400'
              }`}>
                {p.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Event Log */}
      {events.length > 0 && (
        <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Event Log</h3>
          <div className="space-y-2">
            {[...events].reverse().map((e, i) => (
              <p key={i} className="text-sm text-gray-300">{e.message}</p>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
