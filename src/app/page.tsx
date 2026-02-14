import Link from "next/link";

const spotlightScenarios = [
  {
    title: "PR Meltdown",
    category: "Corporate Reputation",
    detail: "Live now · SkyWave Air",
    status: "Playable",
  },
  {
    title: "Product Recall Spiral",
    category: "Consumer Safety",
    detail: "Escalating defect reports across channels",
    status: "Coming Soon",
  },
  {
    title: "Data Leak Whiplash",
    category: "Cyber + Trust",
    detail: "Regulatory, media, and customer pressure waves",
    status: "Coming Soon",
  },
];

const features = [
  {
    title: "Live Pressure Environment",
    description:
      "Feeds spike, stakeholders call, internal teams flood the war room, and your SLA clock keeps moving.",
  },
  {
    title: "Real-Time Decision Scoring",
    description:
      "Every move is scored instantly across trust, sentiment, and readiness so tradeoffs are visible as they happen.",
  },
  {
    title: "Deployment-Ready Outputs",
    description:
      "Each run ends with an After-Action Report plus draft comms: public statement, stakeholder email, support script, and internal memo.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(14,116,144,0.2),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(153,27,27,0.2),transparent_40%),#09090b] px-4 py-8 text-zinc-100 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-6 shadow-[0_25px_60px_-30px_rgba(0,0,0,0.8)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Kobayashi Crisis Lab</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
                Precision under pressure. Controlled chaos. Real outcomes.
              </h1>
              <p className="mt-4 text-sm leading-7 text-zinc-200 sm:text-base">
                Kobayashi is a real-time crisis simulator built for precision under pressure and controlled chaos. Pick
                a role, step into the war room, and face a live meltdown: feeds spike, stakeholders call, internal
                teams flood you with questions, and the SLA clock starts.
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-300 sm:text-base">
                You respond with decisive actions, Kobayashi scores your choices in real time, and then produces an
                After-Action Report plus ready-to-send comms: public statement, stakeholder email, support script, and
                internal memo.
              </p>
            </div>

            <div className="min-w-56 rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Scenario Library</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">51+</p>
              <p className="mt-1 text-sm text-zinc-300">PR Meltdown live now + 50 additional crisis scenarios.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/simulator"
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Enter War Room
            </Link>
            <a
              href="#scenarios"
              className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400"
            >
              Explore Scenario Packs
            </a>
          </div>
        </section>

        <section id="scenarios" className="grid gap-4 md:grid-cols-3">
          {spotlightScenarios.map((scenario) => (
            <article
              key={scenario.title}
              className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-5 transition hover:border-zinc-500"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">{scenario.category}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    scenario.status === "Playable"
                      ? "bg-emerald-900/70 text-emerald-200"
                      : "bg-amber-900/60 text-amber-200"
                  }`}
                >
                  {scenario.status}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">{scenario.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">{scenario.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-5">
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
