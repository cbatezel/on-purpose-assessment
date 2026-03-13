import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { lookupProfile, seasonDescriptions } from "@/lib/assessment-data";
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

function getConfidenceNarrative(season: string, confidence: string | null): string | undefined {
  if (!confidence) return undefined;
  if (confidence === "high") return `You're in the season of ${season}.`;
  if (confidence === "medium") return `You're most likely in the season of ${season}, though your answers suggest you may be navigating a transition.`;
  return `Based on where you are in life, you're likely in the season of ${season} — though your answers suggest you may be revisiting some earlier work. That's not uncommon, especially during periods of change.`;
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
  const confidenceNarrative = getConfidenceNarrative(result.season, result.season_confidence);

  // Compute life events narrative
  const lifeEvents: string[] = result.life_events || [];
  const lifeEventCount = lifeEvents.filter((e: string) => e !== "None of these").length;
  const lifeEventsNarrative = lifeEventCount >= 3
    ? "You're carrying a lot of transitions right now. That can make your season feel less clear — not because you're in the wrong one, but because this one is asking a lot of you."
    : null;

  return (
    <ResultsPageClient
      behavioral={result.season}
      profile={profile}
      gap={result.gap || null}
      mismatch={result.mismatch || null}
      seasonConfidence={result.season_confidence || undefined}
      confidenceNarrative={confidenceNarrative}
      lifeEventsNarrative={lifeEventsNarrative}
    />
  );
}
