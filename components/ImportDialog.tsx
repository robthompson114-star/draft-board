"use client";

import { useState } from "react";

export default function ImportDialog({
  onClose,
  onImport,
  onSample,
}: {
  onClose: () => void;
  onImport: (text: string) => boolean;
  onSample: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const readFile = async (file: File) => setText(await file.text());

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Import rankings</h2>
        <p className="muted">
          One player per line in rank order: <code>Name, Pos, Team, Tier</code> (tier optional). Paste
          straight from a spreadsheet, upload a .csv, or paste a board exported as JSON. This replaces
          the current board.
        </p>
        <textarea
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Bijan Robinson, RB, ATL, 1\nJa'Marr Chase, WR, CIN, 1\nJosh Allen, QB, BUF, 2"}
        />
        <input
          type="file"
          accept=".csv,.tsv,.txt,.json"
          onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
        />
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button
            className="ghost"
            onClick={() => {
              if (confirm("Replace your board with the sample rankings?")) {
                onSample();
                onClose();
              }
            }}
          >
            Load sample
          </button>
          <div className="spacer" />
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={() => {
              if (onImport(text)) onClose();
              else setError("Couldn't read any players from that input.");
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
