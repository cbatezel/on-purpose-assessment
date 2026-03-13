"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

const seasonColors: Record<string, string> = {
  Identity: "#C4956A", Exploration: "#6B8F71", Influence: "#8B2635", Multiplication: "#2D3A5E",
};
const confColors: Record<string, string> = { high: "#6B7D6A", medium: "#E65100", low: "#B22234" };
const PIE_COLORS = ["#C4956A","#6B8F71","#8B2635","#2D3A5E","#9A9590"];
const GENDER_COLORS: Record<string, string> = { Male: "#2D3A5E", Female: "#C4956A", "Prefer not to say": "#9A9590" };

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#F0EDE8;font-family:'DM Sans',system-ui,sans-serif;color:#1C1B19;-webkit-font-smoothing:antialiased}
  input::placeholder{color:#C4C0BB}
  *{-webkit-tap-highlight-color:transparent}
`;

interface Stats {
  totalUsers: number;
  totalAssessments: number;
  assessmentsThisWeek: number;
  avgSeason: string;
  avgExpertise: string;
  avgPassion: string;
  avgBs: string;
  avgConfirmation: string;
  completionRate: number;
}

interface UserRow {
  userId: string; name: string; email: string;
  birth_year: number | null; gender: string | null;
  count: number; latestSeason: string; latestProfile: string; latestDate: string;
}

interface Assessment {
  id: string; created_at: string; user_id: string;
  season: string; profile_name: string; season_confidence: string | null;
  season_score: number; expertise_score: number; passion_score: number; bs_score: number;
  email: string; name: string;
}

interface CohortInterest {
  id: string; created_at: string; name: string; email: string;
  message: string | null; season: string | null; profile_name: string | null; user_id: string | null;
}

interface IncompleteSession {
  email: string; furthest_step: string; last_active_at: string; device_type: string;
}

interface FunnelStep { label: string; count: number }

interface ChartPoint { date: string; count: number }
interface PiePoint { name: string; value: number }
interface BarPoint { name: string; count: number }

const qCounts = { season: 4, expertise: 8, passion: 7, bs: 2 };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function toAvg(score: number, count: number) { return count ? (score / count).toFixed(1) : "—"; }

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function SeasonBadge({ season }: { season: string }) {
  const accent = seasonColors[season] || C.sage;
  return (
    <span style={{
      display:"inline-block",padding:"3px 8px",borderRadius:5,
      background:accent+"18",fontFamily:"'DM Mono',monospace",
      fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",
      color:accent,fontWeight:500,
    }}>{season}</span>
  );
}
function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;
  const colors: Record<string, { bg: string; text: string }> = {
    high: { bg: C.sageLight, text: C.sage },
    medium: { bg: "#FFF3E0", text: "#E65100" },
    low: { bg: C.redLight, text: C.red },
  };
  const c = colors[confidence] || colors.high;
  return (
    <span style={{
      display:"inline-block",padding:"3px 8px",borderRadius:5,
      background:c.bg,fontFamily:"'DM Mono',monospace",
      fontSize:10,letterSpacing:"0.06em",textTransform:"uppercase",
      color:c.text,fontWeight:500,
    }}>{confidence}</span>
  );
}

type Tab = "overview" | "users" | "assessments" | "cohort";
type TimeRange = "7d" | "30d" | "90d" | "all";

const DEVICE_COLORS: Record<string, string> = { mobile: "#8B2635", desktop: "#2D3A5E", tablet: "#C4956A", unknown: "#9A9590" };

export default function AdminClient({
  stats, users, assessments, cohortInterest,
  dailyData, seasonData, confidenceData, topProfiles,
  ageData, genderData, lifeEventData, allDailyCounts, cohortUserIds,
  avgTimeToComplete, deviceData, locationData, referralData, funnelData, incompleteSessions,
}: {
  stats: Stats; users: UserRow[]; assessments: Assessment[]; cohortInterest: CohortInterest[];
  dailyData: ChartPoint[]; seasonData: PiePoint[]; confidenceData: PiePoint[]; topProfiles: BarPoint[];
  ageData: BarPoint[]; genderData: PiePoint[]; lifeEventData: BarPoint[];
  allDailyCounts: Record<string, number>; cohortUserIds: string[];
  avgTimeToComplete: number | null; deviceData: PiePoint[]; locationData: BarPoint[];
  referralData: BarPoint[]; funnelData: FunnelStep[]; incompleteSessions: IncompleteSession[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", birth_year: "", gender: "", is_admin: false });
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeTarget, setMergeTarget] = useState<UserRow | null>(null);
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Assessments tab state
  const [aPage, setAPage] = useState(0);
  const [aFilter, setAFilter] = useState({ season: "", confidence: "" });
  const [aSort, setASort] = useState<{ key: string; asc: boolean }>({ key: "created_at", asc: false });
  const PER_PAGE = 20;

  const cohortUserIdSet = useMemo(() => new Set(cohortUserIds), [cohortUserIds]);

  const filteredUsers = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      })
    : users;

  // Filtered + sorted assessments
  let filteredAssessments = assessments;
  if (aFilter.season) filteredAssessments = filteredAssessments.filter(a => a.season === aFilter.season);
  if (aFilter.confidence) filteredAssessments = filteredAssessments.filter(a => a.season_confidence === aFilter.confidence);
  filteredAssessments = [...filteredAssessments].sort((a, b) => {
    const k = aSort.key as keyof Assessment;
    const av = a[k], bv = b[k];
    if (av == null || bv == null) return 0;
    const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
    return aSort.asc ? cmp : -cmp;
  });
  const totalPages = Math.ceil(filteredAssessments.length / PER_PAGE);
  const pagedAssessments = filteredAssessments.slice(aPage * PER_PAGE, (aPage + 1) * PER_PAGE);

  // Volume trend data for selected time range
  const volumeData = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
    const data: ChartPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      data.push({ date: key, count: allDailyCounts[key] || 0 });
    }
    return data;
  }, [timeRange, allDailyCounts]);

  const handleSortToggle = (key: string) => {
    setASort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: true });
  };

  const handleEditUser = (u: UserRow) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, birth_year: u.birth_year ? String(u.birth_year) : "", gender: u.gender || "", is_admin: false });
    setMergeSearch("");
    setMergeTarget(null);
    setMergeConfirm(false);
    setShowDeleteConfirm(false);
    setDeleteConfirmEmail("");
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    await fetch("/api/admin/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editingUser.userId,
        name: editForm.name.trim() || undefined,
        email: editForm.email.trim() || undefined,
        is_admin: editForm.is_admin,
        birth_year: editForm.birth_year ? parseInt(editForm.birth_year) : undefined,
        gender: editForm.gender || undefined,
      }),
    });
    setSaving(false);
    setEditingUser(null);
    router.refresh();
  };

  const handleMerge = async () => {
    if (!editingUser || !mergeTarget) return;
    setSaving(true);
    await fetch("/api/admin/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUserId: editingUser.userId, targetUserId: mergeTarget.userId }),
    });
    setSaving(false);
    setEditingUser(null);
    setMergeConfirm(false);
    setMergeTarget(null);
    router.refresh();
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    await fetch("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: editingUser.userId }),
    });
    setSaving(false);
    setEditingUser(null);
    setShowDeleteConfirm(false);
    setDeleteConfirmEmail("");
    router.refresh();
  };

  const mergeSearchResults = mergeSearch.trim().length >= 2 && editingUser
    ? users.filter(u => {
        if (u.userId === editingUser.userId) return false;
        const q = mergeSearch.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const handleSignOut = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "assessments", label: "Assessments" },
    { key: "cohort", label: "Cohort Interest" },
  ];

  // Activity feed — last 15 assessments
  const feedItems = assessments.slice(0, 15);

  return (
    <>
      <style>{globalCss}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"24px 24px 72px"}}>

          {/* Top bar: back + tabs + sign out */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
            <Link href="/dashboard" style={{
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              width:32,height:32,borderRadius:"50%",
              background:"rgba(178,34,52,0.09)",border:"none",
              textDecoration:"none",color:"#B22234",transition:"background 0.15s",
              flexShrink:0,
            }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div style={{display:"flex",gap:2,flex:1}}>
              {tabs.map(t => (
                <button key={t.key} onClick={()=>{setTab(t.key);setAPage(0);}} style={{
                  fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.06em",
                  textTransform:"uppercase",padding:"8px 14px",border:"none",
                  background:tab===t.key?`${C.red}10`:"transparent",
                  borderRadius:6,cursor:"pointer",
                  color:tab===t.key?C.red:C.inkLight,
                  fontWeight:tab===t.key?600:400,transition:"all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>
            <button onClick={handleSignOut} style={{
              fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.06em",
              color:C.inkLight,background:"none",border:"none",cursor:"pointer",
              padding:"6px 8px",transition:"color 0.15s",flexShrink:0,
            }}>Sign Out</button>
          </div>

          {/* ══ OVERVIEW TAB ══════════════════════════════════════ */}
          {tab === "overview" && (
            <>
              {/* Assessment Volume chart — TOP */}
              <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,
                padding:"20px 20px 12px",marginBottom:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight}}>Assessment Volume</div>
                  <div style={{display:"flex",gap:2}}>
                    {(["7d","30d","90d","all"] as TimeRange[]).map(r => (
                      <button key={r} onClick={()=>setTimeRange(r)} style={{
                        fontFamily:"'DM Mono',monospace",fontSize:10,padding:"4px 10px",
                        border:"none",borderRadius:4,cursor:"pointer",
                        background:timeRange===r?`${C.red}12`:"transparent",
                        color:timeRange===r?C.red:C.inkLight,
                        fontWeight:timeRange===r?600:400,transition:"all 0.15s",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={volumeData}>
                    <XAxis dataKey="date" tick={{fontSize:9,fontFamily:"'DM Mono',monospace",fill:C.inkLight}}
                      tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
                    <YAxis tick={{fontSize:9,fontFamily:"'DM Mono',monospace",fill:C.inkLight}} allowDecimals={false} width={24} />
                    <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}
                      labelFormatter={v => new Date(v+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} />
                    <Line type="monotone" dataKey="count" stroke={C.red} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Hero numbers */}
              <div style={{display:"flex",gap:48,marginBottom:40,paddingLeft:4}}>
                <div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:6}}>Total Assessments</div>
                  <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:56,
                    fontWeight:700,color:C.ink,lineHeight:1}}>{stats.totalAssessments}</div>
                </div>
                <div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:6}}>This Week</div>
                  <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:56,
                    fontWeight:700,color:C.red,lineHeight:1}}>{stats.assessmentsThisWeek}</div>
                </div>
                <div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:6}}>Completion Rate</div>
                  <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:56,
                    fontWeight:700,color:C.sage,lineHeight:1}}>{stats.completionRate}<span style={{fontSize:28,fontWeight:400}}>%</span></div>
                </div>
              </div>

              {/* Avg Time + Drop-off Funnel row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:20,marginBottom:28}}>
                {/* Avg time to complete */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Avg Time to Complete</div>
                  <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:36,fontWeight:700,color:C.ink,lineHeight:1.2}}>
                    {avgTimeToComplete ? (
                      <>{Math.floor(avgTimeToComplete / 60)}<span style={{fontSize:16,fontWeight:400,color:C.inkMid}}> min </span>{avgTimeToComplete % 60}<span style={{fontSize:16,fontWeight:400,color:C.inkMid}}> sec</span></>
                    ) : "—"}
                  </div>
                </div>

                {/* Drop-off funnel */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:14}}>Drop-off Funnel</div>
                  {funnelData.length > 0 && (() => {
                    const maxCount = funnelData[0].count || 1;
                    return funnelData.map((f, i) => {
                      const dropoff = i > 0 && funnelData[i-1].count > 0
                        ? Math.round(((funnelData[i-1].count - f.count) / funnelData[i-1].count) * 100)
                        : 0;
                      return (
                        <div key={f.label} style={{marginBottom:8}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:C.ink}}>{f.label}</span>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              {i > 0 && dropoff > 0 && (
                                <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.red}}>-{dropoff}%</span>
                              )}
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,width:32,textAlign:"right"}}>{f.count}</span>
                            </div>
                          </div>
                          <div style={{height:8,borderRadius:4,background:`${C.border}60`,overflow:"hidden"}}>
                            <div style={{
                              height:"100%",borderRadius:4,
                              width:`${(f.count / maxCount) * 100}%`,
                              background: i === funnelData.length - 1 ? C.sage : `${C.sage}99`,
                              transition:"width 0.4s ease-out",
                            }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Device + Location + Referrals row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginBottom:28}}>
                {/* Device breakdown */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Device Breakdown</div>
                  {deviceData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={deviceData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}
                            paddingAngle={2}
                            style={{fontSize:10,fontFamily:"'DM Mono',monospace"}}>
                            {deviceData.map((entry, i) => (
                              <Cell key={i} fill={DEVICE_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8}} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginTop:4}}>
                        {deviceData.map(d => {
                          const total = deviceData.reduce((a, b) => a + b.value, 0);
                          return (
                            <div key={d.name} style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{width:7,height:7,borderRadius:"50%",background:DEVICE_COLORS[d.name] || C.inkLight}} />
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkMid,textTransform:"capitalize"}}>
                                {d.name} {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : <p style={{fontSize:12,color:C.inkLight}}>No session data yet.</p>}
                </div>

                {/* Location */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Location</div>
                  {locationData.length > 0 ? (() => {
                    const maxCount = Math.max(...locationData.map(d => d.count));
                    return locationData.map(d => (
                      <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkMid,
                          width:70,textAlign:"right",flexShrink:0}}>{d.name}</span>
                        <div style={{flex:1,height:12,borderRadius:3,background:`${C.border}60`,overflow:"hidden"}}>
                          <div style={{
                            height:"100%",borderRadius:3,
                            width:`${(d.count / maxCount) * 100}%`,
                            background:seasonColors.Multiplication,
                            transition:"width 0.4s ease-out",
                          }} />
                        </div>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkLight,
                          width:24,flexShrink:0}}>{d.count}</span>
                      </div>
                    ));
                  })() : <p style={{fontSize:12,color:C.inkLight}}>No session data yet.</p>}
                </div>

                {/* Referral sources */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Referral Sources</div>
                  {referralData.length > 0 ? (
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {referralData.map(r => (
                        <div key={r.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:C.ink,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{r.name}</span>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,flexShrink:0}}>{r.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{fontSize:12,color:C.inkLight}}>No session data yet.</p>}
                </div>
              </div>

              {/* Live Activity Feed */}
              <div style={{marginBottom:40}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                  textTransform:"uppercase",color:C.sage,marginBottom:14}}>Recent Activity</div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {feedItems.map(a => {
                    const accent = seasonColors[a.season] || C.sage;
                    const hasCohort = cohortUserIdSet.has(a.user_id);
                    return (
                      <Link key={a.id} href={`/admin/assessment/${a.id}`} style={{textDecoration:"none"}}>
                        <div style={{
                          display:"flex",alignItems:"center",gap:12,
                          padding:"11px 16px",borderRadius:8,
                          cursor:"pointer",transition:"background 0.12s",
                        }}
                          onMouseEnter={e=>e.currentTarget.style.background=C.white}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >
                          <div style={{width:8,height:8,borderRadius:"50%",background:accent,flexShrink:0}} />
                          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,
                            color:C.ink,minWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {a.name||"—"}
                          </span>
                          <SeasonBadge season={a.season} />
                          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:C.inkMid,
                            flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {a.profile_name}
                          </span>
                          {hasCohort && (
                            <span title="Submitted cohort interest" style={{fontSize:14,flexShrink:0}}>🔥</span>
                          )}
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,
                            flexShrink:0,textAlign:"right",minWidth:70}}>
                            {timeAgo(a.created_at)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Insights Row: Season donut + Demographics */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
                {/* Season distribution */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Season Distribution</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={seasonData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                        paddingAngle={2} label={({name,percent}: {name?:string;percent?:number})=>`${name||""} ${((percent||0)*100).toFixed(0)}%`}
                        style={{fontSize:10,fontFamily:"'DM Mono',monospace"}}>
                        {seasonData.map((entry, i) => (
                          <Cell key={i} fill={seasonColors[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Demographics */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Demographics</div>
                  {ageData.length > 0 && (
                    <div style={{marginBottom:18}}>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.06em",
                        textTransform:"uppercase",color:C.inkLight,marginBottom:8}}>Age</div>
                      {(() => {
                        const maxCount = Math.max(...ageData.map(d => d.count));
                        return ageData.map(d => (
                          <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkMid,
                              width:28,textAlign:"right",flexShrink:0}}>{d.name}</span>
                            <div style={{flex:1,height:14,borderRadius:3,background:`${C.border}60`,overflow:"hidden"}}>
                              <div style={{
                                height:"100%",borderRadius:3,
                                width:`${(d.count / maxCount) * 100}%`,
                                background:`linear-gradient(90deg, ${C.sage}, ${C.sage}cc)`,
                                transition:"width 0.4s ease-out",
                              }} />
                            </div>
                            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkLight,
                              width:24,flexShrink:0}}>{d.count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  {genderData.length > 0 && (
                    <div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.06em",
                        textTransform:"uppercase",color:C.inkLight,marginBottom:8}}>Gender</div>
                      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                        {genderData.map(g => (
                          <div key={g.name} style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:8,height:8,borderRadius:"50%",
                              background:GENDER_COLORS[g.name] || C.inkLight}} />
                            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:C.inkMid}}>{g.name}</span>
                            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight}}>{g.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Life events + Confidence row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Top Life Events</div>
                  {lifeEventData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={lifeEventData} layout="vertical" margin={{left:0,right:8}}>
                        <XAxis type="number" tick={{fontSize:9,fontFamily:"'DM Mono',monospace",fill:C.inkLight}} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{fontSize:9,fontFamily:"'DM Mono',monospace",fill:C.inkMid}} width={120} />
                        <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8}} />
                        <Bar dataKey="count" fill={seasonColors.Identity} radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p style={{fontSize:13,color:C.inkLight}}>No life events data yet.</p>}
                </div>
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Confidence Breakdown</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={confidenceData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                        paddingAngle={2} label={({name,percent}: {name?:string;percent?:number})=>`${name||""} ${((percent||0)*100).toFixed(0)}%`}
                        style={{fontSize:10,fontFamily:"'DM Mono',monospace"}}>
                        {confidenceData.map((entry, i) => (
                          <Cell key={i} fill={confColors[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ══ USERS TAB ═════════════════════════════════════════ */}
          {tab === "users" && (
            <div>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{
                  width:"100%",height:44,border:`1.5px solid ${search?C.ink:C.border}`,
                  borderRadius:10,padding:"0 14px",fontFamily:"'DM Sans',sans-serif",
                  fontSize:14,color:C.ink,background:C.white,outline:"none",
                  marginBottom:14,transition:"border-color 0.15s",
                }}
                onFocus={e=>e.target.style.borderColor=C.red}
                onBlur={e=>e.target.style.borderColor=search?C.ink:C.border}
              />

              {filteredUsers.length === 0 && (
                <p style={{fontSize:14,color:C.inkLight,textAlign:"center",padding:"20px 0"}}>
                  {search ? "No users match your search." : "No users yet."}
                </p>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filteredUsers.map(u => {
                  const open = expandedUser === u.userId;
                  return (
                    <div key={u.userId} style={{
                      background:C.white,border:`1px solid ${C.border}`,borderRadius:12,
                      overflow:"hidden",transition:"box-shadow 0.15s",
                      boxShadow:open?"0 2px 12px rgba(28,27,25,0.08)":"none",
                    }}>
                      <button onClick={()=>setExpandedUser(open?null:u.userId)} style={{
                        display:"flex",alignItems:"center",justifyContent:"space-between",
                        width:"100%",padding:"14px 18px",border:"none",background:"transparent",
                        cursor:"pointer",textAlign:"left",gap:12,
                      }}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                            <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,
                              fontWeight:600,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",
                              whiteSpace:"nowrap"}}>{u.name || "—"}</span>
                            <SeasonBadge season={u.latestSeason} />
                          </div>
                          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight}}>
                            {u.count} assessment{u.count !== 1 ? "s" : ""}
                          </span>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight}}>
                            {formatDate(u.latestDate)}
                          </span>
                          <svg width="12" height="7" viewBox="0 0 12 7" fill="none"
                            style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}>
                            <path d="M1 1l5 5 5-5" stroke={C.inkLight} strokeWidth="1.5"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>
                      {open && (
                        <div style={{padding:"0 18px 16px"}}>
                          <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"0 0 12px"}} />
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13,marginBottom:12}}>
                            <div><span style={{color:C.inkLight}}>Latest profile: </span><span style={{color:C.ink,fontWeight:500}}>{u.latestProfile}</span></div>
                            <div><span style={{color:C.inkLight}}>Season: </span><span style={{color:C.ink,fontWeight:500}}>{u.latestSeason}</span></div>
                          </div>
                          <button onClick={()=>handleEditUser(u)} style={{
                            fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.04em",
                            color:C.red,background:"none",border:"none",cursor:"pointer",padding:0,
                          }}>Edit User &rarr;</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Edit user modal */}
              {editingUser && (
                <div style={{
                  position:"fixed",top:0,left:0,right:0,bottom:0,
                  background:"rgba(28,27,25,0.5)",zIndex:1000,
                  display:"flex",alignItems:"center",justifyContent:"center",padding:20,
                }} onClick={e=>{if(e.target===e.currentTarget){setEditingUser(null);setMergeConfirm(false);setMergeTarget(null);setMergeSearch("");setShowDeleteConfirm(false);setDeleteConfirmEmail("");}}}>
                  <div style={{
                    background:C.white,borderRadius:16,padding:"28px 24px",
                    maxWidth:460,width:"100%",boxShadow:"0 8px 40px rgba(28,27,25,0.18)",
                    maxHeight:"90vh",overflowY:"auto",
                  }}>
                    <h3 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:20,fontWeight:600,
                      color:C.ink,marginBottom:16}}>Edit User<span style={{color:C.red}}>.</span></h3>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div>
                        <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                          textTransform:"uppercase",color:C.inkLight,display:"block",marginBottom:4}}>Name</label>
                        <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}
                          style={{width:"100%",height:40,border:`1.5px solid ${C.border}`,borderRadius:8,
                            padding:"0 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:C.ink,background:C.bg,outline:"none"}} />
                      </div>
                      <div>
                        <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                          textTransform:"uppercase",color:C.inkLight,display:"block",marginBottom:4}}>Email</label>
                        <input value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))}
                          style={{width:"100%",height:40,border:`1.5px solid ${C.border}`,borderRadius:8,
                            padding:"0 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:C.ink,background:C.bg,outline:"none"}} />
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div>
                          <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                            textTransform:"uppercase",color:C.inkLight,display:"block",marginBottom:4}}>Birth Year</label>
                          <input value={editForm.birth_year} onChange={e=>setEditForm(f=>({...f,birth_year:e.target.value}))}
                            placeholder="1990" type="number"
                            style={{width:"100%",height:40,border:`1.5px solid ${C.border}`,borderRadius:8,
                              padding:"0 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:C.ink,background:C.bg,outline:"none"}} />
                        </div>
                        <div>
                          <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                            textTransform:"uppercase",color:C.inkLight,display:"block",marginBottom:4}}>Gender</label>
                          <select value={editForm.gender} onChange={e=>setEditForm(f=>({...f,gender:e.target.value}))}
                            style={{width:"100%",height:40,border:`1.5px solid ${C.border}`,borderRadius:8,
                              padding:"0 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:C.ink,background:C.bg,outline:"none"}}>
                            <option value="">—</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>
                      </div>
                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                        <input type="checkbox" checked={editForm.is_admin}
                          onChange={e=>setEditForm(f=>({...f,is_admin:e.target.checked}))} />
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkMid}}>Admin</span>
                      </label>
                      <div style={{display:"flex",gap:8,marginTop:4}}>
                        <button onClick={()=>{setEditingUser(null);setMergeConfirm(false);setMergeTarget(null);setShowDeleteConfirm(false);}} style={{
                          flex:1,height:42,borderRadius:8,border:`1.5px solid ${C.border}`,
                          background:"transparent",fontFamily:"'DM Sans',sans-serif",fontSize:14,
                          fontWeight:500,color:C.inkMid,cursor:"pointer",
                        }}>Cancel</button>
                        <button onClick={handleSaveUser} disabled={saving} style={{
                          flex:1,height:42,borderRadius:8,border:"none",background:C.red,
                          fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,
                          color:"white",cursor:"pointer",opacity:saving?0.6:1,
                        }}>{saving?"Saving...":"Save"}</button>
                      </div>
                      <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"8px 0"}} />
                      {/* Merge User */}
                      <div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                          textTransform:"uppercase",color:C.red,marginBottom:8}}>Merge User</div>
                        <p style={{fontSize:12,color:C.inkMid,lineHeight:1.5,marginBottom:8}}>
                          Move all assessments from this user to another user, then delete this account.
                        </p>
                        {!mergeTarget ? (
                          <div style={{position:"relative"}}>
                            <input value={mergeSearch} onChange={e=>{setMergeSearch(e.target.value);setMergeConfirm(false);}}
                              placeholder="Search by name or email..."
                              style={{width:"100%",height:40,border:`1.5px solid ${C.border}`,borderRadius:8,
                                padding:"0 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:C.ink,background:C.bg,outline:"none"}} />
                            {mergeSearchResults.length > 0 && (
                              <div style={{
                                position:"absolute",top:44,left:0,right:0,zIndex:10,
                                background:C.white,border:`1px solid ${C.border}`,borderRadius:8,
                                boxShadow:"0 4px 20px rgba(28,27,25,0.12)",maxHeight:240,overflowY:"auto",
                              }}>
                                {mergeSearchResults.map(u => (
                                  <button key={u.userId} onClick={()=>{setMergeTarget(u);setMergeSearch("");}} style={{
                                    display:"flex",alignItems:"center",justifyContent:"space-between",
                                    width:"100%",padding:"10px 14px",border:"none",background:"transparent",
                                    cursor:"pointer",textAlign:"left",borderBottom:`1px solid ${C.border}`,
                                  }}
                                    onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                                  >
                                    <div>
                                      <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:C.ink}}>{u.name||"—"}</div>
                                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight}}>{u.email}</div>
                                    </div>
                                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkLight,flexShrink:0}}>
                                      {u.count} assessment{u.count!==1?"s":""}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : !mergeConfirm ? (
                          <div>
                            <div style={{background:C.bg,borderRadius:8,padding:12,marginBottom:8}}>
                              <div style={{fontSize:12,color:C.inkMid,lineHeight:1.6}}>
                                <strong style={{color:C.ink}}>{editingUser.name||"—"}</strong>{" "}
                                <span style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>({editingUser.email})</span>
                                <span style={{display:"inline-block",margin:"0 6px",color:C.red}}>→</span>
                                <strong style={{color:C.ink}}>{mergeTarget.name||"—"}</strong>{" "}
                                <span style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>({mergeTarget.email})</span>
                              </div>
                              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,marginTop:4}}>
                                {editingUser.count} assessment{editingUser.count!==1?"s":""} will be moved to {mergeTarget.name||mergeTarget.email}
                              </div>
                            </div>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>{setMergeTarget(null);setMergeSearch("");}} style={{
                                flex:1,height:40,borderRadius:8,border:`1.5px solid ${C.border}`,
                                background:"transparent",fontFamily:"'DM Sans',sans-serif",fontSize:13,
                                fontWeight:500,color:C.inkMid,cursor:"pointer",
                              }}>Change</button>
                              <button onClick={()=>setMergeConfirm(true)} style={{
                                flex:1,height:40,borderRadius:8,border:`1.5px solid ${C.red}`,
                                background:"transparent",fontFamily:"'DM Sans',sans-serif",fontSize:13,
                                fontWeight:600,color:C.red,cursor:"pointer",
                              }}>Merge &amp; Delete</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{background:C.redLight,borderRadius:8,padding:12,textAlign:"center"}}>
                            <p style={{fontSize:12,color:C.red,fontWeight:600,marginBottom:8}}>
                              This will permanently merge {editingUser.count} assessment{editingUser.count!==1?"s":""} into {mergeTarget.name||mergeTarget.email} and delete {editingUser.name||editingUser.email}. Are you sure?
                            </p>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>setMergeConfirm(false)} style={{
                                flex:1,height:36,borderRadius:6,border:`1px solid ${C.border}`,
                                background:C.white,fontSize:12,color:C.inkMid,cursor:"pointer",
                              }}>Cancel</button>
                              <button onClick={handleMerge} disabled={saving} style={{
                                flex:1,height:36,borderRadius:6,border:"none",
                                background:C.red,fontSize:12,fontWeight:600,color:"white",cursor:"pointer",
                                opacity:saving?0.6:1,
                              }}>{saving?"Merging...":"Confirm Merge"}</button>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"8px 0"}} />
                      {/* Delete User */}
                      <div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                          textTransform:"uppercase",color:C.red,marginBottom:8}}>Delete User</div>
                        {!showDeleteConfirm ? (
                          <button onClick={()=>setShowDeleteConfirm(true)} style={{
                            width:"100%",height:40,borderRadius:8,border:`1.5px solid ${C.red}`,
                            background:"transparent",fontFamily:"'DM Sans',sans-serif",fontSize:13,
                            fontWeight:600,color:C.red,cursor:"pointer",
                          }}>Delete User</button>
                        ) : (
                          <div style={{background:C.redLight,borderRadius:8,padding:14}}>
                            <p style={{fontSize:12,color:C.red,fontWeight:600,marginBottom:4}}>
                              Are you sure you want to delete {editingUser.name||"this user"} ({editingUser.email})?
                            </p>
                            <p style={{fontSize:11,color:C.red,lineHeight:1.5,marginBottom:10,opacity:0.8}}>
                              This will permanently delete their profile and all {editingUser.count} assessment result{editingUser.count!==1?"s":""}. This cannot be undone.
                            </p>
                            <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.06em",
                              textTransform:"uppercase",color:C.red,display:"block",marginBottom:4}}>Type email to confirm</label>
                            <input value={deleteConfirmEmail} onChange={e=>setDeleteConfirmEmail(e.target.value)}
                              placeholder={editingUser.email}
                              style={{width:"100%",height:40,border:`1.5px solid ${C.red}40`,borderRadius:8,
                                padding:"0 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:C.ink,background:C.white,outline:"none",marginBottom:10}} />
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>{setShowDeleteConfirm(false);setDeleteConfirmEmail("");}} style={{
                                flex:1,height:36,borderRadius:6,border:`1px solid ${C.border}`,
                                background:C.white,fontSize:12,color:C.inkMid,cursor:"pointer",
                              }}>Cancel</button>
                              <button onClick={handleDeleteUser}
                                disabled={saving || deleteConfirmEmail.toLowerCase() !== editingUser.email.toLowerCase()}
                                style={{
                                  flex:1,height:36,borderRadius:6,border:"none",
                                  background:C.red,fontSize:12,fontWeight:600,color:"white",cursor:"pointer",
                                  opacity:(saving || deleteConfirmEmail.toLowerCase() !== editingUser.email.toLowerCase())?0.4:1,
                                }}>{saving?"Deleting...":"Delete Permanently"}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ ASSESSMENTS TAB ════════════════════════════════════ */}
          {tab === "assessments" && (
            <div>
              {/* Filters */}
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
                <select value={aFilter.season} onChange={e=>{setAFilter(f=>({...f,season:e.target.value}));setAPage(0);}}
                  style={{height:38,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",
                    fontFamily:"'DM Sans',sans-serif",fontSize:13,color:C.ink,background:C.white,outline:"none"}}>
                  <option value="">All Seasons</option>
                  {["Identity","Exploration","Influence","Multiplication"].map(s=>(
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select value={aFilter.confidence} onChange={e=>{setAFilter(f=>({...f,confidence:e.target.value}));setAPage(0);}}
                  style={{height:38,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",
                    fontFamily:"'DM Sans',sans-serif",fontSize:13,color:C.ink,background:C.white,outline:"none"}}>
                  <option value="">All Confidence</option>
                  {["high","medium","low"].map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,
                  alignSelf:"center",marginLeft:"auto"}}>{filteredAssessments.length} results</span>
              </div>

              {/* Table header */}
              <div style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 1.2fr 0.7fr 1.2fr 1fr",
                gap:8,padding:"8px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,
                letterSpacing:"0.06em",textTransform:"uppercase",color:C.inkLight,marginBottom:4}}>
                {[
                  {key:"name",label:"Name"},{key:"email",label:"Email"},{key:"season",label:"Season"},
                  {key:"profile_name",label:"Profile"},{key:"season_confidence",label:"Conf"},
                  {key:"season_score",label:"Scores"},{key:"created_at",label:"Date"},
                ].map(col=>(
                  <button key={col.key} onClick={()=>handleSortToggle(col.key)} style={{
                    background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0,
                    fontFamily:"inherit",fontSize:"inherit",letterSpacing:"inherit",textTransform:"inherit",
                    color:aSort.key===col.key?C.red:C.inkLight,fontWeight:aSort.key===col.key?600:400,
                  }}>{col.label}{aSort.key===col.key?(aSort.asc?" ↑":" ↓"):""}</button>
                ))}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {pagedAssessments.map(a => (
                  <Link key={a.id} href={`/admin/assessment/${a.id}`} style={{textDecoration:"none"}}>
                    <div style={{
                      display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 1.2fr 0.7fr 1.2fr 1fr",
                      gap:8,padding:"10px 16px",background:C.white,border:`1px solid ${C.border}`,
                      borderRadius:10,alignItems:"center",cursor:"pointer",transition:"box-shadow 0.15s",
                    }}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(28,27,25,0.08)"}
                      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
                    >
                      <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,color:C.ink,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name||"—"}</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.email}</span>
                      <SeasonBadge season={a.season} />
                      <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:C.ink,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.profile_name}</span>
                      <ConfidenceBadge confidence={a.season_confidence} />
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkLight}}>
                        S:{toAvg(a.season_score,qCounts.season)} E:{toAvg(a.expertise_score,qCounts.expertise)} P:{toAvg(a.passion_score,qCounts.passion)}
                      </span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkLight}}>
                        {formatDateTime(a.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16}}>
                  <button onClick={()=>setAPage(p=>Math.max(0,p-1))} disabled={aPage===0}
                    style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"6px 12px",
                      border:`1px solid ${C.border}`,borderRadius:6,background:C.white,
                      color:aPage===0?C.inkLight:C.ink,cursor:aPage===0?"default":"pointer"}}>← Prev</button>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,alignSelf:"center"}}>
                    {aPage+1} / {totalPages}
                  </span>
                  <button onClick={()=>setAPage(p=>Math.min(totalPages-1,p+1))} disabled={aPage>=totalPages-1}
                    style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"6px 12px",
                      border:`1px solid ${C.border}`,borderRadius:6,background:C.white,
                      color:aPage>=totalPages-1?C.inkLight:C.ink,cursor:aPage>=totalPages-1?"default":"pointer"}}>Next →</button>
                </div>
              )}

              {/* Incomplete Sessions */}
              {incompleteSessions.length > 0 && (
                <div style={{marginTop:36}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                    textTransform:"uppercase",color:C.red,marginBottom:14}}>
                    Incomplete Sessions ({incompleteSessions.length})
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 0.8fr",
                    gap:8,padding:"8px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,
                    letterSpacing:"0.06em",textTransform:"uppercase",color:C.inkLight,marginBottom:4}}>
                    <span>Email</span><span>Furthest Step</span><span>Last Active</span><span>Device</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {incompleteSessions.map((s, i) => (
                      <div key={i} style={{
                        display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 0.8fr",
                        gap:8,padding:"10px 16px",background:C.white,border:`1px solid ${C.border}`,
                        borderRadius:10,alignItems:"center",
                      }}>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:C.ink,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.email}</span>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkMid,
                          textTransform:"capitalize"}}>{s.furthest_step.replace(/_/g, " ")}</span>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight}}>
                          {timeAgo(s.last_active_at)}
                        </span>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.inkLight,
                          textTransform:"capitalize"}}>{s.device_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ COHORT INTEREST TAB ═══════════════════════════════ */}
          {tab === "cohort" && (
            <div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,marginBottom:14}}>
                {cohortInterest.length} submission{cohortInterest.length !== 1 ? "s" : ""}
              </div>
              {cohortInterest.length === 0 ? (
                <p style={{fontSize:14,color:C.inkLight,textAlign:"center",padding:"20px 0"}}>
                  No cohort interest submissions yet.
                </p>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {cohortInterest.map(ci => (
                    <div key={ci.id} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:4}}>
                        <div>
                          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,color:C.ink}}>{ci.name}</span>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,marginLeft:10}}>{ci.email}</span>
                        </div>
                        <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,flexShrink:0}}>
                          {formatDateTime(ci.created_at)}
                        </span>
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:ci.message?8:0}}>
                        {ci.season && <SeasonBadge season={ci.season} />}
                        {ci.profile_name && (
                          <span style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:13,fontWeight:600,color:C.ink}}>{ci.profile_name}</span>
                        )}
                      </div>
                      {ci.message && (
                        <p style={{fontSize:13,color:C.inkMid,lineHeight:1.5,margin:0,fontStyle:"italic"}}>
                          &ldquo;{ci.message}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{textAlign:"center",padding:"40px 0 4px",fontSize:11,
            fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
            textTransform:"uppercase",color:C.inkLight}}>
            Powered by Third Space
          </div>
        </div>
      </div>
    </>
  );
}
