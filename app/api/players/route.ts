import { mergeSources, parseEspn, parseSleeper, type SourcePlayer } from "@/lib/projections";

export const runtime = "nodejs";

const SEASON = 2026;
const DAY = 60 * 60 * 24;

const SLEEPER_URL =
  `https://api.sleeper.app/projections/nfl/${SEASON}?season_type=regular` +
  ["QB", "RB", "WR", "TE", "K", "DEF"].map((p) => `&position[]=${p}`).join("") +
  "&order_by=adp_half_ppr";

const ESPN_URL = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leaguedefaults/3?view=kona_player_info`;
const ESPN_FILTER = JSON.stringify({
  players: {
    limit: 1000,
    filterStatsForSourceIds: { value: [1] },
    filterStatsForSplitTypeIds: { value: [0] },
    sortPercOwned: { sortAsc: false, sortPriority: 1 },
  },
});

type SourceStatus = { ok: boolean; count: number; error?: string };

async function load(
  name: string,
  fetcher: () => Promise<SourcePlayer[]>,
  status: Record<string, SourceStatus>,
) {
  try {
    const players = await fetcher();
    status[name] = { ok: players.length > 0, count: players.length };
    if (!players.length) status[name].error = "No projections returned";
    return players;
  } catch (e) {
    status[name] = { ok: false, count: 0, error: e instanceof Error ? e.message : String(e) };
    return [];
  }
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, next: { revalidate: DAY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function GET() {
  const status: Record<string, SourceStatus> = {};
  const [sleeper, espn] = await Promise.all([
    load("sleeper", async () => parseSleeper(await getJson(SLEEPER_URL)), status),
    load(
      "espn",
      async () =>
        parseEspn(
          await getJson(ESPN_URL, {
            headers: { "X-Fantasy-Filter": ESPN_FILTER, Accept: "application/json" },
          }),
          SEASON,
        ),
      status,
    ),
  ]);

  const players = mergeSources({ sleeper, espn }, 300);
  if (!players.length) {
    return Response.json(
      { error: "Couldn't load projections from Sleeper or ESPN.", sources: status },
      { status: 502 },
    );
  }
  return Response.json({ season: SEASON, players, sources: status });
}
