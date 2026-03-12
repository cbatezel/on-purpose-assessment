"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

interface AssessmentResult {
  id: string;
  created_at: string;
  season: string;
  profile_name: string;
  season_score: number;
  expertise_score: number;
  passion_score: number;
  bs_score: number;
  season_cohort: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Question counts per section (non-BS questions)
const questionCounts = { season: 8, expertise: 8, passion: 7, bs: 2 };

function toAvg(score: number, count: number): string {
  if (!count) return "0.0";
  return (score / count).toFixed(1);
}

function ScoreBar({ label, score, count }: { label: string; score: number; count: number }) {
  const avg = count ? score / count : 0;
  const pct = Math.min(100, (avg / 5) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.06em",
          textTransform: "uppercase", color: C.inkMid }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
          {toAvg(score, count)}/5
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: C.border, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4, width: `${pct}%`,
          background: label === "BS Meter" ? C.red : C.sage,
          transition: "width 0.6s ease-out",
        }} />
      </div>
    </div>
  );
}

function SeasonBadge({ season }: { season: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 10px", borderRadius: 6,
      background: C.sageLight, fontFamily: "'DM Mono',monospace",
      fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
      color: C.sage, fontWeight: 500,
    }}>{season}</span>
  );
}

function ScoreBars({ r }: { r: AssessmentResult }) {
  return (
    <>
      <ScoreBar label="Season" score={r.season_score} count={questionCounts.season} />
      <ScoreBar label="Expertise" score={r.expertise_score} count={questionCounts.expertise} />
      <ScoreBar label="Passion" score={r.passion_score} count={questionCounts.passion} />
      <ScoreBar label="BS Meter" score={r.bs_score} count={questionCounts.bs} />
    </>
  );
}

export default function DashboardClient({ name, results }: { name: string; results: AssessmentResult[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const latest = results[0] || null;
  const history = results.slice(1);

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 72px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", color: C.sage, marginBottom: 8 }}>
              Dashboard
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(24px,5vw,32px)",
              fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
              Welcome, {name}<span style={{ color: C.red }}>.</span>
            </h1>
          </div>
          <button onClick={handleSignOut} style={{
            fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.06em",
            color: C.inkLight, background: "none", border: "none", cursor: "pointer",
            padding: "6px 10px", transition: "color 0.15s", flexShrink: 0, marginTop: 4,
          }}>Sign Out</button>
        </div>

        {/* Empty state */}
        {!latest && (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: C.sageLight,
              margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="9" stroke={C.sage} strokeWidth="1.5" />
                <path d="M11 7v4M11 14h.01" stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22,
              fontWeight: 600, color: C.ink, marginBottom: 8 }}>
              You haven&apos;t taken the assessment yet<span style={{ color: C.red }}>.</span>
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: C.inkMid, marginBottom: 28 }}>
              The On Purpose Assessment surfaces where you are in your season of purpose — and what might be keeping you from the next one.
            </p>
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: "13px 32px", borderRadius: 10, border: "none",
              fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 600,
              background: C.red, color: "white", textDecoration: "none",
              letterSpacing: "0.01em", transition: "background 0.15s",
            }}>Take the Assessment</Link>
          </div>
        )}

        {/* Latest result */}
        {latest && (
          <>
            <div
              onClick={() => router.push(`/results/${latest.id}`)}
              style={{
                background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: "28px 26px", boxShadow: "0 1px 8px rgba(28,27,25,0.05)", marginBottom: 24,
                cursor: "pointer", transition: "box-shadow 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 16px rgba(28,27,25,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 8px rgba(28,27,25,0.05)")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: C.sage }}>Latest Result</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                    {formatDate(latest.created_at)}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke={C.inkLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <SeasonBadge season={latest.season} />
              </div>

              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif",
                fontSize: "clamp(26px,5vw,34px)", fontWeight: 700, color: C.ink,
                lineHeight: 1.15, marginBottom: 4 }}>
                {latest.profile_name}
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: C.red, marginLeft: 4, verticalAlign: "middle", marginBottom: 4 }} />
              </h2>

              {latest.season_cohort && (
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight,
                  marginBottom: 20 }}>
                  Cohort: {latest.season_cohort}
                </p>
              )}

              <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "18px 0 20px" }} />

              <ScoreBars r={latest} />
            </div>

            <div style={{ marginBottom: 32 }}>
              <Link href="/" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "100%", height: 50, borderRadius: 10, border: "none",
                fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 600,
                background: C.red, color: "white", textDecoration: "none",
                letterSpacing: "0.01em", transition: "background 0.15s",
              }}>Take the Assessment Again</Link>
            </div>
          </>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", color: C.sage, marginBottom: 14 }}>
              Past Results
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map(r => {
                const open = expandedId === r.id;
                return (
                  <div key={r.id}
                    style={{
                      background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
                      overflow: "hidden", transition: "box-shadow 0.15s",
                      boxShadow: open ? "0 2px 12px rgba(28,27,25,0.08)" : "none",
                    }}>
                    <button
                      onClick={() => setExpandedId(open ? null : r.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "16px 20px", border: "none", background: "transparent",
                        cursor: "pointer", textAlign: "left",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <SeasonBadge season={r.season} />
                        <span style={{ fontFamily: "'Playfair Display',Georgia,serif",
                          fontSize: 17, fontWeight: 600, color: C.ink }}>
                          {r.profile_name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                          {formatDate(r.created_at)}
                        </span>
                        <svg width="12" height="7" viewBox="0 0 12 7" fill="none"
                          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                          <path d="M1 1l5 5 5-5" stroke={C.inkLight} strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                    {open && (
                      <div style={{ padding: "0 20px 20px" }}>
                        <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "0 0 16px" }} />
                        <ScoreBars r={r} />
                        <div style={{ marginTop: 8 }}>
                          <Link href={`/results/${r.id}`} style={{
                            fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.04em",
                            color: C.red, textDecoration: "none",
                          }}>View full results &rarr;</Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", padding: "40px 0 4px", fontSize: 11,
          fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em",
          textTransform: "uppercase", color: C.inkLight }}>
          Powered by Third Space
        </div>
      </div>
    </div>
  );
}
