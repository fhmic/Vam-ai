import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CollectiveIntelligenceConsentCard } from "@/components/collective-intelligence/consent-card";
import { DeleteAccountCard } from "@/components/account/delete-account-card";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [{ data: profile }, { data: preferences }, { data: consent }] = await Promise.all([
    supabase.from("profiles").select("display_name, timezone").eq("id", user.id).single(),
    supabase.from("user_preferences").select("theme").eq("user_id", user.id).single(),
    supabase.from("collective_intelligence_consents").select("revoked_at").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-ink dark:text-white">Profile</h1>
      <Card className="space-y-3">
        <div>
          <p className="text-sm text-ink/60 dark:text-white/60">Name</p>
          <p className="font-medium text-ink dark:text-white">{profile?.display_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-sm text-ink/60 dark:text-white/60">Email</p>
          <p className="font-medium text-ink dark:text-white">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-ink/60 dark:text-white/60">Timezone</p>
          <p className="font-medium text-ink dark:text-white">{profile?.timezone}</p>
        </div>
      </Card>
      <Card>
        <h2 className="font-medium text-ink dark:text-white">Collective Intelligence</h2>
        <CollectiveIntelligenceConsentCard initialOptIn={Boolean(consent && !consent.revoked_at)} />
      </Card>
      <Card>
        <h2 className="font-medium text-ink dark:text-white">Appearance</h2>
        <p className="mt-1 text-sm text-ink/60 dark:text-white/60">Choose how VAM looks on this device.</p>
        <div className="mt-3">
          <ThemeToggle initialValue={preferences?.theme ?? "system"} />
        </div>
      </Card>
      <Card>
        <h2 className="font-medium text-ink dark:text-white">Your data</h2>
        <p className="mt-1 text-sm text-ink/60 dark:text-white/60">
          Download everything stored about you — profile, goals, conversations, memory, and
          assessment history — as a single JSON file.
        </p>
        <a
          href="/api/export"
          className="mt-3 inline-block rounded-xl bg-ink/5 dark:bg-white/10 px-4 py-2 text-sm font-medium text-ink dark:text-white hover:bg-ink/10 dark:hover:bg-white/15"
        >
          Download my data
        </a>
      </Card>
      <Card>
        <h2 className="font-medium text-ink dark:text-white">Delete account</h2>
        <DeleteAccountCard />
      </Card>
      <p className="text-sm text-ink/40 dark:text-white/40">
        Editable profile fields and a communication DNA view arrive in a later phase.
      </p>
    </div>
  );
}
