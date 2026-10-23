import Board from "@/components/Board";

export default function Home() {
  return (
    <>
      <header className="top">
        <h1>Draft Board</h1>
        <p className="muted">
          Drag to rerank · ✂ to split a tier · click a name to mark drafted · saved in this browser
        </p>
      </header>
      <Board />
    </>
  );
}
