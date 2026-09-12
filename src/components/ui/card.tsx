import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-ink/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-ink-soft ${className}`}
      {...props}
    />
  );
}
