"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { LEGAL_SLUG_ROUTES } from "@/lib/legal/routes";

interface Document {
  id: string;
  name: string;
  slug: string;
}

export function ReAcceptForm({ documents }: { documents: Document[] }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAccepted = documents.every((doc) => accepted[doc.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allAccepted) {
      setError("Please review and accept every updated agreement to continue.");
      return;
    }

    setIsLoading(true);

    const res = await fetch("/api/legal/re-accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptedDocumentIds: documents.map((d) => d.id) }),
    });

    setIsLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? <FormAlert tone="error" message={error} /> : null}

      {documents.map((doc) => (
        <label
          key={doc.id}
          htmlFor={`accept-${doc.id}`}
          className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-600"
        >
          <input
            id={`accept-${doc.id}`}
            type="checkbox"
            checked={Boolean(accepted[doc.id])}
            onChange={(e) => setAccepted((prev) => ({ ...prev, [doc.id]: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-signal-600
              focus:ring-signal-500"
          />
          <span>
            I have read and agree to the updated{" "}
            <Link
              href={LEGAL_SLUG_ROUTES[doc.slug] ?? "#"}
              target="_blank"
              className="font-medium text-signal-600 underline hover:text-signal-700"
            >
              {doc.name}
            </Link>
            .
          </span>
        </label>
      ))}

      <Button type="submit" className="w-full" isLoading={isLoading} disabled={!allAccepted}>
        Continue
      </Button>
    </form>
  );
}
