"use client";

import { Square } from "chess.js";
import { BookEntry } from "@/lib/types";

interface BoardSquareOverlayProps {
  square: Square;
  whiteAttacks: number;
  blackAttacks: number;
  isBookMove: boolean;
  showMySight: boolean;
  showOpponentSight: boolean;
  showBookMoves: boolean;
  playerColor: "w" | "b";
  bookOpeningName?: string;
}

function SightDots({ count, color }: { count: number; color: string }) {
  if (count === 0) return null;
  const dots = Array.from({ length: Math.min(count, 5) }, (_, i) => (
    <div
      key={i}
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: color,
      }}
    />
  ));
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {dots}
    </div>
  );
}

export function BoardSquareOverlay({
  square,
  whiteAttacks,
  blackAttacks,
  isBookMove,
  showMySight,
  showOpponentSight,
  showBookMoves,
  playerColor,
  bookOpeningName,
}: BoardSquareOverlayProps) {
  const myAttacks = playerColor === "w" ? whiteAttacks : blackAttacks;
  const oppAttacks = playerColor === "w" ? blackAttacks : whiteAttacks;

  const hasContent =
    (showMySight && myAttacks > 0) ||
    (showOpponentSight && oppAttacks > 0) ||
    (showBookMoves && isBookMove);

  if (!hasContent) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* Top-right: opponent sight */}
      {showOpponentSight && oppAttacks > 0 && (
        <div style={{ position: "absolute", top: 2, right: 2 }}>
          <SightDots count={oppAttacks} color="rgba(230, 70, 70, 0.8)" />
        </div>
      )}

      {/* Bottom-right: my sight */}
      {showMySight && myAttacks > 0 && (
        <div style={{ position: "absolute", bottom: 2, right: 2 }}>
          <SightDots count={myAttacks} color="rgba(70, 130, 230, 0.8)" />
        </div>
      )}

      {/* Bottom-left: book move */}
      {showBookMoves && isBookMove && (
        <div
          style={{
            position: "absolute",
            bottom: 1,
            left: 1,
            fontSize: 10,
            lineHeight: 1,
            cursor: "help",
          }}
          title={bookOpeningName ?? "Book move"}
        >
          📖
        </div>
      )}
    </div>
  );
}
