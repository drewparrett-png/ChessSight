import { renderHook, act } from "@testing-library/react";
import { useGame } from "@/hooks/useGame";

describe("useGame", () => {
  it("initializes with starting position", () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.gameState.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(result.current.gameState.turn).toBe("w");
    expect(result.current.gameState.isGameOver).toBe(false);
    expect(result.current.gameState.moveHistory).toEqual([]);
  });

  it("makes a valid move and updates state", () => {
    const { result } = renderHook(() => useGame());
    act(() => { expect(result.current.makeMove("e2", "e4")).toBe(true); });
    expect(result.current.gameState.turn).toBe("b");
    expect(result.current.gameState.moveHistory).toHaveLength(1);
    expect(result.current.gameState.moveHistory[0]).toEqual({ moveNumber: 1, white: "e4", black: undefined });
  });

  it("rejects invalid moves", () => {
    const { result } = renderHook(() => useGame());
    act(() => { expect(result.current.makeMove("e2", "e5")).toBe(false); });
    expect(result.current.gameState.turn).toBe("w");
  });

  it("undoes the last move", () => {
    const { result } = renderHook(() => useGame());
    act(() => { result.current.makeMove("e2", "e4"); });
    act(() => { result.current.undoMove(); });
    expect(result.current.gameState.turn).toBe("w");
    expect(result.current.gameState.moveHistory).toHaveLength(0);
  });

  it("resets the game", () => {
    const { result } = renderHook(() => useGame());
    act(() => { result.current.makeMove("e2", "e4"); });
    act(() => { result.current.resetGame(); });
    expect(result.current.gameState.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(result.current.gameState.moveHistory).toHaveLength(0);
  });

  it("builds move history with paired moves", () => {
    const { result } = renderHook(() => useGame());
    act(() => { result.current.makeMove("e2", "e4"); });
    act(() => { result.current.makeMove("e7", "e5"); });
    expect(result.current.gameState.moveHistory).toEqual([{ moveNumber: 1, white: "e4", black: "e5" }]);
    act(() => { result.current.makeMove("g1", "f3"); });
    expect(result.current.gameState.moveHistory).toEqual([
      { moveNumber: 1, white: "e4", black: "e5" },
      { moveNumber: 2, white: "Nf3", black: undefined },
    ]);
  });
});
