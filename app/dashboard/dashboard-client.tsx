"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lookupProfile } from "@/lib/assessment-data";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

const seasonAccent: Record<string, string> = {
  Identity: "#C4956A", Exploration: "#6B8F71", Influence: "#8B2635", Multiplication: "#2D3A5E",
};

const seasonDescriptions: Record<string, string> = {
  Identity:       "Building the foundation — clarifying who you are, what you believe, and how you connect with others.",
  Exploration:    "Getting reps — trying things widely, taking on responsibility, learning what fits and what doesn't.",
  Influence:      "Going deep — focused, in your lane, using your expertise and passion to make a specific difference.",
  Multiplication: "Passing it on — investing in others, giving away what you've built, multiplying your impact through people.",
};

interface AssessmentResult {
  id: string; created_at: string; season: string; profile_name: string;
  season_cohort: string | null;
}

interface LatestFeedback {
  feedback_accuracy: number | null;
  feedback_new_insight: boolean | null;
  feedback_open_text: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardClient({ name, results, isAdmin = false, latestFeedback }: { name: string; results: AssessmentResult[]; isAdmin?: boolean; latestFeedback?: LatestFeedback | null }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const latest = results[0] || null;
  const history = results.slice(1);
  const accent = latest ? (seasonAccent[latest.season] || C.sage) : C.sage;

  const hasFeedback = !!(latestFeedback?.feedback_accuracy || latestFeedback?.feedback_new_insight !== null && latestFeedback?.feedback_new_insight !== undefined || latestFeedback?.feedback_open_text);
  const [fbEditing, setFbEditing] = useState(!hasFeedback);
  const [fbAccuracy, setFbAccuracy] = useState<number | null>(latestFeedback?.feedback_accuracy ?? null);
  const [fbInsight, setFbInsight] = useState<boolean | null>(latestFeedback?.feedback_new_insight ?? null);
  const [fbText, setFbText] = useState(latestFeedback?.feedback_open_text || "");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSubmitted, setFbSubmitted] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 72px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 4 }}>
            {isAdmin && (
              <Link href="/admin" style={{
                fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.06em",
                color: C.red, textDecoration: "none", padding: "6px 10px",
                transition: "color 0.15s",
              }}>Admin</Link>
            )}
            <button onClick={handleSignOut} style={{
              fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.06em",
              color: C.inkLight, background: "none", border: "none", cursor: "pointer",
              padding: "6px 10px", transition: "color 0.15s",
            }}>Sign Out</button>
          </div>
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

        {/* Season Hero Card */}
        {latest && (
          <>
            <div style={{
              background: accent + "12", border: `1px solid ${accent}30`,
              borderRadius: 16, padding: "24px 26px", marginBottom: 20,
              borderLeft: `4px solid ${accent}`,
            }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.1em",
                textTransform: "uppercase", color: accent, marginBottom: 8, fontWeight: 500 }}>
                Your Season
              </div>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif",
                fontSize: "clamp(28px,6vw,36px)", fontWeight: 700, color: C.ink,
                lineHeight: 1.15, marginBottom: 8 }}>
                {latest.season}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: C.inkMid, margin: 0 }}>
                {seasonDescriptions[latest.season] || ""}
              </p>
            </div>

            {/* Latest result card */}
            <div
              onClick={() => router.push(`/results/${latest.id}`)}
              style={{
                background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: "28px 26px", boxShadow: "0 1px 8px rgba(28,27,25,0.05)", marginBottom: 20,
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

              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif",
                fontSize: "clamp(26px,5vw,34px)", fontWeight: 700, color: C.ink,
                lineHeight: 1.15, marginBottom: 4 }}>
                {latest.profile_name}
              </h2>

              {latest.season_cohort && (
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight,
                  marginBottom: 12 }}>
                  Cohort: {latest.season_cohort}
                </p>
              )}

              <p style={{ fontFamily: "'Playfair Display',Georgia,serif",
                fontSize: 15, fontStyle: "italic", color: C.inkMid, lineHeight: 1.55,
                marginTop: 12 }}>
                &ldquo;{lookupProfile(latest.season, latest.profile_name).mirrorLine}&rdquo;
              </p>
            </div>

            <div style={{ marginBottom: 32 }}>
              <Link href="/?retake=true" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "100%", height: 50, borderRadius: 10, border: "none",
                fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 600,
                background: C.red, color: "white", textDecoration: "none",
                letterSpacing: "0.01em", transition: "background 0.15s",
              }}>Take the Assessment Again</Link>
            </div>

            {/* ── Beta Feedback ── */}
            <div style={{
              marginBottom: 32, paddingTop: 32, paddingLeft: 24, marginLeft: -4,
              borderLeft: `3px solid ${accent}`,
            }}>
              {(hasFeedback && !fbEditing && !fbSubmitted) ? (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif",
                    fontSize: "clamp(20px,4vw,26px)", fontWeight: 600, color: C.ink,
                    lineHeight: 1.2, marginBottom: 6 }}>
                    Thank you<span style={{ color: C.red }}>.</span>
                  </h2>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: C.inkLight, marginBottom: 20 }}>
                    Your feedback helps us make this better for everyone who comes next.
                  </p>
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: "18px 22px", marginBottom: 16 }}>
                    {latestFeedback?.feedback_accuracy && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight,
                          textTransform: "uppercase", letterSpacing: "0.06em" }}>Accuracy</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {[1,2,3,4,5].map(n => (
                            <span key={n} style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                              background: n <= (latestFeedback?.feedback_accuracy || 0) ? accent : C.border }} />
                          ))}
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: C.inkMid, marginLeft: 4 }}>
                            {latestFeedback.feedback_accuracy}/5
                          </span>
                        </span>
                      </div>
                    )}
                    {latestFeedback?.feedback_new_insight !== null && latestFeedback?.feedback_new_insight !== undefined && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 0", borderBottom: latestFeedback?.feedback_open_text ? `1px solid ${C.border}` : "none" }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight,
                          textTransform: "uppercase", letterSpacing: "0.06em" }}>New Insight</span>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 5,
                          background: latestFeedback.feedback_new_insight ? C.sageLight : C.redLight,
                          fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.06em",
                          textTransform: "uppercase", color: latestFeedback.feedback_new_insight ? C.sage : C.red,
                          fontWeight: 500 }}>
                          {latestFeedback.feedback_new_insight ? "Yes" : "No"}
                        </span>
                      </div>
                    )}
                    {latestFeedback?.feedback_open_text && (
                      <div style={{ paddingTop: 10 }}>
                        <p style={{ fontFamily: "'Playfair Display',Georgia,serif", fontStyle: "italic",
                          fontSize: 14, lineHeight: 1.5, color: C.inkMid }}>
                          &ldquo;{latestFeedback.feedback_open_text}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setFbEditing(true); setFbSubmitted(false); }} style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.06em",
                    color: C.inkLight, background: "none", border: "none", cursor: "pointer",
                    padding: 0, transition: "color 0.15s",
                  }}>Update Feedback</button>
                </>
              ) : fbSubmitted ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 0" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="8" stroke={accent} strokeWidth="1.5" fill="none"/>
                    <path d="M5.5 9l2.5 2.5 4.5-5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: C.inkMid }}>
                    Thanks for your feedback.
                  </span>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif",
                    fontSize: "clamp(20px,4vw,26px)", fontWeight: 600, color: C.ink,
                    lineHeight: 1.2, marginBottom: 6 }}>
                    We want your feedback<span style={{ color: C.red }}>.</span>
                  </h2>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: C.inkLight, marginBottom: 24 }}>
                    This assessment is new, and your perspective matters. We&apos;d love to hear what you think.
                  </p>

                  {/* Q1: Accuracy */}
                  <div style={{ marginBottom: 22 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: C.ink, marginBottom: 10 }}>
                      How accurately did this describe where you are right now?
                    </p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setFbAccuracy(n)} style={{
                          width: 42, height: 42, borderRadius: 10,
                          border: `1.5px solid ${fbAccuracy === n ? accent : C.border}`,
                          background: fbAccuracy === n ? accent : C.white,
                          color: fbAccuracy === n ? "white" : C.inkMid,
                          fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 600,
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{n}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, paddingRight: 2 }}>
                      <span style={{ fontSize: 11, color: C.inkLight, fontFamily: "'DM Mono',monospace" }}>Not at all</span>
                      <span style={{ fontSize: 11, color: C.inkLight, fontFamily: "'DM Mono',monospace" }}>Spot on</span>
                    </div>
                  </div>

                  {/* Q2: New insight */}
                  <div style={{ marginBottom: 22 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: C.ink, marginBottom: 10 }}>
                      Do you know something now that you didn&apos;t before?
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {([true, false] as const).map(val => (
                        <button key={String(val)} onClick={() => setFbInsight(val)} style={{
                          padding: "9px 24px", borderRadius: 10,
                          border: `1.5px solid ${fbInsight === val ? accent : C.border}`,
                          background: fbInsight === val ? accent : C.white,
                          color: fbInsight === val ? "white" : C.inkMid,
                          fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500,
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{val ? "Yes" : "No"}</button>
                      ))}
                    </div>
                  </div>

                  {/* Q3: Open text */}
                  <div style={{ marginBottom: 22 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: C.ink, marginBottom: 10 }}>
                      What would you want us to know?
                    </p>
                    <textarea value={fbText} onChange={e => setFbText(e.target.value)}
                      placeholder="Optional — anything at all"
                      rows={3}
                      style={{
                        width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10,
                        padding: "11px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 14,
                        color: C.ink, background: C.white, outline: "none", resize: "vertical",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={e => e.target.style.borderColor = accent}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>

                  {/* Submit */}
                  <button disabled={fbSubmitting || (fbAccuracy === null && fbInsight === null && !fbText.trim())}
                    onClick={async () => {
                      setFbSubmitting(true);
                      try {
                        await fetch("/api/assessment/feedback", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            assessment_id: latest.id,
                            feedback_accuracy: fbAccuracy,
                            feedback_new_insight: fbInsight,
                            feedback_open_text: fbText.trim() || null,
                          }),
                        });
                      } catch {}
                      setFbSubmitted(true);
                      setFbSubmitting(false);
                    }}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      padding: "11px 28px", borderRadius: 10, border: "none",
                      background: (fbAccuracy === null && fbInsight === null && !fbText.trim()) ? C.border : accent,
                      fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600,
                      color: "white", cursor: (fbAccuracy === null && fbInsight === null && !fbText.trim()) ? "default" : "pointer",
                      opacity: fbSubmitting ? 0.6 : 1, transition: "background 0.15s, opacity 0.15s",
                    }}
                  >{fbSubmitting ? "Sending..." : "Submit Feedback"}</button>
                </>
              )}
            </div>
          </>
        )}

        {/* Your Journey — timeline when multiple results */}
        {history.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", color: C.sage, marginBottom: 16 }}>
              Your Journey
            </div>

            {/* Timeline */}
            <div style={{ position: "relative", paddingLeft: 28 }}>
              {/* Vertical line */}
              <div style={{
                position: "absolute", left: 9, top: 4, bottom: 4, width: 2,
                background: `linear-gradient(to bottom, ${accent}, ${C.border})`,
                borderRadius: 1,
              }} />

              {results.map((r, i) => {
                const rAccent = seasonAccent[r.season] || C.sage;
                return (
                  <div key={r.id} style={{ position: "relative", marginBottom: i < results.length - 1 ? 20 : 0 }}>
                    {/* Dot */}
                    <div style={{
                      position: "absolute", left: -22, top: 3,
                      width: 12, height: 12, borderRadius: "50%",
                      background: i === 0 ? rAccent : C.white,
                      border: `2px solid ${rAccent}`,
                    }} />
                    <div
                      onClick={() => router.push(`/results/${r.id}`)}
                      style={{
                        background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
                        padding: "14px 18px", cursor: "pointer", transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(28,27,25,0.08)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{
                            display: "inline-block", padding: "3px 8px", borderRadius: 5,
                            background: rAccent + "18", fontFamily: "'DM Mono',monospace",
                            fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase",
                            color: rAccent, fontWeight: 500,
                          }}>{r.season}</span>
                          <span style={{ fontFamily: "'Playfair Display',Georgia,serif",
                            fontSize: 16, fontWeight: 600, color: C.ink }}>
                            {r.profile_name}
                          </span>
                        </div>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight }}>
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                      <p style={{ fontFamily: "'Playfair Display',Georgia,serif",
                        fontSize: 12, fontStyle: "italic", color: C.inkLight, lineHeight: 1.5,
                        marginTop: 6, overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                        &ldquo;{lookupProfile(r.season, r.profile_name).mirrorLine}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Results (if only one past result, show simpler) */}
        {history.length === 0 && latest && null}

        <div style={{ textAlign: "center", padding: "40px 0 4px", fontSize: 11,
          fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em",
          textTransform: "uppercase", color: C.inkLight }}>
          <a href="https://thirdspacepublishing.com" target="_blank" rel="noopener noreferrer"
            style={{ color: C.inkLight, textDecoration: "none", transition: "color 0.2s" }}>
            Powered by Third Space
          </a>
        </div>
      </div>
    </div>
  );
}
