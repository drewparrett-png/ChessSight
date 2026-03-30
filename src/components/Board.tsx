"use client";

import { Chessboard } from "react-chessboard";
import { PieceDropHandlerArgs, SquareRenderer } from "react-chessboard";
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
  for (const entry of bookMoves) {
    bookSquares.add(entry.move);
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    return onMove(sourceSquare as Square, targetSquare as Square);
  }

  // Custom square renderer using react-chessboard's squareRenderer
  const squareRenderer: SquareRenderer = ({ square, children }) => {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {children}
        <BoardSquareOverlay
          square={square as Square}
          whiteAttacks={attackMap.white[square as Square] ?? 0}
          blackAttacks={attackMap.black[square as Square] ?? 0}
          isBookMove={bookSquares.has(square)}
          showMySight={toggles.mySight}
          showOpponentSight={toggles.opponentSight}
          showBookMoves={toggles.bookMoves}
          playerColor={playerColor}
        />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <EvalBar evaluation={evaluation} visible={toggles.evalBar} />
      <div style={{ width: boardWidth }}>
        <Chessboard
          options={{
            position: fen,
            boardOrientation: playerColor === "w" ? "white" : "black",
            darkSquareStyle: { backgroundColor: "var(--board-dark)" },
            lightSquareStyle: { backgroundColor: "var(--board-light)" },
            boardStyle: { width: boardWidth, height: boardWidth },
            onPieceDrop: handlePieceDrop,
            squareRenderer,
          }}
        />
      </div>
    </div>
  );
}
