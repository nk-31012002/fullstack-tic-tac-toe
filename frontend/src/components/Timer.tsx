// src/components/Timer.tsx
import React from "react";

interface TimerProps {
  seconds: number;
  isMyTurn: boolean;
}

export function Timer({ seconds, isMyTurn }: TimerProps) {
  if (seconds === 0) return null;

  const isUrgent = seconds <= 10;
  const pct = (seconds / 30) * 100;

  return (
    <div style={{ width: "100%", maxWidth: 340, margin: "0 auto" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
        fontSize: 13,
        color: isUrgent ? "#f87171" : "rgba(255,255,255,0.5)",
      }}>
        <span>{isMyTurn ? "Your turn" : "Opponent's turn"}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: isUrgent ? "#f87171" : "#60a5fa" }}>
          {seconds}s
        </span>
      </div>
      <div style={{
        height: 5,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 99,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 99,
          background: isUrgent
            ? "linear-gradient(90deg, #f87171, #ef4444)"
            : "linear-gradient(90deg, #60a5fa, #3b82f6)",
          transition: "width 0.5s linear, background 0.3s",
        }} />
      </div>
    </div>
  );
}
