# ChessSight — Design Specification

A chess learning web app focused on opening mastery and piece sight training.

## Goals

1. Help the user learn classical chess openings through interactive practice
2. Train visual board awareness — seeing what squares each piece attacks and which are contested
3. Provide adjustable AI opponents for continued play after openings

## Tech Stack

- **Framework:** Next.js + TypeScript
- **Deployment:** Vercel
- **Chess engine:** Stockfish WASM (runs entirely in-browser, no server cost)
- **Chess logic:** chess.js (game state, move validation, legal moves)
- **Board UI:** react-chessboard (rendering, drag/drop interaction)
- **Opening book:** Curated JSON served via Next.js API routes

## Architecture

### Hybrid Client-Server

The client does all heavy lifting. The server provides opening book lookups.

**Client-side:**
- chess.js — game state management and move validation
- react-chessboard — board rendering and piece interaction
- Stockfish WASM — position evaluation and AI opponent (ELO 400–2800)
- Sight engine — calculates attack maps from current game state
- Overlay renderer — draws dot indicators and book icons on the board

**Server-side (Next.js API routes):**
- `GET /api/openings?fen=<position>` — returns available book moves and opening name for a given board position
- Stateless — pure lookup against the opening book data

**Opening book data:**
- Structured JSON file keyed by FEN (board position)
- Each entry: `{ move, openingName, eco }`
- Starts with ~50-100 curated main lines (Sicilian, Queen's Gambit, Ruy Lopez, Italian, French, Caro-Kann, etc.)
- Structured for easy expansion — adding openings means adding JSON entries

### Data Flow Per Move

1. Player makes a move → chess.js validates and updates game state
2. New FEN sent to `/api/openings` → returns book moves for current position
3. Sight engine recalculates attack maps from new game state
4. Stockfish evaluates the position (for eval bar)
5. Board re-renders with updated dots, book icons, and eval bar
6. If opponent's turn in Guided Play → pick a random book response (or hand off to Stockfish if out of book)

## Game Modes

### Opening Trainer (Rapid-Fire Drill)

- App presents an opening (random or user-filtered)
- User plays as white or black, opponent plays book moves
- Book move icons (📖) on the board guide the user through known lines
- When the user breaks book:
  - Game pauses
  - Shows the remaining book continuation (where the line was headed)
  - Stockfish evaluates the user's move vs the book move
  - User can take back and retry, or advance to the next opening
- Goal: rapid cycling through openings to build recognition and muscle memory

### Guided Play (Opening → Full Game)

- User plays moves on the board; book icons show available opening moves
- The opening is discovered by playing, not chosen from a catalog
- Opponent randomly selects from known book responses (e.g., playing Queen's Gambit may lead to Accepted, Declined, Slav, etc. depending on opponent's random book choice)
- Once the book is exhausted, Stockfish takes over at the user's chosen ELO level
- Sight overlays and book indicators remain active throughout the entire game
- Teaches how openings transition into middlegames

### Free Play (Sight Training)

- Standard game against Stockfish at adjustable ELO (400–2800)
- No opening guidance or enforced lines
- Book move icons still appear if known book moves exist, but are informational only
- Sight overlays active throughout
- Pure practice with visual training aids

## UI Layout

### Dashboard Structure

```
┌─────────────────────────────────────────────────────┐
│  ♔ ChessSight    [Opening Trainer] [Guided] [Free]  │
├───────────────────────────────┬─────────────────────┤
│                               │ OVERLAYS            │
│                               │ ○ My Sight     [ON] │
│    ┌─┐                        │ ○ Opp Sight    [ON] │
│    │E│    ┌──────────────┐    │ 📖 Book Moves  [ON] │
│    │V│    │              │    │ ▐ Eval Bar     [ON] │
│    │A│    │  CHESSBOARD  │    ├─────────────────────┤
│    │L│    │              │    │ CURRENT OPENING     │
│    │ │    │              │    │ Sicilian Dragon     │
│    │B│    └──────────────┘    │ Move 5 of 12        │
│    │A│                        ├─────────────────────┤
│    │R│                        │ MOVE HISTORY        │
│    └─┘                        │ 1. e4    c5         │
│                               │ 2. Nf3   d6         │
│                               │ 3. d4    cxd4       │
│                               ├─────────────────────┤
│                               │ EVALUATION   +0.3   │
│                               ├─────────────────────┤
│                               │ [Take Back] [Next →]│
│                               │                     │
└───────────────────────────────┴─────────────────────┘
```

### Board Overlays

Each square has designated corners for indicators:

- **Top-right:** Opponent sight dots (red) — count = number of opponent pieces attacking that square
- **Bottom-right:** Your sight dots (blue) — count = number of your pieces attacking that square
- **Bottom-left:** Book move icon (📖) — appears when a known book move lands on that square
- **Top-left:** Reserved for future use

### Evaluation Bar

- Vertical bar along the left edge of the board (chess.com style)
- White section on bottom, black on top
- Fills proportionally based on Stockfish evaluation
- Toggleable via the Overlays panel

### Toggle Switches

All toggles live in the sidebar Overlays panel with clear on/off switch UI:

| Toggle | Indicator | Default |
|--------|-----------|---------|
| My Sight | Blue dot | ON |
| Opponent Sight | Red dot | ON |
| Book Moves | 📖 | ON |
| Evaluation Bar | Bar | ON |

### Mode-Specific Controls

- **Opening Trainer:** Take Back, Next Opening
- **Guided Play:** Take Back, Resign, ELO slider (for post-book Stockfish)
- **Free Play:** New Game, Resign, ELO slider

### Sidebar Panels (top to bottom)

1. Overlays (toggle switches)
2. Current Opening (name, ECO code, move progress, in-book status)
3. Move History (vertical, one row per move number, white + black side by side)
4. Evaluation (horizontal bar + numeric score)
5. Controls (context-sensitive per mode)

## Visual Design

- Dark theme (dark navy/charcoal background)
- Board: classic wood tones (#f0d9b5 light, #b58863 dark)
- Sight dots: blue (rgba(70,130,230,0.8)) for player, red (rgba(230,70,70,0.8)) for opponent
- Book icon: 📖 emoji, small in bottom-left corner
- Sidebar panels: dark cards with subtle borders
- Mode switcher: pill-style tabs in the top bar

## Opening Book Structure

```typescript
interface BookEntry {
  move: string;        // e.g. "e4", "Nf3"
  openingName: string; // e.g. "Sicilian Defense: Dragon Variation"
  eco: string;         // e.g. "B70"
}

// Keyed by FEN string (position after the move leading to this state)
type OpeningBook = Record<string, BookEntry[]>;
```

The API returns all book moves available from the current position. Multiple entries per position represent branching lines (e.g., after 1.d4 d5 2.c4, there are entries for both cxd5 and Nc3).

## Out of Scope (Future)

These are not part of the initial build but the architecture supports them:

- User accounts and authentication
- Progress tracking and statistics
- Gamification (streaks, achievements)
- Expanded opening book (500+ lines)
- Multiplayer
- Mobile-optimized layout
