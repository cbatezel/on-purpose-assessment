"use client";
import { useState } from "react";
import Link from "next/link";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

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
  mostCommonSeason: string;
  mostCommonProfile: string;
}

interface UserRow {
  userId: string;
  name: string;
  email: string;
  count: number;
  latestSeason: string;
  latestProfile: string;
  latestDate: string;
}

interface CohortInterest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string | null;
  season: string | null;
  profile_name: string | null;
  user_id: string | null;
}

interface RecentAssessment {
  id: string;
  created_at: string;
  user_id: string;
  season: string;
  profile_name: string;
  season_confidence: string | null;
  season_score: number;
  expertise_score: number;
  passion_score: number;
  bs_score: number;
  email: string;
  name: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  }) + " " + d.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}

function SeasonBadge({ season }: { season: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 8px", borderRadius: 5,
      background: C.sageLight, fontFamily: "'DM Mono',monospace",
      fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
      color: C.sage, fontWeight: 500,
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
      display: "inline-block", padding: "3px 8px", borderRadius: 5,
      background: c.bg, fontFamily: "'DM Mono',monospace",
      fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
      color: c.text, fontWeight: 500,
    }}>{confidence}</span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "18px 20px", flex: 1, minWidth: 140,
    }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.08em",
        textTransform: "uppercase", color: C.inkLight, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 28,
        fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function AdminClient({
  stats, users, recentAssessments, cohortInterest,
}: {
  stats: Stats;
  users: UserRow[];
  recentAssessments: RecentAssessment[];
  cohortInterest: CohortInterest[];
}) {
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const filteredUsers = search.trim()
    ? users.filter(u => {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      })
    : users;

  return (
    <>
      <style>{globalCss}</style>
      <div style={{ minHeight: "100vh", background: C.bg }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 72px" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.12em",
                textTransform: "uppercase", color: C.sage, marginBottom: 8 }}>
                Admin
              </div>
              <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(24px,5vw,32px)",
                fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
                Assessment Overview<span style={{ color: C.red }}>.</span>
              </h1>
            </div>
            <Link href="/dashboard" style={{
              fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.06em",
              color: C.inkLight, textDecoration: "none", padding: "6px 10px",
              transition: "color 0.15s", flexShrink: 0, marginTop: 4,
            }}>← Dashboard</Link>
          </div>

          {/* ── Stats Overview ─────────────────────────────────── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Assessments" value={stats.totalAssessments} />
            <StatCard label="This Week" value={stats.assessmentsThisWeek} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <StatCard label="Avg Season" value={stats.avgSeason} />
            <StatCard label="Avg Expertise" value={stats.avgExpertise} />
            <StatCard label="Avg Passion" value={stats.avgPassion} />
            <StatCard label="Avg BS" value={stats.avgBs} />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <StatCard label="Most Common Season" value={stats.mostCommonSeason} />
            <StatCard label="Most Common Profile" value={stats.mostCommonProfile} />
          </div>

          {/* ── User List ──────────────────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", color: C.sage, marginBottom: 14 }}>
              Users
            </div>

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: "100%", height: 44, border: `1.5px solid ${search ? C.ink : C.border}`,
                borderRadius: 10, padding: "0 14px", fontFamily: "'DM Sans',sans-serif",
                fontSize: 14, color: C.ink, background: C.white, outline: "none",
                marginBottom: 14, transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = C.red}
              onBlur={e => e.target.style.borderColor = search ? C.ink : C.border}
            />

            {filteredUsers.length === 0 && (
              <p style={{ fontSize: 14, color: C.inkLight, textAlign: "center", padding: "20px 0" }}>
                {search ? "No users match your search." : "No users yet."}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredUsers.map(u => {
                const open = expandedUser === u.userId;
                return (
                  <div key={u.userId} style={{
                    background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
                    overflow: "hidden", transition: "box-shadow 0.15s",
                    boxShadow: open ? "0 2px 12px rgba(28,27,25,0.08)" : "none",
                  }}>
                    <button
                      onClick={() => setExpandedUser(open ? null : u.userId)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "14px 18px", border: "none", background: "transparent",
                        cursor: "pointer", textAlign: "left", gap: 12,
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14,
                            fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap" }}>
                            {u.name || "—"}
                          </span>
                          <SeasonBadge season={u.latestSeason} />
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.email}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                          {u.count} assessment{u.count !== 1 ? "s" : ""}
                        </span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                          {formatDate(u.latestDate)}
                        </span>
                        <svg width="12" height="7" viewBox="0 0 12 7" fill="none"
                          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                          <path d="M1 1l5 5 5-5" stroke={C.inkLight} strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                    {open && (
                      <div style={{ padding: "0 18px 16px" }}>
                        <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "0 0 12px" }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                          <div>
                            <span style={{ color: C.inkLight }}>Latest profile: </span>
                            <span style={{ color: C.ink, fontWeight: 500 }}>{u.latestProfile}</span>
                          </div>
                          <div>
                            <span style={{ color: C.inkLight }}>Season: </span>
                            <span style={{ color: C.ink, fontWeight: 500 }}>{u.latestSeason}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recent Assessments Feed ────────────────────────── */}
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", color: C.sage, marginBottom: 14 }}>
              Recent Assessments
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentAssessments.map(a => (
                <Link key={a.id} href={`/results/${a.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: "14px 18px", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 12, cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(28,27,25,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14,
                          fontWeight: 600, color: C.ink }}>
                          {a.name || "—"}
                        </span>
                        <SeasonBadge season={a.season} />
                        <ConfidenceBadge confidence={a.season_confidence} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                          {a.email}
                        </span>
                        <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 14,
                          fontWeight: 600, color: C.ink }}>
                          {a.profile_name}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: C.inkLight, marginBottom: 2 }}>
                          S:{a.season_score} E:{a.expertise_score} P:{a.passion_score}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                          {formatDateTime(a.created_at)}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M5 3l4 4-4 4" stroke={C.inkLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Cohort Interest ──────────────────────────────────── */}
          <div style={{ marginTop: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.1em",
                textTransform: "uppercase", color: C.sage }}>
                Cohort Interest
              </div>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                ({cohortInterest.length})
              </span>
            </div>

            {cohortInterest.length === 0 ? (
              <p style={{ fontSize: 14, color: C.inkLight, textAlign: "center", padding: "20px 0" }}>
                No cohort interest submissions yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cohortInterest.map(ci => (
                  <div key={ci.id} style={{
                    background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: "14px 18px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
                      <div>
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14,
                          fontWeight: 600, color: C.ink }}>{ci.name}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11,
                          color: C.inkLight, marginLeft: 10 }}>{ci.email}</span>
                      </div>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11,
                        color: C.inkLight, flexShrink: 0 }}>
                        {formatDateTime(ci.created_at)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: ci.message ? 8 : 0 }}>
                      {ci.season && <SeasonBadge season={ci.season} />}
                      {ci.profile_name && (
                        <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 13,
                          fontWeight: 600, color: C.ink }}>{ci.profile_name}</span>
                      )}
                    </div>
                    {ci.message && (
                      <p style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.5, margin: 0,
                        fontStyle: "italic" }}>
                        &ldquo;{ci.message}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", padding: "40px 0 4px", fontSize: 11,
            fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em",
            textTransform: "uppercase", color: C.inkLight }}>
            Powered by Third Space
          </div>
        </div>
      </div>
    </>
  );
}
