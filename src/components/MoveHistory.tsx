"use client";

import { GameState } from "@/lib/types";

interface MoveHistoryProps {
  moveHistory: GameState["moveHistory"];
}

export function MoveHistory({ moveHistory }: MoveHistoryProps) {
  return (
    <div className="rounded-lg p-3 border flex-1 overflow-y-auto" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
        Move History
      </div>
      <div className="flex flex-col gap-1 font-mono text-xs">
        {moveHistory.length === 0 && (
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            No moves yet
          </div>
        )}
        {moveHistory.map((move) => (
          <div
            key={move.moveNumber}
            className="flex items-center gap-2 px-2 py-1 rounded"
            style={{ backgroundColor: "var(--border-color)" }}
          >
            <span className="min-w-[20px]" style={{ color: "var(--text-muted)" }}>
              {move.moveNumber}.
            </span>
            <span className="min-w-[48px]" style={{ color: "var(--text-primary)" }}>
              {move.white}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {move.black ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
