# ChessSight UX: Learning Engine Redesign

## Problem Statement

ChessSight's current UX has three issues that limit its effectiveness as a learning tool:

1. **Sight overlays are hard to interpret** — small red/blue dots are difficult to distinguish, create visual clutter on busy boards, and show raw attacker counts rather than answering the useful question: "who controls this square?"
2. **Learning feedback is shallow** — the break detection modal shows eval numbers but doesn't help users understand *why* a book move is better, doesn't track progress over time, and doesn't build toward mastery.
3. **Mode purpose is unclear** — three modes (Opening Trainer, Guided Play, Free Play) with overlapping functionality and unclear distinctions between Guided Play and Free Play.

## Design Overview

### 1. Sight Overlay Redesign

**Replace dots with badge + inner border system.**

Each square with attackers gets:
- A **colored inner border** (2px inset box-shadow) for at-a-glance pattern scanning: green = you control, red = they control, yellow/amber = contested
- A **corner badge** (top-right) showing the net control number: "+2", "−1", "0"

Color and intensity scale with the control differential. Squares with no attackers from either side show nothing.

**Hover tooltip:** Hovering any square when the overlay is active shows:
- Square name (e.g., "d5")
- Your attacking pieces listed by name and source square (e.g., "You: Knight c3, Bishop b5, Pawn e4")
- Their attacking pieces listed the same way
- Net control summary (e.g., "+2 You")

The tooltip disappears on mouseout and does not interfere with click-to-move.

**Toggle simplification:**
- Current: 4 toggles (My Sight, Opponent Sight, Book Moves, Eval Bar)
- New: 3 toggles
  - **Control Map** (on/off) — the badge + border overlay, replacing both "My Sight" and "Opponent Sight"
  - **Book Moves** (on/off) — unchanged
  - **Eval Bar** (on/off) — unchanged

The combined "Control Map" view is the primary mode because it answers the actionable question. Per-side attack views are available via hover tooltip on individual squares.

**Required data model change:** The current `useSight` hook and `AttackMap` type return only integer attacker counts per square (`Record<Square, number>`). The tooltip requires knowing *which* pieces attack each square. `calculateAttackMap` in `src/lib/sight.ts` must be extended to return piece-level attacker info (piece type + source square) alongside counts. The `AttackMap` type becomes something like `Record<Square, { count: number; pieces: Array<{ piece: PieceSymbol; from: Square }> }>`.

**Why this design:**
- Preserves light/dark square distinction (critical for chess vision — players think in terms of light-square vs dark-square control)
- The inner border provides quick spatial scanning without obscuring the board
- The number badge gives precise information when needed
- Reduces cognitive load: one number answers "am I winning this battle?" instead of counting and comparing two sets of dots

### 2. Mode Simplification

**Collapse three modes into two:**

**Opening Drill** (replaces "Opening Trainer"):
- Opponent strictly plays book moves only
- Break detection with enhanced feedback (see Section 3)
- Repertoire tracking is active — every drill session is logged
- "Next Opening" and "Suggest Drill" buttons available

**Play** (replaces "Guided Play" and "Free Play"):
- Full game against Stockfish at adjustable ELO (400–2800)
- All learning tools available: sight overlay, eval bar, book move indicators
- During the opening phase, book moves are shown on the board as suggestions
- Once out of book, the game continues naturally — no modal interruption
- No repertoire tracking — this mode is for applying knowledge, not drilling

**The distinction:** Opening Drill is for memorization. Play is for application.

Sidebar toggles, eval display, and game controls work identically in both modes.

**Type changes:** The `GameMode` type changes from `"opening-trainer" | "guided-play" | "free-play"` to `"opening-drill" | "play"`. The `ToggleState` type changes from `{ mySight, opponentSight, bookMoves, evalBar }` to `{ controlMap, bookMoves, evalBar }` (all booleans). Both types are referenced across multiple components (`page.tsx`, `Board`, `Sidebar`, `OverlayToggles`, `ModeSelector`) and all consumers must be updated.

### 3. Enhanced Break Detection & What-If Exploration

**Upgraded break detection modal (Opening Drill only):**

When the user plays a non-book move:

1. **Move quality label** — classifies the move with color coding:
   - OK (< 30cp loss) — green
   - Inaccuracy (30–100cp loss) — yellow
   - Mistake (100–200cp loss) — orange
   - Blunder (> 200cp loss) — red
