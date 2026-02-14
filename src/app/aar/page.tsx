"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { afterActionResponseSchema, type AfterActionResponse } from "@/lib/schemas";

type LoadResult =
  | { state: "idle" }
  | { state: "missing" }
  | { state: "invalid" }
  | { state: "ready"; report: AfterActionResponse };

function loadReport(runId: string | null): LoadResult {
  if (!runId) {
    return { state: "missing" };
  }

  if (typeof window === "undefined") {
    return { state: "idle" };
  }

  const storageKey = `kobayashi:run:${runId}`;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { state: "missing" };
    }

    const parsedJson: unknown = JSON.parse(raw);
    const parsed = afterActionResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { state: "invalid" };
    }

    return { state: "ready", report: parsed.data };
  } catch {
    return { state: "invalid" };
  }
}

export default function AfterActionPage() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");
  const result = loadReport(runId);

  if (result.state !== "ready" || !runId) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded border border-zinc-700 bg-zinc-900 p-6">
          <h1 className="text-2xl font-semibold">After-Action Report</h1>
          <p className="text-sm text-zinc-300">
            {result.state === "idle"
              ? "Loading report..."
              : result.state === "invalid"
                ? "Stored report data exists but is invalid."
                : "No run report found for this request."}
          </p>
          <Link href="/simulator" className="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Back to Simulator
          </Link>
        </div>
      </main>
    );
  }

  const report = result.report;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded border border-zinc-700 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">After-Action Report</h1>
            <Link href="/simulator" className="rounded bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900">
              Run Another Simulation
            </Link>
          </div>
          <p className="mt-2 text-sm text-zinc-300">Run ID: {runId}</p>
          <p className="mt-1 text-xs text-zinc-400">Mode: {report.mode}</p>
        </section>

        <section className="rounded border border-zinc-700 bg-zinc-900 p-5">
          <h2 className="mb-3 text-lg font-semibold">AAR Markdown</h2>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-100">
            {report.aarMarkdown}
          </pre>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">holding_statement</h3>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{report.artifacts.holding_statement}</pre>
          </article>

          <article className="rounded border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">reporter_email</h3>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{report.artifacts.reporter_email}</pre>
          </article>

          <article className="rounded border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">support_script</h3>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{report.artifacts.support_script}</pre>
          </article>

          <article className="rounded border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">internal_memo</h3>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{report.artifacts.internal_memo}</pre>
          </article>
        </section>
      </div>
    </main>
  );
}
