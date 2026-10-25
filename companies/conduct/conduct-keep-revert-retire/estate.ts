/**
 * Keep / revert / retire adjudicator — Conduct P-1.
 *
 * An S/4HANA migration costs more than $100M and takes years — Conduct's own
 * number — and the only line item big enough to produce their claimed 30%
 * saving is not migrating things. That decision is made per custom object, by
 * people who no longer know why half of them exist.
 *
 * The adjudicator sorts an estate into four buckets from the signals a system
 * actually carries: execution telemetry, dependency fan-in, whether standard
 * SAP now covers the behaviour, and whether the object touches a regulated or
 * market-specific process.
 *
 * The fourth bucket is the point. An adjudicator that returns a disposition
 * for all 847 objects is lying, and everyone in the room knows it. Where the
 * signals conflict — or where the only evidence is business context the system
 * does not hold — it refuses and says which fact would settle it.
 */

export type Disposition = "retire" | "revert" | "migrate" | "needs-human";

export type CustomObject = {
  id: string;
  name: string;
  type: "report" | "enhancement" | "form" | "interface" | "conversion" | "workflow";
  module: "FI" | "CO" | "MM" | "SD" | "PP" | "HR";
  /** Executions in the last 24 months. */
  calls24m: number;
  /** Months since it last ran, null if never. */
  monthsSinceRun: number | null;
  /** How many other objects call it. */
  fanIn: number;
  /** Does a standard S/4 transaction now cover this behaviour? */
  standardCoverage: "full" | "partial" | "none";
  /** Statutory, tax or audit-bearing. */
  regulated: boolean;
  /** Specific to one country's legal requirements. */
  countrySpecific: string | null;
  /** Person-days to carry it across, estimated from size and type. */
  migrationDays: number;
  /** Does anyone still own it? */
  ownerKnown: boolean;
  /** Only runs at period or year end — the trap for a 24-month window. */
  periodic: boolean;
};

export type Verdict = {
  object: CustomObject;
  disposition: Disposition;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  /** For needs-human: the one fact that would settle it. */
  question: string | null;
  /** Person-days avoided if the disposition is accepted. */
  daysSaved: number;
};

