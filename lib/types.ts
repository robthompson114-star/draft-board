export type Player = {
  id: string;
  name: string;
  pos: string;
  team: string;
  drafted: boolean;
  notes?: string;
};

export type Tier = {
  id: string;
  name: string;
  playerIds: string[];
};

export type BoardState = {
  players: Record<string, Player>;
  tiers: Tier[];
  leagueNotes: string;
};

/** What the client sends to /api/analyze. */
export type AnalyzeRequest = {
  leagueNotes: string;
  tiers: {
    name: string;
    players: { id: string; name: string; pos: string; team: string; drafted: boolean }[];
  }[];
};

/** What /api/analyze returns (mirrors the Zod schema in the route). */
export type Suggestion = {
  playerId: string;
  toTierIndex: number;
  placement: "top" | "bottom";
  reason: string;
};

export type AnalyzeResponse = {
  summary: string;
  moves: Suggestion[];
  tierNotes: { tierIndex: number; note: string }[];
};
