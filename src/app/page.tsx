import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Kobayashi Crisis Lab</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Generative Crisis Simulator</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            Kobayashi is a real-time crisis simulator for precision under pressure and controlled chaos. Choose your
            role, step into the war room, and face a live meltdown: public feeds spike, stakeholders call, internal
            teams flood in, and the SLA clock starts.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            You make decisive moves, Kobayashi scores every choice in real time, then delivers an After-Action Report
            plus ready-to-send comms: public statement, stakeholder email, support script, and internal memo.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/simulator"
              className="rounded bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Start PR Meltdown
            </Link>
            <a
              href="#features"
              className="rounded border border-zinc-600 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400"
            >
              View Simulation Features
            </a>
          </div>
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Public Feed</h2>
            <p className="mt-2 text-sm text-zinc-200">Escalating media signals land in real time as beats trigger.</p>
          </article>

          <article className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Incoming Calls</h2>
            <p className="mt-2 text-sm text-zinc-200">
              Reporter call transcript and audio playback with browser-safe fallback controls.
            </p>
          </article>

          <article className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Action Evaluation</h2>
            <p className="mt-2 text-sm text-zinc-200">Each action updates trust, sentiment, and readiness with coaching.</p>
          </article>

          <article className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">After-Action Report</h2>
            <p className="mt-2 text-sm text-zinc-200">Generate timeline analysis and four communication artifacts instantly.</p>
          </article>
        </section>

        <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Scenario Pack</p>
              <p className="mt-1 text-lg font-semibold">PR Meltdown · SkyWave Air · Head of Comms</p>
            </div>
            <Link
              href="/simulator"
              className="rounded bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              Enter Simulator
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
