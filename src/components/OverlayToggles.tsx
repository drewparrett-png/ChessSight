"use client";

import { ToggleState } from "@/lib/types";

interface OverlayTogglesProps {
  toggles: ToggleState;
  onToggle: (key: keyof ToggleState) => void;
}

function Toggle({
  label,
  enabled,
  color,
  icon,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  color: string;
  icon?: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon ? (
          <span className="text-xs">{icon}</span>
        ) : (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-xs" style={{ color: "#ccc" }}>
          {label}
        </span>
      </div>
      <button
        onClick={onToggle}
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{ backgroundColor: enabled ? color : "#444" }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: enabled ? 18 : 2 }}
        />
      </button>
    </div>
  );
}

export function OverlayToggles({ toggles, onToggle }: OverlayTogglesProps) {
  return (
    <div className="rounded-lg p-3 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
        Overlays
      </div>
      <div className="flex flex-col gap-2">
        <Toggle
          label="My Sight"
          enabled={toggles.mySight}
          color="rgba(70, 130, 230, 0.8)"
          onToggle={() => onToggle("mySight")}
        />
        <Toggle
          label="Opponent Sight"
          enabled={toggles.opponentSight}
          color="rgba(230, 70, 70, 0.8)"
          onToggle={() => onToggle("opponentSight")}
        />
        <Toggle
          label="Book Moves"
          enabled={toggles.bookMoves}
          color="#66bb6a"
          icon="📖"
          onToggle={() => onToggle("bookMoves")}
        />
        <Toggle
          label="Eval Bar"
          enabled={toggles.evalBar}
          color="#7ec8e3"
          icon="▐"
          onToggle={() => onToggle("evalBar")}
        />
      </div>
    </div>
  );
}
