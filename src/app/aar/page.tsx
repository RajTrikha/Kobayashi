"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { afterActionResponseSchema, type AfterActionResponse } from "@/lib/schemas";

type ArtifactKey = keyof AfterActionResponse["artifacts"];

const artifactCards: Array<{ key: ArtifactKey; label: string }> = [
  { key: "holding_statement", label: "Holding Statement" },
  { key: "reporter_email", label: "Reporter Email" },
  { key: "support_script", label: "Support Script" },
  { key: "internal_memo", label: "Internal Memo" },
];

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
  const [copiedArtifact, setCopiedArtifact] = useState<ArtifactKey | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  async function handleCopyArtifact(key: ArtifactKey, value: string): Promise<void> {
    setCopyError(null);

    try {
      if (!navigator.clipboard) {
        throw new Error("clipboard_unavailable");
      }

      await navigator.clipboard.writeText(value);
      setCopiedArtifact(key);

      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }

      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedArtifact((active) => (active === key ? null : active));
      }, 1500);
    } catch {
      setCopyError("Copy failed. Please copy manually from the card.");
    }
  }

  if (result.state !== "ready" || !runId) {
    const emptyStateMessage =
      result.state === "idle"
        ? "Loading your report from local storage..."
        : result.state === "invalid"
          ? "We found data for this run, but it is not in a valid report format."
          : "No saved report was found for this run ID.";

    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-xl border border-zinc-700 bg-zinc-900 p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">After-Action Report</p>
            <h1 className="mt-2 text-2xl font-semibold">No report available</h1>
            <p className="mt-3 text-sm text-zinc-300">{emptyStateMessage}</p>
          </div>
          <p className="text-sm text-zinc-400">
            Run a new simulation and generate an after-action report to view this page.
          </p>
          <Link href="/simulator" className="w-fit rounded bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900">
            Go to Simulator
          </Link>
        </div>
      </main>
    );
  }

  const report = result.report;

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 text-zinc-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Kobayashi Simulator</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">After-Action Report</h1>
              <p className="mt-3 text-sm text-zinc-300">
                Review the final narrative and copy communication artifacts for downstream teams.
              </p>
            </div>
            <Link href="/simulator" className="rounded bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900">
              Run Another Simulation
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Run ID</p>
              <p className="mt-1 text-sm text-zinc-100">{runId}</p>
            </div>
            <div className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Mode</p>
              <p className="mt-1 text-sm capitalize text-zinc-100">{report.mode}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 sm:p-7">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">AAR Narrative</h2>
            <p className="mt-1 text-sm text-zinc-400">Raw markdown output from the report generator.</p>
          </div>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-100">
            {report.aarMarkdown}
          </pre>
        </section>

        <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 sm:p-7">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Artifacts</h2>
              <p className="mt-1 text-sm text-zinc-400">Ready-to-use outputs in a 2x2 layout.</p>
            </div>
            {copyError ? <p className="text-xs text-rose-300">{copyError}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {artifactCards.map(({ key, label }) => (
              <article key={key} className="flex min-h-56 flex-col rounded border border-zinc-700 bg-zinc-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{label}</h3>
                  <button
                    type="button"
                    onClick={() => handleCopyArtifact(key, report.artifacts[key])}
                    className="rounded border border-zinc-600 px-2.5 py-1 text-xs font-semibold text-zinc-200 transition hover:border-zinc-400 hover:text-zinc-50"
                  >
                    {copiedArtifact === key ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-3 flex-1 overflow-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100">
                  {report.artifacts[key]}
                </pre>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
