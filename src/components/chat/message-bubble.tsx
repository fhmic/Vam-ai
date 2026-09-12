export function MessageBubble({ role, content }: { role: "user" | "mentor"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? "bg-signal-600 text-white" : "bg-white text-ink dark:text-white border border-ink/10 dark:border-white/10"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
