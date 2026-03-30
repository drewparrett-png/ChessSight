# UX Learning Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign ChessSight's overlay system, simplify modes to two, add enhanced break detection with what-if exploration, and build a repertoire tracking system — making ChessSight a real learning tool.

**Architecture:** The work decomposes into four independent tracks: (1) sight engine + overlay UI, (2) mode simplification, (3) break detection + exploration, (4) repertoire tracking. Each track modifies shared types but can be built and tested incrementally. All state lives in `page.tsx`; new components are presentational. Storage uses a `RepertoireStore` interface backed by localStorage.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, chess.js, stockfish.js (WASM), Tailwind CSS 4, Jest 30 + React Testing Library 16.

**Spec:** `docs/superpowers/specs/2026-03-30-ux-learning-engine-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/repertoire-store.ts` | `RepertoireStore` interface + `LocalStorageRepertoireStore` implementation |
| `src/lib/repertoire-types.ts` | Types for drill sessions, stats, variation paths |
| `src/lib/opening-parser.ts` | Heuristic parser: flat opening name → variation path array |
| `src/components/SquareTooltip.tsx` | Hover tooltip showing per-piece attacker details |
| `src/components/ExplorationBanner.tsx` | Banner shown during what-if exploration mode |
| `src/components/DrillDashboard.tsx` | Repertoire tree, coverage, suggest drill button |
| `src/hooks/useRepertoire.ts` | React hook wrapping `RepertoireStore` with state |
| `__tests__/lib/sight.test.ts` | Tests for extended attack map with piece-level data |
| `__tests__/lib/repertoire-store.test.ts` | Tests for storage abstraction |
| `__tests__/lib/opening-parser.test.ts` | Tests for opening name parsing |
| `__tests__/lib/stockfish-pv.test.ts` | Tests for PV line parsing |
| `__tests__/components/BoardSquareOverlay.test.tsx` | Tests for new overlay rendering |
| `__tests__/components/BreakDetectionModal.test.tsx` | Tests for enhanced modal |
| `__tests__/components/DrillDashboard.test.tsx` | Tests for drill dashboard |

### Modified Files
| File | What Changes |
|------|-------------|
| `src/lib/types.ts` | `GameMode` → 2 values, `ToggleState` → `controlMap`, `AttackMap` → piece-level data, new `EvalResult.pv` field |
| `src/lib/sight.ts` | `calculateAttackMap` returns piece-level attacker info per square |
| `src/engine/stockfish.ts` | Parse PV lines from UCI `info` output, return in evaluate result |
| `src/hooks/useStockfish.ts` | Expose PV data from engine |
| `src/hooks/useSight.ts` | Return new `AttackMap` shape |
| `src/components/BoardSquareOverlay.tsx` | Replace dots with badge + inner border |
| `src/components/OverlayToggles.tsx` | 3 toggles instead of 4 |
| `src/components/ModeSelector.tsx` | 2 modes instead of 3 |
| `src/components/BreakDetectionModal.tsx` | Quality labels, PV preview, "Explore" button |
| `src/components/Board.tsx` | Pass new overlay props, add tooltip hover state |
| `src/components/Sidebar.tsx` | Conditional DrillDashboard vs OpeningInfo, updated props |
| `src/components/GameControls.tsx` | Updated mode checks for 2 modes |
| `src/app/page.tsx` | New toggle shape, 2 modes, exploration state, repertoire wiring |

---

## Task 1: Update Shared Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update GameMode type**

In `src/lib/types.ts`, replace the `GameMode` type:

```typescript
export type GameMode = "opening-drill" | "play";
```

- [ ] **Step 2: Update ToggleState type**

Replace the `ToggleState` interface:

```typescript
export interface ToggleState {
  controlMap: boolean;
  bookMoves: boolean;
  evalBar: boolean;
}
```

- [ ] **Step 3: Update AttackMap type**

Replace the `AttackMap` interface:

```typescript
export interface Attacker {
  piece: PieceSymbol;
  from: Square;
}

export interface SquareAttackInfo {
  count: number;
  pieces: Attacker[];
}

export interface AttackMap {
  white: Record<Square, SquareAttackInfo>;
  black: Record<Square, SquareAttackInfo>;
}
```

Add `PieceSymbol` to the existing chess.js import at the top of the file: `import { Square, Color, PieceSymbol } from "chess.js"`.

- [ ] **Step 4: Update EvalResult type**

Add a `pv` field to `EvalResult`:

```typescript
export interface EvalResult {
  score: number;
  mate?: number;
  pv?: string[]; // principal variation moves in UCI format
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: update shared types for UX redesign

GameMode: 3 modes → 2 (opening-drill, play)
ToggleState: mySight/opponentSight → controlMap
AttackMap: integer counts → piece-level attacker info
EvalResult: add optional pv field"
```

> **Note:** This will cause TypeScript errors across the codebase. That's expected — subsequent tasks fix each consumer.

---

## Task 2: Extend Sight Engine

**Files:**
- Modify: `src/lib/sight.ts`
- Modify: `src/hooks/useSight.ts`
- Create: `__tests__/lib/sight.test.ts`

- [ ] **Step 1: Write failing tests for piece-level attack map**

Create `__tests__/lib/sight.test.ts`:

```typescript
import { Chess } from "chess.js";
import { calculateAttackMap } from "@/lib/sight";

describe("calculateAttackMap", () => {
  it("returns piece-level attacker info for starting position", () => {
    const chess = new Chess();
    const map = calculateAttackMap(chess);

    // e3 is attacked by white's d2 pawn and f2 pawn
    expect(map.white["e3"].count).toBe(2);
    expect(map.white["e3"].pieces).toEqual(
      expect.arrayContaining([
        { piece: "p", from: "d2" },
        { piece: "p", from: "f2" },
      ])
    );
    expect(map.white["e3"].pieces).toHaveLength(2);
  });

  it("returns zero count and empty pieces for unattacked squares", () => {
    const chess = new Chess();
    const map = calculateAttackMap(chess);

    // e5 is not attacked by white in starting position
    expect(map.white["e5"].count).toBe(0);
    expect(map.white["e5"].pieces).toEqual([]);
  });

  it("tracks knight attacks with source squares", () => {
    const chess = new Chess();
    const map = calculateAttackMap(chess);

    // f3 is attacked by white's g1 knight
    expect(map.white["f3"].pieces).toEqual(
      expect.arrayContaining([{ piece: "n", from: "g1" }])
    );
  });

  it("tracks sliding piece attacks correctly", () => {
    // Position with open files for rook
    const chess = new Chess("r3k3/8/8/8/8/8/8/4K3 b q - 0 1");
    const map = calculateAttackMap(chess);

    // Black rook on a8 attacks a1-a7 and b8-g8 (not past king on e8)
    expect(map.black["a1"].pieces).toEqual(
      expect.arrayContaining([{ piece: "r", from: "a8" }])
    );
    expect(map.black["d8"].pieces).toEqual(
      expect.arrayContaining([{ piece: "r", from: "a8" }])
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/sight.test.ts --no-coverage`
Expected: FAIL — `map.white["e3"]` will be a number, not an object.

- [ ] **Step 3: Update calculateAttackMap to return piece-level data**

In `src/lib/sight.ts`, update the helper and main function:

