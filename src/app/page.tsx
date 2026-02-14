import Link from "next/link";

const spotlightScenarios = [
  {
    title: "PR Meltdown",
    category: "Corporate Reputation",
    detail: "Live now · SkyWave Air — grounded flights, viral footage, hostile reporters",
    status: "Playable",
  },
  {
    title: "Product Recall Spiral",
    category: "Consumer Safety",
    detail: "Escalating defect reports, regulatory pressure, supply chain chaos",
    status: "Coming Soon",
  },
  {
    title: "Data Leak Whiplash",
    category: "Cyber + Trust",
    detail: "Regulatory, media, and customer pressure waves after a breach",
    status: "Coming Soon",
  },
];

const features = [
  {
    num: "01",
    title: "Live Pressure Environment",
    description:
      "Social feeds spike, reporters call in, internal teams flood the war room with questions, and your 8-minute SLA clock never stops.",
  },
  {
    num: "02",
    title: "AI-Scored Decisions",
    description:
      "Every action you take is evaluated by Claude in real time across trust, sentiment, legal risk, and readiness — tradeoffs surface instantly.",
  },
  {
    num: "03",
    title: "Deployment-Ready Outputs",
    description:
      "Each run generates an After-Action Report plus four ready-to-send artifacts: holding statement, reporter email, support script, and internal memo.",
  },
];

const howItWorks = [
  { step: "1", title: "Enter the War Room", detail: "Choose a crisis scenario and step into the role of Head of Communications." },
  { step: "2", title: "Face the Meltdown", detail: "Respond to escalating events — social media, reporter calls, internal messages — under an 8-minute clock." },
  { step: "3", title: "Get Scored & Coached", detail: "Every decision is AI-evaluated with instant coaching notes and state updates." },
  { step: "4", title: "Export Your Report", detail: "Walk away with a graded AAR and four deployment-ready communication artifacts." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-zinc-100 sm:px-6 sm:py-12">
      {/* Radial gradient atmosphere */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, rgba(6,182,212,0.15), transparent 45%), radial-gradient(circle at 90% 10%, rgba(220,38,38,0.12), transparent 40%), radial-gradient(circle at 50% 100%, rgba(6,182,212,0.06), transparent 50%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8">
        {/* ── Hero ── */}
        <section className="kobayashi-scanline glass-panel glass-panel-cyan relative overflow-hidden p-6 sm:p-10">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="glow-text-cyan text-4xl font-black uppercase tracking-[0.18em] text-cyan-300 sm:text-6xl lg:text-7xl">
                  Kobayashi
                </h1>
                <span className="rounded border border-zinc-700/50 bg-zinc-800/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Generative Crisis Sim
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Train for the crisis{" "}
                <span className="glow-text-red text-red-400">before</span>{" "}
                <span className="text-zinc-300">it hits.</span>
              </h2>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                Kobayashi drops you into a live, AI-generated crisis. Social feeds explode, reporters call in,
                your internal teams need answers, and the SLA clock is running. You have 8 minutes to contain it.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
                Every decision is scored by Claude in real time. When the clock expires, you get a graded
                After-Action Report and four deployment-ready artifacts — a public statement, reporter email,
                support script, and internal memo. Ready to use. No editing required.
              </p>
            </div>

            <div className="glass-panel flex min-w-56 flex-col gap-3 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Scenario Library</p>
                <p className="glow-text-cyan mt-2 font-mono text-4xl font-bold text-cyan-400">51+</p>
                <p className="mt-1 text-sm text-zinc-500">Crisis scenarios across industries</p>
              </div>
              <div className="border-t border-zinc-700/40 pt-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Powered By</p>
                <p className="mt-1 text-sm font-bold text-zinc-300">Claude + ElevenLabs</p>
                <p className="mt-0.5 text-xs text-zinc-500">AI evaluation + voice synthesis</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/simulator"
              className="glow-btn-red rounded-lg bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-red-500"
            >
              Enter War Room
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-zinc-600 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:border-cyan-700 hover:text-cyan-300"
            >
              How It Works
            </a>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="glass-panel p-6 sm:p-8">
          <p className="glow-text-cyan text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">How It Works</p>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">Four steps. Eight minutes. Real outcomes.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item) => (
              <div key={item.step} className="rounded-lg border border-zinc-700/40 bg-zinc-800/20 p-4">
                <span className="glow-text-cyan font-mono text-3xl font-bold text-cyan-500/40">{item.step}</span>
                <h3 className="mt-2 text-sm font-bold text-zinc-200">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scenario spotlight ── */}
        <section id="scenarios">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Scenario Packs</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">Choose your crisis</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {spotlightScenarios.map((scenario) => (
              <article
                key={scenario.title}
                className={`glass-panel group relative overflow-hidden p-5 transition-all ${
                  scenario.status === "Playable"
                    ? "border-l-2 border-l-cyan-500/50 hover:border-l-cyan-400"
                    : "border-l-2 border-l-amber-500/30 hover:border-l-amber-400/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{scenario.category}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      scenario.status === "Playable"
                        ? "glow-border-cyan border border-cyan-700/60 bg-cyan-950/50 text-cyan-300"
                        : "border border-amber-700/50 bg-amber-950/40 text-amber-300"
                    }`}
                  >
                    {scenario.status}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold">{scenario.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{scenario.detail}</p>
                {scenario.status === "Playable" ? (
                  <Link
                    href="/simulator"
                    className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-cyan-400 transition hover:text-cyan-300"
                  >
                    Play Now &rarr;
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="grid gap-5 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="glass-panel group p-5">
              <div className="flex items-start gap-3">
                <span className="glow-text-cyan font-mono text-2xl font-bold text-cyan-500/60">{feature.num}</span>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.description}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* ── Built With ── */}
        <section className="glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Built With</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">Modern stack. Zero compromises.</h2>
            </div>
            <Link
              href="/simulator"
              className="glow-btn-red rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-red-500"
            >
              Try It Now
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Framework", value: "Next.js 16 + React 19" },
              { label: "AI Engine", value: "Claude (Anthropic)" },
              { label: "Voice", value: "ElevenLabs TTS" },
              { label: "Validation", value: "Zod 4 (type-safe)" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-700/40 bg-zinc-800/20 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-zinc-200">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
