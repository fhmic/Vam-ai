export function WaveformBars({
  active = true,
  className = "",
  color = "bg-signal-500",
}: {
  active?: boolean;
  className?: string;
  color?: string;
}) {
  const heights = [40, 70, 100, 65, 45];
  const delays = [0, 0.1, 0.2, 0.3, 0.15];

  return (
    <div className={`flex h-6 items-end gap-1 ${className}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-full ${color} ${active ? "animate-waveform-bar" : ""}`}
          style={{ height: `${h}%`, animationDelay: `${delays[i]}s` }}
        />
      ))}
    </div>
  );
}
