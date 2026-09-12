"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MessageFeedback({ messageId }: { messageId: string }) {
  const supabase = createClient();
  const [rating, setRating] = useState<-1 | 1 | null>(null);

  async function rate(next: -1 | 1) {
    setRating(next);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("message_feedback")
      .upsert({ message_id: messageId, user_id: user.id, rating: next }, { onConflict: "message_id,user_id" });
  }

  return (
    <div className="mt-1 flex gap-1">
      <button
        type="button"
        onClick={() => rate(1)}
        className={`rounded px-1.5 py-0.5 text-xs ${rating === 1 ? "bg-emerald-100 text-emerald-700" : "text-ink/30 dark:text-white/30 hover:text-ink/60 dark:hover:text-white/60"}`}
        aria-label="Helpful"
      >
        👍
      </button>
      <button
        type="button"
        onClick={() => rate(-1)}
        className={`rounded px-1.5 py-0.5 text-xs ${rating === -1 ? "bg-red-100 text-red-700" : "text-ink/30 dark:text-white/30 hover:text-ink/60 dark:hover:text-white/60"}`}
        aria-label="Not helpful"
      >
        👎
      </button>
    </div>
  );
}
