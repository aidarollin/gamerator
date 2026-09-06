const PHASES = [
  { n: 1, name: "Skeleton, deployed", state: "current" },
  { n: 2, name: "Design system in code", state: "todo" },
  { n: 3, name: "Schema, fixtures, renderer — no AI", state: "todo" },
  { n: 4, name: "Generation", state: "todo" },
  { n: 5, name: "Authoring UI", state: "todo" },
  { n: 6, name: "Persistence", state: "todo" },
  { n: 7, name: "Access, audit, spending wall", state: "todo" },
  { n: 8, name: "Export, and the rest of the catalog", state: "todo" },
  { n: 9, name: "Evals and guardrails", state: "todo" },
  { n: 10, name: "Figma review loop, runbook, handoff", state: "todo" },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">gamerator</h1>
        <p className="text-sm leading-relaxed opacity-70">
          An internal game generator for the Pandai content team. A content
          designer describes a learning game; the system produces a playable,
          Pandai Design System 1.5 faithful game and an export the product team
          can consume.
        </p>
      </header>

      <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-medium">Phase 1 — skeleton, deployed</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-70">
          This page exists to prove one thing: the Next.js + OpenNext +
          Cloudflare Workers stack builds and serves. It has no features and is
          not supposed to. The AI arrives in Phase 4, after the renderer can
          already play hand-written specs.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Build phases</h2>
        <ol className="flex flex-col gap-1">
          {PHASES.map((phase) => (
            <li
              key={phase.n}
              className="flex items-baseline gap-3 text-sm tabular-nums"
            >
              <span className="w-5 shrink-0 text-right opacity-40">
                {phase.n}
              </span>
              <span
                className={
                  phase.state === "current"
                    ? "font-medium"
                    : "opacity-50"
                }
              >
                {phase.name}
              </span>
              {phase.state === "current" && (
                <span className="rounded-full border border-black/15 px-2 py-0.5 text-[11px] opacity-60 dark:border-white/20">
                  current
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <footer className="text-xs leading-relaxed opacity-50">
        Plan and reasoning live in <code>docs/</code>. Read{" "}
        <code>docs/STATUS.md</code> first — it carries the live blockers.
      </footer>
    </main>
  );
}
