"use client";

import { useState, useCallback, useRef } from "react";
import { Chess, Square } from "chess.js";
import { GameState } from "@/lib/types";

function buildMoveHistory(chess: Chess): GameState["moveHistory"] {
  const history = chess.history();
  const pairs: GameState["moveHistory"] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ moveNumber: Math.floor(i / 2) + 1, white: history[i], black: history[i + 1] });
  }
  return pairs;
}

export function useGame() {
  const chessRef = useRef(new Chess());
  const [gameState, setGameState] = useState<GameState>(() => ({
    fen: chessRef.current.fen(),
    turn: chessRef.current.turn(),
    isGameOver: chessRef.current.isGameOver(),
    moveHistory: [],
  }));

  const syncState = useCallback(() => {
    const chess = chessRef.current;
    setGameState({
      fen: chess.fen(), turn: chess.turn(), isGameOver: chess.isGameOver(), moveHistory: buildMoveHistory(chess),
    });
  }, []);

  const makeMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    try {
      const result = chessRef.current.move({ from, to, promotion: promotion as any });
      if (result) { syncState(); return true; }
      return false;
    } catch { return false; }
  }, [syncState]);

  const makeMoveFromSan = useCallback((san: string): boolean => {
    try {
      const result = chessRef.current.move(san);
      if (result) { syncState(); return true; }
      return false;
    } catch { return false; }
  }, [syncState]);

  const undoMove = useCallback(() => { chessRef.current.undo(); syncState(); }, [syncState]);
  const resetGame = useCallback(() => { chessRef.current.reset(); syncState(); }, [syncState]);
  const getChess = useCallback(() => chessRef.current, []);

  return { gameState, makeMove, makeMoveFromSan, undoMove, resetGame, getChess };
}
