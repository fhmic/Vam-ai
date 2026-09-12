import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MentorChat } from "./mentor-chat";

export default async function MentorPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [{ data: assignment }, { data: preferences }, { data: session }] = await Promise.all([
    supabase
      .from("user_mentor_assignments")
      .select("mentors(slug, display_name, tagline)")
      .eq("user_id", user.id)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("voice_gender, voice_enabled")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("conversation_sessions")
      .select("id")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let history: { role: "user" | "mentor"; content: string }[] = [];
  if (session?.id) {
    const { data: messages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", session.id)
      .neq("role", "system")
      .order("created_at", { ascending: true })
      .limit(50);
    history = (messages ?? []) as typeof history;
  }

  // Supabase's relational embed typing isn't fully resolved for this
  // hand-authored Database type; narrowed here rather than fighting it.
  const mentor = (assignment as any)?.mentors as
    | { slug: string; display_name: string; tagline: string }
    | undefined;

  return (
    <MentorChat
      mentorSlug={mentor?.slug ?? null}
      mentorName={mentor?.display_name ?? "your mentor"}
      mentorTagline={mentor?.tagline ?? null}
      initialSessionId={session?.id ?? null}
      initialHistory={history}
      initialVoiceGender={preferences?.voice_gender ?? "auto"}
      voiceEnabled={preferences?.voice_enabled ?? true}
    />
  );
}
