"use client";

import { OverlayToggles } from "./OverlayToggles";
import { OpeningInfo } from "./OpeningInfo";
import { MoveHistory } from "./MoveHistory";
import { EvalDisplay } from "./EvalDisplay";
import { GameControls } from "./GameControls";
import { GameMode, GameState, ToggleState, EvalResult } from "@/lib/types";

interface SidebarProps {
  mode: GameMode;
  toggles: ToggleState;
  onToggle: (key: keyof ToggleState) => void;
  openingName: string | null;
  eco: string | null;
  moveCount: number;
  isInBook: boolean;
  moveHistory: GameState["moveHistory"];
  evaluation: EvalResult;
  elo: number;
  onEloChange: (elo: number) => void;
  onTakeBack: () => void;
  onNextOpening?: () => void;
  onNewGame?: () => void;
  onResign?: () => void;
}

export function Sidebar({
  mode,
  toggles,
  onToggle,
  openingName,
  eco,
  moveCount,
  isInBook,
  moveHistory,
  evaluation,
  elo,
  onEloChange,
  onTakeBack,
  onNextOpening,
  onNewGame,
  onResign,
}: SidebarProps) {
  return (
    <div className="flex flex-col gap-3 min-w-[260px] max-w-[300px]">
      <OverlayToggles toggles={toggles} onToggle={onToggle} />
      <OpeningInfo
        openingName={openingName}
        eco={eco}
        moveCount={moveCount}
        isInBook={isInBook}
      />
      <MoveHistory moveHistory={moveHistory} />
      <EvalDisplay evaluation={evaluation} />
      <GameControls
        mode={mode}
        onTakeBack={onTakeBack}
        onNextOpening={onNextOpening}
        onNewGame={onNewGame}
        onResign={onResign}
        elo={elo}
        onEloChange={onEloChange}
      />
    </div>
  );
}
