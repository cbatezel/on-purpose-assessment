import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: results } = await supabase
    .from("assessment_results")
    .select("id, created_at, season, profile_name, season_score, expertise_score, passion_score, bs_score, season_cohort")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const name = user.user_metadata?.name || user.email?.split("@")[0] || "there";

  return <DashboardClient name={name} results={results || []} />;
}
