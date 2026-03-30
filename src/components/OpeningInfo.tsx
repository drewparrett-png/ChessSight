"use client";

interface OpeningInfoProps {
  openingName: string | null;
  eco: string | null;
  moveCount: number;
  isInBook: boolean;
}

export function OpeningInfo({ openingName, eco, moveCount, isInBook }: OpeningInfoProps) {
  return (
    <div className="rounded-lg p-3 border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
        Current Opening
      </div>
      <div className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
        {openingName ?? "No opening detected"}
      </div>
      {eco && (
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: "var(--border-color)", color: "var(--accent-highlight)" }}>
            {eco} · Move {moveCount}
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px]"
            style={{
              backgroundColor: isInBook ? "#1a3a1a" : "#3a1a1a",
              color: isInBook ? "var(--accent-green)" : "var(--accent-red)",
            }}
          >
            {isInBook ? "In Book ✓" : "Out of Book"}
          </span>
        </div>
      )}
    </div>
  );
}
