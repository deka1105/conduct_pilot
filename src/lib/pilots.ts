import type { ComponentType } from "react";

/**
 * The pilots built for Conduct.
 *
 * Extracted from the pilot factory; each entry points at a folder under
 * `companies/conduct/`. Adding one by hand means creating that folder and
 * appending here, exactly as in the source repo.
 */
export type Pilot = {
  slug: string;
  title: string;
  company: string;
  useCase: string;
  demo: string;
  built: string;
  tier: "eval" | "outreach";
  load: () => Promise<{ default: ComponentType }>;
};

export const pilots: Pilot[] = [
  {
    slug: "conduct-keep-revert-retire",
    title: "Keep/revert/retire adjudicator",
    company: "conduct",
    useCase: "UC-5",
    demo: "847 custom objects triaged on a 24-month window — 146 retire, 237 revert to standard, 390 must migrate, and 74 are handed back with the one question that would settle each, taking 2,268 of 6,187 person-days off the carry.",
    built: "2026-10-25",
    tier: "eval",
    load: () => import("@companies/conduct/conduct-keep-revert-retire/Pilot"),
  },
];

export function getPilot(slug: string): Pilot | undefined {
  return pilots.find((p) => p.slug === slug);
}
