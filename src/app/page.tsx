"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { BreakDetectionModal } from "@/components/BreakDetectionModal";
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
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

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

  const [breakInfo, setBreakInfo] = useState<{
    userMove: string;
    availableBookMoves: BookEntry[];
    userMoveEval: EvalResult;
    bookMoveEval: EvalResult;
  } | null>(null);

  // Track whether a break just occurred
  const [pendingBreakCheck, setPendingBreakCheck] = useState(false);
  const preBreakBookMoves = useRef<BookEntry[]>([]);
  const preBreakFen = useRef<string>("");

  const handleMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (mode === "opening-trainer") {
        // Check if this move matches any book move
        const clone = new Chess(gameState.fen);
        const isBookMove = bookMoves.some((b) => {
          try {
            const resolved = clone.move(b.move);
            clone.undo();
            return resolved && resolved.from === from && resolved.to === to;
          } catch {
            return false;
          }
        });

        if (!isBookMove && bookMoves.length > 0) {
          // Save book state before the move changes it
          preBreakBookMoves.current = [...bookMoves];
          preBreakFen.current = gameState.fen;
        }

        const success = makeMove(from, to);
        if (success) {
          setSelectedSquare(null);
          if (!isBookMove && preBreakBookMoves.current.length > 0) {
            setPendingBreakCheck(true);
          }
        }
        return success;
      }
      const success = makeMove(from, to);
      if (success) setSelectedSquare(null);
      return success;
    },
    [makeMove, mode, bookMoves, gameState.fen]
  );

  // Handle break detection async (after move is made and Stockfish can evaluate)
  useEffect(() => {
    if (!pendingBreakCheck || !engineReady) return;
    setPendingBreakCheck(false);

    const detectBreak = async () => {
      // 1. Evaluate position after user's non-book move (current FEN)
      const userEval = await evaluateRaw(gameState.fen) ?? { score: 0 };

      // 2. Evaluate position after the first book move would have been played
      const clone = new Chess(preBreakFen.current);
      const firstBookMove = preBreakBookMoves.current[0];
      let bookEval: EvalResult = { score: 0 };
      try {
        clone.move(firstBookMove.move);
        bookEval = await evaluateRaw(clone.fen()) ?? { score: 0 };
      } catch {
        // If book move can't be played, leave bookEval at 0
      }

      const chess = getChess();
      const history = chess.history();
      setBreakInfo({
        userMove: history[history.length - 1] ?? "?",
        availableBookMoves: preBreakBookMoves.current,
        userMoveEval: userEval,
        bookMoveEval: bookEval,
      });
    };
    detectBreak();
  }, [pendingBreakCheck, engineReady, gameState.fen, evaluateRaw, getChess]);

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

  // Legal moves for selected piece (click-to-move)
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    const chess = new Chess(gameState.fen);
    return chess.moves({ square: selectedSquare, verbose: true });
  }, [selectedSquare, gameState.fen]);

  const legalMoveSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
    }
    for (const move of legalMoves) {
      const isCapture = move.captured;
      styles[move.to] = {
        background: isCapture
          ? "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.3) 55%)"
          : "radial-gradient(circle, rgba(0,0,0,0.25) 25%, transparent 25%)",
        cursor: "pointer",
      };
    }
    return styles;
  }, [selectedSquare, legalMoves]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      // If a piece is selected and this square is a legal move, make the move
      if (selectedSquare) {
        const isLegalTarget = legalMoves.some((m) => m.to === square);
        if (isLegalTarget) {
          handleMove(selectedSquare, square);
          setSelectedSquare(null);
          return;
        }
      }
      // Check if this square has one of our pieces
      const chess = new Chess(gameState.fen);
      const piece = chess.get(square);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square === selectedSquare ? null : square);
      } else {
        setSelectedSquare(null);
      }
    },
    [selectedSquare, legalMoves, handleMove, gameState.fen, playerColor]
  );

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
          onSquareClick={handleSquareClick}
          squareStyles={legalMoveSquareStyles}
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
      {breakInfo && (
        <BreakDetectionModal
          userMove={breakInfo.userMove}
          bookMoves={breakInfo.availableBookMoves}
          userMoveEval={breakInfo.userMoveEval}
          bookMoveEval={breakInfo.bookMoveEval}
          onTryAgain={() => {
            undoMove();
            setBreakInfo(null);
          }}
          onNextOpening={() => {
            resetGame();
            setBreakInfo(null);
          }}
        />
      )}
    </main>
  );
}
