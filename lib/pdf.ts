import type { BoardState } from "./types";

// Position colors match the on-screen badges (app/globals.css).
const POS_COLORS: Record<string, [number, number, number]> = {
  QB: [229, 72, 77],
  RB: [48, 164, 108],
  WR: [62, 99, 221],
  TE: [247, 107, 21],
  K: [142, 78, 198],
};
const DEFAULT_COLOR: [number, number, number] = [111, 110, 119];

/**
 * Download a printable cheat sheet: three columns per letter page, tier headers,
 * and an empty checkbox per player to cross off during the draft.
 * Players already marked drafted get a filled box.
 */
export async function downloadBoardPdf(state: BoardState) {
  const { jsPDF } = await import("jspdf"); // loaded on demand to keep the page light
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  const gutter = 12;
  const cols = 3;
  const colW = (pageW - margin * 2 - gutter * (cols - 1)) / cols;
  const rowH = 10.5;
  const top = margin + 22;
  const bottom = pageH - margin;

  let page = 1;
  let col = 0;
  let y = top;

  const header = () => {
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(20);
    doc.text("Draft Board", margin, margin + 8);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(110);
    const notes = state.leagueNotes ? `${state.leagueNotes}  ·  ` : "";
    doc.text(`${notes}Proj = half-PPR season points  ·  page ${page}`, pageW - margin, margin + 8, {
      align: "right",
    });
  };

  // Advance to the next column/page if `needed` points won't fit.
  const ensure = (needed: number) => {
    if (y + needed <= bottom) return;
    col++;
    y = top;
    if (col >= cols) {
      doc.addPage();
      page++;
      col = 0;
      header();
    }
  };

  const fit = (text: string, maxW: number) => {
    if (doc.getTextWidth(text) <= maxW) return text;
    while (text.length > 1 && doc.getTextWidth(text + "…") > maxW) text = text.slice(0, -1);
    return text + "…";
  };

  header();
  let rank = 0;
  for (const tier of state.tiers) {
    if (!tier.playerIds.length) continue;
    // Keep a tier header together with at least its first two players.
    ensure(rowH * 3.5);
    const x = margin + col * (colW + gutter);
    doc.setFillColor(235, 237, 240).rect(x, y - 1, colW, rowH + 1, "F");
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(20);
    doc.text(fit(tier.name || "Tier", colW - 6), x + 3, y + 7);
    y += rowH + 3;

    for (const id of tier.playerIds) {
      const p = state.players[id];
      if (!p) continue;
      rank++;
      ensure(rowH);
      const cx = margin + col * (colW + gutter);

      // Checkbox
      doc.setDrawColor(90).setLineWidth(0.6);
      doc.rect(cx, y, 7, 7, p.drafted ? "FD" : "S");

      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(110);
      doc.text(String(rank), cx + 24, y + 6, { align: "right" });

      // Position badge
      const [r, g, b] = POS_COLORS[p.pos] ?? DEFAULT_COLOR;
      doc.setFillColor(r, g, b).roundedRect(cx + 27, y - 0.5, 20, 8, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold").setFontSize(6).setTextColor(255);
      doc.text(p.pos || "-", cx + 37, y + 5.5, { align: "center" });

      const projText = p.proj != null ? p.proj.toFixed(1) : "";
      const right = cx + colW;
      doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(20);
      doc.text(projText, right, y + 6, { align: "right" });
      doc.setFont("helvetica", "normal").setTextColor(110);
      doc.text(p.team, right - 26, y + 6, { align: "right" });

      doc.setFont("helvetica", p.drafted ? "normal" : "bold").setTextColor(p.drafted ? 150 : 20);
      const nameX = cx + 51;
      const name = fit(p.name, right - 50 - nameX);
      doc.text(name, nameX, y + 6);
      if (p.drafted) {
        doc.setDrawColor(150).setLineWidth(0.5);
        doc.line(nameX, y + 3.5, nameX + doc.getTextWidth(name), y + 3.5);
      }
      y += rowH;
    }
    y += 4;
  }

  doc.save("draft-board.pdf");
}
