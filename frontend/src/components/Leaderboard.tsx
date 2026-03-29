// src/components/Leaderboard.tsx
import React, { useEffect, useState } from "react";
import { getLeaderboard, LeaderboardEntry } from "../lib/nakama";

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 14 }}>
      Loading leaderboard…
    </p>
  );

  if (entries.length === 0) return (
    <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 14 }}>
      No scores yet. Play a game!
    </p>
  );

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 80px",
        gap: "0 12px",
        color: "rgba(255,255,255,0.35)",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        paddingBottom: 8,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 8,
      }}>
        <span>#</span><span>Player</span><span style={{ textAlign: "right" }}>Score</span>
      </div>

      {entries.map((e) => (
        <div key={e.userId} style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 80px",
          gap: "0 12px",
          padding: "9px 0",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          fontSize: 14,
          color: "rgba(255,255,255,0.85)",
          alignItems: "center",
        }}>
          <span style={{
            fontWeight: 700,
            color: e.rank === 1 ? "#fbbf24" : e.rank === 2 ? "#9ca3af" : e.rank === 3 ? "#d97706" : "rgba(255,255,255,0.4)",
          }}>
            {e.rank === 1 ? "🏆" : e.rank}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {e.username}
          </span>
          <span style={{ textAlign: "right", fontWeight: 600, color: "#34d399" }}>
            {e.score > 0 ? "+" : ""}{e.score}
          </span>
        </div>
      ))}
    </div>
  );
}
