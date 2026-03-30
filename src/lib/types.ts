import { Square, Color, PieceSymbol } from "chess.js";

export type GameMode = "opening-trainer" | "guided-play" | "free-play";

export interface ToggleState {
  mySight: boolean;
  opponentSight: boolean;
  bookMoves: boolean;
  evalBar: boolean;
}

export interface BookEntry {
  move: string;
  openingName: string;
  eco: string;
}

export type BookResponse = {
  moves: BookEntry[];
  currentOpening: string | null;
  eco: string | null;
};

// Maps each square to the number of attackers from each side
export interface AttackMap {
  white: Record<Square, number>;
  black: Record<Square, number>;
}

export interface GameState {
  fen: string;
  turn: Color;
  isGameOver: boolean;
  moveHistory: { moveNumber: number; white: string; black?: string }[];
  lastMove?: { from: Square; to: Square };
}

export interface EvalResult {
  score: number; // centipawns from white's perspective
  mate?: number; // moves to mate (positive = white mates)
}