2. **Side-by-side comparison** — user's move with eval vs best book move with eval (same as today but with clearer labels)
3. **"Why?" line preview** — engine's top continuation (3–5 moves) for both the user's move and the book move, shown in algebraic notation. **Note:** The current `useStockfish` hook only returns eval scores and best move, not principal variation (PV) lines. The hook must be extended to parse PV data from the Stockfish `info` output (the `pv` field in UCI protocol) and expose it as an array of moves.
4. **Three actions:**
   - **Try Again** — undoes the move, returns to the position (same as today)
   - **Next Opening** — starts a new drill (same as today)
   - **Explore** — new: dismisses the modal and continues play from the non-book position

**What-If Exploration mode:**

When the user clicks "Explore":
- The game continues from the non-book move against the Stockfish engine
- A small banner appears above the board: "Exploring — you broke from book at move X"
- The user can play out the position to experience the consequences of their move
- A "Back to Drill" button returns to the book position to try again
- Exploration sessions are NOT tracked in repertoire stats — this is a learning sandbox

### 4. Repertoire Tracker

**Data model — what gets tracked per drill session:**
- Opening name and ECO code
- Variation path (e.g., Queen's Gambit → Declined → Orthodox Defense). **Note:** The current `BookEntry` type only stores a flat `openingName` and `eco` code — there is no hierarchical variation data. The variation path will be derived by parsing `openingName` strings heuristically (e.g., "Queen's Gambit Declined: Orthodox Defense" → ["Queen's Gambit", "Declined", "Orthodox Defense"]). This is imperfect but sufficient; the opening book data can be restructured later for more accuracy.
- Depth reached before breaking from book (or "completed" if the full line was played)
- Move quality at the break point (OK / Inaccuracy / Mistake / Blunder)
- Timestamp

**Drill Dashboard (sidebar in Opening Drill mode):**

Replaces the current "Opening Info" card with a richer display:
- Collapsible tree of openings drilled, with drill counts and status indicators
- ✓ for lines completed without breaking
- ⚠️ for lines where the user consistently breaks (weak spots)
- Coverage indicator: "You've explored X of Y openings in the book"
- **"Suggest Drill"** button — picks the least-practiced opening or one where the user keeps breaking. Tiebreaker: prefer weak-spot openings (high break rate) over merely least-practiced ones. Simple heuristic, not spaced repetition.

**Storage abstraction:**
- A `RepertoireStore` interface with methods: `save(session)`, `getStats()`, `getOpeningHistory(eco?)`, `clear()`
- `LocalStorageRepertoireStore` implements the interface using browser localStorage
- Interface is designed so a backend implementation can drop in later without touching any components

**Explicitly out of scope:**
- Spaced repetition scheduling algorithm
- Trend charts or analytics over time
- Export/import of repertoire data
- Backend/auth system

### 5. Component Changes Summary

| Component | Change |
|-----------|--------|
| **BoardSquareOverlay** | Replace dots with badge + inner border rendering |
| **OverlayToggles** | 3 toggles (Control Map, Book Moves, Eval Bar) instead of 4 |
| **ModeSelector** | 2 modes (Opening Drill, Play) instead of 3 |
| **BreakDetectionModal** | Add move quality label, line preview, "Explore" action |
| **OpeningInfo** | Replace with DrillDashboard in Opening Drill mode |
| **Sidebar** | Conditionally render DrillDashboard vs simple OpeningInfo based on mode |
| **New: SquareTooltip** | Hover tooltip showing attacker details |
| **New: ExplorationBanner** | Banner during what-if exploration |
| **New: DrillDashboard** | Repertoire tree, coverage, suggest drill |
| **New: RepertoireStore** | Storage abstraction + localStorage implementation |

### 6. Data Flow

```
User makes move in Opening Drill
  → useGame updates position
  → useOpeningBook checks if move is in book
  → If not in book:
      → useStockfish evaluates both moves
      → BreakDetectionModal shows with quality label + line preview
      → User chooses: Try Again / Next Opening / Explore
      → If Explore: enter exploration mode (banner, engine play, no tracking)
  → If in book:
      → RepertoireStore.save() logs the continuation
      → DrillDashboard updates stats
      → Opponent plays book response

User hovers square (Control Map active)
  → useSight provides attacker data for square
  → SquareTooltip renders with piece-by-piece breakdown
```

## Success Criteria

1. A user can glance at the board and instantly see which squares they control vs their opponent — without counting dots
2. When breaking from book, the user understands whether their move was reasonable and why the book move is preferred
3. After 10+ drill sessions, the user can see which openings they know well and which need work
4. The two-mode structure is self-explanatory — no confusion about which mode to use
