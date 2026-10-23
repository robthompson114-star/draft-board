"use client";

import { useState } from "react";
import { findTierIndex, movePlayer } from "@/lib/board";
import type { AnalyzeRequest, AnalyzeResponse, BoardState, Suggestion } from "@/lib/types";

export default function AiPanel({
  state,
  setState,
  sportName,
}: {
  state: BoardState;
  setState: React.Dispatch<React.SetStateAction<BoardState>>;
  sportName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(new Set());
    const body: AnalyzeRequest = {
      sport: sportName,
      leagueNotes: state.leagueNotes,
      tiers: state.tiers.map((t) => ({
        name: t.name,
        players: t.playerIds
          .map((id) => state.players[id])
          .filter(Boolean)
          .map(({ id, name, pos, team, drafted, proj }) => ({ id, name, pos, team, drafted, proj })),
      })),
    };
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Drop suggestions that reference players/tiers that no longer exist.
  const valid = (m: Suggestion) =>
    !!state.players[m.playerId] && m.toTierIndex >= 0 && m.toTierIndex < state.tiers.length;

  const apply = (m: Suggestion, i: number) => {
    setState((s) =>
      movePlayer(
        s,
        m.playerId,
        m.toTierIndex,
        m.placement === "top" ? 0 : s.tiers[m.toTierIndex].playerIds.length,
      ),
    );
    setApplied((a) => new Set(a).add(i));
  };

  const applyAll = () => result?.moves.forEach((m, i) => !applied.has(i) && valid(m) && apply(m, i));

  return (
    <aside className="ai">
      <h2>Ask Claude</h2>
      <label className="muted" htmlFor="league">
        League settings & notes
      </label>
      <textarea
        id="league"
        rows={3}
        value={state.leagueNotes}
        onChange={(e) => setState((s) => ({ ...s, leagueNotes: e.target.value }))}
        placeholder="e.g. 12-team, full PPR, superflex, I pick 7th"
      />
      <button className="primary" onClick={analyze} disabled={loading}>
        {loading ? "Analyzing…" : "Review my tiers"}
      </button>
      {loading && <p className="muted">Claude is reading your board — this can take 20–60 seconds.</p>}
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <p>{result.summary}</p>

          {result.moves.length > 0 && (
            <>
              <div className="result-head">
                <h3>Suggested moves</h3>
                <button className="small" onClick={applyAll}>
                  Apply all
                </button>
              </div>
              <ul className="moves">
                {result.moves.map((m, i) => {
                  if (!valid(m)) return null;
                  const p = state.players[m.playerId];
                  const from = findTierIndex(state.tiers, m.playerId);
                  return (
                    <li key={i} className={applied.has(i) ? "applied" : ""}>
                      <div>
                        <strong>{p.name}</strong>{" "}
                        <span className="muted">
                          {state.tiers[from]?.name ?? "?"} → {state.tiers[m.toTierIndex].name} ({m.placement})
                        </span>
                      </div>
                      <div className="reason">{m.reason}</div>
                      <button className="small" onClick={() => apply(m, i)} disabled={applied.has(i)}>
                        {applied.has(i) ? "Applied" : "Apply"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {result.tierNotes.length > 0 && (
            <>
              <h3>Tier notes</h3>
              <ul className="notes">
                {result.tierNotes.map((n, i) => (
                  <li key={i}>
                    <strong>{state.tiers[n.tierIndex]?.name ?? `Tier ${n.tierIndex + 1}`}:</strong> {n.note}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
