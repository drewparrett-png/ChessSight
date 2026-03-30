"use client";

import { GameMode } from "@/lib/types";

interface GameControlsProps {
  mode: GameMode;
  onTakeBack: () => void;
  onNextOpening?: () => void;
  onNewGame?: () => void;
  onResign?: () => void;
  elo: number;
  onEloChange?: (elo: number) => void;
}

export function GameControls({
  mode,
  onTakeBack,
  onNextOpening,
  onNewGame,
  onResign,
  elo,
  onEloChange,
}: GameControlsProps) {
  const buttonStyle = {
    backgroundColor: "var(--border-color)",
    color: "var(--accent-highlight)",
  };

  return (
    <div className="flex flex-col gap-2">
      {(mode === "guided-play" || mode === "free-play") && onEloChange && (
        <div className="rounded-lg p-3 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Engine ELO
            </span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {elo}
            </span>
          </div>
          <input
            type="range"
            min={400}
            max={2800}
            step={50}
            value={elo}
            onChange={(e) => onEloChange(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onTakeBack}
          className="flex-1 py-2 px-3 rounded-md text-xs font-medium"
          style={buttonStyle}
        >
          ↩ Take Back
        </button>

        {mode === "opening-trainer" && onNextOpening && (
          <button
            onClick={onNextOpening}
            className="flex-1 py-2 px-3 rounded-md text-xs font-medium"
            style={buttonStyle}
          >
            Next Opening →
          </button>
        )}

        {mode === "free-play" && onNewGame && (
          <button
            onClick={onNewGame}
            className="flex-1 py-2 px-3 rounded-md text-xs font-medium"
            style={buttonStyle}
          >
            New Game
          </button>
        )}

        {(mode === "guided-play" || mode === "free-play") && onResign && (
          <button
            onClick={onResign}
            className="flex-1 py-2 px-3 rounded-md text-xs font-medium"
            style={{ backgroundColor: "#3a1a1a", color: "rgba(230,70,70,0.8)" }}
          >
            Resign
          </button>
        )}
      </div>
    </div>
  );
}