/*
  Rules are ordered and each one names the evidence it used. A reviewer has to
  be able to disagree with a disposition, which means seeing what produced it —
  this is the difference between a triage tool and an oracle.
*/
export function adjudicate(o: CustomObject): Verdict {
  const reasons: string[] = [];
  const dead = o.calls24m === 0;
  const rare = o.calls24m > 0 && o.calls24m < 12;

  // --- refusals first. These are the cases where the data cannot decide. ---

  if (dead && o.periodic) {
    return {
      object: o,
      disposition: "needs-human",
      confidence: "low",
      reasons: [
        "No executions in 24 months, but it is flagged as a period-end object.",
        "A 24-month window is blind to anything that runs on a longer cycle, and the one time that matters is year-end close.",
      ],
      question: `Did ${o.name} run during the last annual close? Telemetry older than 24 months would settle it.`,
      daysSaved: 0,
    };
  }

  if (o.regulated && o.standardCoverage !== "none" && !o.ownerKnown) {
    return {
      object: o,
      disposition: "needs-human",
      confidence: "low",
      reasons: [
        `Statutory or audit-bearing${o.countrySpecific ? ` and specific to ${o.countrySpecific}` : ""}.`,
        `Standard S/4 appears to offer ${o.standardCoverage} coverage, but no owner is recorded to confirm the requirement still applies.`,
      ],
      question: `Which regulation does ${o.name} implement, and does standard S/4 satisfy it in ${o.countrySpecific ?? "every market in scope"}?`,
      daysSaved: 0,
    };
  }

  if (dead && o.fanIn > 0) {
    return {
      object: o,
      disposition: "needs-human",
      confidence: "low",
      reasons: [
        "Never executed in 24 months, yet other objects still reference it.",
        `${o.fanIn} caller${o.fanIn === 1 ? "" : "s"} means either the callers are dead too, or there is a path the telemetry did not record.`,
      ],
      question: `${o.fanIn === 1 ? `Is the single caller` : `Are the ${o.fanIn} callers`} of ${o.name} dead too? If so the whole cluster retires together.`,
      daysSaved: 0,
    };
  }

  // --- retire: nothing calls it and nothing runs it ---

  if (dead && o.fanIn === 0 && !o.regulated) {
    reasons.push("No executions in 24 months.");
    reasons.push("Nothing references it — it is unreachable from any entry point.");
    if (o.monthsSinceRun === null) reasons.push("No execution has ever been recorded.");
    return {
      object: o, disposition: "retire",
      confidence: o.monthsSinceRun === null ? "high" : "medium",
      reasons, question: null, daysSaved: o.migrationDays,
    };
  }

  // --- revert to standard: S/4 now does this ---

  if (o.standardCoverage === "full" && !o.countrySpecific) {
    reasons.push("Standard S/4 fully covers this behaviour.");
    reasons.push(rare ? `Used rarely — ${o.calls24m} executions in 24 months.` : `${o.calls24m.toLocaleString("en-US")} executions, all of which standard can serve.`);
    if (o.fanIn > 3) reasons.push(`${o.fanIn} callers will need repointing at the standard transaction.`);
    return {
      object: o, disposition: "revert",
      confidence: o.fanIn > 3 ? "medium" : "high",
      reasons, question: null,
      // Reverting is not free — repointing callers costs roughly a third.
      daysSaved: Math.round(o.migrationDays * (o.fanIn > 3 ? 0.55 : 0.8)),
    };
  }

  if (o.standardCoverage === "partial" && !o.regulated && rare) {
    reasons.push("Standard S/4 partially covers this, and the object is barely used.");
    reasons.push(`${o.calls24m} executions in 24 months.`);
    reasons.push("The gap between standard and custom is likely cheaper to absorb as a process change than to carry.");
    return { object: o, disposition: "revert", confidence: "medium", reasons, question: null, daysSaved: Math.round(o.migrationDays * 0.6) };
  }

  // --- migrate: it earns its place ---

  if (o.regulated) reasons.push(`Statutory or audit-bearing${o.countrySpecific ? `, specific to ${o.countrySpecific}` : ""}.`);
  if (o.standardCoverage === "none") reasons.push("No standard S/4 equivalent.");
  if (o.calls24m >= 12) reasons.push(`In active use — ${o.calls24m.toLocaleString("en-US")} executions in 24 months.`);
  if (o.fanIn > 0) reasons.push(`${o.fanIn} other object${o.fanIn === 1 ? "" : "s"} depend on it.`);
  if (reasons.length === 0) reasons.push("In use, with no standard replacement identified.");

  return {
    object: o, disposition: "migrate",
    confidence: o.ownerKnown ? "high" : "medium",
    reasons, question: null, daysSaved: 0,
  };
}

export type Summary = {
  total: number;
  counts: Record<Disposition, number>;
  daysSaved: number;
  totalDays: number;
  /** Share of the estate the tool declines to decide. */
  refusalRate: number;
};

export function summarise(verdicts: Verdict[]): Summary {
  const counts: Record<Disposition, number> = { retire: 0, revert: 0, migrate: 0, "needs-human": 0 };
  let daysSaved = 0, totalDays = 0;
  for (const v of verdicts) {
    counts[v.disposition]++;
    daysSaved += v.daysSaved;
    totalDays += v.object.migrationDays;
  }
  return {
    total: verdicts.length, counts, daysSaved, totalDays,
    refusalRate: verdicts.length ? counts["needs-human"] / verdicts.length : 0,
  };
}

export const DISPOSITION_LABEL: Record<Disposition, string> = {
  retire: "Retire",
  revert: "Revert to standard",
  migrate: "Migrate",
  "needs-human": "Needs a human",
};
