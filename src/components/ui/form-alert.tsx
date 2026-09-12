export function FormAlert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const toneClasses =
    tone === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div role="status" className={`rounded-xl border px-3 py-2 text-sm ${toneClasses}`}>
      {message}
    </div>
  );
}
