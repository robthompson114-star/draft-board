import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Board from "@/components/Board";
import { SPORT_LIST, SPORTS, isSportSlug } from "@/lib/sports";

export const dynamicParams = false;

export function generateStaticParams() {
  return SPORT_LIST.map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sport: string }>;
}): Promise<Metadata> {
  const { sport } = await params;
  return isSportSlug(sport) ? { title: `${SPORTS[sport].name} Draft Board` } : {};
}

export default async function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params;
  if (!isSportSlug(sport)) notFound();
  const s = SPORTS[sport];
  return (
    <>
      <header className="top">
        <Link href="/" className="back">
          ← All sports
        </Link>
        <h1>
          {s.emoji} {s.name} Draft Board
        </h1>
        <p className="muted">
          Drag to rerank · Proj = projected points (hover for each source) · ✂ to split a tier ·
          click a name to mark drafted · saved in this browser
        </p>
      </header>
      <Board sport={sport} />
    </>
  );
}
