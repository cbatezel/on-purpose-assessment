import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  // ── Fetch all assessment results ────────────────────────────────
  const { data: allResults } = await adminClient
    .from("assessment_results")
    .select("id, created_at, user_id, season, profile_name, season_confidence, season_score, expertise_score, passion_score, bs_score, season_confirmation_score, birth_year, gender, life_events")
    .order("created_at", { ascending: false });

  // ── Build user map from auth ────────────────────────────────────
  const userMap: Record<string, { email: string; name: string }> = {};
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      userMap[u.id] = {
        email: u.email || "",
        name: u.user_metadata?.name || u.email?.split("@")[0] || "",
      };
    }
  }

  // ── Compute stats ──────────────────────────────────────────────
  const uniqueUserIds = new Set(allResults?.map(r => r.user_id));
  const totalUsers = uniqueUserIds.size;
  const totalAssessments = allResults?.length || 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const assessmentsThisWeek = allResults?.filter(r => new Date(r.created_at) >= weekAgo).length || 0;

  // Normalized averages (divide by question count)
  const qCounts = { season: 4, expertise: 8, passion: 7, bs: 2 };
  let sSum = 0, eSum = 0, pSum = 0, bSum = 0, confSum = 0, confCount = 0;
  const seasonCounts: Record<string, number> = {};
  const confidenceCounts: Record<string, number> = {};
  const profileCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};

  for (const r of allResults || []) {
    sSum += r.season_score || 0;
    eSum += r.expertise_score || 0;
    pSum += r.passion_score || 0;
    bSum += r.bs_score || 0;
    if (r.season_confirmation_score != null) {
      confSum += Number(r.season_confirmation_score);
      confCount++;
    }
    seasonCounts[r.season] = (seasonCounts[r.season] || 0) + 1;
    if (r.season_confidence) {
      confidenceCounts[r.season_confidence] = (confidenceCounts[r.season_confidence] || 0) + 1;
    }
    profileCounts[r.profile_name] = (profileCounts[r.profile_name] || 0) + 1;
    const day = r.created_at.split("T")[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  }

  const n = totalAssessments || 1;
  const avgConfirmation = confCount > 0 ? (confSum / confCount).toFixed(1) : "—";

  // Daily chart data for last 30 days
  const dailyData: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyData.push({ date: key, count: dailyCounts[key] || 0 });
  }

  // Season distribution
  const seasonData = Object.entries(seasonCounts).map(([name, value]) => ({ name, value }));

  // Confidence distribution
  const confidenceData = Object.entries(confidenceCounts).map(([name, value]) => ({ name, value }));

  // Top 5 profiles
  const topProfiles = Object.entries(profileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // ── Build user list ─────────────────────────────────────────────
  const userSummaryMap: Record<string, {
    count: number;
    latestSeason: string;
    latestProfile: string;
    latestDate: string;
  }> = {};

  for (const r of allResults || []) {
    if (!userSummaryMap[r.user_id]) {
      userSummaryMap[r.user_id] = {
        count: 1,
        latestSeason: r.season,
        latestProfile: r.profile_name,
        latestDate: r.created_at,
      };
    } else {
      userSummaryMap[r.user_id].count++;
    }
  }

  const users = Object.entries(userSummaryMap).map(([userId, summary]) => ({
    userId,
    name: userMap[userId]?.name || "",
    email: userMap[userId]?.email || "",
    ...summary,
  }));

  // ── All assessments for the assessments tab ─────────────────────
  const assessments = (allResults || []).map(r => ({
    ...r,
    email: userMap[r.user_id]?.email || "",
    name: userMap[r.user_id]?.name || "",
  }));

  // ── Fetch cohort interest ───────────────────────────────────────
  const { data: cohortInterest } = await adminClient
    .from("cohort_interest")
    .select("*")
    .order("created_at", { ascending: false });

  const stats = {
    totalUsers,
    totalAssessments,
    assessmentsThisWeek,
    avgSeason: (sSum / n / qCounts.season).toFixed(1),
    avgExpertise: (eSum / n / qCounts.expertise).toFixed(1),
    avgPassion: (pSum / n / qCounts.passion).toFixed(1),
    avgBs: (bSum / n / qCounts.bs).toFixed(1),
    avgConfirmation,
  };

  // ── Demographics data ─────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const ageBuckets: Record<string, number> = {};
  const genderCounts: Record<string, number> = {};
  for (const r of allResults || []) {
    if (r.birth_year && r.birth_year > 1920 && r.birth_year <= currentYear) {
      const age = currentYear - r.birth_year;
      const decade = `${Math.floor(age / 10) * 10}s`;
      ageBuckets[decade] = (ageBuckets[decade] || 0) + 1;
    }
    if (r.gender) {
      genderCounts[r.gender] = (genderCounts[r.gender] || 0) + 1;
    }
  }
  const ageData = Object.entries(ageBuckets)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([name, count]) => ({ name, count }));
  const genderData = Object.entries(genderCounts)
    .map(([name, value]) => ({ name, value }));

  // ── Life events data ──────────────────────────────────────────
  const lifeEventCounts: Record<string, number> = {};
  for (const r of allResults || []) {
    const events: string[] = r.life_events || [];
    for (const e of events) {
      if (e && e !== "None of these") {
        lifeEventCounts[e] = (lifeEventCounts[e] || 0) + 1;
      }
    }
  }
  const lifeEventData = Object.entries(lifeEventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // ── All daily counts (for flexible time range) ────────────────
  const allDailyCounts: Record<string, number> = {};
  for (const r of allResults || []) {
    const day = r.created_at.split("T")[0];
    allDailyCounts[day] = (allDailyCounts[day] || 0) + 1;
  }

  // ── Cohort interest user IDs for fire badge ───────────────────
  const cohortUserIds = (cohortInterest || [])
    .filter(ci => ci.user_id)
    .map(ci => ci.user_id as string);

  return (
    <AdminClient
      stats={stats}
      users={users}
      assessments={assessments}
      cohortInterest={cohortInterest || []}
      dailyData={dailyData}
      seasonData={seasonData}
      confidenceData={confidenceData}
      topProfiles={topProfiles}
      ageData={ageData}
      genderData={genderData}
      lifeEventData={lifeEventData}
      allDailyCounts={allDailyCounts}
      cohortUserIds={cohortUserIds}
    />
  );
}
