"use client";

import { EvalResult } from "@/lib/types";

interface EvalBarProps {
  evaluation: EvalResult;
  visible: boolean;
}

export function EvalBar({ evaluation, visible }: EvalBarProps) {
  if (!visible) return null;

  // Convert centipawns to a percentage (50% = even)
  // Clamp between 5% and 95% for visual clarity
  let whitePercent: number;
  if (evaluation.mate !== undefined) {
    whitePercent = evaluation.mate > 0 ? 95 : 5;
  } else {
    // sigmoid-like mapping: score of ±500cp maps to ~90%/10%
    whitePercent = 50 + 50 * (2 / (1 + Math.exp(-evaluation.score / 250)) - 1);
    whitePercent = Math.max(5, Math.min(95, whitePercent));
  }

  return (
    <div
      style={{
        width: 24,
        height: "100%",
        backgroundColor: "#333",
        borderRadius: 4,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border-color)",
      }}
    >
      {/* Black portion (top) */}
      <div
        style={{
          flex: 100 - whitePercent,
          backgroundColor: "#333",
          transition: "flex 0.3s ease",
        }}
      />
      {/* White portion (bottom) */}
      <div
        style={{
          flex: whitePercent,
          backgroundColor: "#e8e8e8",
          transition: "flex 0.3s ease",
        }}
      />
    </div>
  );
}
