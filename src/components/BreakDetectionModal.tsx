"use client";

import { BookEntry, EvalResult } from "@/lib/types";

interface BreakDetectionModalProps {
  userMove: string;
  bookMoves: BookEntry[];
  userMoveEval: EvalResult;
  bookMoveEval: EvalResult;
  onTryAgain: () => void;
  onNextOpening: () => void;
}

export function BreakDetectionModal({
  userMove,
  bookMoves,
  userMoveEval,
  bookMoveEval,
  onTryAgain,
  onNextOpening,
}: BreakDetectionModalProps) {
  const userScore = (userMoveEval.score / 100).toFixed(1);
  const bookScore = (bookMoveEval.score / 100).toFixed(1);
  const scoreDiff = ((userMoveEval.score - bookMoveEval.score) / 100).toFixed(1);
  const isBlunder = Math.abs(userMoveEval.score - bookMoveEval.score) > 100;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        className="rounded-xl p-6 max-w-md w-full"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <h2
          className="text-lg font-bold mb-4"
          style={{ color: isBlunder ? "rgba(230,70,70,0.9)" : "var(--accent-highlight)" }}
        >
          {isBlunder ? "You left the book!" : "Out of book"}
        </h2>

        <div className="mb-4">
          <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            You played: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{userMove}</span>
            <span className="ml-2" style={{ color: "var(--text-muted)" }}>
              (eval: {Number(userScore) >= 0 ? "+" : ""}{userScore})
            </span>
          </div>

          <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            Book move{bookMoves.length > 1 ? "s" : ""}:
          </div>
          <div className="flex flex-col gap-1 ml-2">
            {bookMoves.map((entry) => (
              <div key={entry.move} className="text-sm" style={{ color: "var(--text-primary)" }}>
                <span className="font-semibold">{entry.move}</span>
                <span className="ml-2" style={{ color: "var(--accent-green)" }}>{entry.openingName}</span>
                <span className="ml-1" style={{ color: "var(--text-muted)" }}>({entry.eco})</span>
              </div>
            ))}
          </div>

          {bookMoves.length > 0 && (
            <div className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Book eval: {Number(bookScore) >= 0 ? "+" : ""}{bookScore}
              {isBlunder && (
                <span style={{ color: "rgba(230,70,70,0.9)" }}>
                  {" "}({Number(scoreDiff) >= 0 ? "+" : ""}{scoreDiff} difference)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onTryAgain}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: "var(--border-color)",
              color: "var(--accent-highlight)",
            }}
          >
            ↩ Try Again
          </button>
          <button
            onClick={onNextOpening}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: "var(--border-color)",
              color: "var(--accent-highlight)",
            }}
          >
            Next Opening →
          </button>
        </div>
      </div>
    </div>
  );
}
