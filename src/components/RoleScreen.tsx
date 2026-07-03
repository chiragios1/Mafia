'use client';
import { Room, Phase, Player } from '@/types/game';
import { castMafiaVote, doctorSave, castPoliceVote, castDayVote } from '@/lib/game';
import { useState, useEffect } from 'react';

interface Props {
  room: Room;
  playerId: string;
  roomCode: string;
}

// What each role sees during each phase
function shouldBeActive(playerRole: string, phase: Phase): boolean {
  if (phase === 'mafia_wake') return playerRole === 'mafia';
  if (phase === 'police_wake') return playerRole === 'police';
  if (phase === 'doctor_wake') return playerRole === 'doctor';
  if (phase === 'day' || phase === 'vote' || phase === 'revote') return true;
  return false;
}

const ROLE_CONFIG = {
  mafia:    { color: 'text-red-400',    cardBg: 'bg-red-950',   cardBorder: 'border-red-500',   bg: 'phase-mafia',   icon: '🔪', label: 'MAFIA',      desc: 'Eliminate the town — one by one.' },
  police:   { color: 'text-blue-400',   cardBg: 'bg-blue-950',  cardBorder: 'border-blue-500',  bg: 'phase-police',  icon: '🔍', label: 'POLICE',   desc: 'Find the Mafia before it\'s too late.' },
  doctor:   { color: 'text-green-400',  cardBg: 'bg-green-950', cardBorder: 'border-green-500', bg: 'phase-doctor',  icon: '💊', label: 'DOCTOR',      desc: 'Save one life each night.' },
  civilian: { color: 'text-gray-200',   cardBg: 'bg-gray-800',  cardBorder: 'border-gray-500',  bg: 'phase-night',   icon: '👤', label: 'CIVILIAN',    desc: 'Find the Mafia and vote them out.' },
  god:      { color: 'text-yellow-300', cardBg: 'bg-yellow-950',cardBorder: 'border-yellow-500',bg: 'phase-night',   icon: '👑', label: 'GOD',         desc: 'You are the narrator. Guide the game.' },
};

