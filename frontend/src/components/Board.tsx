// src/components/Board.tsx
import React from "react";

interface BoardProps {
  board: string[];
  isMyTurn: boolean;
  mySymbol: string | undefined;
  onMove: (index: number) => void;
  disabled: boolean;
}

export function Board({ board, isMyTurn, mySymbol, onMove, disabled }: BoardProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        width: "100%",
        maxWidth: "340px",
        margin: "0 auto",
      }}
    >
      {board.map((cell, i) => {
        const isEmpty = cell === "";
        const isClickable = isEmpty && isMyTurn && !disabled;

        return (
          <button
            key={i}
            onClick={() => isClickable && onMove(i)}
            style={{
              height: "100px",
              borderRadius: "12px",
              border: "2px solid",
              borderColor: isEmpty ? "rgba(255,255,255,0.15)" : cell === "X" ? "#60a5fa" : "#f472b6",
              background: isEmpty
                ? isClickable
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.03)"
                : cell === "X"
                  ? "rgba(96,165,250,0.12)"
                  : "rgba(244,114,182,0.12)",
              cursor: isClickable ? "pointer" : "default",
              fontSize: "2.8rem",
              fontWeight: 700,
              color: cell === "X" ? "#60a5fa" : "#f472b6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
              transform: isClickable ? undefined : undefined,
            }}
            onMouseEnter={e => {
              if (isClickable) {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.35)";
              }
            }}
            onMouseLeave={e => {
              if (isClickable) {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
              }
            }}
          >
            {cell}
          </button>
        );
      })}
    </div>
  );
}
