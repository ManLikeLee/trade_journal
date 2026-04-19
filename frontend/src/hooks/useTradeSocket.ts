'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth';

let socket: Socket | null = null;

export function useTradeSocket() {
  const qc = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();
  const connected = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (connected.current) return;

    socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000'}/ws`,
      {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    );

    socket.on('connect', () => {
      connected.current = true;
      console.log('[WS] connected');
    });

    socket.on('disconnect', () => {
      connected.current = false;
    });

    // Invalidate React Query caches on server-pushed events
    socket.on('trade:created', () => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    });

    socket.on('trade:updated', (trade: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['trade', trade.id] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    });

    socket.on('trade:deleted', (payload: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.removeQueries({ queryKey: ['trade', payload.id] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    });

    socket.on('analytics:refresh', () => {
      qc.invalidateQueries({ queryKey: ['analytics'] });
    });

    return () => {
      socket?.disconnect();
      socket = null;
      connected.current = false;
    };
  }, [isAuthenticated, accessToken, qc]);

  return { socket };
}
