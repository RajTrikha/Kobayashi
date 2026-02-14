"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  afterActionResponseSchema,
  runLogEventSchema,
  runStateSchema,
  type AfterActionRequest,
  type AfterActionResponse,
  type RunState,
} from "@/lib/schemas";

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
  | {
      state: "ready";
      report: AfterActionResponse;
      runLog: AfterActionRequest["runLog"];
      finalState: RunState | null;
      runProfile: string | null;
      storedAt: string | null;
    };

type ScorePoint = {
  label: string;
  readiness: number;
  delta: number;
};

type NarrativeBlock =
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

type NarrativeSection = {
  heading: string;
  blocks: NarrativeBlock[];
};

type ParsedNarrative = {
  title: string;
  sections: NarrativeSection[];
};

const storedRunSchema = z
  .object({
    report: afterActionResponseSchema,
    runLog: z.array(runLogEventSchema).optional(),
    finalState: runStateSchema.optional(),
    runProfile: z.string().optional(),
    storedAt: z.string().datetime().optional(),
  })
  .passthrough();

function cleanMarkdownLine(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function parseMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanMarkdownLine(cell));
}

function parseNarrativeSectionBlocks(lines: string[]): NarrativeBlock[] {
  const blocks: NarrativeBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index] ?? "";
    const line = raw.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index]?.trim() ?? "";
        if (!/^[-*]\s+/.test(candidate)) {
          break;
        }
        items.push(cleanMarkdownLine(candidate.replace(/^[-*]\s+/, "")));
        index += 1;
      }
      if (items.length > 0) {
        blocks.push({ type: "unordered-list", items });
      }
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index]?.trim() ?? "";
        if (!/^\d+\.\s+/.test(candidate)) {
          break;
        }
        items.push(cleanMarkdownLine(candidate.replace(/^\d+\.\s+/, "")));
        index += 1;
      }
      if (items.length > 0) {
        blocks.push({ type: "ordered-list", items });
      }
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index]?.trim() ?? "";
        if (!candidate.startsWith("|")) {
          break;
        }
        tableLines.push(candidate);
        index += 1;
      }

      if (tableLines.length >= 2) {
        const headers = parseMarkdownTableRow(tableLines[0] ?? "");
        const rows = tableLines
          .slice(1)
          .filter((tableLine) => !/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?$/.test(tableLine))
          .map((tableLine) => parseMarkdownTableRow(tableLine));

        if (headers.length > 0 && rows.length > 0) {
          blocks.push({ type: "table", headers, rows });
          continue;
        }
      }

      if (tableLines.length > 0) {
        blocks.push({ type: "paragraph", text: cleanMarkdownLine(tableLines.join(" ")) });
      }
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index]?.trim() ?? "";
      if (
        !candidate ||
        /^[-*]\s+/.test(candidate) ||
        /^\d+\.\s+/.test(candidate) ||
        candidate.startsWith("|")
      ) {
        break;
      }
      paragraphLines.push(cleanMarkdownLine(candidate));
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
      continue;
    }

    index += 1;
  }

  return blocks;
}

function parseNarrative(markdown: string): ParsedNarrative {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return {
      title: "After-Action Report",
      sections: [],
    };
  }

  const lines = normalized.split("\n");
  let title = "After-Action Report";
  let cursor = 0;

  const firstLine = lines[0]?.trim() ?? "";
  if (firstLine.startsWith("# ")) {
    title = cleanMarkdownLine(firstLine.slice(2));
    cursor = 1;
  }

  const sections: NarrativeSection[] = [];
  let currentHeading = "Overview";
  let currentLines: string[] = [];

  for (let index = cursor; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("## ")) {
      if (currentLines.length > 0 || sections.length === 0) {
        sections.push({
          heading: currentHeading,
          blocks: parseNarrativeSectionBlocks(currentLines),
        });
      }
      currentHeading = cleanMarkdownLine(trimmed.slice(3));
      currentLines = [];
      continue;
    }

    currentLines.push(rawLine);
  }

  if (currentLines.length > 0 || sections.length === 0) {
    sections.push({
      heading: currentHeading,
      blocks: parseNarrativeSectionBlocks(currentLines),
    });
  }

  return { title, sections };
}

