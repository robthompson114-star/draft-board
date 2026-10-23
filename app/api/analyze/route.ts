import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { AnalyzeRequest } from "@/lib/types";

export const runtime = "nodejs";
// Claude may think for a while on a big board; give the function room on Vercel.
export const maxDuration = 120;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const AnalysisSchema = z.object({
  summary: z.string().describe("2-4 sentence overall read on the board"),
  moves: z
    .array(
      z.object({
        playerId: z.string().describe("Exact id of the player from the board"),
        toTierIndex: z.number().int().describe("0-based index of the destination tier"),
        placement: z.enum(["top", "bottom"]),
        reason: z.string().describe("One sentence on why"),
      }),
    )
    .describe("Suggested reranks, most impactful first. Empty if the board looks right."),
  tierNotes: z.array(
    z.object({
      tierIndex: z.number().int(),
      note: z.string().describe("Short note on this tier: a cliff, positional scarcity, etc."),
    }),
  ),
});

const SYSTEM = `You are a sharp fantasy sports analyst reviewing a user's tiered draft board.
Tiers group players the user considers roughly interchangeable; order within a tier is their preference.
Suggest only moves you'd genuinely defend (at most ~10), using your knowledge of player value, role, injury risk,
and the league settings provided. Respect the user's board — don't re-rank everything to match consensus.
Players marked drafted are already off the board: never suggest moving them, but use them to judge positional runs.
Use only player ids and tier indexes that appear in the board.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(body?.tiers) || body.tiers.length === 0) {
    return Response.json({ error: "Board has no tiers." }, { status: 400 });
  }

  const board = body.tiers
    .map(
      (t, i) =>
        `[tier ${i}] ${t.name}\n` +
        t.players
          .map(
            (p) =>
              `  - id=${p.id} | ${p.name} | ${p.pos} | ${p.team}` +
              (p.proj != null ? ` | proj ${p.proj} pts` : "") +
              (p.drafted ? " | DRAFTED" : ""),
          )
          .join("\n"),
    )
    .join("\n");

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
      // If a safety classifier ever declines, let the API retry on a suitable model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Sport: ${body.sport || "NFL"}\n\nLeague settings / notes:\n${body.leagueNotes || "(none given)"}\n\nMy board:\n${board}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "Claude declined to analyze this board." }, { status: 422 });
    }
    if (!response.parsed_output) {
      return Response.json({ error: "Claude returned an unexpected response." }, { status: 502 });
    }
    return Response.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Invalid Anthropic API key." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Rate limited — try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return Response.json({ error: `Claude API error (${err.status}).` }, { status: 502 });
    }
    console.error(err);
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
