export type Player = {
  id: string;
  name: string;
  pos: string;
  team: string;
  drafted: boolean;
  notes?: string;
  /** Average season half-PPR projection across sources. */
  proj?: number;
  /** Per-source half-PPR projections, e.g. { sleeper: 251.3, espn: 240.1 }. */
  sources?: Record<string, number>;
  adp?: number;
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
    players: {
      id: string;
      name: string;
      pos: string;
      team: string;
      drafted: boolean;
      proj?: number;
    }[];
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
