// This file mirrors what `npm run db:types` (supabase gen types typescript
// --linked) would generate once these migrations are applied to a linked
// project. Regenerate for real after `supabase db push --linked` to catch
// any drift — this hand-maintained version exists only so the app
// typechecks against the Foundation Hardening schema before a live
// Supabase project is linked in this environment.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: string;
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          timezone: string;
          plan: "free" | "pro";
          onboarding_completed_at: string | null;
          terms_accepted_at: string | null;
          organization_name: string | null;
          country: string | null;
          industry_id: string | null;
          functional_area_id: string | null;
          current_role_id: string | null;
          career_level:
            | "Entry Level"
            | "Early Career"
            | "Mid Level"
            | "Senior Level"
            | "Executive Level"
            | "Board Level"
            | null;
          primary_goal:
            | "Improve Confidence"
            | "Executive Presence"
            | "Ace Interviews"
            | "Improve Presentations"
            | "Improve Meetings"
            | "Become More Persuasive"
            | "Leadership Communication"
            | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          plan?: "free" | "pro";
          onboarding_completed_at?: string | null;
          terms_accepted_at?: string | null;
          organization_name?: string | null;
          country?: string | null;
          industry_id?: string | null;
          functional_area_id?: string | null;
          current_role_id?: string | null;
          career_level?:
            | "Entry Level"
            | "Early Career"
            | "Mid Level"
            | "Senior Level"
            | "Executive Level"
            | "Board Level"
            | null;
          primary_goal?:
            | "Improve Confidence"
            | "Executive Presence"
            | "Ace Interviews"
            | "Improve Presentations"
            | "Improve Meetings"
            | "Become More Persuasive"
            | "Leadership Communication"
            | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          plan?: "free" | "pro";
          onboarding_completed_at?: string | null;
          terms_accepted_at?: string | null;
          organization_name?: string | null;
          country?: string | null;
          industry_id?: string | null;
          functional_area_id?: string | null;
          current_role_id?: string | null;
          career_level?:
            | "Entry Level"
            | "Early Career"
            | "Mid Level"
            | "Senior Level"
            | "Executive Level"
            | "Board Level"
            | null;
          primary_goal?:
            | "Improve Confidence"
            | "Executive Presence"
            | "Ace Interviews"
            | "Improve Presentations"
            | "Improve Meetings"
            | "Become More Persuasive"
            | "Leadership Communication"
            | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_industry_id_fkey";
            columns: ["industry_id"];
            isOneToOne: false;
            referencedRelation: "industries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_functional_area_id_fkey";
            columns: ["functional_area_id"];
            isOneToOne: false;
            referencedRelation: "functional_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_current_role_id_fkey";
            columns: ["current_role_id"];
            isOneToOne: false;
            referencedRelation: "current_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      industries: {
        Row: { id: string; slug: string; name: string; is_active: boolean; created_at: string };
        Insert: { id?: string; slug: string; name: string; is_active?: boolean; created_at?: string };
        Update: { id?: string; slug?: string; name?: string; is_active?: boolean; created_at?: string };
        Relationships: [];
      };
      functional_areas: {
        Row: { id: string; slug: string; name: string; is_active: boolean; created_at: string };
        Insert: { id?: string; slug: string; name: string; is_active?: boolean; created_at?: string };
        Update: { id?: string; slug?: string; name?: string; is_active?: boolean; created_at?: string };
        Relationships: [];
      };
      current_roles: {
        Row: { id: string; slug: string; name: string; is_active: boolean; created_at: string };
        Insert: { id?: string; slug: string; name: string; is_active?: boolean; created_at?: string };
        Update: { id?: string; slug?: string; name?: string; is_active?: boolean; created_at?: string };
        Relationships: [];
      };
      legal_documents: {
        Row: {
          id: string;
          name: string;
          slug: string;
          version: string;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          version: string;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          version?: string;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      legal_acceptances: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          accepted_at: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          document_id?: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "legal_acceptances_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "legal_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: "light" | "dark" | "system";
          voice_enabled: boolean;
          tts_speed: number;
          mentor_style: "supportive" | "balanced" | "challenging";
          coaching_intensity: "low" | "medium" | "high";
          voice_gender: "auto" | "male" | "female";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: "light" | "dark" | "system";
          voice_enabled?: boolean;
          tts_speed?: number;
          mentor_style?: "supportive" | "balanced" | "challenging";
          coaching_intensity?: "low" | "medium" | "high";
          voice_gender?: "auto" | "male" | "female";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: "light" | "dark" | "system";
          voice_enabled?: boolean;
          tts_speed?: number;
          mentor_style?: "supportive" | "balanced" | "challenging";
          coaching_intensity?: "low" | "medium" | "high";
          voice_gender?: "auto" | "male" | "female";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mentors: {
        Row: {
          id: string;
          slug: string;
          display_name: string;
          tagline: string;
          persona_prompt: string;
          mentor_style: "supportive" | "balanced" | "challenging";
          best_fit_goals: string[];
          voice_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name: string;
          tagline: string;
          persona_prompt: string;
          mentor_style: "supportive" | "balanced" | "challenging";
          best_fit_goals?: string[];
          voice_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          display_name?: string;
          tagline?: string;
          persona_prompt?: string;
          mentor_style?: "supportive" | "balanced" | "challenging";
          best_fit_goals?: string[];
          voice_id?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      conversation_sessions: {
        Row: {
          id: string;
          user_id: string;
          mentor_id: string;
          title: string | null;
          started_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mentor_id: string;
          title?: string | null;
          started_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mentor_id?: string;
          title?: string | null;
          started_at?: string;
          last_message_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "mentors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: "user" | "mentor" | "system";
          content: string;
          input_mode: "text" | "voice";
          audio_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          role: "user" | "mentor" | "system";
          content: string;
          input_mode?: "text" | "voice";
          audio_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          role?: "user" | "mentor" | "system";
          content?: string;
          input_mode?: "text" | "voice";
          audio_path?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "conversation_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_mentor_assignments: {
        Row: {
          id: string;
          user_id: string;
          mentor_id: string;
          reason: string;
          assigned_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mentor_id: string;
          reason: string;
          assigned_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mentor_id?: string;
          reason?: string;
          assigned_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_mentor_assignments_mentor_id_fkey";
            columns: ["mentor_id"];
            isOneToOne: false;
            referencedRelation: "mentors";
            referencedColumns: ["id"];
          },
        ];
      };
      memory_items: {
        Row: {
          id: string;
          user_id: string;
          type: "fact" | "preference" | "goal_reference" | "episodic_summary";
          content: string;
          source_message_id: string | null;
          importance: number;
          embedding: number[] | null;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "fact" | "preference" | "goal_reference" | "episodic_summary";
          content: string;
          source_message_id?: string | null;
          importance?: number;
          embedding?: number[] | null;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "fact" | "preference" | "goal_reference" | "episodic_summary";
          content?: string;
          source_message_id?: string | null;
          importance?: number;
          embedding?: number[] | null;
          superseded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: "active" | "paused" | "completed" | "abandoned";
          target_date: string | null;
          priority: "low" | "medium" | "high";
          category: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          status?: "active" | "paused" | "completed" | "abandoned";
          target_date?: string | null;
          priority?: "low" | "medium" | "high";
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          status?: "active" | "paused" | "completed" | "abandoned";
          target_date?: string | null;
          priority?: "low" | "medium" | "high";
          category?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      progress_snapshots: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          source: "activity" | "assessment";
          metric_key: string;
          metric_value: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id?: string | null;
          source: "activity" | "assessment";
          metric_key: string;
          metric_value: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string | null;
          source?: "activity" | "assessment";
          metric_key?: string;
          metric_value?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_snapshots_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      action_plans: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          week_start_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id?: string | null;
          week_start_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string | null;
          week_start_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_plans_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      action_plan_items: {
        Row: {
          id: string;
          action_plan_id: string;
          user_id: string;
          title: string;
          is_ai_suggested: boolean;
          is_completed: boolean;
          completed_at: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          action_plan_id: string;
          user_id: string;
          title: string;
          is_ai_suggested?: boolean;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          action_plan_id?: string;
          user_id?: string;
          title?: string;
          is_ai_suggested?: boolean;
          is_completed?: boolean;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_plan_items_action_plan_id_fkey";
            columns: ["action_plan_id"];
            isOneToOne: false;
            referencedRelation: "action_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      message_feedback: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          rating: -1 | 1;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          rating: -1 | 1;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          rating?: -1 | 1;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_feedback_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_templates: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          schema: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          schema: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          schema?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      assessment_responses: {
        Row: {
          id: string;
          user_id: string;
          template_id: string;
          answers: Json;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id: string;
          answers: Json;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string;
          answers?: Json;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_responses_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "assessment_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_scores: {
        Row: {
          id: string;
          response_id: string;
          user_id: string;
          scores: Json;
          narrative_summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          response_id: string;
          user_id: string;
          scores: Json;
          narrative_summary: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          user_id?: string;
          scores?: Json;
          narrative_summary?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_scores_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: true;
            referencedRelation: "assessment_responses";
            referencedColumns: ["id"];
          },
        ];
      };
      coaching_frameworks: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          framework_prompt: string;
          applicable_goals: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          framework_prompt: string;
          applicable_goals?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          framework_prompt?: string;
          applicable_goals?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      coaching_journeys: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          primary_goal: string | null;
          steps: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          primary_goal?: string | null;
          steps: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          primary_goal?: string | null;
          steps?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_journey_progress: {
        Row: {
          id: string;
          user_id: string;
          journey_id: string;
          current_step: number;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          journey_id: string;
          current_step?: number;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          journey_id?: string;
          current_step?: number;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_journey_progress_journey_id_fkey";
            columns: ["journey_id"];
            isOneToOne: false;
            referencedRelation: "coaching_journeys";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string; created_at?: string };
        Relationships: [];
      };
      collective_intelligence_consents: {
        Row: { user_id: string; consented_at: string; revoked_at: string | null; updated_at: string };
        Insert: { user_id: string; consented_at?: string; revoked_at?: string | null; updated_at?: string };
        Update: { user_id?: string; consented_at?: string; revoked_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      collective_insights: {
        Row: {
          id: string; title: string; summary: string; category: string; cohort_description: string;
          sample_size: number; period_start: string; period_end: string; status: "draft" | "published" | "archived";
          published_at: string | null; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; title: string; summary: string; category: string; cohort_description: string;
          sample_size: number; period_start: string; period_end: string; status?: "draft" | "published" | "archived";
          published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; title?: string; summary?: string; category?: string; cohort_description?: string;
          sample_size?: number; period_start?: string; period_end?: string; status?: "draft" | "published" | "archived";
          published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases used throughout the app instead of reaching
// into Database["public"]["Tables"][...] everywhere.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Industry = Database["public"]["Tables"]["industries"]["Row"];
export type FunctionalArea = Database["public"]["Tables"]["functional_areas"]["Row"];
export type CurrentRole = Database["public"]["Tables"]["current_roles"]["Row"];
export type LegalDocument = Database["public"]["Tables"]["legal_documents"]["Row"];
export type LegalAcceptance = Database["public"]["Tables"]["legal_acceptances"]["Row"];
export type UserPreferences = Database["public"]["Tables"]["user_preferences"]["Row"];
export type Mentor = Database["public"]["Tables"]["mentors"]["Row"];
export type ConversationSession = Database["public"]["Tables"]["conversation_sessions"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type UserMentorAssignment = Database["public"]["Tables"]["user_mentor_assignments"]["Row"];
export type MemoryItem = Database["public"]["Tables"]["memory_items"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type ProgressSnapshot = Database["public"]["Tables"]["progress_snapshots"]["Row"];
export type ActionPlan = Database["public"]["Tables"]["action_plans"]["Row"];
export type ActionPlanItem = Database["public"]["Tables"]["action_plan_items"]["Row"];
export type MessageFeedback = Database["public"]["Tables"]["message_feedback"]["Row"];
export type AssessmentTemplate = Database["public"]["Tables"]["assessment_templates"]["Row"];
export type AssessmentResponse = Database["public"]["Tables"]["assessment_responses"]["Row"];
export type AssessmentScore = Database["public"]["Tables"]["assessment_scores"]["Row"];
export type CoachingFramework = Database["public"]["Tables"]["coaching_frameworks"]["Row"];
export type CoachingJourney = Database["public"]["Tables"]["coaching_journeys"]["Row"];
export type UserJourneyProgress = Database["public"]["Tables"]["user_journey_progress"]["Row"];
export type CollectiveInsight = Database["public"]["Tables"]["collective_insights"]["Row"];
