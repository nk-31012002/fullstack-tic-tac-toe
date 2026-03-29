// src/App.tsx
import React, { useState } from "react";
import { authenticateWithNickname, getSession, resetConnection } from "./lib/nakama";
import { useGame } from "./hooks/useGame";
import { Board } from "./components/Board";
import { Timer } from "./components/Timer";
import { Leaderboard } from "./components/Leaderboard";

// ─── Screens ──────────────────────────────────────────────────────────────────

type Screen = "login" | "lobby" | "game" | "result";

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [nickname, setNickname] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [timedMode, setTimedMode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const game = useGame(userId);

  // ── Auth ────────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    const name = nickname.trim();
    if (!name) { setAuthError("Please enter a nickname"); return; }
    if (name.length < 2) { setAuthError("Nickname must be at least 2 characters"); return; }

    setAuthLoading(true);
    setAuthError("");
    try {
      const session = await authenticateWithNickname(name);
      setUserId(session.user_id ?? null);
      setScreen("lobby");
    } catch (e: any) {
      setAuthError(e?.message ?? "Failed to connect to server");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Matchmaking ─────────────────────────────────────────────────────────────

  const handleFindGame = async () => {
    setScreen("game");
    await game.findGame(timedMode);
  };

  const handlePlayAgain = () => {
    game.resetGame();
    resetConnection();   // clear stale socket/session
    setScreen("lobby");
    setShowLeaderboard(false);
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const myInfo = userId && game.gameState ? game.gameState.players[userId] : null;
  const opponentId = game.gameState
    ? Object.keys(game.gameState.players).find(id => id !== userId)
    : null;
  const opponentInfo = opponentId ? game.gameState?.players[opponentId] : null;

  const winnerLabel = (() => {
    if (!game.gameOver) return null;
    if (game.gameOver.winner === "draw") return "It's a draw!";
    if (game.gameOver.winner === userId) return "You win! 🏆";
    return "You lose";
  })();

  const pointsDelta = game.gameOver?.winner === userId ? "+200 pts" : game.gameOver?.winner === "draw" ? "±0" : "-50 pts";

  // ── Common styles ───────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "20px",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 420,
    color: "white",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 10,
    border: "1.5px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.07)",
    color: "white",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
  };

  // ────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === "login") return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, textAlign: "center" }}>
          Tic-Tac-Toe
        </h1>
        <p style={{ margin: "0 0 28px", textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
          Multiplayer · Powered by Nakama
        </p>

        <label style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", display: "block", marginBottom: 6 }}>
          Choose a nickname
        </label>
        <input
          style={inputStyle}
          placeholder="e.g. Ace"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          autoFocus
        />
        {authError && (
          <p style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{authError}</p>
        )}
        <button style={{ ...btnStyle, marginTop: 16 }} onClick={handleLogin} disabled={authLoading}>
          {authLoading ? "Connecting…" : "Continue →"}
        </button>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // LOBBY
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === "lobby") return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>
          Welcome, {nickname} 👋
        </h2>
        <p style={{ margin: "0 0 28px", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
          Ready to play?
        </p>

        {/* Mode selector */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          padding: "16px",
          marginBottom: 20,
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
            Game mode
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {(["classic", "timed"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setTimedMode(mode === "timed")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1.5px solid",
                  borderColor: (mode === "timed") === timedMode
                    ? "#6366f1"
                    : "rgba(255,255,255,0.12)",
                  background: (mode === "timed") === timedMode
                    ? "rgba(99,102,241,0.2)"
                    : "transparent",
                  color: "white",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {mode === "classic" ? "Classic" : "⏱ Timed (30s)"}
              </button>
            ))}
          </div>
        </div>

        <button style={btnStyle} onClick={handleFindGame}>
          Find a Game
        </button>

        <button
          style={{
            ...btnStyle,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            marginTop: 10,
          }}
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          {showLeaderboard ? "Hide" : "🏆 View"} Leaderboard
        </button>

        {showLeaderboard && (
          <div style={{ marginTop: 24 }}>
            <Leaderboard />
          </div>
        )}
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // GAME
  // ────────────────────────────────────────────────────────────────────────────
  if (screen === "game") {
    // Game over → show result overlay
    if (game.gameOver) {
      return (
        <div style={pageStyle}>
          <div style={cardStyle}>
            {/* Winner symbol */}
            <div style={{
              textAlign: "center",
              fontSize: 72,
              marginBottom: 8,
            }}>
              {game.gameOver.winner === userId ? "✕" : game.gameOver.winner === "draw" ? "○" : "○"}
            </div>

            <h2 style={{
              textAlign: "center",
              fontSize: 28,
              fontWeight: 700,
              margin: "0 0 4px",
              color: game.gameOver.winner === userId ? "#34d399"
                : game.gameOver.winner === "draw" ? "#fbbf24" : "#f87171",
            }}>
              {winnerLabel}
            </h2>

            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", margin: "0 0 4px", fontSize: 14 }}>
              {game.gameOver.reason === "timeout" ? "Opponent timed out"
                : game.gameOver.reason === "opponent_left" ? "Opponent left"
                : "Game complete"}
            </p>

            <p style={{
              textAlign: "center",
              fontSize: 20,
              fontWeight: 700,
              margin: "0 0 28px",
              color: game.gameOver.winner === userId ? "#34d399" : "#f87171",
            }}>
              {pointsDelta}
            </p>

            {/* Mini board */}
            {game.gameState && (
              <div style={{ marginBottom: 24 }}>
                <Board
                  board={game.gameState.board}
                  isMyTurn={false}
                  mySymbol={myInfo?.symbol}
                  onMove={() => {}}
                  disabled
                />
              </div>
            )}

            {/* Leaderboard */}
            <div style={{ marginBottom: 24 }}>
              <Leaderboard />
            </div>

            <button style={btnStyle} onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          {/* Header: player vs player */}
          {game.gameState && Object.keys(game.gameState.players).length === 2 ? (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 24, color: "#60a5fa", fontWeight: 700 }}>
                  {myInfo?.symbol}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                  {nickname} (you)
                </div>
              </div>
              <div style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                fontWeight: 600,
              }}>
                VS
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 24, color: "#f472b6", fontWeight: 700 }}>
                  {opponentInfo?.symbol}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                  {opponentInfo?.displayName ?? "Opponent"}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: "center",
              padding: "20px 0",
              marginBottom: 20,
              color: "rgba(255,255,255,0.5)",
            }}>
              {game.isConnecting ? "Connecting to server…" : "Finding an opponent…"}
              <div style={{
                width: 32,
                height: 32,
                border: "3px solid rgba(255,255,255,0.15)",
                borderTopColor: "#6366f1",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "14px auto 0",
              }} />
            </div>
          )}

          {/* Turn indicator */}
          {game.gameState?.status === "playing" && (
            <div style={{
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color: game.isMyTurn ? "#34d399" : "rgba(255,255,255,0.45)",
              marginBottom: 14,
            }}>
              {game.isMyTurn ? "Your turn" : "Waiting for opponent…"}
            </div>
          )}

          {/* Timer */}
          {game.gameState?.timerDeadline !== 0 && (
            <div style={{ marginBottom: 16 }}>
              <Timer seconds={game.timeLeft} isMyTurn={game.isMyTurn} />
            </div>
          )}

          {/* Board */}
          {game.gameState && (
            <Board
              board={game.gameState.board}
              isMyTurn={game.isMyTurn}
              mySymbol={myInfo?.symbol}
              onMove={game.makeMove}
              disabled={!game.isMyTurn}
            />
          )}

          {/* Error */}
          {game.error && (
            <p style={{
              color: "#f87171",
              textAlign: "center",
              marginTop: 14,
              fontSize: 13,
            }}>
              {game.error}
            </p>
          )}

          <button
            style={{
              ...btnStyle,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              marginTop: 20,
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
            }}
            onClick={handlePlayAgain}
          >
            Leave game
          </button>
        </div>

        {/* Spinner keyframes */}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return null;
}