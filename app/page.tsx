import Link from "next/link";
import { SPORT_LIST } from "@/lib/sports";

export default function Home() {
  return (
    <main className="home">
      <h1>Draft Board</h1>
      <p className="home-sub">
        Tier and rerank your fantasy draft, get a second opinion from Claude, and print a cheat
        sheet. Pick a sport to get started.
      </p>
      <div className="sport-grid">
        {SPORT_LIST.map((s) => (
          <Link key={s.slug} href={`/${s.slug}`} className="sport-card" data-sport={s.slug}>
            <span className="sport-emoji" aria-hidden>
              {s.emoji}
            </span>
            <span className="sport-name">{s.name}</span>
            <span className="sport-tagline">{s.tagline}</span>
          </Link>
        ))}
      </div>
      <p className="muted home-foot">
        Each sport has its own board, saved in this browser.
      </p>
    </main>
  );
}
