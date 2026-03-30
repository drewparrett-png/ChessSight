"use client";

import { GameMode } from "@/lib/types";

interface ModeSelectorProps {
  activeMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

const MODES: { key: GameMode; label: string }[] = [
  { key: "opening-trainer", label: "Opening Trainer" },
  { key: "guided-play", label: "Guided Play" },
  { key: "free-play", label: "Free Play" },
];

export function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-2.5 border-b"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="text-lg font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
        ♔ ChessSight
      </div>
      <div className="flex gap-1">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors"
            style={{
              backgroundColor: activeMode === key ? "var(--border-color)" : "transparent",
              color: activeMode === key ? "var(--accent-highlight)" : "var(--text-secondary)",
              borderColor: activeMode === key ? "var(--accent-highlight)" : "#333",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="w-[120px]" />
    </header>
  );
}
