'use client';
import { useEffect, useState } from 'react';
import { subscribeToRoom } from '@/lib/game';
import { Room } from '@/types/game';

export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      setRoom(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [roomCode]);

  return { room, loading };
}
