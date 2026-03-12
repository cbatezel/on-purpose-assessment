import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { lookupProfile } from "@/lib/assessment-data";
import ResultsPageClient from "./results-page-client";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: result } = await adminClient
    .from("assessment_results")
    .select("season, profile_name")
    .eq("id", id)
    .single();

  if (!result) {
    return { title: "Results | The On Purpose Assessment" };
  }

  const title = `My Season: ${result.season} — ${result.profile_name} | On Purpose Assessment`;
  const description = `I took the On Purpose Assessment and landed in the ${result.season} season as "${result.profile_name}". Find out where you are.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ResultsPage({ params }: Props) {
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