Replace `emptySquareMap()` (which returns `Record<Square, number>`) with a new helper:

```typescript
function emptyAttackInfoMap(): Record<Square, SquareAttackInfo> {
  const map = {} as Record<Square, SquareAttackInfo>;
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
  for (const f of files) {
    for (const r of ranks) {
      map[`${f}${r}` as Square] = { count: 0, pieces: [] };
    }
  }
  return map;
}
```

Update `calculateAttackMap`:
- Replace `const white = emptySquareMap()` with `const white = emptyAttackInfoMap()`
- Replace `const black = emptySquareMap()` with `const black = emptyAttackInfoMap()`
- Replace `white[sq]++` with `white[sq].count++; white[sq].pieces.push({ piece: piece.type, from: from as Square })`
- Replace `black[sq]++` with `black[sq].count++; black[sq].pieces.push({ piece: piece.type, from: from as Square })`

Update the import at the top to include `SquareAttackInfo` from types.

Remove the old `emptySquareMap()` function if it's no longer used.

- [ ] **Step 4: Update useSight hook**

`src/hooks/useSight.ts` — no changes needed to the hook itself since it just calls `calculateAttackMap` and returns the result. The return type changes automatically via the updated `AttackMap` type.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/lib/sight.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/sight.ts src/hooks/useSight.ts __tests__/lib/sight.test.ts
git commit -m "feat: extend attack map to include piece-level attacker info

calculateAttackMap now returns { count, pieces[] } per square instead of
just an integer count. Enables hover tooltips showing which specific
pieces attack each square."
```

---

## Task 3: Extend Stockfish PV Line Parsing

**Files:**
- Modify: `src/engine/stockfish.ts`
- Modify: `src/hooks/useStockfish.ts`
- Create: `__tests__/lib/stockfish-pv.test.ts`

- [ ] **Step 1: Write failing test for PV parsing**

Create `__tests__/lib/stockfish-pv.test.ts`:

```typescript
import { parsePvFromInfo } from "@/engine/stockfish";

