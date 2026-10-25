import { DemoBanner } from "@/lib/app-shell";
import { DEMO_NOTE } from "./fixtures";
import { Board } from "./Board";

/**
 * Keep / revert / retire adjudicator — Conduct P-1.
 *
 * Stateless and client-side: the estate is generated in the browser and the
 * adjudication is a pure function over it, so there is nothing a second
 * visitor should see that this one changed.
 */
export default function KeepRevertRetirePilot() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6">
      <DemoBanner>{DEMO_NOTE}</DemoBanner>

      <h1 className="text-lg font-semibold tracking-tight">
        847 custom objects. Which of them actually have to come across?
      </h1>
      <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-foreground/65">
        The default in an S/4HANA programme is to migrate everything, which is what makes
        migrations cost what they cost. Each object here is sorted from its own telemetry,
        dependencies and standard coverage — and where those signals conflict, it is handed back
        rather than guessed at.
      </p>

      <div className="mt-6">
        <Board />
      </div>
    </div>
  );
}
