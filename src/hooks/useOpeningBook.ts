"use client";

import { useState, useCallback } from "react";
import { BookEntry, BookResponse } from "@/lib/types";

export function useOpeningBook() {
  const [bookMoves, setBookMoves] = useState<BookEntry[]>([]);
  const [currentOpening, setCurrentOpening] = useState<string | null>(null);
  const [eco, setEco] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookMoves = useCallback(async (fen: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/openings?fen=${encodeURIComponent(fen)}`);
      if (!res.ok) { setBookMoves([]); setCurrentOpening(null); setEco(null); return; }
      const data: BookResponse = await res.json();
      setBookMoves(data.moves);
      setCurrentOpening(data.currentOpening);
      setEco(data.eco);
    } catch { setBookMoves([]); setCurrentOpening(null); setEco(null); }
    finally { setIsLoading(false); }
  }, []);

  return { bookMoves, currentOpening, eco, isLoading, fetchBookMoves };
}
