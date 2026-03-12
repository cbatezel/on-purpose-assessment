import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { lookupProfile, seasonDescriptions } from "@/lib/assessment-data";
import ResultsPageClient from "./results-page-client";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the assessment result — use admin client to bypass RLS
  const { data: result, error } = await adminClient
    .from("assessment_results")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !result) {
    notFound();
  }

  // Verify the result belongs to this user
  if (result.user_id !== user.id) {
    notFound();
  }

  const profile = lookupProfile(result.season, result.profile_name);

  return (
    <ResultsPageClient
      behavioral={result.season}
      profile={profile}
      gap={result.gap || null}
      mismatch={result.mismatch || null}
    />
  );
}
