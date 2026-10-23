"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import {
  addTier,
  boardFromProjections,
  deleteTier,
  findTierIndex,
  isBoardState,
  mergeTierUp,
  movePlayer,
  newId,
  nudgePlayer,
  overallRanks,
  parseImport,
  positionRanks,
  removePlayer,
  splitTierAt,
} from "@/lib/board";
import { downloadBoardPdf } from "@/lib/pdf";
import { sampleBoard } from "@/lib/sample";
import { SPORTS, type SportSlug } from "@/lib/sports";
import type { BoardState, Player } from "@/lib/types";
import AiPanel from "./AiPanel";
import ImportDialog from "./ImportDialog";

// NFL keeps the original key so boards saved before multi-sport support still load.
const storageKey = (sport: SportSlug) =>
  sport === "nfl" ? "draft-board:v1" : `draft-board:${sport}:v1`;

export default function Board({ sport: slug }: { sport: SportSlug }) {
  const sport = SPORTS[slug];
  const STORAGE_KEY = storageKey(slug);
  const [state, setState] = useState<BoardState>(() => sampleBoard(slug));
  const [loaded, setLoaded] = useState(false);
  const [posFilter, setPosFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [hideDrafted, setHideDrafted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPos, setNewPos] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [loadingTop, setLoadingTop] = useState(false);

  // Load / persist to this browser.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isBoardState(parsed)) setState(parsed);
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, loaded]);

  const ranks = useMemo(() => overallRanks(state), [state]);
  const posRanks = useMemo(() => positionRanks(state), [state]);
  const positions = useMemo(
    () => [...new Set(Object.values(state.players).map((p) => p.pos).filter(Boolean))].sort(),
    [state.players],
  );

  const q = search.trim().toLowerCase();
  const isVisible = (p: Player) =>
    (posFilter === "ALL" || p.pos === posFilter) &&
    (!hideDrafted || !p.drafted) &&
    (!q || p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Resolve a droppable id (player or tier) to [tierIndex, indexWithinTier]. */
  const locate = (s: BoardState, id: string): [number, number] | null => {
    const tierIdx = s.tiers.findIndex((t) => t.id === id);
    if (tierIdx !== -1) return [tierIdx, s.tiers[tierIdx].playerIds.length];
    const t = findTierIndex(s.tiers, id);
    if (t === -1) return null;
    return [t, s.tiers[t].playerIds.indexOf(id)];
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  // Moving across tiers happens live during the drag so the drop target opens up.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setState((s) => {
      const from = findTierIndex(s.tiers, String(active.id));
      const to = locate(s, String(over.id));
      if (from === -1 || !to || from === to[0]) return s;
      return movePlayer(s, String(active.id), to[0], to[1]);
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setState((s) => {
      const to = locate(s, String(over.id));
      if (!to) return s;
      return movePlayer(s, String(active.id), to[0], to[1]);
    });
  };

  const update = (fn: (s: BoardState) => BoardState) => setState(fn);
  const togglePlayer = (id: string) =>
    update((s) => ({
      ...s,
      players: { ...s.players, [id]: { ...s.players[id], drafted: !s.players[id].drafted } },
    }));

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = newId();
    update((s) => {
      const tiers = [...s.tiers];
      const last = tiers.length - 1;
      tiers[last] = { ...tiers[last], playerIds: [...tiers[last].playerIds, id] };
      return {
        ...s,
        players: {
          ...s.players,
          [id]: {
            id,
            name: newName.trim(),
            pos: newPos.trim().toUpperCase(),
            team: newTeam.trim().toUpperCase(),
            drafted: false,
          },
        },
        tiers,
      };
    });
    setNewName("");
    setNewPos("");
    setNewTeam("");
  };

  const loadTop300 = async () => {
    if (!confirm("Replace your board with the 2026 top 300 (Sleeper + ESPN half-PPR projections)?"))
      return;
    setLoadingTop(true);
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      if (!res.ok) {
        const detail = Object.entries(data.sources ?? {})
          .map(([k, v]) => `${k}: ${(v as { error?: string }).error ?? "ok"}`)
          .join("; ");
        throw new Error(`${data.error ?? `Request failed (${res.status})`} ${detail}`);
      }
      setState((s) => boardFromProjections(data.players, s.leagueNotes));
      const missing = Object.entries(data.sources ?? {})
        .filter(([, v]) => !(v as { ok: boolean }).ok)
        .map(([k]) => k);
      if (missing.length)
        alert(`Loaded ${data.players.length} players. Couldn't reach: ${missing.join(", ")}.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTop(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "draft-board.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const draftedCount = Object.values(state.players).filter((p) => p.drafted).length;
  const total = Object.keys(state.players).length;
  const activePlayer = activeId ? state.players[activeId] : null;

  // The board lives in localStorage, so render client-side only (avoids a flash of sample data).
  if (!loaded) return <p className="muted loading">Loading board…</p>;

  return (
    <div className="layout">
      <main className="board">
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Filter by position">
            {["ALL", ...positions].map((p) => (
              <button
                key={p}
                className={`chip ${posFilter === p ? "on" : ""}`}
                data-pos={p}
                onClick={() => setPosFilter(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            className="search"
            placeholder="Search player or team"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="toggle">
            <input
              type="checkbox"
              checked={hideDrafted}
              onChange={(e) => setHideDrafted(e.target.checked)}
            />
            Hide drafted
          </label>
          <span className="count">
            {draftedCount}/{total} drafted
          </span>
          <div className="spacer" />
          {sport.liveTop300 && (
            <button className="primary" onClick={loadTop300} disabled={loadingTop}>
              {loadingTop ? "Loading…" : "Load 2026 Top 300"}
            </button>
          )}
          <button onClick={() => update(addTier)}>+ Tier</button>
          <button onClick={() => setImportOpen(true)}>Import</button>
          <button onClick={() => downloadBoardPdf(state, sport)}>Download PDF</button>
          <button onClick={exportJson}>Export</button>
          <button
            className="ghost"
            onClick={() => {
              if (confirm("Mark every player as undrafted?"))
                update((s) => ({
                  ...s,
                  players: Object.fromEntries(
                    Object.entries(s.players).map(([k, p]) => [k, { ...p, drafted: false }]),
                  ),
                }));
            }}
          >
            Reset draft
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          {state.tiers.map((tier, ti) => {
            const visible = tier.playerIds.filter(
              (id) => state.players[id] && isVisible(state.players[id]),
            );
            return (
              <TierSection
                key={tier.id}
                id={tier.id}
                index={ti}
                name={tier.name}
                count={tier.playerIds.length}
                hidden={tier.playerIds.length - visible.length}
                onRename={(name) =>
                  update((s) => ({
                    ...s,
                    tiers: s.tiers.map((t) => (t.id === tier.id ? { ...t, name } : t)),
                  }))
                }
                onMergeUp={ti > 0 ? () => update((s) => mergeTierUp(s, ti)) : undefined}
                onDelete={
                  state.tiers.length > 1 ? () => update((s) => deleteTier(s, ti)) : undefined
                }
              >
                <SortableContext items={visible} strategy={verticalListSortingStrategy}>
                  {visible.map((id, i) => (
                    <PlayerRow
                      key={id}
                      player={state.players[id]}
                      rank={ranks[id]}
                      posRank={posRanks[id]}
                      canSplit={tier.playerIds.indexOf(id) > 0}
                      isFirst={ti === 0 && i === 0}
                      onToggle={() => togglePlayer(id)}
                      onUp={() => update((s) => nudgePlayer(s, id, -1))}
                      onDown={() => update((s) => nudgePlayer(s, id, 1))}
                      onSplit={() => update((s) => splitTierAt(s, id))}
                      onRemove={() => update((s) => removePlayer(s, id))}
                    />
                  ))}
                </SortableContext>
              </TierSection>
            );
          })}
          <DragOverlay>
            {activePlayer ? (
              <div className="row overlay">
                <span className="rank">{ranks[activePlayer.id]}</span>
                <span className="pos" data-pos={activePlayer.pos}>
                  {activePlayer.pos}
                </span>
                <span className="name">{activePlayer.name}</span>
                <span className="team">{activePlayer.team}</span>
                <span className="proj">{activePlayer.proj ?? ""}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <form className="add" onSubmit={addPlayer}>
          <input placeholder="Player name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input placeholder="Pos" value={newPos} onChange={(e) => setNewPos(e.target.value)} size={4} />
          <input placeholder="Team" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} size={4} />
          <button type="submit">Add to last tier</button>
        </form>
      </main>

      <AiPanel state={state} setState={setState} sportName={sport.name} />

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImport={(text) => {
            const trimmed = text.trim();
            if (trimmed.startsWith("{")) {
              try {
                const parsed = JSON.parse(trimmed);
                if (isBoardState(parsed)) {
                  setState(parsed);
                  return true;
                }
              } catch {}
              return false;
            }
            const next = parseImport(text);
            if (!next) return false;
            setState((s) => ({ ...next, leagueNotes: s.leagueNotes }));
            return true;
          }}
          onSample={() => setState(sampleBoard(slug))}
          placeholder={sport.importPlaceholder}
        />
      )}
    </div>
  );
}

function TierSection(props: {
  id: string;
  index: number;
  name: string;
  count: number;
  hidden: number;
  onRename: (name: string) => void;
  onMergeUp?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });
  return (
    <section className={`tier ${isOver ? "over" : ""}`} data-tier={props.index % 8}>
      <header>
        <input
          className="tier-name"
          value={props.name}
          onChange={(e) => props.onRename(e.target.value)}
          aria-label="Tier name"
        />
        <span className="muted">
          {props.count} player{props.count === 1 ? "" : "s"}
          {props.hidden > 0 && ` · ${props.hidden} hidden`}
        </span>
        <div className="spacer" />
        {props.onMergeUp && (
          <button className="ghost small" onClick={props.onMergeUp} title="Merge into tier above">
            Merge ↑
          </button>
        )}
        {props.onDelete && (
          <button
            className="ghost small"
            onClick={props.onDelete}
            title="Delete tier (players move to the adjacent tier)"
          >
            ✕
          </button>
        )}
      </header>
      <div ref={setNodeRef} className="rows">
        {props.children}
        {props.count === 0 && <div className="empty">Drop players here</div>}
      </div>
    </section>
  );
}

function PlayerRow(props: {
  player: Player;
  rank: number;
  posRank: string;
  canSplit: boolean;
  isFirst: boolean;
  onToggle: () => void;
  onUp: () => void;
  onDown: () => void;
  onSplit: () => void;
  onRemove: () => void;
}) {
  const { player: p } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`row ${p.drafted ? "drafted" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <span className="handle" {...attributes} {...listeners} aria-label={`Drag ${p.name}`}>
        ⋮⋮
      </span>
      <span className="rank">{props.rank}</span>
      <span className="pos" data-pos={p.pos}>
        {p.pos || "—"}
      </span>
      <button className="name" onClick={props.onToggle} title="Click to mark drafted">
        {p.name}
      </button>
      <span className="team">{p.team}</span>
      <span className="posrank">{props.posRank}</span>
      <span
        className="proj"
        title={
          p.sources
            ? Object.entries(p.sources)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ") + (p.adp ? ` · ADP ${p.adp}` : "")
            : undefined
        }
      >
        {p.proj ?? ""}
      </span>
      <span className="actions">
        <button className="ghost small" onClick={props.onUp} disabled={props.isFirst} aria-label="Move up">
          ↑
        </button>
        <button className="ghost small" onClick={props.onDown} aria-label="Move down">
          ↓
        </button>
        <button
          className="ghost small"
          onClick={props.onSplit}
          disabled={!props.canSplit}
          title="Start a new tier at this player"
        >
          ✂
        </button>
        <button className="ghost small" onClick={props.onRemove} aria-label="Remove player">
          ✕
        </button>
      </span>
    </div>
  );
}
