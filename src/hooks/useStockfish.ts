"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createStockfish, StockfishEngine } from "@/engine/stockfish";
import { EvalResult } from "@/lib/types";

export function useStockfish() {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [evaluation, setEvaluation] = useState<EvalResult>({ score: 0 });

  useEffect(() => {
    let mounted = true;
    createStockfish()
      .then((engine) => {
        if (mounted) { engineRef.current = engine; setIsReady(true); }
        else { engine.destroy(); }
      })
      .catch((err) => {
        console.warn("Stockfish failed to initialize:", err);
      });
    return () => { mounted = false; engineRef.current?.destroy(); };
  }, []);

  const evaluate = useCallback(async (fen: string) => {
    if (!engineRef.current) return;
    const result = await engineRef.current.evaluate(fen);
    setEvaluation(result);
  }, []);

  const evaluateRaw = useCallback(async (fen: string): Promise<{ score: number; mate?: number } | null> => {
    if (!engineRef.current) return null;
    return engineRef.current.evaluate(fen);
  }, []);

  const getBestMove = useCallback(async (fen: string): Promise<string | null> => {
    if (!engineRef.current) return null;
    return engineRef.current.getBestMove(fen);
  }, []);

  const setElo = useCallback((elo: number) => { engineRef.current?.setElo(elo); }, []);

  return { isReady, evaluation, evaluate, evaluateRaw, getBestMove, setElo };
}
