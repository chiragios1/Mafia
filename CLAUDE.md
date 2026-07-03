# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

No test suite is configured.

## Environment variables

Create `.env.local` with these Firebase keys before running:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Architecture

**Stack:** Next.js 16 App Router · React 19 · Firebase Realtime Database · Tailwind CSS 4

**Data flow:** All game state lives in Firebase under `rooms/<code>`. Clients subscribe via `subscribeToRoom` (which wraps Firebase's `onValue`) through the `useRoom` hook. There is no server-side API — every mutation is a direct Firebase `update`/`set` call from `src/lib/game.ts`.

**Key files:**

| File | Purpose |
|------|---------|
| `src/types/game.ts` | All shared types: `Role`, `Phase`, `Player`, `Room`, etc. |
| `src/lib/firebase.ts` | Firebase app init; exports `db` (Realtime Database instance) |
| `src/lib/game.ts` | All game logic — room creation/joining, role assignment, phase transitions, vote resolution, win-condition checks |
| `src/hooks/useRoom.ts` | `useRoom(roomCode)` — subscribes to Firebase and returns live `Room` state |
| `src/app/page.tsx` | Home page — create or join a room; stores `playerId` in `sessionStorage` |
| `src/app/room/[code]/page.tsx` | Room page — reads `playerId` from `sessionStorage`, routes to `LobbyScreen` or `GameScreen` based on phase |
| `src/components/RoleScreen.tsx` | Per-role night/day action UI (mafia vote, doctor save, police check, civilian wait) |
| `src/components/GodPanel.tsx` | God (moderator) view — advances phases, sees all roles, resolves night/day |

**Game phases (in order):** `lobby` → `night` → `mafia_wake` → `police_wake` → `doctor_wake` → `day` → `vote` → (back to `night` or) `game_over`

**Role assignment:** `assignRoles` in `game.ts` — 1 mafia per 5 non-god players, always 1 police and 1 doctor if enough players, rest are civilians. The first player to create the room becomes `god` (moderator/narrator).

**Player identity:** No auth. `playerId` is a random ID stored only in `sessionStorage`; losing the session means losing access to that player slot.
