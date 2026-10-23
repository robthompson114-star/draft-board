export type SportSlug = "nfl" | "nba" | "mlb" | "nhl";

export type Sport = {
  slug: SportSlug;
  name: string;
  emoji: string;
  tagline: string;
  /** Label for the projected-points column / PDF legend. */
  projLabel: string;
  defaultLeagueNotes: string;
  importPlaceholder: string;
  /** Only the NFL board can pull live projections (Sleeper + ESPN). */
  liveTop300: boolean;
};

export const SPORTS: Record<SportSlug, Sport> = {
  nfl: {
    slug: "nfl",
    name: "NFL",
    emoji: "🏈",
    tagline: "Football · half-PPR projections from Sleeper + ESPN",
    projLabel: "Proj = half-PPR season points",
    defaultLeagueNotes: "12-team, half-PPR, 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX",
    importPlaceholder: "Bijan Robinson, RB, ATL, 1\nJa'Marr Chase, WR, CIN, 1\nJosh Allen, QB, BUF, 2",
    liveTop300: true,
  },
  nba: {
    slug: "nba",
    name: "NBA",
    emoji: "🏀",
    tagline: "Basketball · points or category leagues",
    projLabel: "Proj = projected fantasy points",
    defaultLeagueNotes: "12-team, H2H 9-category (PTS, REB, AST, STL, BLK, 3PM, FG%, FT%, TO)",
    importPlaceholder: "Nikola Jokic, C, DEN, 1\nShai Gilgeous-Alexander, PG, OKC, 1\nVictor Wembanyama, C, SAS, 1",
    liveTop300: false,
  },
  mlb: {
    slug: "mlb",
    name: "MLB",
    emoji: "⚾",
    tagline: "Baseball · roto, categories or points",
    projLabel: "Proj = projected fantasy points",
    defaultLeagueNotes: "12-team, 5x5 roto (R, HR, RBI, SB, AVG / W, SV, K, ERA, WHIP)",
    importPlaceholder: "Shohei Ohtani, DH, LAD, 1\nAaron Judge, OF, NYY, 1\nBobby Witt Jr., SS, KC, 1",
    liveTop300: false,
  },
  nhl: {
    slug: "nhl",
    name: "NHL",
    emoji: "🏒",
    tagline: "Hockey · points or category leagues",
    projLabel: "Proj = projected fantasy points",
    defaultLeagueNotes: "12-team, H2H categories (G, A, +/-, PPP, SOG, HIT; W, SV%, GAA)",
    importPlaceholder: "Connor McDavid, C, EDM, 1\nNathan MacKinnon, C, COL, 1\nCale Makar, D, COL, 1",
    liveTop300: false,
  },
};

export const SPORT_LIST = Object.values(SPORTS);

export const isSportSlug = (s: string): s is SportSlug => s in SPORTS;
