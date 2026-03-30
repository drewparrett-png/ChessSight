export interface StockfishEngine {
  evaluate: (fen: string) => Promise<{ score: number; mate?: number }>;
  getBestMove: (fen: string) => Promise<string>;
  setElo: (elo: number) => void;
  destroy: () => void;
}

export function createStockfish(): Promise<StockfishEngine> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/stockfish/stockfish.js");
    let resolveEval: ((val: { score: number; mate?: number }) => void) | null = null;
    let resolveBestMove: ((val: string) => void) | null = null;
    let lastEval: { score: number; mate?: number } = { score: 0 };

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";

      if (line.startsWith("info depth") && line.includes("score")) {
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (cpMatch) {
          lastEval = { score: parseInt(cpMatch[1]) };
        } else if (mateMatch) {
          const mate = parseInt(mateMatch[1]);
          lastEval = { score: mate > 0 ? 10000 : -10000, mate };
        }
      }

      if (line.startsWith("bestmove")) {
        const move = line.split(" ")[1];
        if (resolveEval) {
          resolveEval(lastEval);
          resolveEval = null;
        }
        if (resolveBestMove) {
          resolveBestMove(move);
          resolveBestMove = null;
        }
      }
    };

    worker.onerror = reject;

    worker.postMessage("uci");
    worker.postMessage("isready");

    const readyHandler = (e: MessageEvent) => {
      if (typeof e.data === "string" && e.data === "readyok") {
        worker.removeEventListener("message", readyHandler);
        resolve({
          evaluate(fen: string) {
            return new Promise((res) => {
              lastEval = { score: 0 };
              resolveEval = res;
              worker.postMessage(`position fen ${fen}`);
              worker.postMessage("go depth 15");
            });
          },
          getBestMove(fen: string) {
            return new Promise((res) => {
              lastEval = { score: 0 };
              resolveBestMove = res;
              worker.postMessage(`position fen ${fen}`);
              worker.postMessage("go depth 15");
            });
          },
          setElo(elo: number) {
            worker.postMessage("setoption name UCI_LimitStrength value true");
            worker.postMessage(`setoption name UCI_Elo value ${elo}`);
          },
          destroy() {
            worker.postMessage("quit");
            worker.terminate();
          },
        });
      }
    };
    worker.addEventListener("message", readyHandler);
  });
}
