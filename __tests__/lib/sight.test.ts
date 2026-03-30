import { Chess } from "chess.js";
import { calculateAttackMap } from "@/lib/sight";

describe("calculateAttackMap", () => {
  it("returns empty maps for empty board", () => {
    const chess = new Chess("8/8/8/8/8/8/8/8 w - - 0 1", { skipValidation: true });
    const map = calculateAttackMap(chess);
    expect(Object.values(map.white).every((v) => v === 0)).toBe(true);
    expect(Object.values(map.black).every((v) => v === 0)).toBe(true);
  });

  it("calculates knight attacks correctly", () => {
    const chess = new Chess("8/8/8/8/4N3/8/8/8 w - - 0 1", { skipValidation: true });
    const map = calculateAttackMap(chess);
    expect(map.white["d2" as any]).toBe(1);
    expect(map.white["f2" as any]).toBe(1);
    expect(map.white["c3" as any]).toBe(1);
    expect(map.white["g3" as any]).toBe(1);
    expect(map.white["c5" as any]).toBe(1);
    expect(map.white["g5" as any]).toBe(1);
    expect(map.white["d6" as any]).toBe(1);
    expect(map.white["f6" as any]).toBe(1);
    expect(map.white["e5" as any]).toBe(0);
  });

  it("compounds multiple attackers on same square", () => {
    // Two knights on c4 and e4 both attack d2 and d6
    const chess = new Chess("8/8/8/8/2N1N3/8/8/8 w - - 0 1", { skipValidation: true });
    const map = calculateAttackMap(chess);
    expect(map.white["d2" as any]).toBeGreaterThanOrEqual(2);
  });

  it("calculates pawn attacks (not forward moves)", () => {
    const chess = new Chess("8/8/8/8/4P3/8/8/8 w - - 0 1", { skipValidation: true });
    const map = calculateAttackMap(chess);
    expect(map.white["d5" as any]).toBe(1);
    expect(map.white["f5" as any]).toBe(1);
    expect(map.white["e5" as any]).toBe(0);
  });

  it("separates white and black attacks", () => {
    const chess = new Chess();
    const map = calculateAttackMap(chess);
    expect(map.white["d3" as any]).toBeGreaterThan(0);
    expect(map.black["d6" as any]).toBeGreaterThan(0);
  });
});
