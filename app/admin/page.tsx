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
    .select("id, created_at, user_id, season, profile_name, season_confidence, season_score, expertise_score, passion_score, bs_score, season_confirmation_score, birth_year, gender, life_events, feedback_accuracy, feedback_new_insight, feedback_open_text, season_self_select")
    .order("created_at", { ascending: false });

  // ── Build user map from auth ────────────────────────────────────
  const userMap: Record<string, { email: string; name: string; birth_year: number | null; gender: string | null; is_admin: boolean }> = {};
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      userMap[u.id] = {
        email: u.email || "",
        name: u.user_metadata?.name || u.email?.split("@")[0] || "",
        birth_year: null,
        gender: null,
        is_admin: false,
      };
    }
  }

  // ── Fetch birth_year and gender from profiles (source of truth) ──
  const { data: allProfiles } = await adminClient
    .from("profiles")
    .select("id, birth_year, gender, is_admin");
  if (allProfiles) {
    for (const p of allProfiles) {
      if (userMap[p.id]) {
        userMap[p.id].birth_year = p.birth_year || null;
        userMap[p.id].gender = p.gender || null;
        userMap[p.id].is_admin = !!p.is_admin;
      }
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
    firstDate: string;
    latestAssessment: {
      season_confidence: string | null;
      profile_name: string;
      season_self_select: string | null;
      life_events: string[];
    } | null;
  }> = {};

  for (const r of allResults || []) {
    if (!userSummaryMap[r.user_id]) {
      userSummaryMap[r.user_id] = {
        count: 1,
        latestSeason: r.season,
        latestProfile: r.profile_name,
        latestDate: r.created_at,
        firstDate: r.created_at,
        latestAssessment: {
          season_confidence: r.season_confidence,
          profile_name: r.profile_name,
          season_self_select: r.season_self_select || null,
          life_events: r.life_events || [],
        },
      };
    } else {
      userSummaryMap[r.user_id].count++;
      // Results are ordered desc, so the last one is the oldest
      userSummaryMap[r.user_id].firstDate = r.created_at;
    }
  }

  const users = Object.entries(userSummaryMap).map(([userId, summary]) => ({
    userId,
    name: userMap[userId]?.name || "",
    email: userMap[userId]?.email || "",
    birth_year: userMap[userId]?.birth_year || null,
    gender: userMap[userId]?.gender || null,
    is_admin: userMap[userId]?.is_admin || false,
    ...summary,
  }));

  // ── All assessments for the assessments tab ─────────────────────
  const assessments = (allResults || []).map(r => ({
    ...r,
    email: userMap[r.user_id]?.email || "",
    name: userMap[r.user_id]?.name || "",
    has_feedback: !!r.feedback_accuracy,
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

  // ── Fetch assessment sessions for analytics ─────────────────
  const { data: allSessions } = await adminClient
    .from("assessment_sessions")
    .select("id, created_at, email, device_type, timezone, referrer, utm_source, utm_medium, utm_campaign, current_step, furthest_step, completed_at, time_to_complete_seconds, assessment_result_id, last_active_at")
    .order("created_at", { ascending: false });

  // Session analytics
  const sessions = allSessions || [];
  const completedSessions = sessions.filter(s => s.completed_at);
  const incompleteSessions = sessions.filter(s => !s.completed_at);
  const completionRate = sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0;

  // Avg time to complete
  const completionTimes = completedSessions.filter(s => s.time_to_complete_seconds).map(s => s.time_to_complete_seconds as number);
  const avgTimeToComplete = completionTimes.length > 0 ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) : null;

  // Device breakdown
  const deviceCounts: Record<string, number> = {};
  for (const s of sessions) {
    const d = s.device_type || "unknown";
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
  }
  const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));

  // Timezone → region mapping
  const tzRegionMap = (tz: string): string => {
    if (!tz) return "Unknown";
    if (/America\/(New_York|Detroit|Indiana|Louisville|Toronto|Montreal|Atlanta|Miami|Philadelphia|Washington|Boston|Charlotte|Pittsburgh)/i.test(tz)) return "US East";
    if (/America\/(Chicago|Winnipeg|Dallas|Houston|Minneapolis|Memphis|Milwaukee|Nashville|Oklahoma|Omaha|Boise|Denver|Phoenix|Indianapolis)/i.test(tz) && !/Mountain|Phoenix|Denver|Boise/i.test(tz)) return "US Central";
    if (/America\/(Denver|Boise|Phoenix|Edmonton|Albuquerque|Salt_Lake)/i.test(tz)) return "US Mountain";
    if (/America\/(Los_Angeles|Vancouver|Seattle|Portland|San_Francisco|Anchorage|Juneau|Adak)/i.test(tz)) return "US Pacific";
    if (/America\//.test(tz)) return "Americas Other";
    return "International";
  };
  const regionCounts: Record<string, number> = {};
  for (const s of sessions) {
    const region = tzRegionMap(s.timezone || "");
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  }
  const locationData = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Referral sources
  const referralCounts: Record<string, number> = {};
  for (const s of sessions) {
    let source = s.utm_source || "";
    if (!source && s.referrer) {
      try { source = new URL(s.referrer).hostname; } catch { source = s.referrer; }
    }
    if (!source) source = "Direct";
    referralCounts[source] = (referralCounts[source] || 0) + 1;
  }
  const referralData = Object.entries(referralCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Drop-off funnel
  const funnelSteps = [
    { label: "Started (email)", test: () => true },
    { label: "Completed demographics", test: (s: typeof sessions[0]) => {
      const demoSteps = ["life_events","self_season","season_q1","expertise_q1","passion_q1","processing","results"];
      return demoSteps.some(ds => s.furthest_step?.includes(ds)) || !!s.completed_at;
    }},
    { label: "Started questions", test: (s: typeof sessions[0]) => {
      return s.furthest_step?.startsWith("season_q") || s.furthest_step?.startsWith("expertise_q") || s.furthest_step?.startsWith("passion_q") || s.furthest_step === "processing" || s.furthest_step === "results" || !!s.completed_at;
    }},
    { label: "Reached halfway", test: (s: typeof sessions[0]) => {
      if (s.completed_at) return true;
      const step = s.furthest_step || "";
      // Halfway is around expertise questions
      return step.startsWith("expertise_q") || step.startsWith("passion_q") || step === "processing" || step === "results";
    }},
    { label: "Completed", test: (s: typeof sessions[0]) => !!s.completed_at },
  ];
  const funnelData = funnelSteps.map(f => ({
    label: f.label,
    count: sessions.filter(f.test).length,
  }));

  // ── Feedback stats ───────────────────────────────────────────
  let fbAccuracySum = 0, fbAccuracyCount = 0, fbInsightYes = 0, fbInsightTotal = 0, fbTotalCount = 0;
  const allFeedback: { id: string; name: string; season: string; profile_name: string; accuracy: number | null; new_insight: boolean | null; text: string | null; created_at: string }[] = [];
  for (const r of allResults || []) {
    if (r.feedback_accuracy != null || r.feedback_new_insight != null || r.feedback_open_text) {
      fbTotalCount++;
      if (r.feedback_accuracy != null) { fbAccuracySum += r.feedback_accuracy; fbAccuracyCount++; }
      if (r.feedback_new_insight != null) { fbInsightTotal++; if (r.feedback_new_insight) fbInsightYes++; }
      allFeedback.push({
        id: r.id,
        name: userMap[r.user_id]?.name || userMap[r.user_id]?.email || "Anonymous",
        season: r.season,
        profile_name: r.profile_name,
        accuracy: r.feedback_accuracy ?? null,
        new_insight: r.feedback_new_insight ?? null,
        text: r.feedback_open_text || null,
        created_at: r.created_at,
      });
    }
  }
  const feedbackStats = {
    avgAccuracy: fbAccuracyCount > 0 ? (fbAccuracySum / fbAccuracyCount).toFixed(1) : null,
    insightYesRate: fbInsightTotal > 0 ? Math.round((fbInsightYes / fbInsightTotal) * 100) : null,
    totalFeedback: fbTotalCount,
    totalAssessments,
  };

  return (
    <AdminClient
      stats={{...stats, completionRate}}
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
      avgTimeToComplete={avgTimeToComplete}
      deviceData={deviceData}
      locationData={locationData}
      referralData={referralData}
      funnelData={funnelData}
      feedbackStats={feedbackStats}
      allFeedback={allFeedback}
      incompleteSessions={incompleteSessions.slice(0, 100).map(s => ({
        email: s.email || "—",
        furthest_step: s.furthest_step || "email",
        last_active_at: s.last_active_at || s.created_at,
        device_type: s.device_type || "—",
      }))}
    />
  );
}
