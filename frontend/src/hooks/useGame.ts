// src/hooks/useGame.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { findAndJoinMatch, sendMove } from "../lib/nakama";

export interface PlayerInfo {
  symbol: string;
  displayName: string;
}

export interface GameState {
  board: string[];
  turn: string;
  players: Record<string, PlayerInfo>;
  winner: string | null;
  status: "waiting" | "playing" | "finished";
  timerDeadline: number;
  moveCount: number;
}

export type GameOverReason = "finished" | "timeout" | "opponent_left";

interface GameOverEvent {
  winner: string | null;
  reason: GameOverReason;
  timedOut?: string;
}

interface UseGameReturn {
  gameState: GameState | null;
  matchId: string | null;
  gameOver: GameOverEvent | null;
  timeLeft: number;
  isMyTurn: boolean;
  isConnecting: boolean;
  error: string | null;
  findGame: (timedMode: boolean) => Promise<void>;
  makeMove: (position: number) => Promise<void>;
  resetGame: () => void;
}

export function useGame(myUserId: string | null): UseGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<GameOverEvent | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const timedModeRef = useRef(false);
  const matchIdRef = useRef<string | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer countdown
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (!gameState || gameState.timerDeadline === 0 || gameState.status !== "playing") {
      setTimeLeft(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((gameState.timerDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    timerIntervalRef.current = setInterval(tick, 500);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [gameState?.timerDeadline, gameState?.status]);

  const handleMessage = useCallback((msg: any) => {
    console.log("[game] message type:", msg.type, msg);
    switch (msg.type) {
      case "waiting":
        break;
      case "game_start":
      case "game_update":
        setGameState(msg.state as GameState);
        break;
      case "game_over":
        setGameState(msg.state ?? null);
        setGameOver({
          winner: msg.winner,
          reason: msg.reason,
          timedOut: msg.timedOut,
        });
        break;
      case "error":
        setError(msg.message ?? "Server error");
        setTimeout(() => setError(null), 3000);
        break;
    }
  }, []);

  const findGame = useCallback(async (timedMode: boolean) => {
    setIsConnecting(true);
    setError(null);
    timedModeRef.current = timedMode;
    try {
      const mid = await findAndJoinMatch(timedMode, handleMessage);
      matchIdRef.current = mid;
      setMatchId(mid);
    } catch (e: any) {
      console.error("[game] findGame error", e);
      setError(e?.message ?? "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  }, [handleMessage]);

  const makeMove = useCallback(async (position: number) => {
    const mid = matchIdRef.current;
    if (!mid || !gameState || gameState.status !== "playing") return;
    if (gameState.turn !== myUserId) return;
    if (gameState.board[position] !== "") return;
    try {
      await sendMove(mid, position, timedModeRef.current);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send move");
    }
  }, [gameState, myUserId]);

  const resetGame = useCallback(() => {
    setGameState(null);
    setMatchId(null);
    matchIdRef.current = null;
    setGameOver(null);
    setError(null);
    setTimeLeft(0);
  }, []);

  const isMyTurn = !!gameState && gameState.status === "playing" && gameState.turn === myUserId;

  return {
    gameState, matchId, gameOver, timeLeft, isMyTurn,
    isConnecting, error, findGame, makeMove, resetGame,
  };
}