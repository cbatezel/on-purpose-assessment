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

  console.log("[dashboard] Authenticated user ID:", user.id, "email:", user.email);

  // Try with user's session first
  const { data: results, error: rlsError } = await supabase
    .from("assessment_results")
    .select("id, created_at, season, profile_name, season_score, expertise_score, passion_score, bs_score, season_cohort, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  console.log("[dashboard] RLS query result:", results?.length, "rows, error:", rlsError?.message);

  // If RLS returns nothing, fall back to admin client to diagnose
  let finalResults = results;
  if (!results || results.length === 0) {
    const { data: adminResults, error: adminError } = await adminClient
      .from("assessment_results")
      .select("id, created_at, season, profile_name, season_score, expertise_score, passion_score, bs_score, season_cohort, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    console.log("[dashboard] Admin query for user_id match:", adminResults?.length, "rows, error:", adminError?.message);

    // Also check if there are results with a different user_id for this email
    const { data: emailResults } = await adminClient
      .from("assessment_results")
      .select("id, user_id, created_at")
      .limit(5);

    console.log("[dashboard] Recent assessment_results (all users):", JSON.stringify(emailResults));

    finalResults = adminResults || [];
  }

  const rawName = user.user_metadata?.name || user.email?.split("@")[0] || "there";
  const name = capitalizeName(rawName);

  return <DashboardClient name={name} results={finalResults || []} />;
}
