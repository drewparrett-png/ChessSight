"use client";

import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";
import { BoardSquareOverlay } from "./BoardSquareOverlay";
import { EvalBar } from "./EvalBar";
import { AttackMap, BookEntry, EvalResult, ToggleState } from "@/lib/types";

interface BoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => boolean;
  attackMap: AttackMap;
  bookMoves: BookEntry[];
  evaluation: EvalResult;
  toggles: ToggleState;
  playerColor: "w" | "b";
  boardWidth?: number;
}

export function Board({
  fen,
  onMove,
  attackMap,
  bookMoves,
  evaluation,
  toggles,
  playerColor,
  boardWidth = 480,
}: BoardProps) {
  // Build set of squares that have book moves
  const bookSquares = new Set<string>();
  // We need to map SAN moves to target squares
  // For now, book moves are shown by their target square
  // The parent component should pass resolved target squares
  for (const entry of bookMoves) {
    // Extract target square from SAN — simplified approach
    // Full SAN parsing happens in the parent
    bookSquares.add(entry.move);
  }

  function onDrop(sourceSquare: string, targetSquare: string): boolean {
    return onMove(sourceSquare as Square, targetSquare as Square);
  }

  // Build custom square renderers for overlays
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  const allSquares: Square[] = [];
  for (const file of "abcdefgh") {
    for (const rank of "12345678") {
      allSquares.push(`${file}${rank}` as Square);
    }
  }

  // Custom square renderer using react-chessboard's customSquare
  function CustomSquareRenderer({
    children,
    square,
    style,
  }: {
    children: React.ReactNode;
    square: Square;
    style: React.CSSProperties;
  }) {
    return (
      <div style={{ ...style, position: "relative" }}>
        {children}
        <BoardSquareOverlay
          square={square}
          whiteAttacks={attackMap.white[square] ?? 0}
          blackAttacks={attackMap.black[square] ?? 0}
          isBookMove={bookSquares.has(square)}
          showMySight={toggles.mySight}
          showOpponentSight={toggles.opponentSight}
          showBookMoves={toggles.bookMoves}
          playerColor={playerColor}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <EvalBar evaluation={evaluation} visible={toggles.evalBar} />
      <div>
        <Chessboard
          id="chesssight-board"
          position={fen}
          onPieceDrop={onDrop}
          boardWidth={boardWidth}
          customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
          customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
          boardOrientation={playerColor === "w" ? "white" : "black"}
          customSquare={CustomSquareRenderer as any}
        />
      </div>
    </div>
  );
}
