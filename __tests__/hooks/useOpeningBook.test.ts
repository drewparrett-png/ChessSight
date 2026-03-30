import { renderHook, act, waitFor } from "@testing-library/react";
import { useOpeningBook } from "@/hooks/useOpeningBook";

global.fetch = jest.fn();

describe("useOpeningBook", () => {
  beforeEach(() => { (fetch as jest.Mock).mockReset(); });

  it("fetches book moves for a given FEN", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ moves: [{ move: "e4", openingName: "King's Pawn Opening", eco: "B00" }], currentOpening: "King's Pawn Opening", eco: "B00" }),
    });
    const { result } = renderHook(() => useOpeningBook());
    act(() => { result.current.fetchBookMoves("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"); });
    await waitFor(() => {
      expect(result.current.bookMoves).toHaveLength(1);
      expect(result.current.bookMoves[0].move).toBe("e4");
      expect(result.current.currentOpening).toBe("King's Pawn Opening");
    });
  });

  it("returns empty when no book moves exist", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ moves: [], currentOpening: null, eco: null }),
    });
    const { result } = renderHook(() => useOpeningBook());
    act(() => { result.current.fetchBookMoves("8/8/8/8/8/8/8/8 w - - 0 1"); });
    await waitFor(() => {
      expect(result.current.bookMoves).toHaveLength(0);
      expect(result.current.currentOpening).toBeNull();
    });
  });
});
