// src/lib/nakama.ts
import { Client, Session, Socket } from "@heroiclabs/nakama-js";

const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST ?? "localhost";
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT ?? "7350";
const NAKAMA_USE_SSL = import.meta.env.VITE_NAKAMA_SSL === "true";
const SERVER_KEY = import.meta.env.VITE_SERVER_KEY ?? "defaultkey";

let _client: Client | null = null;
let _session: Session | null = null;
let _socket: Socket | null = null;
let _socketConnected = false;

export function getClient(): Client {
  if (!_client) {
    _client = new Client(SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL, 7000);
  }
  return _client;
}

export async function authenticateWithNickname(nickname: string): Promise<Session> {
  const client = getClient();
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  const session = await client.authenticateDevice(deviceId, true, nickname);
  _session = session;
  return session;
}

export function getSession(): Session | null {
  return _session;
}

export async function openSocket(): Promise<Socket> {
  if (_socket && _socketConnected) return _socket;

  const client = getClient();
  if (!_session) throw new Error("No session — authenticate first");

  _socket = client.createSocket(NAKAMA_USE_SSL, false);
  _socket.ondisconnect = () => {
    console.log("[nakama] socket disconnected");
    _socketConnected = false;
    _socket = null;
  };
  await _socket.connect(_session, true);
  _socketConnected = true;
  console.log("[nakama] socket connected");
  return _socket;
}

export function getSocket(): Socket | null {
  return _socket;
}

export function resetConnection() {
  if (_socket) {
    try { _socket.disconnect(true); } catch (_) {}
    _socket = null;
  }
  _socketConnected = false;
  _session = null;
  _client = null;
}

export interface FindMatchResult {
  matchId: string;
  created: boolean;
}

// All-in-one: open socket, set listener, find match, join match
export async function findAndJoinMatch(
  timedMode: boolean,
  onMessage: (msg: any) => void
): Promise<string> {
  const socket = await openSocket();

  // Set listener BEFORE joining
  socket.onmatchdata = (matchData) => {
    console.log("[nakama] raw matchdata opcode:", matchData.op_code);
    try {
      const decoder = new TextDecoder();
      const raw = typeof matchData.data === "string"
        ? matchData.data
        : decoder.decode(matchData.data as Uint8Array);
      console.log("[nakama] matchdata payload:", raw);
      const msg = JSON.parse(raw);
      onMessage(msg);
    } catch (e) {
      console.error("[nakama] failed to parse matchdata", e);
    }
  };

  const client = getClient();
  if (!_session) throw new Error("No session");

  // Find or create match via RPC
  const res = await client.rpc(_session, "find_or_create_match", { timedMode });
  const { matchId } = res.payload as FindMatchResult;
  console.log("[nakama] joining match", matchId);

  await socket.joinMatch(matchId);
  console.log("[nakama] joined match", matchId);

  return matchId;
}

export async function sendMove(matchId: string, position: number, timedMode: boolean) {
  const socket = await openSocket();
  const payload = JSON.stringify({ position, timedMode });
  await socket.sendMatchState(matchId, 2, payload);
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  userId: string;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const client = getClient();
  if (!_session) throw new Error("No session");
  const res = await client.rpc(_session, "get_leaderboard", {});
  const data = res.payload as { records: LeaderboardEntry[] };
  return data.records ?? [];
}

export async function getPlayerStats() {
  const client = getClient();
  if (!_session) throw new Error("No session");
  const res = await client.rpc(_session, "get_player_stats", {});
  return res.payload as { score: number; rank: number | null; username: string };
}