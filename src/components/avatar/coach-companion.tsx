import { pickCompanionAvatar } from "@/lib/avatar/registry";
import { WaveformBars } from "@/components/waveform/waveform-bars";

const MODULE_LINES: Record<string, string> = {
  progress: "Small steps, tracked honestly, beat big plans that never start.",
  assessments: "A quick check-in now makes next month's trend line mean something.",
  journeys: "Pick one step. You don't need the whole path figured out yet.",
  insights: "This is the shape of your progress — not just a snapshot.",
  dashboard: "Good to see you. Your mentor's ready whenever you are.",
};

export function CoachCompanion({ moduleKey }: { moduleKey: string }) {
  const Avatar = pickCompanionAvatar(moduleKey);
  const line = MODULE_LINES[moduleKey] ?? "Let's keep going.";

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white/60 p-4 dark:border-white/10 dark:bg-ink-soft/60">
      <Avatar className="h-16 w-16 shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-ink/80 dark:text-white/80">{line}</p>
        <WaveformBars className="mt-2" color="bg-current-500" />
      </div>
    </div>
  );
}
