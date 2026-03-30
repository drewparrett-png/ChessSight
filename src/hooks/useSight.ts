"use client";

import { useMemo } from "react";
import { Chess } from "chess.js";
import { calculateAttackMap } from "@/lib/sight";
import { AttackMap } from "@/lib/types";

export function useSight(chess: Chess): AttackMap {
  const fen = chess.fen();
  return useMemo(() => {
    return calculateAttackMap(chess);
  }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps
}
