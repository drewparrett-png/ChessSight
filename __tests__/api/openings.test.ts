/**
 * @jest-environment node
 */
import { GET } from "@/app/api/openings/route";
import { NextRequest } from "next/server";

describe("GET /api/openings", () => {
  it("returns book moves for starting position", async () => {
    const url = new URL("http://localhost/api/openings?fen=rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    const req = new NextRequest(url);
    const res = await GET(req);
    const data = await res.json();
    expect(data.moves.length).toBeGreaterThan(0);
    const moveNames = data.moves.map((m: any) => m.move);
    expect(moveNames).toContain("e4");
    expect(moveNames).toContain("d4");
  });

  it("returns empty for unknown position", async () => {
    const url = new URL("http://localhost/api/openings?fen=8/8/8/8/8/8/8/8 w - - 0 1");
    const req = new NextRequest(url);
    const res = await GET(req);
    const data = await res.json();
    expect(data.moves).toEqual([]);
    expect(data.currentOpening).toBeNull();
  });

  it("returns 400 if no fen provided", async () => {
    const url = new URL("http://localhost/api/openings");
    const req = new NextRequest(url);
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