describe("parsePvFromInfo", () => {
  it("extracts PV moves from info line", () => {
    const line = "info depth 15 seldepth 20 score cp 35 pv e2e4 e7e5 g1f3 b8c6 f1b5";
    const pv = parsePvFromInfo(line);
    expect(pv).toEqual(["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"]);
  });

  it("returns empty array for info line without pv", () => {
    const line = "info depth 15 seldepth 20 score cp 35";
    const pv = parsePvFromInfo(line);
    expect(pv).toEqual([]);
  });

  it("handles mate score with pv", () => {
    const line = "info depth 15 score mate 3 pv e2e4 e7e5 d1h5";
    const pv = parsePvFromInfo(line);
    expect(pv).toEqual(["e2e4", "e7e5", "d1h5"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/stockfish-pv.test.ts --no-coverage`
Expected: FAIL — `parsePvFromInfo` is not exported.

- [ ] **Step 3: Add PV parsing to stockfish.ts**

In `src/engine/stockfish.ts`, add an exported helper function:

```typescript
export function parsePvFromInfo(line: string): string[] {
  const pvIndex = line.indexOf(" pv ");
  if (pvIndex === -1) return [];
  return line.slice(pvIndex + 4).trim().split(/\s+/);
}
```

Then update the `evaluate` method inside `createStockfish` to capture the PV from the last `info depth` line. In the message handler that parses `info depth` lines (around line 18-26), also store the PV:

```typescript
// Inside the onmessage handler, where score is parsed:
let lastPv: string[] = [];

// After parsing score from info line:
lastPv = parsePvFromInfo(data);
```

When the `bestmove` line resolves the promise, include the PV:

```typescript
resolve({ score: lastScore, mate: lastMate, pv: lastPv });
```

Update the `evaluate` return type in the `StockfishEngine` interface:

```typescript
evaluate: (fen: string) => Promise<{ score: number; mate?: number; pv?: string[] }>;
```

- [ ] **Step 4: Update useStockfish hook**

In `src/hooks/useStockfish.ts`, update `evaluate` callback to store PV in state:

The `EvalResult` type already has the `pv` field from Task 1. The `evaluate` callback calls `engineRef.current.evaluate(fen)` which now returns `pv`. Update the callback:

```typescript
const evaluate = useCallback(async (fen: string) => {
  if (!engineRef.current) return;
  const result = await engineRef.current.evaluate(fen);
  setEvaluation(result);
}, []);
```

This already works — `result` now includes `pv` and `setEvaluation` stores the full object. No code change needed here, but verify `evaluateRaw` also passes through PV:

```typescript
const evaluateRaw = useCallback(async (fen: string): Promise<EvalResult | null> => {
  if (!engineRef.current) return null;
  return engineRef.current.evaluate(fen);
}, []);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/lib/stockfish-pv.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/engine/stockfish.ts src/hooks/useStockfish.ts __tests__/lib/stockfish-pv.test.ts
git commit -m "feat: parse principal variation from Stockfish output

Extracts PV move list from UCI info lines. evaluate() now returns
pv?: string[] alongside score/mate. Enables showing 'why' lines
in break detection modal."
```

---

## Task 4: Redesign Board Square Overlay

**Files:**
- Modify: `src/components/BoardSquareOverlay.tsx`
- Modify: `src/components/Board.tsx`
- Create: `__tests__/components/BoardSquareOverlay.test.tsx`

- [ ] **Step 1: Write failing test for new overlay**

Create `__tests__/components/BoardSquareOverlay.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { BoardSquareOverlay } from "@/components/BoardSquareOverlay";

describe("BoardSquareOverlay", () => {
  it("renders control badge with positive number when player controls", () => {
    render(
      <BoardSquareOverlay
        square="e4"
        myAttacks={{ count: 3, pieces: [] }}
        opponentAttacks={{ count: 1, pieces: [] }}
        isBookMove={false}
        showControlMap={true}
        showBookMoves={false}
        playerColor="w"
      />
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders negative badge when opponent controls", () => {
    render(
      <BoardSquareOverlay
        square="d5"
        myAttacks={{ count: 1, pieces: [] }}
        opponentAttacks={{ count: 3, pieces: [] }}
        isBookMove={false}
        showControlMap={true}
        showBookMoves={false}
        playerColor="w"
      />
    );
    expect(screen.getByText("−2")).toBeInTheDocument();
  });

  it("renders contested badge when equal", () => {
    render(
      <BoardSquareOverlay
        square="e5"
        myAttacks={{ count: 2, pieces: [] }}
        opponentAttacks={{ count: 2, pieces: [] }}
        isBookMove={false}
        showControlMap={true}
        showBookMoves={false}
        playerColor="w"
      />
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders nothing when no attackers and no book move", () => {
    const { container } = render(
      <BoardSquareOverlay
        square="a1"
        myAttacks={{ count: 0, pieces: [] }}
        opponentAttacks={{ count: 0, pieces: [] }}
        isBookMove={false}
        showControlMap={true}
        showBookMoves={false}
        playerColor="w"
      />
    );
    expect(container.firstChild?.childNodes.length).toBe(0);
  });

  it("renders book move indicator when showBookMoves is true", () => {
    render(
      <BoardSquareOverlay
        square="e4"
        myAttacks={{ count: 0, pieces: [] }}
        opponentAttacks={{ count: 0, pieces: [] }}
        isBookMove={true}
        showControlMap={false}
        showBookMoves={true}
        playerColor="w"
      />
    );
    expect(screen.getByText("📖")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/components/BoardSquareOverlay.test.tsx --no-coverage`
Expected: FAIL — props don't match current interface.

- [ ] **Step 3: Rewrite BoardSquareOverlay component**

Replace `src/components/BoardSquareOverlay.tsx`:

```typescript
"use client";

import { Square } from "chess.js";
import { SquareAttackInfo } from "@/lib/types";

interface BoardSquareOverlayProps {
  square: Square;
  myAttacks: SquareAttackInfo;
  opponentAttacks: SquareAttackInfo;
  isBookMove: boolean;
  showControlMap: boolean;
  showBookMoves: boolean;
  playerColor: "w" | "b";
  bookOpeningName?: string;
}

export function BoardSquareOverlay({
  myAttacks,
  opponentAttacks,
  isBookMove,
  showControlMap,
  showBookMoves,
  bookOpeningName,
}: BoardSquareOverlayProps) {
  const netControl = myAttacks.count - opponentAttacks.count;
  const hasAttackers = myAttacks.count > 0 || opponentAttacks.count > 0;

  // Determine colors based on control
  let borderColor = "transparent";
  let badgeColor = "transparent";
  let badgeText = "";
  let textColor = "white";

  if (showControlMap && hasAttackers) {
    if (netControl > 0) {
      borderColor = `rgba(50, 160, 50, ${Math.min(0.3 + netControl * 0.1, 0.6)})`;
      badgeColor = "rgba(50, 160, 50, 0.85)";
      badgeText = `+${netControl}`;
    } else if (netControl < 0) {
      borderColor = `rgba(230, 70, 70, ${Math.min(0.3 + Math.abs(netControl) * 0.1, 0.6)})`;
      badgeColor = "rgba(230, 70, 70, 0.85)";
      badgeText = `−${Math.abs(netControl)}`;
    } else {
      borderColor = "rgba(200, 180, 40, 0.4)";
      badgeColor = "rgba(180, 160, 40, 0.85)";
      badgeText = "0";
    }
  }

  const showBadge = showControlMap && hasAttackers;
  const showBook = showBookMoves && isBookMove;

  if (!showBadge && !showBook) {
    return <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        boxShadow: showBadge ? `inset 0 0 0 2px ${borderColor}` : "none",
      }}
    >
      {showBadge && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: badgeColor,
            color: textColor,
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 4px",
            borderRadius: 3,
            lineHeight: "14px",
            pointerEvents: "auto",
          }}
        >
          {badgeText}
        </span>
      )}
      {showBook && (
        <span
          style={{
            position: "absolute",
            bottom: 2,
            left: 2,
            fontSize: 12,
            lineHeight: 1,
          }}
          title={bookOpeningName || "Book move"}
        >
          📖
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update Board.tsx to pass new overlay props**

In `src/components/Board.tsx`, update the square renderer callback. Where it currently passes `whiteAttacks={attackMap.white[square] || 0}` and `blackAttacks={attackMap.black[square] || 0}`, change to:

```typescript
const playerAttacks = playerColor === "w" ? attackMap.white[square] : attackMap.black[square];
const opponentAttacks = playerColor === "w" ? attackMap.black[square] : attackMap.white[square];
```

And pass to `BoardSquareOverlay`:

```typescript
<BoardSquareOverlay
  square={square}
  myAttacks={playerAttacks || { count: 0, pieces: [] }}
  opponentAttacks={opponentAttacks || { count: 0, pieces: [] }}
  isBookMove={/* existing logic */}
  showControlMap={toggles.controlMap}
  showBookMoves={toggles.bookMoves}
  playerColor={playerColor}
  bookOpeningName={/* existing logic */}
/>
```

Remove references to `toggles.mySight` and `toggles.opponentSight` — replace with `toggles.controlMap`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/components/BoardSquareOverlay.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/BoardSquareOverlay.tsx src/components/Board.tsx __tests__/components/BoardSquareOverlay.test.tsx
git commit -m "feat: redesign overlay with control badges and inner borders

Replace red/blue attacker dots with colored inner border + corner badge
showing net control number. Green = you control, red = they control,
yellow = contested. Preserves light/dark square distinction."
```

---

## Task 5: Add Square Hover Tooltip

**Files:**
- Create: `src/components/SquareTooltip.tsx`
- Modify: `src/components/Board.tsx`

- [ ] **Step 1: Create SquareTooltip component**

Create `src/components/SquareTooltip.tsx`:

```typescript
"use client";

import { Square, PieceSymbol } from "chess.js";
import { SquareAttackInfo } from "@/lib/types";

interface SquareTooltipProps {
  square: Square;
  myAttacks: SquareAttackInfo;
  opponentAttacks: SquareAttackInfo;
  position: { x: number; y: number };
}

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King",
};

function formatAttackers(info: SquareAttackInfo): string {
  if (info.count === 0) return "None";
  return info.pieces.map((a) => `${PIECE_NAMES[a.piece]} ${a.from}`).join(", ");
}

export function SquareTooltip({
  square,
  myAttacks,
  opponentAttacks,
  position,
}: SquareTooltipProps) {
  const net = myAttacks.count - opponentAttacks.count;
  const netLabel =
    net > 0 ? `+${net} You` : net < 0 ? `${net} Them` : "Even";

  return (
    <div
      style={{
        position: "fixed",
        left: position.x + 12,
        top: position.y - 8,
        background: "rgba(22, 33, 62, 0.95)",
        border: "1px solid #0f3460",
        borderRadius: 6,
        padding: "8px 12px",
        color: "#e8e8e8",
        fontSize: 12,
        lineHeight: 1.6,
        zIndex: 1000,
        pointerEvents: "none",
        minWidth: 180,
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {square.toUpperCase()} — {netLabel}
      </div>
      <div style={{ color: "rgba(100, 200, 100, 0.9)" }}>
        You: {formatAttackers(myAttacks)}
      </div>
      <div style={{ color: "rgba(230, 100, 100, 0.9)" }}>
        Them: {formatAttackers(opponentAttacks)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add hover state to Board.tsx**

In `src/components/Board.tsx`:

1. Add state for hovered square and mouse position:

```typescript
const [hoveredSquare, setHoveredSquare] = useState<Square | null>(null);
const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
```

2. Add `onMouseOver` handler to the board wrapper div that determines which square is hovered based on mouse position relative to the board, or add `pointerEvents: "auto"` to the overlay badge and use `onMouseEnter`/`onMouseLeave` on the square overlay container.

The simplest approach: update `BoardSquareOverlay` to accept `onMouseEnter` and `onMouseLeave` callbacks, set `pointerEvents: "auto"` on the outer div, and bubble hover events up.

3. Render `SquareTooltip` when `hoveredSquare` is set and `toggles.controlMap` is true:

```typescript
{hoveredSquare && toggles.controlMap && (
  <SquareTooltip
    square={hoveredSquare}
    myAttacks={playerAttacksForSquare}
    opponentAttacks={opponentAttacksForSquare}
    position={tooltipPos}
  />
)}
```

- [ ] **Step 3: Verify tooltip appears on hover manually**

Run: `npm run dev`
Open the app, enable Control Map, hover over squares.
Expected: Tooltip shows square name, attacker list, and net control.

- [ ] **Step 4: Commit**

```bash
git add src/components/SquareTooltip.tsx src/components/Board.tsx src/components/BoardSquareOverlay.tsx
git commit -m "feat: add hover tooltip showing per-piece attacker details

Hovering a square with Control Map active shows which specific pieces
attack it from each side, with net control summary."
```

---

## Task 6: Simplify Overlay Toggles

**Files:**
- Modify: `src/components/OverlayToggles.tsx`

- [ ] **Step 1: Update OverlayToggles to 3 toggles**

In `src/components/OverlayToggles.tsx`, replace the 4 toggle items with 3:

```typescript
const TOGGLES: { key: keyof ToggleState; label: string; color: string }[] = [
  { key: "controlMap", label: "Control Map", color: "rgba(100, 180, 100, 0.8)" },
  { key: "bookMoves", label: "Book Moves", color: "#66bb6a" },
  { key: "evalBar", label: "Eval Bar", color: "#7ec8e3" },
];
```

Remove references to `mySight` and `opponentSight`.

- [ ] **Step 2: Verify toggles render correctly**

Run: `npm run dev`
Expected: 3 toggles in sidebar — Control Map, Book Moves, Eval Bar.

- [ ] **Step 3: Commit**

```bash
git add src/components/OverlayToggles.tsx
git commit -m "refactor: simplify overlay toggles from 4 to 3

Replace My Sight + Opponent Sight with single Control Map toggle.
Book Moves and Eval Bar unchanged."
```

---

## Task 7: Simplify Modes to Two

**Files:**
- Modify: `src/components/ModeSelector.tsx`
- Modify: `src/components/GameControls.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update ModeSelector**

In `src/components/ModeSelector.tsx`, replace the MODES array:

```typescript
const MODES: { key: GameMode; label: string }[] = [
  { key: "opening-drill", label: "Opening Drill" },
  { key: "play", label: "Play" },
];
```

- [ ] **Step 2: Update GameControls mode checks**

In `src/components/GameControls.tsx`:
- ELO slider: show when `mode === "play"` (was `guided-play` or `free-play`)
- Take Back: always shown (unchanged)
- Next Opening: show when `mode === "opening-drill"` (was `opening-trainer`)
- New Game: show when `mode === "play"` (was `free-play`)
- Resign: show when `mode === "play"` (was `guided-play` or `free-play`)

Remove the `onNewGame` button — it's redundant with Resign in the unified Play mode. Resign can serve both purposes.

- [ ] **Step 3: Update page.tsx mode state and AI logic**

In `src/app/page.tsx`:

1. Change default mode:
```typescript
const [mode, setMode] = useState<GameMode>("play");
```

2. Update toggle state default:
```typescript
const [toggles, setToggles] = useState<ToggleState>({
  controlMap: true,
  bookMoves: true,
  evalBar: true,
});
```

3. Update AI move logic:
- `mode === "opening-drill"`: plays book moves only (was `opening-trainer`)
- `mode === "play"`: tries book moves first, falls back to Stockfish (was `guided-play` logic)
- Remove the `free-play` branch entirely

4. Update break detection: only trigger when `mode === "opening-drill"` (was `opening-trainer`)

5. Update all references to `toggles.mySight`/`toggles.opponentSight` → use `toggles.controlMap`

- [ ] **Step 4: Verify both modes work**

Run: `npm run dev`
Test:
- Opening Drill: opponent plays book moves, break detection fires on non-book moves
- Play: Stockfish responds, no break detection modal

- [ ] **Step 5: Commit**

```bash
git add src/components/ModeSelector.tsx src/components/GameControls.tsx src/app/page.tsx
git commit -m "feat: simplify to two modes — Opening Drill and Play

Remove Guided Play and Free Play. Opening Drill = opponent stays in book.
Play = full Stockfish game with learning tools."
```

---

## Task 8: Enhance Break Detection Modal

**Files:**
- Modify: `src/components/BreakDetectionModal.tsx`
- Create: `__tests__/components/BreakDetectionModal.test.tsx`

- [ ] **Step 1: Write failing test for move quality labels**

Create `__tests__/components/BreakDetectionModal.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { BreakDetectionModal } from "@/components/BreakDetectionModal";

describe("BreakDetectionModal", () => {
  const defaultProps = {
    userMove: "Nf6",
    bookMoves: [{ move: "e5", openingName: "King's Pawn", eco: "C20" }],
    userMoveEval: { score: -45, pv: ["g1f3", "b8c6", "f1b5"] },
    bookMoveEval: { score: 15, pv: ["e7e5", "g1f3", "b8c6"] },
    onTryAgain: jest.fn(),
    onNextOpening: jest.fn(),
    onExplore: jest.fn(),
  };

  it("shows Inaccuracy label for 30-100cp loss", () => {
    render(<BreakDetectionModal {...defaultProps} />);
    expect(screen.getByText("Inaccuracy")).toBeInTheDocument();
  });

  it("shows OK label for < 30cp loss", () => {
    render(
      <BreakDetectionModal
        {...defaultProps}
        userMoveEval={{ score: 5 }}
        bookMoveEval={{ score: 15 }}
      />
    );
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("shows Blunder label for > 200cp loss", () => {
    render(
      <BreakDetectionModal
        {...defaultProps}
        userMoveEval={{ score: -250 }}
        bookMoveEval={{ score: 15 }}
      />
    );
    expect(screen.getByText("Blunder")).toBeInTheDocument();
  });

  it("renders Explore button", () => {
    render(<BreakDetectionModal {...defaultProps} />);
    expect(screen.getByText("Explore")).toBeInTheDocument();
  });

  it("shows PV line when available", () => {
    render(<BreakDetectionModal {...defaultProps} />);
    // Book move PV should be displayed
    expect(screen.getByText(/e7e5/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/components/BreakDetectionModal.test.tsx --no-coverage`
Expected: FAIL — no `onExplore` prop, no quality labels.

- [ ] **Step 3: Rewrite BreakDetectionModal**

Replace `src/components/BreakDetectionModal.tsx`:

```typescript
"use client";

import { BookEntry, EvalResult } from "@/lib/types";

interface BreakDetectionModalProps {
  userMove: string;
  bookMoves: BookEntry[];
  userMoveEval: EvalResult;
  bookMoveEval: EvalResult;
  onTryAgain: () => void;
  onNextOpening: () => void;
  onExplore: () => void;
}

function classifyMove(userScore: number, bookScore: number): { label: string; color: string } {
  const loss = Math.abs(bookScore - userScore);
  if (loss < 30) return { label: "OK", color: "#66bb6a" };
  if (loss < 100) return { label: "Inaccuracy", color: "#fdd835" };
  if (loss < 200) return { label: "Mistake", color: "#ffa726" };
  return { label: "Blunder", color: "#ef5350" };
}

function formatScore(eval_: EvalResult): string {
  if (eval_.mate !== undefined) return `M${eval_.mate}`;
  return eval_.score > 0 ? `+${(eval_.score / 100).toFixed(1)}` : (eval_.score / 100).toFixed(1);
}

function formatPv(pv?: string[]): string {
  if (!pv || pv.length === 0) return "";
  return pv.slice(0, 5).join(" ");
}

export function BreakDetectionModal({
  userMove,
  bookMoves,
  userMoveEval,
  bookMoveEval,
  onTryAgain,
  onNextOpening,
  onExplore,
}: BreakDetectionModalProps) {
  const quality = classifyMove(userMoveEval.score, bookMoveEval.score);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: "var(--bg-card, #16213e)", border: "1px solid var(--border-color, #0f3460)",
        borderRadius: 12, padding: 24, maxWidth: 420, width: "90%", color: "var(--text-primary, #e8e8e8)",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>You Left the Book</h3>

        {/* Quality Badge */}
        <div style={{
          display: "inline-block", padding: "4px 12px", borderRadius: 6,
          background: quality.color, color: "#1a1a2e", fontWeight: 700, fontSize: 14, marginBottom: 16,
        }}>
          {quality.label}
        </div>

        {/* User Move */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary, #888)", marginBottom: 4 }}>Your Move</div>
          <div style={{ fontWeight: 600 }}>{userMove} ({formatScore(userMoveEval)})</div>
          {userMoveEval.pv && userMoveEval.pv.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted, #666)", marginTop: 2 }}>
              Line: {formatPv(userMoveEval.pv)}
            </div>
          )}
        </div>

        {/* Book Move */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary, #888)", marginBottom: 4 }}>Book Move</div>
          {bookMoves.map((bm, i) => (
            <div key={i}>
              <div style={{ fontWeight: 600 }}>
                {bm.move} ({formatScore(bookMoveEval)}) — {bm.openingName} ({bm.eco})
              </div>
            </div>
          ))}
          {bookMoveEval.pv && bookMoveEval.pv.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted, #666)", marginTop: 2 }}>
              Line: {formatPv(bookMoveEval.pv)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onTryAgain} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border-color, #0f3460)",
            background: "transparent", color: "var(--text-primary, #e8e8e8)", cursor: "pointer", fontWeight: 600,
          }}>
            Try Again
          </button>
          <button onClick={onExplore} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
            background: "var(--accent-highlight, #7ec8e3)", color: "#1a1a2e", cursor: "pointer", fontWeight: 600,
          }}>
            Explore
          </button>
          <button onClick={onNextOpening} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border-color, #0f3460)",
            background: "transparent", color: "var(--text-primary, #e8e8e8)", cursor: "pointer", fontWeight: 600,
          }}>
            Next Opening
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/components/BreakDetectionModal.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/BreakDetectionModal.tsx __tests__/components/BreakDetectionModal.test.tsx
git commit -m "feat: enhance break detection with quality labels, PV lines, Explore

Modal now classifies moves as OK/Inaccuracy/Mistake/Blunder based on
centipawn loss. Shows engine continuation lines. Adds Explore button
for what-if play."
```

---

## Task 9: Add What-If Exploration Mode

**Files:**
- Create: `src/components/ExplorationBanner.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create ExplorationBanner component**

Create `src/components/ExplorationBanner.tsx`:

```typescript
"use client";

interface ExplorationBannerProps {
  breakMoveNumber: number;
  onBackToDrill: () => void;
}

export function ExplorationBanner({
  breakMoveNumber,
  onBackToDrill,
}: ExplorationBannerProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 16px", background: "rgba(126, 200, 227, 0.15)",
      border: "1px solid rgba(126, 200, 227, 0.3)", borderRadius: 8, marginBottom: 8,
      color: "var(--accent-highlight, #7ec8e3)", fontSize: 13,
    }}>
      <span>Exploring — you broke from book at move {breakMoveNumber}</span>
      <button onClick={onBackToDrill} style={{
        padding: "4px 12px", borderRadius: 6, border: "1px solid var(--accent-highlight, #7ec8e3)",
        background: "transparent", color: "var(--accent-highlight, #7ec8e3)", cursor: "pointer",
        fontSize: 12, fontWeight: 600,
      }}>
        Back to Drill
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add exploration state to page.tsx**

In `src/app/page.tsx`, add state:

```typescript
const [isExploring, setIsExploring] = useState(false);
const [explorationBreakMove, setExplorationBreakMove] = useState(0);
const [explorationReturnFen, setExplorationReturnFen] = useState<string | null>(null);
```

First, add a `loadFen` method to `useGame`. In `src/hooks/useGame.ts`, add alongside `resetGame`:

```typescript
const loadFen = useCallback((fen: string) => {
  chessRef.current.load(fen);
  syncState();
}, [syncState]);
```

And include `loadFen` in the return object.

Then in `page.tsx`, save the pre-break FEN when break detection triggers (before the non-book move is evaluated). Add a ref or state variable:

```typescript
const preBreakFenRef = useRef<string | null>(null);
```

In the break detection logic (where the non-book move is detected, around the existing break handling code), save the FEN *before* the move was made:

```typescript
// When break is detected, save the FEN from before the user's non-book move
// This is the position we want to return to
preBreakFenRef.current = previousFen; // previousFen should be captured before makeMove
```

Add `onExplore` handler (passed to `BreakDetectionModal`):

```typescript
const handleExplore = useCallback(() => {
  setIsExploring(true);
  setExplorationBreakMove(Math.ceil(gameState.moveHistory.length / 2));
  setExplorationReturnFen(preBreakFenRef.current);
  setShowBreakModal(false);
}, [gameState.moveHistory.length]);
```

Add `onBackToDrill` handler:

```typescript
const handleBackToDrill = useCallback(() => {
  if (explorationReturnFen) {
    loadFen(explorationReturnFen); // from useGame hook
  }
  setIsExploring(false);
  setExplorationReturnFen(null);
  preBreakFenRef.current = null;
}, [explorationReturnFen, loadFen]);
```

During exploration mode:
- AI moves use Stockfish (not book moves) regardless of mode
- Break detection is suppressed
- Repertoire tracking is suppressed

- [ ] **Step 3: Render ExplorationBanner above the board**

In `page.tsx`, above the `<Board>` component:

```typescript
{isExploring && (
  <ExplorationBanner
    breakMoveNumber={explorationBreakMove}
    onBackToDrill={handleBackToDrill}
  />
)}
```

- [ ] **Step 4: Verify exploration flow manually**

Run: `npm run dev`
1. Switch to Opening Drill
2. Play a non-book move
3. Click "Explore" in modal
4. Verify: banner appears, Stockfish responds, no more break modals
5. Click "Back to Drill" — returns to pre-break position

- [ ] **Step 5: Commit**

```bash
git add src/components/ExplorationBanner.tsx src/app/page.tsx src/hooks/useGame.ts
git commit -m "feat: add what-if exploration mode for break detection

After breaking from book, users can click Explore to continue playing
the position against Stockfish. Banner shows break point. Back to Drill
returns to the book position."
```

---

## Task 10: Build Opening Name Parser

**Files:**
- Create: `src/lib/opening-parser.ts`
- Create: `__tests__/lib/opening-parser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/opening-parser.test.ts`:

```typescript
import { parseVariationPath } from "@/lib/opening-parser";

describe("parseVariationPath", () => {
  it("parses colon-separated variation", () => {
    expect(parseVariationPath("Queen's Gambit Declined: Orthodox Defense"))
      .toEqual(["Queen's Gambit", "Declined", "Orthodox Defense"]);
  });

  it("parses single opening name", () => {
    expect(parseVariationPath("Sicilian Defense"))
      .toEqual(["Sicilian Defense"]);
  });

  it("parses comma-separated variation", () => {
    expect(parseVariationPath("Ruy Lopez, Berlin Defense"))
      .toEqual(["Ruy Lopez", "Berlin Defense"]);
  });

  it("handles null/empty input", () => {
    expect(parseVariationPath(null)).toEqual(["Unknown"]);
    expect(parseVariationPath("")).toEqual(["Unknown"]);
  });

  it("trims whitespace from parts", () => {
    expect(parseVariationPath("French Defense : Winawer Variation"))
      .toEqual(["French Defense", "Winawer Variation"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/opening-parser.test.ts --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement parser**

Create `src/lib/opening-parser.ts`:

```typescript
export function parseVariationPath(openingName: string | null): string[] {
  if (!openingName || openingName.trim() === "") return ["Unknown"];

  // Try colon-separated first (most common: "Queen's Gambit Declined: Orthodox Defense")
  if (openingName.includes(":")) {
    return openingName.split(":").map((s) => s.trim()).filter(Boolean);
  }

  // Try comma-separated ("Ruy Lopez, Berlin Defense")
  if (openingName.includes(",")) {
    return openingName.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return [openingName.trim()];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/opening-parser.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/opening-parser.ts __tests__/lib/opening-parser.test.ts
git commit -m "feat: add heuristic opening name parser for variation paths

Parses flat opening names like 'Queen's Gambit Declined: Orthodox Defense'
into variation path arrays for repertoire tree display."
```

---

## Task 11: Build Repertoire Store

**Files:**
- Create: `src/lib/repertoire-types.ts`
- Create: `src/lib/repertoire-store.ts`
- Create: `src/hooks/useRepertoire.ts`
- Create: `__tests__/lib/repertoire-store.test.ts`

- [ ] **Step 1: Define repertoire types**

Create `src/lib/repertoire-types.ts`:

```typescript
export type MoveQuality = "ok" | "inaccuracy" | "mistake" | "blunder" | "completed";

export interface DrillSession {
  id: string;
  openingName: string;
  eco: string;
  variationPath: string[];
  depthReached: number;
  breakQuality: MoveQuality;
  timestamp: number;
}

export interface OpeningStats {
  openingName: string;
  eco: string;
  drillCount: number;
  completions: number;
  lastDrilled: number;
  breakdowns: Record<MoveQuality, number>;
  variations: Record<string, number>; // variation path key → drill count
}

export interface RepertoireStats {
  totalDrills: number;
  openingsExplored: number;
  totalOpeningsInBook: number;
  openings: OpeningStats[];
}

export interface RepertoireStore {
  save(session: DrillSession): void;
  getStats(): RepertoireStats;
  getOpeningHistory(eco?: string): DrillSession[];
  clear(): void;
}
```

- [ ] **Step 2: Write failing tests for localStorage store**

Create `__tests__/lib/repertoire-store.test.ts`:

```typescript
import { LocalStorageRepertoireStore } from "@/lib/repertoire-store";
import { DrillSession } from "@/lib/repertoire-types";

// Mock localStorage
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => mockStorage[key] || null);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => { mockStorage[key] = value; });
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation((key) => { delete mockStorage[key]; });
});

afterEach(() => jest.restoreAllMocks());

function makeSession(overrides?: Partial<DrillSession>): DrillSession {
  return {
    id: crypto.randomUUID(),
    openingName: "Sicilian Defense",
    eco: "B20",
    variationPath: ["Sicilian Defense"],
    depthReached: 5,
    breakQuality: "inaccuracy",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("LocalStorageRepertoireStore", () => {
  it("saves and retrieves a drill session", () => {
    const store = new LocalStorageRepertoireStore(75);
    const session = makeSession();
    store.save(session);
    const history = store.getOpeningHistory();
    expect(history).toHaveLength(1);
    expect(history[0].eco).toBe("B20");
  });

  it("computes stats across multiple sessions", () => {
    const store = new LocalStorageRepertoireStore(75);
    store.save(makeSession({ eco: "B20", openingName: "Sicilian Defense" }));
    store.save(makeSession({ eco: "B20", openingName: "Sicilian Defense" }));
    store.save(makeSession({ eco: "D06", openingName: "Queen's Gambit" }));
    const stats = store.getStats();
    expect(stats.totalDrills).toBe(3);
    expect(stats.openingsExplored).toBe(2);
  });

  it("filters history by ECO code", () => {
    const store = new LocalStorageRepertoireStore(75);
    store.save(makeSession({ eco: "B20" }));
    store.save(makeSession({ eco: "D06" }));
    expect(store.getOpeningHistory("B20")).toHaveLength(1);
  });

  it("clears all data", () => {
    const store = new LocalStorageRepertoireStore(75);
    store.save(makeSession());
    store.clear();
    expect(store.getOpeningHistory()).toHaveLength(0);
  });

  it("tracks completions separately", () => {
    const store = new LocalStorageRepertoireStore(75);
    store.save(makeSession({ breakQuality: "completed" }));
    store.save(makeSession({ breakQuality: "mistake" }));
    const stats = store.getStats();
    const opening = stats.openings[0];
    expect(opening.completions).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/lib/repertoire-store.test.ts --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement LocalStorageRepertoireStore**

Create `src/lib/repertoire-store.ts`:

```typescript
import { DrillSession, OpeningStats, RepertoireStats, RepertoireStore, MoveQuality } from "./repertoire-types";

const STORAGE_KEY = "chesssight-repertoire";

export class LocalStorageRepertoireStore implements RepertoireStore {
  private totalOpeningsInBook: number;

  constructor(totalOpeningsInBook: number) {
    this.totalOpeningsInBook = totalOpeningsInBook;
  }

  private getSessions(): DrillSession[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setSessions(sessions: DrillSession[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  save(session: DrillSession): void {
    const sessions = this.getSessions();
    sessions.push(session);
    this.setSessions(sessions);
  }

  getStats(): RepertoireStats {
    const sessions = this.getSessions();
    const byEco = new Map<string, DrillSession[]>();

    for (const s of sessions) {
      const existing = byEco.get(s.eco) || [];
      existing.push(s);
      byEco.set(s.eco, existing);
    }

    const openings: OpeningStats[] = [];
    for (const [eco, ecoSessions] of byEco) {
      const breakdowns: Record<MoveQuality, number> = {
        ok: 0, inaccuracy: 0, mistake: 0, blunder: 0, completed: 0,
      };
      const variations: Record<string, number> = {};

      for (const s of ecoSessions) {
        breakdowns[s.breakQuality]++;
        const varKey = s.variationPath.join(" > ");
        variations[varKey] = (variations[varKey] || 0) + 1;
      }

      openings.push({
        openingName: ecoSessions[0].openingName,
        eco,
        drillCount: ecoSessions.length,
        completions: breakdowns.completed,
        lastDrilled: Math.max(...ecoSessions.map((s) => s.timestamp)),
        breakdowns,
        variations,
      });
    }

    openings.sort((a, b) => b.drillCount - a.drillCount);

    return {
      totalDrills: sessions.length,
      openingsExplored: byEco.size,
      totalOpeningsInBook: this.totalOpeningsInBook,
      openings,
    };
  }

  getOpeningHistory(eco?: string): DrillSession[] {
    const sessions = this.getSessions();
    if (!eco) return sessions;
    return sessions.filter((s) => s.eco === eco);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/lib/repertoire-store.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Create useRepertoire hook**

Create `src/hooks/useRepertoire.ts`:

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import { LocalStorageRepertoireStore } from "@/lib/repertoire-store";
import { DrillSession, RepertoireStats, RepertoireStore } from "@/lib/repertoire-types";

export function useRepertoire(totalOpeningsInBook: number) {
  const storeRef = useRef<RepertoireStore>(new LocalStorageRepertoireStore(totalOpeningsInBook));
  const [stats, setStats] = useState<RepertoireStats>(() => storeRef.current.getStats());

  const saveDrill = useCallback((session: DrillSession) => {
    storeRef.current.save(session);
    setStats(storeRef.current.getStats());
  }, []);

  const getHistory = useCallback((eco?: string) => {
    return storeRef.current.getOpeningHistory(eco);
  }, []);

  const clearAll = useCallback(() => {
    storeRef.current.clear();
    setStats(storeRef.current.getStats());
  }, []);

  const suggestDrill = useCallback((availableEcos: string[]): string | null => {
    const currentStats = storeRef.current.getStats();
    // Prefer weak spots (high break rate), then least practiced
    const ecoSet = new Set(availableEcos);
    const explored = currentStats.openings.filter((o) => ecoSet.has(o.eco));
    const unexplored = availableEcos.filter((eco) => !explored.some((o) => o.eco === eco));

    // If there are unexplored openings, pick one at random
    if (unexplored.length > 0) {
      return unexplored[Math.floor(Math.random() * unexplored.length)];
    }

    // Otherwise pick the one with highest break rate (lowest completion ratio)
    const sorted = [...explored].sort((a, b) => {
      const aRate = a.completions / a.drillCount;
      const bRate = b.completions / b.drillCount;
      return aRate - bRate; // lowest completion rate first
    });

    return sorted[0]?.eco || null;
  }, []);

  return { stats, saveDrill, getHistory, clearAll, suggestDrill };
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/repertoire-types.ts src/lib/repertoire-store.ts src/hooks/useRepertoire.ts __tests__/lib/repertoire-store.test.ts
git commit -m "feat: add repertoire tracking with localStorage persistence

RepertoireStore interface with LocalStorageRepertoireStore implementation.
Tracks drill sessions, computes per-opening stats, suggests weak-spot
drills. useRepertoire hook wraps store with React state."
```

---

## Task 12: Build Drill Dashboard

**Files:**
- Create: `src/components/DrillDashboard.tsx`
- Create: `__tests__/components/DrillDashboard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/DrillDashboard.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { DrillDashboard } from "@/components/DrillDashboard";
import { RepertoireStats } from "@/lib/repertoire-types";

const mockStats: RepertoireStats = {
  totalDrills: 65,
  openingsExplored: 3,
  totalOpeningsInBook: 75,
  openings: [
    {
      openingName: "Sicilian Defense",
      eco: "B20",
      drillCount: 50,
      completions: 30,
      lastDrilled: Date.now(),
      breakdowns: { ok: 10, inaccuracy: 5, mistake: 3, blunder: 2, completed: 30 },
      variations: { "Sicilian Defense > Najdorf": 20, "Sicilian Defense > Dragon": 15 },
    },
    {
      openingName: "Queen's Gambit",
      eco: "D06",
      drillCount: 10,
      completions: 2,
      lastDrilled: Date.now() - 86400000,
      breakdowns: { ok: 3, inaccuracy: 2, mistake: 2, blunder: 1, completed: 2 },
      variations: { "Queen's Gambit > Declined": 7 },
    },
  ],
};

describe("DrillDashboard", () => {
  it("renders coverage indicator", () => {
    render(<DrillDashboard stats={mockStats} onSuggestDrill={jest.fn()} />);
    expect(screen.getByText(/3 of 75/)).toBeInTheDocument();
  });

  it("renders opening names with drill counts", () => {
    render(<DrillDashboard stats={mockStats} onSuggestDrill={jest.fn()} />);
    expect(screen.getByText(/Sicilian Defense/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("renders Suggest Drill button", () => {
    render(<DrillDashboard stats={mockStats} onSuggestDrill={jest.fn()} />);
    expect(screen.getByText("Suggest Drill")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/components/DrillDashboard.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement DrillDashboard**

Create `src/components/DrillDashboard.tsx`:

```typescript
"use client";

import { useState } from "react";
import { RepertoireStats, OpeningStats } from "@/lib/repertoire-types";

interface DrillDashboardProps {
  stats: RepertoireStats;
  onSuggestDrill: () => void;
  currentOpening?: string | null;
  currentEco?: string | null;
}

function OpeningRow({ opening }: { opening: OpeningStats }) {
  const [expanded, setExpanded] = useState(false);
  const completionRate = opening.drillCount > 0 ? opening.completions / opening.drillCount : 0;
  const isWeak = completionRate < 0.4 && opening.drillCount >= 3;

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "6px 8px", background: "transparent",
          border: "none", color: "var(--text-primary, #e8e8e8)", cursor: "pointer",
          borderRadius: 4, fontSize: 13, textAlign: "left",
        }}
      >
        <span>
          {expanded ? "▾" : "▸"} {opening.openingName}
          {isWeak && <span style={{ color: "#ffa726", marginLeft: 4 }} title="Weak spot">⚠️</span>}
        </span>
        <span style={{ color: "var(--text-muted, #666)", fontSize: 12 }}>
          {opening.drillCount}
          {opening.completions > 0 && (
            <span style={{ color: "#66bb6a", marginLeft: 4 }}>
              {"✓".repeat(Math.min(opening.completions, 3))}
            </span>
          )}
        </span>
      </button>
      {expanded && (
        <div style={{ paddingLeft: 20, fontSize: 12, color: "var(--text-secondary, #888)" }}>
          {Object.entries(opening.variations).map(([path, count]) => (
            <div key={path} style={{ padding: "2px 0" }}>
              {path} ({count})
            </div>
          ))}
          <div style={{ padding: "2px 0", color: "var(--text-muted, #666)" }}>
            OK: {opening.breakdowns.ok} · Inaccuracy: {opening.breakdowns.inaccuracy} ·
            Mistake: {opening.breakdowns.mistake} · Blunder: {opening.breakdowns.blunder}
          </div>
        </div>
      )}
    </div>
  );
}

export function DrillDashboard({
  stats,
  onSuggestDrill,
  currentOpening,
  currentEco,
}: DrillDashboardProps) {
  return (
    <div style={{
      background: "var(--bg-card, #16213e)", borderRadius: 8,
      border: "1px solid var(--border-color, #0f3460)", padding: 12,
    }}>
      {/* Current Opening */}
      {currentOpening && (
        <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border-color, #0f3460)" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted, #666)", marginBottom: 4 }}>
            Current Opening
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary, #e8e8e8)" }}>
            {currentOpening}
          </div>
          {currentEco && (
            <span style={{ fontSize: 11, color: "var(--text-secondary, #888)" }}>{currentEco}</span>
          )}
        </div>
      )}

      {/* Coverage */}
      <div style={{ marginBottom: 12, fontSize: 12, color: "var(--text-secondary, #888)" }}>
        Explored {stats.openingsExplored} of {stats.totalOpeningsInBook} openings · {stats.totalDrills} total drills
      </div>

      {/* Suggest Drill */}
      <button onClick={onSuggestDrill} style={{
        width: "100%", padding: "8px 12px", marginBottom: 12, borderRadius: 6,
        border: "1px solid var(--accent-highlight, #7ec8e3)", background: "transparent",
        color: "var(--accent-highlight, #7ec8e3)", cursor: "pointer", fontWeight: 600, fontSize: 13,
      }}>
        Suggest Drill
      </button>

      {/* Opening Tree */}
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {stats.openings.length === 0 ? (
          <div style={{ color: "var(--text-muted, #666)", fontSize: 13, textAlign: "center", padding: 16 }}>
            No drills yet. Start playing!
          </div>
        ) : (
          stats.openings.map((o) => <OpeningRow key={o.eco} opening={o} />)
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/components/DrillDashboard.test.tsx --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DrillDashboard.tsx __tests__/components/DrillDashboard.test.tsx
git commit -m "feat: add drill dashboard with repertoire tree and coverage

Collapsible opening tree showing drill counts, completion indicators,
weak spot warnings. Coverage indicator and Suggest Drill button."
```

---

## Task 13: Wire Everything Together

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar to conditionally render DrillDashboard**

In `src/components/Sidebar.tsx`:

1. Add `DrillDashboard` import and new props:

```typescript
import { DrillDashboard } from "./DrillDashboard";
import { RepertoireStats } from "@/lib/repertoire-types";
```

Add to `SidebarProps`:

```typescript
stats?: RepertoireStats;
onSuggestDrill?: () => void;
```

2. In the render, replace `<OpeningInfo>` with conditional rendering:

```typescript
{mode === "opening-drill" && stats ? (
  <DrillDashboard
    stats={stats}
    onSuggestDrill={onSuggestDrill || (() => {})}
    currentOpening={openingName}
    currentEco={eco}
  />
) : (
  <OpeningInfo
    openingName={openingName}
    eco={eco}
    moveCount={moveCount}
    isInBook={isInBook}
  />
)}
```

- [ ] **Step 2: Wire repertoire into page.tsx**

In `src/app/page.tsx`:

1. Import and initialize the hook:

```typescript
import { useRepertoire } from "@/hooks/useRepertoire";
import { parseVariationPath } from "@/lib/opening-parser";
```

```typescript
const { stats, saveDrill, suggestDrill } = useRepertoire(75); // 75 openings in book
```

2. Detect end-of-book-line and save "completed" drills. After the user plays a book move and the opponent responds, fetch the new position's book moves. If the API returns an empty moves array (no book continuations), the line is complete. Save the drill:

```typescript
// In the move handler, after opponent plays book response and new bookMoves are fetched:
if (mode === "opening-drill" && newBookMoves.length === 0) {
  saveDrill({
    id: crypto.randomUUID(),
    openingName: currentOpening || "Unknown",
    eco: eco || "???",
    variationPath: parseVariationPath(currentOpening),
    depthReached: Math.ceil(gameState.moveHistory.length / 2),
    breakQuality: "completed",
    timestamp: Date.now(),
  });
}
```

Do NOT save on every intermediate book move — only on breaks (step 3) and completions (this step).

3. When break detection triggers, save the drill session:

```typescript
saveDrill({
  id: crypto.randomUUID(),
  openingName: currentOpening || "Unknown",
  eco: eco || "???",
  variationPath: parseVariationPath(currentOpening),
  depthReached: Math.ceil(gameState.moveHistory.length / 2),
  breakQuality: classifyMoveQuality(userMoveEval.score, bookMoveEval.score),
  timestamp: Date.now(),
});
```

Extract the quality classifier into a shared utility. In `src/lib/repertoire-types.ts`, add:

```typescript
export function classifyMoveQuality(userScore: number, bookScore: number): MoveQuality {
  const loss = Math.abs(bookScore - userScore);
  if (loss < 30) return "ok";
  if (loss < 100) return "inaccuracy";
  if (loss < 200) return "mistake";
  return "blunder";
}
```

Then update `BreakDetectionModal` to import and use it (replacing the local `classifyMove` function). The modal maps `MoveQuality` → display label and color:

```typescript
import { classifyMoveQuality } from "@/lib/repertoire-types";

const QUALITY_DISPLAY: Record<MoveQuality, { label: string; color: string }> = {
  ok: { label: "OK", color: "#66bb6a" },
  inaccuracy: { label: "Inaccuracy", color: "#fdd835" },
  mistake: { label: "Mistake", color: "#ffa726" },
  blunder: { label: "Blunder", color: "#ef5350" },
  completed: { label: "Completed", color: "#66bb6a" },
};
```

And `page.tsx` imports the same function for repertoire saves.

4. Wire `suggestDrill` to the dashboard button. The `suggestDrill` function returns an ECO code. To start a drill for that ECO, reset the game to the starting position (`resetGame()`) and let the normal Opening Drill flow handle it — the opponent will play book moves, and the suggested ECO will naturally appear as the user plays into that line. For a more targeted approach: scan `openings.json` to find a FEN whose entries match the target ECO, then use `loadFen()` to jump to that position. Start simple (just reset to start) and enhance later if needed.

5. Pass `stats` and `onSuggestDrill` to `<Sidebar>`.

- [ ] **Step 3: Run the full test suite**

Run: `npx jest --no-coverage`
Expected: All tests pass. Fix any remaining TypeScript or test failures.

- [ ] **Step 4: Manual integration test**

Run: `npm run dev`

Full test flow:
1. Open app → defaults to Play mode
2. Switch to Opening Drill → DrillDashboard shows (empty initially)
3. Play some book moves → position advances
4. Play a non-book move → break modal shows with quality label + PV lines
5. Click "Try Again" → returns to position
6. Play non-book move again → click "Explore" → banner appears, Stockfish plays
7. Click "Back to Drill" → returns to book position
8. Complete a few drills → dashboard updates with counts and variation tree
9. Click "Suggest Drill" → loads a new opening
10. Toggle Control Map → badges + borders appear on squares
11. Hover a square → tooltip shows attacker details
12. Switch to Play mode → regular Stockfish game, no drill dashboard

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/Sidebar.tsx
git commit -m "feat: wire repertoire tracking and drill dashboard into app

Connect useRepertoire hook to page state. Sidebar conditionally shows
DrillDashboard in Opening Drill mode. Drill sessions saved on book
breaks. Suggest Drill picks weak spots or unexplored openings."
```

---

## Task 14: Type Check and Final Cleanup

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Fix any remaining type errors from the migration.

- [ ] **Step 2: Run full test suite**

Run: `npx jest --no-coverage`
Ensure all tests pass.

- [ ] **Step 3: Run dev build**

Run: `npm run build`
Ensure the build succeeds with no errors.

- [ ] **Step 4: Clean up any unused imports or dead code**

Remove old `emptySquareMap` function from `sight.ts` if still present. Remove any unused type imports. Remove references to `"free-play"` or `"guided-play"` strings anywhere in the codebase.

Run: `npx tsc --noEmit && npx jest --no-coverage`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: clean up types and remove dead code from mode migration"
```
