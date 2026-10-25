import type { CustomObject } from "./estate";

/**
 * A synthetic ECC estate, generated deterministically.
 *
 * Shaped like the thing it stands in for: a long tail of reports nobody runs,
 * a hard core of statutory objects that must come across, and a middle where
 * standard S/4 has caught up since the customisation was written. Execution
 * telemetry is stored per month so the review window is a real control rather
 * than a label — widening it genuinely resurrects objects from the dead pile.
 */

const MODULES = ["FI", "CO", "MM", "SD", "PP", "HR"] as const;
const TYPES = ["report", "enhancement", "form", "interface", "conversion", "workflow"] as const;
const COUNTRIES = ["Germany", "Brazil", "India", "Italy", "Mexico", "Poland"];

const NOUNS = ["Invoice", "Vendor", "Delivery", "Payroll", "Tax", "Dunning", "Rebate", "Batch",
  "Goods", "Settlement", "Pricing", "Credit", "Asset", "Order", "Shipment", "Withholding",
  "Intercompany", "Period", "Material", "Customer"];
const VERBS = ["Posting", "Extract", "Upload", "Check", "Report", "Correction", "Split",
  "Reversal", "Clearing", "Approval", "Validation", "Export"];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RawObject = Omit<CustomObject, "calls24m" | "monthsSinceRun"> & {
  /** Executions per month, index 0 = most recent. 36 months of history. */
  callsByMonth: number[];
};

export function buildEstate(count = 847, seed = 31): RawObject[] {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const out: RawObject[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    const type = pick(TYPES);
    const mod = pick(MODULES);
    const roll = r();

    // Three populations, deliberately: dead tail, standard-covered middle,
    // and the statutory core.
    const kind = roll < 0.3 ? "dead" : roll < 0.68 ? "covered" : "core";

    const regulated = kind === "core" ? r() < 0.55 : r() < 0.08;
    const countrySpecific = regulated && r() < 0.45 ? pick(COUNTRIES) : null;
    const periodic = r() < 0.09;

    const callsByMonth: number[] = [];
    if (kind === "dead") {
      // Mostly silent. A few fired long ago, which is what makes the window matter.
      /*
        Spread across the whole history, not just beyond 24 months: an object
        last run 18 months ago is dead to a 12-month window and alive to a
        24-month one, which is exactly the judgment the window control exists
        to expose.
      */
      const lastActive = r() < 0.5 ? 8 + Math.floor(r() * 28) : -1;
      for (let m = 0; m < 36; m++) callsByMonth.push(m === lastActive ? 1 + Math.floor(r() * 4) : 0);
    } else if (periodic) {
      for (let m = 0; m < 36; m++) callsByMonth.push(m % 12 === 0 ? 1 + Math.floor(r() * 3) : 0);
    } else {
      const base = kind === "core" ? 20 + r() * 400 : 1 + r() * 30;
      for (let m = 0; m < 36; m++) callsByMonth.push(Math.round(base * (0.5 + r())));
    }

    const standardCoverage: CustomObject["standardCoverage"] =
      kind === "covered" ? (r() < 0.6 ? "full" : "partial")
      : kind === "core" ? (r() < 0.2 ? "partial" : "none")
      : r() < 0.4 ? "full" : r() < 0.7 ? "partial" : "none";

    // Real estates do carry Z_X and Z_X_V2 side by side, but two different
    // objects with the identical name would just read as a bug.
    let name = `Z_${pick(NOUNS).toUpperCase()}_${pick(VERBS).toUpperCase()}`;
    if (used.has(name)) {
      let n = 2;
      while (used.has(`${name}_V${n}`)) n++;
      name = `${name}_V${n}`;
    }
    used.add(name);

    out.push({
      id: `Z${mod}${String(i).padStart(4, "0")}`,
      name,
      type, module: mod,
      fanIn: kind === "dead" ? (r() < 0.18 ? 1 + Math.floor(r() * 3) : 0) : Math.floor(r() * 9),
      standardCoverage,
      regulated,
      countrySpecific,
      migrationDays: Math.max(1, Math.round((type === "interface" ? 9 : type === "conversion" ? 7 : 4) * (0.5 + r() * 1.8))),
      ownerKnown: kind === "dead" ? r() < 0.2 : r() < 0.75,
      periodic,
      callsByMonth,
    });
  }
  return out;
}

/** Collapses the monthly history into the window the reviewer chose. */
export function withWindow(o: RawObject, months: number): CustomObject {
  const slice = o.callsByMonth.slice(0, months);
  const calls = slice.reduce((a, b) => a + b, 0);
  const lastIdx = o.callsByMonth.findIndex((n) => n > 0);
  const { callsByMonth, ...rest } = o;
  void callsByMonth;
  return { ...rest, calls24m: calls, monthsSinceRun: lastIdx === -1 ? null : lastIdx };
}

export const DEMO_NOTE =
  "This estate of 847 custom objects is generated for the demo — no SAP system was read, and no ABAP is parsed here. The adjudication is real: every disposition below is derived from the object's own telemetry, dependencies and coverage by the rules in estate.ts, and the objects it refuses to decide are the ones where those signals genuinely conflict.";
