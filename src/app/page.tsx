"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Chess, Square } from "chess.js";
import { Board } from "@/components/Board";
import { Sidebar } from "@/components/Sidebar";
import { ModeSelector } from "@/components/ModeSelector";
import { useGame } from "@/hooks/useGame";
import { useStockfish } from "@/hooks/useStockfish";
import { useOpeningBook } from "@/hooks/useOpeningBook";
import { useSight } from "@/hooks/useSight";
import { GameMode, ToggleState, BookEntry, EvalResult } from "@/lib/types";

export default function Home() {
  const [mode, setMode] = useState<GameMode>("guided-play");
  const [playerColor] = useState<"w" | "b">("w");
  const [elo, setElo] = useState(1200);
  const [toggles, setToggles] = useState<ToggleState>({
    mySight: true,
    opponentSight: true,
    bookMoves: true,
    evalBar: true,
  });

  const { gameState, makeMove, makeMoveFromSan, undoMove, resetGame, getChess } = useGame();
  const { isReady: engineReady, evaluation, evaluate, evaluateRaw, getBestMove, setElo: setEngineElo } = useStockfish();
  const { bookMoves, currentOpening, eco, fetchBookMoves } = useOpeningBook();
  const attackMap = useSight(getChess());

  // Fetch book moves and evaluate whenever position changes
  useEffect(() => {
    fetchBookMoves(gameState.fen);
    if (engineReady) {
      evaluate(gameState.fen);
    }
  }, [gameState.fen, engineReady, fetchBookMoves, evaluate]);

  // Update engine ELO when slider changes
  useEffect(() => {
    if (engineReady) {
      setEngineElo(elo);
    }
  }, [elo, engineReady, setEngineElo]);

  // AI opponent's turn
  useEffect(() => {
    if (gameState.isGameOver || !engineReady) return;
    if (gameState.turn === playerColor) return; // Not opponent's turn

    const makeAIMove = async () => {
      // In guided play, try book move first
      if (mode === "guided-play" && bookMoves.length > 0) {
        // Pick a random book move
        const randomBook = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        const success = makeMoveFromSan(randomBook.move);
        if (success) return;
      }

      // In opening trainer, always play book moves
      if (mode === "opening-trainer" && bookMoves.length > 0) {
        const randomBook = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        makeMoveFromSan(randomBook.move);
        return;
      }

      // Fall back to Stockfish
      if (mode !== "opening-trainer") {
        const bestMove = await getBestMove(gameState.fen);
        if (bestMove) {
          const from = bestMove.slice(0, 2) as Square;
          const to = bestMove.slice(2, 4) as Square;
          const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
          makeMove(from, to, promotion);
        }
      }
    };

    // Small delay so it doesn't feel instant
    const timeout = setTimeout(makeAIMove, 300);
    return () => clearTimeout(timeout);
  }, [gameState.fen, gameState.turn, gameState.isGameOver, playerColor, mode, bookMoves, engineReady, getBestMove, makeMove, makeMoveFromSan]);

  const handleMove = useCallback(
    (from: Square, to: Square): boolean => {
      return makeMove(from, to);
    },
    [makeMove]
  );

  const handleToggle = useCallback((key: keyof ToggleState) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleModeChange = useCallback(
    (newMode: GameMode) => {
      setMode(newMode);
      resetGame();
    },
    [resetGame]
  );

  const handleNextOpening = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const isInBook = bookMoves.length > 0;
  const moveCount = gameState.moveHistory.length;

  // Resolve book move target squares for the board overlay
  // Use a cloned Chess instance to avoid mutating shared state during render
  const resolvedBookMoves = useMemo(() => {
    const clone = new Chess(gameState.fen);
    return bookMoves.map((entry) => {
      try {
        const move = clone.move(entry.move);
        if (move) {
          clone.undo();
          return { ...entry, targetSquare: move.to };
        }
      } catch {
        // Invalid move in current position
      }
      return { ...entry, targetSquare: null };
    }).filter((e) => e.targetSquare !== null);
  }, [gameState.fen, bookMoves]);

  // Create book entries keyed by target square for the board
  const bookEntriesForBoard = resolvedBookMoves.map((e) => ({
    move: e.targetSquare!,
    openingName: e.openingName,
    eco: e.eco,
  }));

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      <ModeSelector activeMode={mode} onModeChange={handleModeChange} />
      <div className="flex-1 flex justify-center items-start p-4 gap-4">
        <Board
          fen={gameState.fen}
          onMove={handleMove}
          attackMap={attackMap}
          bookMoves={bookEntriesForBoard}
          evaluation={evaluation}
          toggles={toggles}
          playerColor={playerColor}
        />
        <Sidebar
          mode={mode}
          toggles={toggles}
          onToggle={handleToggle}
          openingName={currentOpening}
          eco={eco}
          moveCount={moveCount}
          isInBook={isInBook}
          moveHistory={gameState.moveHistory}
          evaluation={evaluation}
          elo={elo}
          onEloChange={setElo}
          onTakeBack={undoMove}
          onNextOpening={mode === "opening-trainer" ? handleNextOpening : undefined}
          onNewGame={mode === "free-play" ? resetGame : undefined}
          onResign={mode !== "opening-trainer" ? resetGame : undefined}
        />
      </div>
    </main>
  );
}
