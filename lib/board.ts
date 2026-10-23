import type { BoardState, Player, Tier } from "./types";

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function findTierIndex(tiers: Tier[], playerId: string) {
  return tiers.findIndex((t) => t.playerIds.includes(playerId));
}

/** Overall rank (1-based) for every player, in board order. */
export function overallRanks(state: BoardState) {
  const ranks: Record<string, number> = {};
  let n = 1;
  for (const t of state.tiers) for (const id of t.playerIds) ranks[id] = n++;
  return ranks;
}

/** Per-position rank, e.g. RB3. */
export function positionRanks(state: BoardState) {
  const counts: Record<string, number> = {};
  const ranks: Record<string, string> = {};
  for (const t of state.tiers)
    for (const id of t.playerIds) {
      const pos = state.players[id]?.pos || "?";
      counts[pos] = (counts[pos] ?? 0) + 1;
      ranks[id] = `${pos}${counts[pos]}`;
    }
  return ranks;
}

/** Move a player to `toTier` at `toIndex` (index within the destination tier). */
export function movePlayer(
  state: BoardState,
  playerId: string,
  toTier: number,
  toIndex: number,
): BoardState {
  const from = findTierIndex(state.tiers, playerId);
  if (from === -1 || toTier < 0 || toTier >= state.tiers.length) return state;
  const tiers = state.tiers.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
  tiers[from].playerIds = tiers[from].playerIds.filter((id) => id !== playerId);
  const dest = tiers[toTier].playerIds;
  dest.splice(Math.max(0, Math.min(toIndex, dest.length)), 0, playerId);
  return { ...state, tiers };
}

/** Nudge a player up/down one spot, crossing tier boundaries when at an edge. */
export function nudgePlayer(state: BoardState, playerId: string, dir: -1 | 1): BoardState {
  const t = findTierIndex(state.tiers, playerId);
  if (t === -1) return state;
  const i = state.tiers[t].playerIds.indexOf(playerId);
  const len = state.tiers[t].playerIds.length;
  if (dir === -1 && i === 0) {
    if (t === 0) return state;
    return movePlayer(state, playerId, t - 1, state.tiers[t - 1].playerIds.length);
  }
  if (dir === 1 && i === len - 1) {
    if (t === state.tiers.length - 1) return state;
    return movePlayer(state, playerId, t + 1, 0);
  }
  return movePlayer(state, playerId, t, i + dir);
}

/** Start a new tier beginning at this player (everyone below moves with them). */
export function splitTierAt(state: BoardState, playerId: string): BoardState {
  const t = findTierIndex(state.tiers, playerId);
  if (t === -1) return state;
  const ids = state.tiers[t].playerIds;
  const i = ids.indexOf(playerId);
  if (i === 0) return state;
  const tiers = [...state.tiers];
  tiers.splice(
    t,
    1,
    { ...tiers[t], playerIds: ids.slice(0, i) },
    { id: newId(), name: "", playerIds: ids.slice(i) },
  );
  return { ...state, tiers: renumber(tiers) };
}

/** Merge a tier into the one above it. */
export function mergeTierUp(state: BoardState, tierIndex: number): BoardState {
  if (tierIndex <= 0) return state;
  const tiers = [...state.tiers];
  const above = tiers[tierIndex - 1];
  tiers[tierIndex - 1] = {
    ...above,
    playerIds: [...above.playerIds, ...tiers[tierIndex].playerIds],
  };
  tiers.splice(tierIndex, 1);
  return { ...state, tiers: renumber(tiers) };
}

export function addTier(state: BoardState): BoardState {
  return {
    ...state,
    tiers: renumber([...state.tiers, { id: newId(), name: "", playerIds: [] }]),
  };
}

/** Delete a tier; its players drop into the tier above (or below if it's the first). */
export function deleteTier(state: BoardState, tierIndex: number): BoardState {
  if (state.tiers.length <= 1) return state;
  if (tierIndex > 0) return mergeTierUp(state, tierIndex);
  const tiers = [...state.tiers];
  tiers[1] = { ...tiers[1], playerIds: [...tiers[0].playerIds, ...tiers[1].playerIds] };
  tiers.shift();
  return { ...state, tiers: renumber(tiers) };
}

/** Give default "Tier N" names to tiers the user hasn't custom-named. */
export function renumber(tiers: Tier[]): Tier[] {
  return tiers.map((t, i) =>
    !t.name || /^Tier \d+$/.test(t.name) ? { ...t, name: `Tier ${i + 1}` } : t,
  );
}

export function removePlayer(state: BoardState, playerId: string): BoardState {
  const players = { ...state.players };
  delete players[playerId];
  return {
    ...state,
    players,
    tiers: state.tiers.map((t) => ({
      ...t,
      playerIds: t.playerIds.filter((id) => id !== playerId),
    })),
  };
}

/**
 * Parse pasted rankings. One player per line, in rank order:
 *   Name, POS, TEAM[, tier[, projected points]]
 * Tabs work too (paste straight from a spreadsheet). A header row is skipped.
 * If a tier column is present, players are grouped by it; otherwise they all land in one tier.
 */
export function parseImport(text: string): BoardState | null {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(l.includes("\t") ? "\t" : ",").map((c) => c.trim()));
  if (rows.length && /^name$/i.test(rows[0][0] ?? "")) rows.shift();
  if (!rows.length) return null;

  const players: Record<string, Player> = {};
  const tierMap = new Map<string, string[]>();
  for (const [name, pos = "", team = "", tier = "1", projText = ""] of rows) {
    if (!name) continue;
    const id = newId();
    const proj = parseFloat(projText);
    players[id] = {
      id,
      name,
      pos: pos.toUpperCase(),
      team: team.toUpperCase(),
      drafted: false,
      ...(Number.isFinite(proj) ? { proj } : {}),
    };
    const key = tier || "1";
    if (!tierMap.has(key)) tierMap.set(key, []);
    tierMap.get(key)!.push(id);
  }
  const tiers = renumber(
    [...tierMap.values()].map((playerIds) => ({ id: newId(), name: "", playerIds })),
  );
  return { players, tiers, leagueNotes: "" };
}

export function isBoardState(x: unknown): x is BoardState {
  const b = x as BoardState;
  return !!b && typeof b.players === "object" && Array.isArray(b.tiers);
}

/** Build a fresh board from ranked projections, chunked into tiers of `perTier` (one round in a 12-team league). */
export function boardFromProjections(
  ranked: { name: string; pos: string; team: string; proj: number; sources: Record<string, number>; adp?: number }[],
  leagueNotes: string,
  perTier = 12,
): BoardState {
  const players: Record<string, Player> = {};
  const tiers: Tier[] = [];
  ranked.forEach((r, i) => {
    const id = newId();
    players[id] = { id, name: r.name, pos: r.pos, team: r.team, drafted: false, proj: r.proj, sources: r.sources, adp: r.adp };
    if (i % perTier === 0) tiers.push({ id: newId(), name: "", playerIds: [] });
    tiers[tiers.length - 1].playerIds.push(id);
  });
  return { players, tiers: renumber(tiers), leagueNotes };
}
