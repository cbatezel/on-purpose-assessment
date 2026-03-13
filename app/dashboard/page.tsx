import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import DashboardClient from "./dashboard-client";

function capitalizeName(name: string): string {
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Try with user's session first
  const { data: results } = await supabase
    .from("assessment_results")
    .select("id, created_at, season, profile_name, season_cohort, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // If RLS returns nothing, fall back to admin client
  let finalResults = results;
  if (!results || results.length === 0) {
    const { data: adminResults } = await adminClient
      .from("assessment_results")
      .select("id, created_at, season, profile_name, season_cohort, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    finalResults = adminResults || [];
  }

  // Fetch feedback for the latest assessment
  let latestFeedback: { feedback_accuracy: number | null; feedback_new_insight: boolean | null; feedback_open_text: string | null } | null = null;
  const latestId = finalResults?.[0]?.id;
  if (latestId) {
    const { data: fb } = await adminClient
      .from("assessment_results")
      .select("feedback_accuracy, feedback_new_insight, feedback_open_text")
      .eq("id", latestId)
      .single();
    if (fb) latestFeedback = fb;
  }

  const rawName = user.user_metadata?.name || user.email?.split("@")[0] || "there";
  const name = capitalizeName(rawName);

  // Check admin status
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = !!profile?.is_admin;

  return <DashboardClient name={name} results={finalResults || []} isAdmin={isAdmin} latestFeedback={latestFeedback} />;
}
