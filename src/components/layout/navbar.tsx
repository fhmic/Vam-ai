"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function NavBar({ displayName, isAdmin }: { displayName: string | null; isAdmin: boolean }) {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <header className="border-b border-ink/10 bg-white dark:border-white/10 dark:bg-ink-soft">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-display text-lg font-medium text-ink dark:text-white">
            VAM
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            <Link href="/mentor" className="text-sm text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white">
              Mentor
            </Link>
            <Link href="/progress" className="text-sm text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white">
              Progress
            </Link>
            <Link href="/assessments" className="text-sm text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white">
              Assessments
            </Link>
            <Link href="/journeys" className="text-sm text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white">
              Journeys
            </Link>
            <Link href="/insights" className="text-sm text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white">
              Insights
            </Link>
            {isAdmin ? <Link href="/admin" className="text-sm text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white">Admin</Link> : null}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/settings/profile" className="text-sm text-ink/60 hover:text-ink dark:text-white/60 dark:hover:text-white">
            {displayName ?? "Welcome"}
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
