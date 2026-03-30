import { NextRequest, NextResponse } from "next/server";
import openingBook from "@/data/openings.json";

const rawBook = openingBook as Record<string, { moves: { move: string; openingName: string; eco: string }[] }>;

// Normalize FEN by stripping en passant square — it varies between chess.js versions
// but doesn't affect opening identification
function normalizeFen(fen: string): string {
  const parts = fen.split(" ");
  if (parts.length >= 4) {
    parts[3] = "-"; // zero out en passant square
  }
  return parts.join(" ");
}

// Build a normalized lookup table at startup
const book = new Map<string, { moves: { move: string; openingName: string; eco: string }[] }>();
for (const [fen, entry] of Object.entries(rawBook)) {
  book.set(normalizeFen(fen), entry);
}

export async function GET(request: NextRequest) {
  const fen = request.nextUrl.searchParams.get("fen");

  if (!fen) {
    return NextResponse.json({ error: "fen parameter is required" }, { status: 400 });
  }

  const entry = book.get(normalizeFen(fen));

  if (!entry) {
    return NextResponse.json({
      moves: [],
      currentOpening: null,
      eco: null,
    });
  }

  return NextResponse.json({
    moves: entry.moves,
    currentOpening: entry.moves[0]?.openingName ?? null,
    eco: entry.moves[0]?.eco ?? null,
  });
}
