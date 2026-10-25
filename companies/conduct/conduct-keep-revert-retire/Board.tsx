"use client";

import { useMemo, useState } from "react";
import { buildEstate, withWindow } from "./fixtures";
import { adjudicate, summarise, DISPOSITION_LABEL, type Disposition } from "./estate";

const STYLE: Record<Disposition, string> = {
  retire: "border-emerald-600/50 text-emerald-800 dark:border-emerald-400/40 dark:text-emerald-300",
  revert: "border-sky-600/50 text-sky-800 dark:border-sky-400/40 dark:text-sky-300",
  migrate: "border-foreground/25 text-foreground/65",
  "needs-human": "border-amber-600/50 text-amber-800 dark:border-amber-400/40 dark:text-amber-300",
};
const ORDER: Disposition[] = ["retire", "revert", "migrate", "needs-human"];
const num = (n: number) => n.toLocaleString("en-US");

export function Board() {
  const [months, setMonths] = useState(24);
  const [filter, setFilter] = useState<Disposition | "all">("all");

  const raw = useMemo(() => buildEstate(), []);
  const verdicts = useMemo(() => raw.map((o) => adjudicate(withWindow(o, months))), [raw, months]);
  const s = useMemo(() => summarise(verdicts), [verdicts]);

  const shown = filter === "all" ? verdicts : verdicts.filter((v) => v.disposition === filter);
  const visible = shown.slice(0, 40);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ORDER.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(filter === d ? "all" : d)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              filter === d ? "border-foreground/40 bg-foreground/[0.06]" : "border-foreground/12 hover:border-foreground/30"
            }`}
          >
            <div className="font-mono text-[22px] leading-none tabular-nums">{num(s.counts[d])}</div>
            <div className="mt-1 text-[11px] leading-tight text-foreground/55">{DISPOSITION_LABEL[d]}</div>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-foreground/12 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-[13px] font-medium">
            {num(s.daysSaved)} of {num(s.totalDays)} person-days taken off the migration
          </span>
          <span className="font-mono text-[12px] tabular-nums text-foreground/60">
            {((s.daysSaved / s.totalDays) * 100).toFixed(0)}% of the carry
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${(s.daysSaved / s.totalDays) * 100}%` }} />
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-foreground/55">
          Retiring an object saves its whole carry; reverting to standard saves most of it, less the
          work of repointing callers. Migrating saves nothing — that is the baseline everything is
          measured against.
        </p>
      </div>

      <div className="rounded-lg border border-foreground/12 px-4 py-3">
        <label htmlFor="window" className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[12px] text-foreground/70">Telemetry window</span>
          <span className="font-mono text-[11.5px] tabular-nums">{months} months</span>
        </label>
        <input
          id="window" type="range" min={6} max={36} step={1} value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="mt-1.5 w-full accent-foreground/70"
        />
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-foreground/55">
          How far back execution history is trusted. Shorten it and more objects look dead —
          at {months} months, {num(s.counts.retire)} do. This is the single most consequential
          setting on the page, and the reason period-end objects are refused rather than retired.
        </p>
      </div>

      <section>
        <h2 className="mb-2 flex flex-wrap items-baseline gap-2 text-[13px] font-semibold">
          {filter === "all" ? "All objects" : DISPOSITION_LABEL[filter]}
          <span className="font-mono text-[11px] font-normal text-foreground/50">
            showing {visible.length} of {num(shown.length)}
            {filter !== "all" && " — click the tile again for all"}
          </span>
        </h2>
        <div className="divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/12">
          {visible.map((v) => (
            <details key={v.object.id} className="group px-3 py-2 open:bg-foreground/[0.02]">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 list-none">
                <span className="font-mono text-[12px] [overflow-wrap:anywhere]">{v.object.name}</span>
                <span className="font-mono text-[10.5px] text-foreground/40">{v.object.module}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10.5px] ${STYLE[v.disposition]}`}>
                  {DISPOSITION_LABEL[v.disposition]}
                </span>
                <span className="ml-auto font-mono text-[10.5px] text-foreground/40">
                  {v.daysSaved > 0 ? `−${v.daysSaved}d` : `${v.object.migrationDays}d carry`}
                </span>
              </summary>
              <div className="mt-1.5 space-y-1.5 border-l-2 border-foreground/10 pl-3">
                <ul className="list-disc space-y-0.5 pl-4 text-[12px] leading-relaxed text-foreground/65">
                  {v.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
                {v.question && (
                  <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
                    <span className="font-medium">To settle it:</span> {v.question}
                  </p>
                )}
                <p className="font-mono text-[10.5px] text-foreground/40">
                  {v.object.type} · {v.object.calls24m.toLocaleString("en-US")} runs in {months}m ·
                  fan-in {v.object.fanIn} · standard coverage {v.object.standardCoverage} ·
                  confidence {v.confidence}
                  {v.object.periodic && " · period-end"}
                  {v.object.regulated && " · statutory"}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