export default function RoleScreen({ room, playerId, roomCode }: Props) {
  const player = room.players?.[playerId];

  const storageKey = `roleHidden_${roomCode}_${playerId}`;
  const [roleHidden, setRoleHidden] = useState(false);
  const [peeking, setPeeking] = useState(false);

  // Read confirmation from sessionStorage once on mount
  useEffect(() => {
    setRoleHidden(sessionStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  function hideRole() {
    sessionStorage.setItem(storageKey, 'true');
    setRoleHidden(true);
  }

  function peek() {
    setPeeking(true);
    setTimeout(() => setPeeking(false), 4000);
  }

  if (!player) return null;

  const role = player.role;
  const phase = room.phase;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.civilian;
  const active = shouldBeActive(role, phase);
  const players = Object.values(room.players || {});
  const alivePlayers = players.filter(p => p.isAlive && !p.isGod && p.id !== playerId);
  const events = room.events || [];
  const lastEvent = events[events.length - 1];

  if (!player.isAlive) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center phase-night p-6 text-center">
        <div className="text-6xl mb-4">💀</div>
        <h2 className="text-2xl font-black text-gray-300 mb-2">You are Dead</h2>
        <p className="text-gray-500 text-sm">Watch the game unfold...</p>
        {lastEvent && <p className="text-gray-400 text-sm mt-4 italic">{lastEvent.message}</p>}
      </div>
    );
  }

  // SLEEP SCREEN — shown to all non-active roles during night phases
  if (['night', 'mafia_wake', 'police_wake', 'doctor_wake'].includes(phase) && !active) {
    const showCard = !roleHidden || peeking;

    return (
      <div className="min-h-dvh flex flex-col items-center justify-center phase-night p-6 text-center gap-8">
        <div className="animate-fade-in-down">
          <div className="text-5xl mb-3 animate-breathe">😴</div>
          <h2 className="font-display text-3xl text-indigo-300">City is Sleeping</h2>
          <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase">Keep your eyes closed...</p>
        </div>

        {showCard ? (
          /* Role card — full reveal */
          <div className="w-full max-w-xs flex flex-col items-center gap-4">
            <div className={`w-full rounded-3xl border-2 ${config.cardBorder} ${config.cardBg} p-8 flex flex-col items-center gap-3 animate-pop-in`}>
              <div className="text-7xl animate-heartbeat">{config.icon}</div>
              <div className={`font-display text-6xl ${config.color}`}>{config.label}</div>
              <div className="text-gray-400 text-sm">{config.desc}</div>
            </div>
            {!roleHidden && (
              <button
                onClick={hideRole}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-2xl transition text-sm"
              >
                Got it — hide my role
              </button>
            )}
            {peeking && (
              <p className="text-gray-500 text-xs">Role hidden again in a moment...</p>
            )}
          </div>
        ) : (
          /* Hidden state — just a peek button */
          <button
            onClick={peek}
            className={`w-full max-w-xs border-2 border-dashed ${config.cardBorder} rounded-3xl py-8 flex flex-col items-center gap-2 opacity-40 hover:opacity-70 transition`}
          >
            <div className="text-3xl">👁</div>
            <span className="text-gray-400 text-sm">Tap to peek your role</span>
          </button>
        )}
      </div>
    );
  }

  // GAME OVER
  if (phase === 'game_over') {
    const won =
      (room.winner === 'mafia' && role === 'mafia') ||
      (room.winner === 'town' && role !== 'mafia');
    return (
      <div className={`min-h-dvh flex flex-col items-center justify-center p-6 text-center ${config.bg}`}>
        <div className="text-6xl mb-4">{won ? '🏆' : '💔'}</div>
        <h2 className="text-3xl font-black text-white mb-3">{won ? 'You Win!' : 'You Lose!'}</h2>
        <div className={`flex items-center gap-2 px-5 py-2 rounded-full border ${config.cardBorder} ${config.cardBg}`}>
          <span className="text-xl">{config.icon}</span>
          <span className={`font-black uppercase tracking-widest text-sm ${config.color}`}>{config.label}</span>
        </div>
        <p className="text-gray-400 mt-4 text-sm">
          {room.winner === 'mafia' ? 'The Mafia took over the city.' : 'The town eliminated all Mafia members.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-dvh flex flex-col p-4 pb-8 ${active ? config.bg : 'phase-night'}`}>
      {/* Role Header */}
      <div className={`rounded-2xl border ${config.cardBorder} ${config.cardBg} px-5 py-4 mt-4 mb-5 flex items-center gap-4 animate-fade-in-down`}>
        <div className="text-5xl">{config.icon}</div>
        <div>
          <div className={`font-display text-4xl leading-none ${config.color}`}>{config.label}</div>
          <div className="text-gray-400 text-xs mt-1">{config.desc}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-gray-500 text-xs uppercase tracking-wider">Round</div>
          <div className="text-white font-bold text-lg">{room.round}</div>
        </div>
      </div>

      {/* Phase-specific content */}
      {active && (
        <div className="flex-1">
          {/* MAFIA VOTING */}
          {phase === 'mafia_wake' && role === 'mafia' && (
            <MafiaVotePanel
              alivePlayers={alivePlayers.filter(p => p.role !== 'mafia')}
              allMafia={players.filter(p => p.role === 'mafia' && p.id !== playerId && p.isAlive)}
              votes={room.mafiaVotes || {}}
              playerId={playerId}
              players={room.players || {}}
              onVote={(targetId) => castMafiaVote(roomCode, playerId, targetId)}
            />
          )}

          {/* POLICE CHECK */}
          {phase === 'police_wake' && role === 'police' && (
            <PoliceCheckPanel
              alivePlayers={alivePlayers}
              policeVotes={room.policeVotes || {}}
              policeCheck={room.policeCheck}
              playerId={playerId}
              onVote={(suspectId) => castPoliceVote(roomCode, playerId, suspectId)}
            />
          )}

          {/* DOCTOR SAVE */}
          {phase === 'doctor_wake' && role === 'doctor' && (
            <DoctorSavePanel
              alivePlayers={players.filter(p => p.isAlive && !p.isGod)}
              doctorSave={room.doctorSave}
              onSave={(targetId) => doctorSave(roomCode, targetId)}
            />
          )}

          {/* DAY DISCUSSION */}
          {phase === 'day' && (
            <DayPanel lastEvent={lastEvent} />
          )}

          {/* DAY VOTE */}
          {phase === 'vote' && (
            <VotePanel
              alivePlayers={alivePlayers}
              dayVotes={room.dayVotes || {}}
              playerId={playerId}
              players={room.players || {}}
              onVote={(targetId) => castDayVote(roomCode, playerId, targetId)}
            />
          )}

          {/* RE-VOTE */}
          {phase === 'revote' && (
            <div className="space-y-3">
              <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-3 text-center">
                <p className="text-pink-300 text-sm font-semibold">Tie! Vote again — only tied players</p>
              </div>
              <VotePanel
                alivePlayers={alivePlayers.filter(p => (room.tiedPlayers || []).includes(p.id))}
                dayVotes={room.dayVotes || {}}
                playerId={playerId}
                players={room.players || {}}
                onVote={(targetId) => castDayVote(roomCode, playerId, targetId)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Sub-panels ---

function MafiaVotePanel({
  alivePlayers, allMafia, votes, playerId, players, onVote
}: {
  alivePlayers: Player[];
  allMafia: Player[];
  votes: Record<string, string>;
  playerId: string;
  players: Record<string, Player>;
  onVote: (id: string) => void;
}) {
  const myVote = votes[playerId];

  return (
    <div className="space-y-4">
      {allMafia.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <p className="text-red-300 text-xs uppercase tracking-wider font-semibold mb-2">Your team</p>
          {allMafia.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-red-200 text-sm py-1">
              <span>🔪</span><span>{p.name}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-gray-400 text-sm mb-3 text-center">Choose your victim</p>
        <div className="space-y-2">
          {alivePlayers.map(p => {
            const votedFor = Object.entries(votes).filter(([, t]) => t === p.id).length;
            return (
              <button
                key={p.id}
                onClick={() => onVote(p.id)}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition ${
                  myVote === p.id
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-red-500/50'
                }`}
              >
                <span className="font-medium">{p.name}</span>
                {votedFor > 0 && (
                  <span className="text-xs text-red-400">{votedFor} vote{votedFor > 1 ? 's' : ''}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {myVote && (
        <div className="text-center text-green-400 text-sm">
          ✓ You voted for {players[myVote]?.name}
        </div>
      )}
    </div>
  );
}

function PoliceCheckPanel({
  alivePlayers, policeVotes, policeCheck: check, playerId, onVote
}: {
  alivePlayers: Player[];
  policeVotes: Record<string, string>;
  policeCheck: { suspectId: string; result: string } | null;
  playerId: string;
  onVote: (id: string) => void;
}) {
  const myVote = policeVotes[playerId];

  // Result revealed by god
  if (check) {
    return (
      <div className="space-y-4">
        <p className="text-gray-400 text-sm text-center">God has revealed the answer</p>
        <div className={`rounded-2xl p-5 text-center border animate-pop-in ${
          check.result === 'yes' ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'
        }`}>
          <div className="text-3xl mb-2">{check.result === 'yes' ? '🔴' : '🟢'}</div>
          <p className="text-white font-bold">
            {check.result === 'yes' ? 'Yes — They are Mafia!' : 'No — They are not Mafia.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm text-center">Vote — who do you suspect is Mafia?</p>
      <div className="space-y-2">
        {alivePlayers.map(p => {
          const votedFor = Object.values(policeVotes).filter(id => id === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => onVote(p.id)}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition ${
                myVote === p.id
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:border-blue-500/40'
              }`}
            >
              <span className="font-medium">{p.name}</span>
              {votedFor > 0 && (
                <span className="text-xs text-blue-400">{votedFor} vote{votedFor > 1 ? 's' : ''}</span>
              )}
            </button>
          );
        })}
      </div>
      {myVote && (
        <p className="text-center text-blue-400 text-sm">✓ Voted — waiting for God to reveal...</p>
      )}
    </div>
  );
}

function DoctorSavePanel({
  alivePlayers, doctorSave: saved, onSave
}: {
  alivePlayers: Player[];
  doctorSave: string | null;
  onSave: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm text-center">Choose one player to protect tonight</p>

      {saved ? (
        <div className="rounded-2xl p-5 text-center border border-green-500 bg-green-500/10">
          <div className="text-3xl mb-2">🛡️</div>
          <p className="text-green-300 font-bold">Player protected!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alivePlayers.map(p => (
            <button
              key={p.id}
              onClick={() => onSave(p.id)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border border-white/10 bg-white/5 text-gray-300 hover:border-green-500/50 transition"
            >
              <span className="font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DayPanel({ lastEvent }: { lastEvent?: { message: string; type: string } }) {
  return (
    <div className="space-y-4">
      {lastEvent && (
        <div className={`rounded-2xl p-5 text-center border ${
          lastEvent.type === 'killed' ? 'border-red-500/40 bg-red-500/10' :
          lastEvent.type === 'saved' ? 'border-green-500/40 bg-green-500/10' :
          'border-white/20 bg-white/5'
        }`}>
          <p className="text-white text-base font-medium">{lastEvent.message}</p>
        </div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
        <p className="text-yellow-300 font-semibold mb-1">Discussion Time</p>
        <p className="text-gray-400 text-sm">Talk with other players. Share your suspicions. Waiting for God to start the vote...</p>
      </div>
    </div>
  );
}

function VotePanel({
  alivePlayers, dayVotes, playerId, players, onVote
}: {
  alivePlayers: Player[];
  dayVotes: Record<string, string>;
  playerId: string;
  players: Record<string, Player>;
  onVote: (id: string) => void;
}) {
  const myVote = dayVotes[playerId];

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm text-center">Vote to eliminate a suspect</p>
      <div className="space-y-2">
        {alivePlayers.map(p => {
          const votedFor = Object.entries(dayVotes).filter(([, t]) => t === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => !myVote && onVote(p.id)}
              disabled={!!myVote}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition ${
                myVote === p.id
                  ? 'border-orange-500 bg-orange-500/20 text-white'
                  : myVote
                  ? 'border-white/5 bg-white/3 text-gray-500 cursor-not-allowed opacity-60'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:border-orange-500/50'
              }`}
            >
              <span className="font-medium">{p.name}</span>
              {votedFor > 0 && (
                <span className="text-xs text-orange-400">{votedFor} vote{votedFor > 1 ? 's' : ''}</span>
              )}
            </button>
          );
        })}
      </div>
      {myVote && (
        <div className="text-center text-green-400 text-sm">
          ✓ Voted for {players[myVote]?.name}. Waiting for others...
        </div>
      )}
    </div>
  );
}
