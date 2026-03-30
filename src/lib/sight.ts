import { Chess, Square, Color } from "chess.js";

const ALL_SQUARES: Square[] = [];
for (const file of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
  for (const rank of ["1", "2", "3", "4", "5", "6", "7", "8"]) {
    ALL_SQUARES.push(`${file}${rank}` as Square);
  }
}

interface AttackMap {
  white: Record<Square, number>;
  black: Record<Square, number>;
}

function emptySquareMap(): Record<Square, number> {
  const map: Record<string, number> = {};
  for (const sq of ALL_SQUARES) {
    map[sq] = 0;
  }
  return map as Record<Square, number>;
}

export function calculateAttackMap(chess: Chess): AttackMap {
  const white = emptySquareMap();
  const black = emptySquareMap();

  const board = chess.board();

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;

      const from = piece.square;
      const attackedSquares = getAttackedSquares(chess, from, piece.type, piece.color);

      for (const sq of attackedSquares) {
        if (piece.color === "w") {
          white[sq]++;
        } else {
          black[sq]++;
        }
      }
    }
  }

  return { white, black };
}

function getAttackedSquares(
  chess: Chess,
  from: Square,
  pieceType: string,
  color: Color
): Square[] {
  const attacked: Square[] = [];
  const [fileIdx, rankIdx] = squareToCoords(from);

  switch (pieceType) {
    case "p": {
      const direction = color === "w" ? -1 : 1;
      const attackRank = rankIdx + direction;
      if (attackRank >= 0 && attackRank < 8) {
        if (fileIdx > 0) attacked.push(coordsToSquare(fileIdx - 1, attackRank));
        if (fileIdx < 7) attacked.push(coordsToSquare(fileIdx + 1, attackRank));
      }
      break;
    }
    case "n": {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [df, dr] of offsets) {
        const f = fileIdx + df;
        const r = rankIdx + dr;
        if (f >= 0 && f < 8 && r >= 0 && r < 8) attacked.push(coordsToSquare(f, r));
      }
      break;
    }
    case "b": {
      addSlidingAttacks(chess, fileIdx, rankIdx, [[-1,-1],[-1,1],[1,-1],[1,1]], attacked);
      break;
    }
    case "r": {
      addSlidingAttacks(chess, fileIdx, rankIdx, [[-1,0],[1,0],[0,-1],[0,1]], attacked);
      break;
    }
    case "q": {
      addSlidingAttacks(chess, fileIdx, rankIdx, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], attacked);
      break;
    }
    case "k": {
      const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (const [df, dr] of offsets) {
        const f = fileIdx + df;
        const r = rankIdx + dr;
        if (f >= 0 && f < 8 && r >= 0 && r < 8) attacked.push(coordsToSquare(f, r));
      }
      break;
    }
  }
  return attacked;
}

function addSlidingAttacks(
  chess: Chess,
  fileIdx: number,
  rankIdx: number,
  directions: number[][],
  attacked: Square[]
): void {
  const board = chess.board();
  for (const [df, dr] of directions) {
    let f = fileIdx + df;
    let r = rankIdx + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      attacked.push(coordsToSquare(f, r));
      if (board[r][f] !== null) break;
      f += df;
      r += dr;
    }
  }
}

function squareToCoords(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - "a".charCodeAt(0);
  const rank = 8 - parseInt(sq[1]);
  return [file, rank];
}

function coordsToSquare(file: number, rank: number): Square {
  return `${"abcdefgh"[file]}${8 - rank}` as Square;
}
