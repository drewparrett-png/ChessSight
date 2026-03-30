"use client";

import { EvalResult } from "@/lib/types";

interface EvalDisplayProps {
  evaluation: EvalResult;
}

export function EvalDisplay({ evaluation }: EvalDisplayProps) {
  const displayScore = evaluation.mate !== undefined
    ? `M${Math.abs(evaluation.mate)}`
    : (evaluation.score / 100).toFixed(1);

  const isPositive = evaluation.mate !== undefined
    ? evaluation.mate > 0
    : evaluation.score >= 0;

  // Percentage for the bar (white's perspective)
  let whitePercent: number;
  if (evaluation.mate !== undefined) {
    whitePercent = evaluation.mate > 0 ? 95 : 5;
  } else {
    whitePercent = 50 + 50 * (2 / (1 + Math.exp(-evaluation.score / 250)) - 1);
    whitePercent = Math.max(5, Math.min(95, whitePercent));
  }

  return (
    <div className="rounded-lg p-3 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
        Evaluation
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#333" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${whitePercent}%`,
              background: "linear-gradient(90deg, #e8e8e8, #ccc)",
            }}
          />
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {isPositive ? "+" : ""}{displayScore}
        </span>
      </div>
    </div>
  );
}
