import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check is_admin in profiles table
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  // ── Fetch overview stats ──────────────────────────────────────

  // Total users (count of distinct user_ids in assessment_results)
  const { count: totalAssessments } = await adminClient
    .from("assessment_results")
    .select("*", { count: "exact", head: true });

  const { data: distinctUsers } = await adminClient
    .from("assessment_results")
    .select("user_id");
  const uniqueUserIds = new Set(distinctUsers?.map(r => r.user_id));
  const totalUsers = uniqueUserIds.size;

  // Assessments this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: assessmentsThisWeek } = await adminClient
    .from("assessment_results")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgo.toISOString());

  // Average scores
  const { data: allResults } = await adminClient
    .from("assessment_results")
    .select("season_score, expertise_score, passion_score, bs_score, season, profile_name");

  let avgSeason = 0, avgExpertise = 0, avgPassion = 0, avgBs = 0;
  const seasonCounts: Record<string, number> = {};
  const profileCounts: Record<string, number> = {};

  if (allResults && allResults.length > 0) {
    let sSum = 0, eSum = 0, pSum = 0, bSum = 0;
    for (const r of allResults) {
      sSum += r.season_score || 0;
      eSum += r.expertise_score || 0;
      pSum += r.passion_score || 0;
      bSum += r.bs_score || 0;
      seasonCounts[r.season] = (seasonCounts[r.season] || 0) + 1;
      profileCounts[r.profile_name] = (profileCounts[r.profile_name] || 0) + 1;
    }
    const n = allResults.length;
    avgSeason = sSum / n;
    avgExpertise = eSum / n;
    avgPassion = pSum / n;
    avgBs = bSum / n;
  }

  const mostCommonSeason = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const mostCommonProfile = Object.entries(profileCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  // ── Fetch recent assessments (last 20) ────────────────────────

  const { data: recentAssessments } = await adminClient
    .from("assessment_results")
    .select("id, created_at, user_id, season, profile_name, season_confidence, season_score, expertise_score, passion_score, bs_score")
    .order("created_at", { ascending: false })
    .limit(20);

  // Get user info for recent assessments
  const recentUserIds = [...new Set(recentAssessments?.map(r => r.user_id) || [])];
  const userMap: Record<string, { email: string; name: string }> = {};
  if (recentUserIds.length > 0) {
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        userMap[u.id] = {
          email: u.email || "",
          name: u.user_metadata?.name || u.email?.split("@")[0] || "",
        };
      }
    }
  }

  const recentWithUsers = (recentAssessments || []).map(r => ({
    ...r,
    email: userMap[r.user_id]?.email || "",
    name: userMap[r.user_id]?.name || "",
  }));

  // ── Build user list with assessment counts ────────────────────

  const userList = Object.entries(
    (allResults || []).reduce<Record<string, {
      user_id: string;
      count: number;
      latestSeason: string;
      latestProfile: string;
      latestDate: string;
    }>>((acc, r) => {
      // We don't have user_id on allResults query above, so re-query
      return acc;
    }, {})
  );

  // Full user summary query
  const { data: userSummaries } = await adminClient
    .from("assessment_results")
    .select("user_id, season, profile_name, created_at")
    .order("created_at", { ascending: false });

  const userSummaryMap: Record<string, {
    count: number;
    latestSeason: string;
    latestProfile: string;
    latestDate: string;
  }> = {};

  for (const r of userSummaries || []) {
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

  const stats = {
    totalUsers,
    totalAssessments: totalAssessments || 0,
    assessmentsThisWeek: assessmentsThisWeek || 0,
    avgSeason: avgSeason.toFixed(1),
    avgExpertise: avgExpertise.toFixed(1),
    avgPassion: avgPassion.toFixed(1),
    avgBs: avgBs.toFixed(1),
    mostCommonSeason,
    mostCommonProfile,
  };

  return (
    <AdminClient
      stats={stats}
      users={users}
      recentAssessments={recentWithUsers}
    />
  );
}
