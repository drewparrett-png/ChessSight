"use client";

import React from "react";
import { Chessboard } from "react-chessboard";
import { PieceDropHandlerArgs, SquareRenderer, SquareHandlerArgs } from "react-chessboard";
import { Square } from "chess.js";
import { BoardSquareOverlay } from "./BoardSquareOverlay";
import { EvalBar } from "./EvalBar";
import { AttackMap, BookEntry, EvalResult, ToggleState } from "@/lib/types";

interface BoardProps {
  fen: string;
  onMove: (from: Square, to: Square) => boolean;
  onSquareClick?: (square: Square) => void;
  squareStyles?: Record<string, React.CSSProperties>;
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
  onSquareClick,
  squareStyles,
  attackMap,
  bookMoves,
  evaluation,
  toggles,
  playerColor,
  boardWidth = 480,
}: BoardProps) {
  // Build map from target square to opening name for tooltip
  const bookSquareMap = new Map<string, string>();
  for (const entry of bookMoves) {
    bookSquareMap.set(entry.move, entry.openingName);
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    return onMove(sourceSquare as Square, targetSquare as Square);
  }

  // Custom square renderer using react-chessboard's squareRenderer
  const squareRenderer: SquareRenderer = ({ square, children }) => {
    const extraStyle = squareStyles?.[square];
    return (
      <div
        style={{ position: "relative", width: "100%", height: "100%", ...extraStyle }}
      >
        {children}
        <BoardSquareOverlay
          square={square as Square}
          whiteAttacks={attackMap.white[square as Square] ?? 0}
          blackAttacks={attackMap.black[square as Square] ?? 0}
          isBookMove={bookSquareMap.has(square)}
          showMySight={toggles.mySight}
          showOpponentSight={toggles.opponentSight}
          showBookMoves={toggles.bookMoves}
          playerColor={playerColor}
          bookOpeningName={bookSquareMap.get(square)}
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
            onSquareClick: onSquareClick
              ? ({ square }: SquareHandlerArgs) => onSquareClick(square as Square)
              : undefined,
            onPieceClick: onSquareClick
              ? ({ square }: { square: string | null }) => {
                  if (square) onSquareClick(square as Square);
                }
              : undefined,
            squareStyles: squareStyles,
            squareRenderer,
          }}
        />
      </div>
    </div>
  );
}
