import { NextRequest, NextResponse } from "next/server";
import openingBook from "@/data/openings.json";

const book = openingBook as Record<string, { moves: { move: string; openingName: string; eco: string }[] }>;

export async function GET(request: NextRequest) {
  const fen = request.nextUrl.searchParams.get("fen");

  if (!fen) {
    return NextResponse.json({ error: "fen parameter is required" }, { status: 400 });
  }

  const entry = book[fen];

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
