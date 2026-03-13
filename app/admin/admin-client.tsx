"use client";
import { useState } from "react";
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
}

interface UserRow {
  userId: string; name: string; email: string;
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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background:C.white,border:`1px solid ${C.border}`,borderRadius:12,
      padding:"18px 20px",flex:1,minWidth:130,
    }}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
        textTransform:"uppercase",color:C.inkLight,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,
        fontWeight:700,color:C.ink,lineHeight:1.1}}>{value}</div>
      {sub && <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:C.inkLight,marginTop:4}}>{sub}</div>}
    </div>
  );
}

type Tab = "overview" | "users" | "assessments" | "cohort";

export default function AdminClient({
  stats, users, assessments, cohortInterest,
  dailyData, seasonData, confidenceData, topProfiles,
}: {
  stats: Stats; users: UserRow[]; assessments: Assessment[]; cohortInterest: CohortInterest[];
  dailyData: ChartPoint[]; seasonData: PiePoint[]; confidenceData: PiePoint[]; topProfiles: BarPoint[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", birth_year: "", gender: "", is_admin: false });
  const [mergeEmail, setMergeEmail] = useState("");
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Assessments tab state
  const [aPage, setAPage] = useState(0);
  const [aFilter, setAFilter] = useState({ season: "", confidence: "" });
  const [aSort, setASort] = useState<{ key: string; asc: boolean }>({ key: "created_at", asc: false });
  const PER_PAGE = 20;

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

  const handleSortToggle = (key: string) => {
    setASort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: true });
  };

  const handleEditUser = (u: UserRow) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, birth_year: "", gender: "", is_admin: false });
    setMergeEmail("");
    setMergeConfirm(false);
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
    if (!editingUser || !mergeEmail.trim()) return;
    const target = users.find(u => u.email.toLowerCase() === mergeEmail.trim().toLowerCase());
    if (!target) { alert("User not found with that email."); return; }
    if (target.userId === editingUser.userId) { alert("Cannot merge into same user."); return; }
    setSaving(true);
    await fetch("/api/admin/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUserId: editingUser.userId, targetUserId: target.userId }),
    });
    setSaving(false);
    setEditingUser(null);
    setMergeConfirm(false);
    router.refresh();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "assessments", label: "Assessments" },
    { key: "cohort", label: "Cohort Interest" },
  ];

  return (
    <>
      <style>{globalCss}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"24px 24px 72px"}}>

          {/* Back arrow */}
          <div style={{marginBottom:20}}>
            <Link href="/dashboard" style={{
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              width:36,height:36,borderRadius:"50%",
              background:"rgba(178,34,52,0.09)",border:"none",
              textDecoration:"none",color:"#B22234",transition:"background 0.15s",
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Header */}
          <div style={{marginBottom:28}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.12em",
              textTransform:"uppercase",color:C.sage,marginBottom:8}}>Admin</div>
            <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"clamp(24px,5vw,32px)",
              fontWeight:700,color:C.ink,lineHeight:1.2}}>
              Assessment Overview<span style={{color:C.red}}>.</span>
            </h1>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:4,marginBottom:28,borderBottom:`1px solid ${C.border}`,paddingBottom:0}}>
            {tabs.map(t => (
              <button key={t.key} onClick={()=>{setTab(t.key);setAPage(0);}} style={{
                fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.06em",
                textTransform:"uppercase",padding:"10px 16px",border:"none",
                background:"transparent",cursor:"pointer",
                color:tab===t.key?C.red:C.inkLight,
                borderBottom:tab===t.key?`2px solid ${C.red}`:"2px solid transparent",
                fontWeight:tab===t.key?600:400,transition:"all 0.15s",marginBottom:-1,
              }}>{t.label}</button>
            ))}
          </div>

          {/* ══ OVERVIEW TAB ══════════════════════════════════════ */}
          {tab === "overview" && (
            <>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
                <StatCard label="Total Users" value={stats.totalUsers} />
                <StatCard label="Assessments" value={stats.totalAssessments} />
                <StatCard label="This Week" value={stats.assessmentsThisWeek} />
                <StatCard label="Avg Confirmation" value={stats.avgConfirmation} sub="/5" />
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:32}}>
                <StatCard label="Avg Season" value={stats.avgSeason} sub="/5" />
                <StatCard label="Avg Expertise" value={stats.avgExpertise} sub="/5" />
                <StatCard label="Avg Passion" value={stats.avgPassion} sub="/5" />
                <StatCard label="Avg BS" value={stats.avgBs} sub="/5" />
              </div>

              {/* Line chart: assessments per day */}
              <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"20px 20px 12px",marginBottom:24}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                  textTransform:"uppercase",color:C.inkLight,marginBottom:12}}>Assessments per Day (30 days)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyData}>
                    <XAxis dataKey="date" tick={{fontSize:10,fontFamily:"'DM Mono',monospace",fill:C.inkLight}}
                      tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
                    <YAxis tick={{fontSize:10,fontFamily:"'DM Mono',monospace",fill:C.inkLight}} allowDecimals={false} width={30} />
                    <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8,border:`1px solid ${C.border}`}}
                      labelFormatter={v => new Date(v+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} />
                    <Line type="monotone" dataKey="count" stroke={C.red} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Charts row: season + confidence donuts + top profiles bar */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:24}}>
                {/* Season distribution */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:8}}>Season Distribution</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={seasonData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}
                        paddingAngle={2} label={({name,percent}: {name?:string;percent?:number})=>`${name||""} ${((percent||0)*100).toFixed(0)}%`}
                        style={{fontSize:9,fontFamily:"'DM Mono',monospace"}}>
                        {seasonData.map((entry, i) => (
                          <Cell key={i} fill={seasonColors[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Confidence distribution */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:8}}>Confidence Levels</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={confidenceData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}
                        paddingAngle={2} label={({name,percent}: {name?:string;percent?:number})=>`${name||""} ${((percent||0)*100).toFixed(0)}%`}
                        style={{fontSize:9,fontFamily:"'DM Mono',monospace"}}>
                        {confidenceData.map((entry, i) => (
                          <Cell key={i} fill={confColors[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Top profiles */}
                <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px"}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                    textTransform:"uppercase",color:C.inkLight,marginBottom:8}}>Top 5 Profiles</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={topProfiles} layout="vertical" margin={{left:0,right:8}}>
                      <XAxis type="number" tick={{fontSize:10,fontFamily:"'DM Mono',monospace",fill:C.inkLight}} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{fontSize:9,fontFamily:"'DM Mono',monospace",fill:C.inkMid}} width={90} />
                      <Tooltip contentStyle={{fontFamily:"'DM Sans',sans-serif",fontSize:12,borderRadius:8}} />
                      <Bar dataKey="count" fill={C.sage} radius={[0,4,4,0]} />
                    </BarChart>
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
                }} onClick={e=>{if(e.target===e.currentTarget){setEditingUser(null);setMergeConfirm(false);}}}>
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
                        <button onClick={()=>{setEditingUser(null);setMergeConfirm(false);}} style={{
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
                      <div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.08em",
                          textTransform:"uppercase",color:C.red,marginBottom:8}}>Merge User</div>
                        <p style={{fontSize:12,color:C.inkMid,lineHeight:1.5,marginBottom:8}}>
                          Move all assessments from this user to another user, then delete this account.
                        </p>
                        <input value={mergeEmail} onChange={e=>{setMergeEmail(e.target.value);setMergeConfirm(false);}}
                          placeholder="Target user email..."
                          style={{width:"100%",height:40,border:`1.5px solid ${C.border}`,borderRadius:8,
                            padding:"0 12px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:C.ink,background:C.bg,outline:"none",marginBottom:8}} />
                        {!mergeConfirm ? (
                          <button onClick={()=>{if(mergeEmail.trim())setMergeConfirm(true);}} disabled={!mergeEmail.trim()} style={{
                            width:"100%",height:40,borderRadius:8,border:`1.5px solid ${C.red}`,
                            background:"transparent",fontFamily:"'DM Sans',sans-serif",fontSize:13,
                            fontWeight:600,color:C.red,cursor:mergeEmail.trim()?"pointer":"default",
                            opacity:mergeEmail.trim()?1:0.4,
                          }}>Merge &amp; Delete</button>
                        ) : (
                          <div style={{background:C.redLight,borderRadius:8,padding:12,textAlign:"center"}}>
                            <p style={{fontSize:12,color:C.red,fontWeight:600,marginBottom:8}}>
                              This will permanently merge and delete this user. Are you sure?
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