function extractOverallGrade(markdown: string): { grade: string; label: string } | null {
  const match = markdown.match(/\*\*Overall Grade:\s*([^*]+)\*\*\s*[—-]\s*(.+)/i);
  if (!match) {
    return null;
  }
  return {
    grade: cleanMarkdownLine(match[1] ?? ""),
    label: cleanMarkdownLine(match[2] ?? ""),
  };
}

function parseTimelineItem(item: string): { time: string; detail: string } | null {
  const match = item.match(/^(\d{2}:\d{2})\s*-\s*(.+)$/);
  if (!match) {
    return null;
  }
  return {
    time: match[1] ?? "",
    detail: cleanMarkdownLine(match[2] ?? ""),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildScoreSeries(runLog: AfterActionRequest["runLog"]): ScorePoint[] {
  const points: ScorePoint[] = [{ label: "Start", readiness: 50, delta: 0 }];
  let fallbackReadiness = 50;
  let evaluationCount = 0;

  for (const event of runLog) {
    if (event.type !== "evaluation") {
      continue;
    }

    evaluationCount += 1;
    const payload = asRecord(event.payload);
    const scoreDelta = clamp(Math.round(asNumber(payload?.scoreDelta) ?? 0), -10, 10);
    const updatedState = asRecord(payload?.updatedState);
    const readinessScore = asNumber(updatedState?.readinessScore);
    const nextReadiness =
      readinessScore !== null
        ? clamp(Math.round(readinessScore), 0, 100)
        : clamp(Math.round(fallbackReadiness + scoreDelta * 3), 0, 100);

    fallbackReadiness = nextReadiness;
    points.push({
      label: `E${evaluationCount}`,
      readiness: nextReadiness,
      delta: scoreDelta,
    });
  }

  return points;
}

function toLinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return "";
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function loadReportFromStorage(runId: string | null): LoadResult {
  if (!runId) {
    return { state: "missing" };
  }

  const storageKey = `kobayashi:run:${runId}`;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { state: "missing" };
    }

    const parsedJson: unknown = JSON.parse(raw);
    const directParsed = afterActionResponseSchema.safeParse(parsedJson);
    if (directParsed.success) {
      return {
        state: "ready",
        report: directParsed.data,
        runLog: [],
        finalState: null,
        runProfile: null,
        storedAt: null,
      };
    }

    const storedParsed = storedRunSchema.safeParse(parsedJson);
    if (storedParsed.success) {
      return {
        state: "ready",
        report: storedParsed.data.report,
        runLog: storedParsed.data.runLog ?? [],
        finalState: storedParsed.data.finalState ?? null,
        runProfile: storedParsed.data.runProfile ?? null,
        storedAt: storedParsed.data.storedAt ?? null,
      };
    }

    return { state: "invalid" };
  } catch {
    return { state: "invalid" };
  }
}

export default function AfterActionPage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen px-6 py-12 text-zinc-100">
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5">
          <div className="glass-panel p-7">
            <p className="text-sm text-zinc-400">Loading report...</p>
          </div>
        </div>
      </main>
    }>
      <AfterActionContent />
    </Suspense>
  );
}

function AfterActionContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");
  const [result, setResult] = useState<LoadResult>({ state: "idle" });
  const [copiedArtifact, setCopiedArtifact] = useState<ArtifactKey | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setResult(loadReportFromStorage(runId));
  }, [runId]);

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
      <main className="relative min-h-screen px-6 py-12 text-zinc-100">
        <div
          className="pointer-events-none fixed inset-0 z-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(220,38,38,0.08), transparent 45%), radial-gradient(circle at 50% 100%, rgba(6,182,212,0.06), transparent 50%)",
          }}
        />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5">
          <div className="glass-panel glass-panel-red p-7">
            <p className="glow-text-red text-xs font-bold uppercase tracking-[0.2em] text-red-400">After-Action Report</p>
            <h1 className="mt-2 text-2xl font-bold">No report available</h1>
            <p className="mt-3 text-sm text-zinc-400">{emptyStateMessage}</p>
            <p className="mt-4 text-sm text-zinc-500">
              Run a new simulation and generate an after-action report to view this page.
            </p>
            <Link href="/simulator" className="glow-btn-cyan mt-4 inline-block w-fit rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-bold text-white">
              Go to Simulator
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const report = result.report;
  const finalState = result.finalState;
  const scoreSeries = buildScoreSeries(result.runLog);
  const chartWidth = 680;
  const chartHeight = 220;
  const chartPadding = 26;
  const plottedScoreSeries =
    scoreSeries.length > 0
      ? scoreSeries.map((point, index) => {
          const denominator = Math.max(1, scoreSeries.length - 1);
          const x = chartPadding + (index / denominator) * (chartWidth - chartPadding * 2);
          const y =
            chartPadding + ((100 - point.readiness) / 100) * (chartHeight - chartPadding * 2);
          return { ...point, x, y };
        })
      : [];
  const linePath = toLinePath(plottedScoreSeries.map((point) => ({ x: point.x, y: point.y })));
  const hasChartData = scoreSeries.length > 1;
  const parsedNarrative = parseNarrative(report.aarMarkdown);
  const gradeSummary = extractOverallGrade(report.aarMarkdown);

  return (
    <main className="relative min-h-screen px-4 py-12 text-zinc-100 sm:px-6">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(220,38,38,0.08), transparent 45%), radial-gradient(circle at 50% 100%, rgba(6,182,212,0.06), transparent 50%)",
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="glass-panel glass-panel-red p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="glow-text-red text-xs font-bold uppercase tracking-[0.2em] text-red-400">Kobayashi Simulator</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">After-Action Report</h1>
              <p className="mt-3 text-sm text-zinc-400">
                Review the final narrative and copy communication artifacts for downstream teams.
              </p>
            </div>
            <Link href="/simulator" className="glow-btn-cyan rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-bold text-white">
              Run Another Simulation
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Run ID</p>
              <p className="mt-1 font-mono text-sm text-zinc-300">{runId}</p>
            </div>
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Mode</p>
              <p className="mt-1 text-sm capitalize text-zinc-300">{report.mode}</p>
            </div>
            {result.runProfile ? (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Run Profile</p>
                <p className="mt-1 text-sm uppercase text-zinc-300">{result.runProfile.replace(/_/g, " ")}</p>
              </div>
            ) : null}
            {result.storedAt ? (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Generated</p>
                <p className="mt-1 text-sm text-zinc-300">{new Date(result.storedAt).toLocaleString()}</p>
              </div>
            ) : null}
            {gradeSummary ? (
              <div className="sm:col-span-2 rounded-lg border border-cyan-700/50 bg-cyan-950/20 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-cyan-300">Overall Grade</p>
                <p className="mt-1 text-sm text-zinc-100">
                  <span className="font-bold text-cyan-300">{gradeSummary.grade}</span> · {gradeSummary.label}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="glass-panel p-6 sm:p-7">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Performance Graph</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Readiness trend across evaluated decisions in this run.
              </p>
            </div>
            {finalState ? (
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded border border-cyan-700/50 bg-cyan-950/20 px-2.5 py-1.5">
                  <p className="uppercase tracking-wide text-cyan-300">Readiness</p>
                  <p className="mt-1 text-sm font-bold text-zinc-100">{finalState.readinessScore}/100</p>
                </div>
                <div className="rounded border border-zinc-700/50 bg-zinc-950/50 px-2.5 py-1.5">
                  <p className="uppercase tracking-wide text-zinc-400">Sentiment</p>
                  <p className="mt-1 text-sm font-bold text-zinc-100">{finalState.publicSentiment}/100</p>
                </div>
                <div className="rounded border border-zinc-700/50 bg-zinc-950/50 px-2.5 py-1.5">
                  <p className="uppercase tracking-wide text-zinc-400">Trust</p>
                  <p className="mt-1 text-sm font-bold text-zinc-100">{finalState.trustScore}/100</p>
                </div>
              </div>
            ) : null}
          </div>

          {hasChartData ? (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/40 p-4">
              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-56 w-full min-w-[620px]"
                  role="img"
                  aria-label="Readiness trend graph"
                >
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y =
                      chartPadding + ((100 - tick) / 100) * (chartHeight - chartPadding * 2);
                    return (
                      <g key={`tick_${tick}`}>
                        <line
                          x1={chartPadding}
                          x2={chartWidth - chartPadding}
                          y1={y}
                          y2={y}
                          stroke="rgba(82,82,91,0.35)"
                          strokeDasharray={tick === 0 || tick === 100 ? "0" : "3 4"}
                        />
                        <text
                          x={6}
                          y={y + 4}
                          fontSize="10"
                          fill="rgba(161,161,170,0.85)"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  {linePath ? (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="rgba(34,211,238,0.95)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}

                  {plottedScoreSeries.map((point) => (
                    <g key={`pt_${point.label}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={4}
                        fill="rgba(34,211,238,0.95)"
                        stroke="rgba(8,47,73,0.9)"
                        strokeWidth={1.5}
                      />
                      <text
                        x={point.x}
                        y={chartHeight - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill="rgba(161,161,170,0.9)"
                      >
                        {point.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {scoreSeries.slice(1).map((point, index) => (
                  <div
                    key={`delta_${point.label}_${index}`}
                    className="rounded-md border border-zinc-700/50 bg-zinc-900/60 px-2.5 py-1.5 text-xs"
                  >
                    <p className="uppercase tracking-wide text-zinc-500">{point.label}</p>
                    <p className="mt-1 text-zinc-200">
                      Readiness <span className="font-bold">{point.readiness}</span>
                      {" · "}
                      Delta{" "}
                      <span className={point.delta >= 0 ? "font-bold text-emerald-300" : "font-bold text-rose-300"}>
                        {point.delta >= 0 ? `+${point.delta}` : point.delta}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/40 p-4 text-sm text-zinc-400">
              Score graph is available for new runs with evaluation telemetry. Run a fresh simulation to populate the chart.
            </div>
          )}
        </section>

        <section className="glass-panel glass-panel-cyan p-6 sm:p-7">
          <div className="mb-3">
            <h2 className="text-lg font-bold">{parsedNarrative.title || "AAR Narrative"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Structured incident narrative generated from run data.</p>
          </div>

          <div className="space-y-4">
            {parsedNarrative.sections.length === 0 ? (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/50 p-4 text-sm text-zinc-300">
                Narrative was generated but no structured sections were found.
              </div>
            ) : (
              parsedNarrative.sections.map((section, sectionIndex) => {
                const sectionHeading = section.heading || `Section ${sectionIndex + 1}`;
                const isTimelineSection = sectionHeading.toLowerCase().includes("timeline");

                return (
                  <article
                    key={`${sectionHeading}_${sectionIndex}`}
                    className="rounded-lg border border-zinc-700/50 bg-zinc-950/40 p-4"
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-300">{sectionHeading}</h3>
                    <div className="mt-3 space-y-3">
                      {section.blocks.length === 0 ? (
                        <p className="text-sm text-zinc-400">No content in this section.</p>
                      ) : (
                        section.blocks.map((block, blockIndex) => {
                          if (block.type === "paragraph") {
                            return (
                              <p key={`${sectionHeading}_p_${blockIndex}`} className="text-sm leading-6 text-zinc-200">
                                {block.text}
                              </p>
                            );
                          }

                          if (block.type === "unordered-list") {
                            if (isTimelineSection) {
                              return (
                                <div key={`${sectionHeading}_ul_${blockIndex}`} className="space-y-2">
                                  {block.items.map((item, itemIndex) => {
                                    const parsedItem = parseTimelineItem(item);
                                    if (!parsedItem) {
                                      return (
                                        <div
                                          key={`${sectionHeading}_timeline_fallback_${itemIndex}`}
                                          className="rounded-md border border-zinc-700/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200"
                                        >
                                          {item}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={`${sectionHeading}_timeline_${itemIndex}`}
                                        className="flex items-start gap-3 rounded-md border border-zinc-700/50 bg-zinc-900/60 px-3 py-2"
                                      >
                                        <span className="rounded border border-cyan-700/50 bg-cyan-950/40 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
                                          {parsedItem.time}
                                        </span>
                                        <p className="text-sm text-zinc-200">{parsedItem.detail}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }

                            return (
                              <ul key={`${sectionHeading}_ul_${blockIndex}`} className="space-y-1 text-sm text-zinc-200">
                                {block.items.map((item, itemIndex) => (
                                  <li key={`${sectionHeading}_ul_item_${itemIndex}`} className="flex gap-2">
                                    <span className="mt-1 text-cyan-400">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            );
                          }

                          if (block.type === "ordered-list") {
                            return (
                              <ol
                                key={`${sectionHeading}_ol_${blockIndex}`}
                                className="space-y-1 text-sm text-zinc-200"
                              >
                                {block.items.map((item, itemIndex) => (
                                  <li key={`${sectionHeading}_ol_item_${itemIndex}`} className="flex gap-2">
                                    <span className="mt-0.5 font-mono text-xs font-bold text-cyan-400">
                                      {itemIndex + 1}.
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ol>
                            );
                          }

                          return (
                            <div
                              key={`${sectionHeading}_table_${blockIndex}`}
                              className="overflow-auto rounded-lg border border-zinc-700/50"
                            >
                              <table className="min-w-full divide-y divide-zinc-700/50 text-left text-sm">
                                <thead className="bg-zinc-900/70">
                                  <tr>
                                    {block.headers.map((header, headerIndex) => (
                                      <th
                                        key={`${sectionHeading}_th_${headerIndex}`}
                                        className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-400"
                                      >
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/70">
                                  {block.rows.map((row, rowIndex) => (
                                    <tr key={`${sectionHeading}_row_${rowIndex}`} className="bg-zinc-950/50">
                                      {row.map((cell, cellIndex) => (
                                        <td
                                          key={`${sectionHeading}_cell_${rowIndex}_${cellIndex}`}
                                          className="px-3 py-2 text-zinc-200"
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="glass-panel p-6 sm:p-7">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Artifacts</h2>
              <p className="mt-1 text-sm text-zinc-500">Ready-to-use outputs for deployment.</p>
            </div>
            {copyError ? <p className="text-xs text-rose-400">{copyError}</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {artifactCards.map(({ key, label }) => (
              <article key={key} className="flex min-h-56 flex-col rounded-lg border border-zinc-700/50 bg-zinc-950/40 p-4 transition hover:border-zinc-600/60">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-500">{label}</h3>
                  <button
                    type="button"
                    onClick={() => handleCopyArtifact(key, report.artifacts[key])}
                    className={`rounded-md border px-2.5 py-1 text-xs font-bold transition ${
                      copiedArtifact === key
                        ? "border-cyan-600 bg-cyan-950/40 text-cyan-300"
                        : "border-zinc-600 text-zinc-400 hover:border-cyan-700 hover:text-cyan-300"
                    }`}
                  >
                    {copiedArtifact === key ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-3 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-3 text-sm text-zinc-200">
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
