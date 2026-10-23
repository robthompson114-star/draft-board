// Parse and merge season projections from Sleeper and ESPN's public (unofficial) fantasy feeds.
// Pure functions so they can be tested without the network; the fetching lives in app/api/players.

export type SourcePlayer = {
  name: string;
  pos: string;
  team: string;
  halfPpr: number;
  adp?: number;
};

export type MergedPlayer = {
  name: string;
  pos: string;
  team: string;
  proj: number;
  sources: Record<string, number>;
  adp?: number;
};

const POSITIONS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

const TEAM_ALIASES: Record<string, string> = { WAS: "WSH", JAC: "JAX", LA: "LAR", OAK: "LV" };
const normTeam = (t: string | null | undefined) => {
  const up = (t ?? "").toUpperCase();
  return TEAM_ALIASES[up] ?? up;
};

const normName = (n: string) =>
  n
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.'’,-]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Team defenses are named differently on every site, so key them by team instead.
const keyOf = (p: { name: string; pos: string; team: string }) =>
  p.pos === "DEF" ? `DEF:${p.team}` : `${p.pos}:${normName(p.name)}`;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Sleeper: GET api.sleeper.app/projections/nfl/{season}?season_type=regular&position[]=... */
export function parseSleeper(json: unknown): SourcePlayer[] {
  if (!Array.isArray(json)) return [];
  const out: SourcePlayer[] = [];
  for (const row of json) {
    const pos = row?.player?.position;
    const pts = Number(row?.stats?.pts_half_ppr);
    if (!POSITIONS.has(pos) || !Number.isFinite(pts) || pts <= 0) continue;
    const team = normTeam(row?.team ?? row?.player?.team);
    const name =
      pos === "DEF"
        ? `${team} D/ST`
        : `${row?.player?.first_name ?? ""} ${row?.player?.last_name ?? ""}`.trim();
    if (!name) continue;
    const adp = Number(row?.stats?.adp_half_ppr);
    out.push({
      name,
      pos,
      team,
      halfPpr: pts,
      // Sleeper uses 999 for "not drafted".
      adp: Number.isFinite(adp) && adp > 0 && adp < 999 ? adp : undefined,
    });
  }
  return out;
}

const ESPN_POS: Record<number, string> = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DEF" };
const ESPN_TEAM: Record<number, string> = {
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
  9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA", 16: "MIN",
  17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC",
  25: "SF", 26: "SEA", 27: "TB", 28: "WSH", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};
const ESPN_RECEPTIONS = "53";

/**
 * ESPN: GET lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leaguedefaults/3?view=kona_player_info
 * League default 3 is PPR scoring, so half-PPR = applied total - 0.5 × receptions.
 */
export function parseEspn(json: unknown, season: number): SourcePlayer[] {
  const players = (json as { players?: unknown[] })?.players;
  if (!Array.isArray(players)) return [];
  const out: SourcePlayer[] = [];
  for (const entry of players as { player?: Record<string, any> }[]) {
    const p = entry?.player;
    const pos = ESPN_POS[p?.defaultPositionId];
    if (!p || !pos) continue;
    const proj = (p.stats ?? []).find(
      (s: any) => s?.seasonId === season && s?.statSourceId === 1 && s?.statSplitTypeId === 0,
    );
    const ppr = Number(proj?.appliedTotal);
    if (!Number.isFinite(ppr) || ppr <= 0) continue;
    const rec = Number(proj?.stats?.[ESPN_RECEPTIONS] ?? 0) || 0;
    const team = ESPN_TEAM[p.proTeamId] ?? "";
    out.push({
      name: pos === "DEF" ? `${team} D/ST` : String(p.fullName ?? ""),
      pos,
      team,
      halfPpr: ppr - 0.5 * rec,
    });
  }
  return out;
}

/**
 * Average each player's half-PPR projection across sources, then rank.
 * Order: Sleeper half-PPR ADP when a player has one (that's the market's draft-day consensus),
 * then everyone else by projected points.
 */
export function mergeSources(bySource: Record<string, SourcePlayer[]>, limit = 300) {
  const merged = new Map<string, MergedPlayer>();
  for (const [source, players] of Object.entries(bySource)) {
    for (const sp of players) {
      const key = keyOf(sp);
      const existing = merged.get(key);
      if (existing) {
        existing.sources[source] = round1(sp.halfPpr);
        existing.adp ??= sp.adp;
        if (!existing.team) existing.team = sp.team;
      } else {
        merged.set(key, {
          name: sp.name,
          pos: sp.pos,
          team: sp.team,
          proj: 0,
          sources: { [source]: round1(sp.halfPpr) },
          adp: sp.adp,
        });
      }
    }
  }
  const all = [...merged.values()];
  for (const p of all) {
    const vals = Object.values(p.sources);
    p.proj = round1(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  all.sort((a, b) => {
    if (a.adp != null && b.adp != null) return a.adp - b.adp;
    if (a.adp != null) return -1;
    if (b.adp != null) return 1;
    return b.proj - a.proj;
  });
  return all.slice(0, limit);
}
