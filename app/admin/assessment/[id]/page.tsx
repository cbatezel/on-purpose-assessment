import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

const SEASON_CONFIRMATION_QUESTIONS: Record<string, Record<string, string>> = {
  identity: {
    sc1: "I'm actively clarifying what I believe and what I'm willing to stand behind.",
    sc2: "I'm building consistency between what I say and what I do.",
    sc3: "I've had a conversation recently where I was honest about who I am \u2014 even when it was uncomfortable.",
    sc4: "I'm investing in relationships that challenge me to understand myself better.",
    sc5: "This season has been completely fulfilling in every way.",
  },
  exploration: {
    sc1: "I've said yes to something in the last few months that I didn't feel ready for.",
    sc2: "I'm discovering how I best contribute \u2014 not just what\u2019s available.",
    sc3: "I'm building competency on purpose, not just collecting experiences.",
    sc4: "I've gotten feedback recently that helped me see how I'm different from the people around me.",
    sc5: "I'm perfectly satisfied with where I'm at \u2014 I don't wish for anything different.",
  },
  influence: {
    sc1: "I spend the majority of my time doing the work I'm most effective at.",
    sc2: "I've clarified where I should say no, and I do it consistently.",
    sc3: "I've turned down a good opportunity recently because it didn't fit where I'm headed.",
    sc4: "I'm actively thinking about how to get more done through others.",
    sc5: "It's always easy for me to do what's asked.",
  },
  multiplication: {
    sc1: "I've made time for someone behind me in the last month \u2014 not because I had to, but because I chose to.",
    sc2: "I could name who I'm investing in right now.",
    sc3: "I'm passing on stories and principles, not just instructions.",
    sc4: "I care more about the mission outlasting me than about my role in it.",
    sc5: "I'm completely satisfied with every area of my life.",
  },
};

const EXPERTISE_QUESTIONS: Record<string, string> = {
  e1: "I regularly invest time improving my craft, even when no one is asking me to.",
  e2: "In the last month, someone came to me specifically because of a skill they know I have.",
  e3: "I'm more interested in getting reps than getting recognition right now.",
  e4: "I find more energy in teaching others what I know how to do than in doing it myself.",
  e5: "I deliberately practice the fundamentals of my work, even when I already feel competent.",
  e6: "I've turned down a good opportunity in the last year because it didn't fit where I'm headed.",
  e7_work: "The people I work with would say they know exactly how I contribute.",
  e7_personal: "The people closest to me would say they know exactly how I contribute.",
  e8: "If someone asked what I'm best at, I'd have to think about it.",
  e9: "I'm satisfied with the level of expertise I've developed and don't feel much need to keep growing.",
};

const PASSION_QUESTIONS: Record<string, string> = {
  p1: "There's a specific person or group I've shown up for repeatedly \u2014 not because I had to, but because I chose to.",
  p2: "I notice problems in the world that bother me more than they seem to bother others.",
  p3: "I've recently given time, money, or energy to something that didn't benefit me directly.",
  p4_work: "My passion and my professional work feel meaningfully connected.",
  p4_personal: "My passion and my personal life feel meaningfully connected.",
  p5: "I've walked away from something I cared about because it wasn't the thing I cared about most.",
  p6: "I get more energy from investing in someone else's growth than advancing my own work.",
  p7: "I haven't yet found the thing I'd sacrifice comfort for.",
  p8: "The cause or people I care about would say I show up for them consistently and without reservation.",
};

const INVERSE_KEYS = new Set(["e8", "p7"]);
const BS_KEYS = new Set(["sc5", "e9", "p8"]);

function ScoreBar({ score, label }: { score: number; label?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: n <= score ? C.red : C.border,
            display: "inline-block",
          }}
        />
      ))}
      <span style={{
        fontFamily: "'DM Mono',monospace",
        fontSize: 12,
        color: C.inkMid,
        marginLeft: 4,
      }}>{score}/5</span>
      {label && (
        <span style={{
          fontFamily: "'DM Mono',monospace",
          fontSize: 10,
          color: C.inkLight,
          marginLeft: 4,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>{label}</span>
      )}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "24px 28px",
      marginBottom: 20,
    }}>
      <h3 style={{
        fontFamily: "'Playfair Display',serif",
        fontSize: 18,
        fontWeight: 600,
        color: C.ink,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${C.border}`,
      }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{
        fontFamily: "'DM Mono',monospace",
        fontSize: 11,
        color: C.inkLight,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}>{label}</span>
      <span style={{
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 14,
        color: C.ink,
        fontWeight: 500,
      }}>{value}</span>
    </div>
  );
}

function AnswerRow({ questionKey, questionText, score, tag }: {
  questionKey: string;
  questionText: string;
  score: number;
  tag?: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
      padding: "10px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{
        fontFamily: "'DM Mono',monospace",
        fontSize: 11,
        color: C.inkLight,
        minWidth: 70,
        paddingTop: 2,
        textTransform: "uppercase",
      }}>{questionKey}</span>
      <span style={{
        flex: 1,
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 13,
        color: C.inkMid,
        lineHeight: "1.5",
      }}>
        {questionText}
        {tag && (
          <span style={{
            display: "inline-block",
            marginLeft: 8,
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 9,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 500,
            background: tag === "BS" ? C.redLight : "#FFF3E0",
            color: tag === "BS" ? C.red : "#E65100",
          }}>{tag}</span>
        )}
      </span>
      <ScoreBar score={score} />
    </div>
  );
}

function SeasonBadge({ season }: { season: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 8px", borderRadius: 5,
      background: C.sageLight, fontFamily: "'DM Mono',monospace",
      fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
      color: C.sage, fontWeight: 500,
    }}>{season}</span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return <span style={{ color: C.inkLight }}>--</span>;
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
      fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
      color: c.text, fontWeight: 500,
    }}>{confidence}</span>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Fetch the full assessment result
  const { data: assessment, error } = await adminClient
    .from("assessment_results")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !assessment) {
    notFound();
  }

  // Get user info
  let userName = "";
  let userEmail = "";
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  if (authUsers?.users) {
    const authUser = authUsers.users.find(u => u.id === assessment.user_id);
    if (authUser) {
      userName = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "";
      userEmail = authUser.email || "";
    }
  }

  const seasonAnswers: Record<string, number> = assessment.season_answers || {};
  const expertiseAnswers: Record<string, number> = assessment.expertise_answers || {};
  const passionAnswers: Record<string, number> = assessment.passion_answers || {};
  const season = (assessment.season || "").toLowerCase();
  const seasonQuestions = SEASON_CONFIRMATION_QUESTIONS[season] || {};
  const lifeEvents: string[] = assessment.life_events || [];
  const feelingWords: string[] = assessment.feeling_words || [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg};font-family:'DM Sans',system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
      ` }} />

      <div style={{
        minHeight: "100vh",
        background: C.bg,
        padding: "40px 20px 80px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* Back button */}
          <Link href="/admin" style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(178,34,52,0.09)",
            border: "none",
            textDecoration: "none",
            color: "#B22234",
            transition: "background 0.15s",
            marginBottom: 28,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 32,
              fontWeight: 700,
              color: C.ink,
              lineHeight: 1.2,
              marginBottom: 4,
            }}>Assessment Detail</h1>
            <p style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 16,
              color: C.inkMid,
            }}>{userName || "Unknown User"}</p>
          </div>

          {/* User Info */}
          <SectionCard title="User Information">
            <InfoRow label="Name" value={userName || "--"} />
            <InfoRow label="Email" value={userEmail || "--"} />
            <InfoRow label="Birth Year" value={assessment.birth_year || "--"} />
            <InfoRow label="Gender" value={assessment.gender || "--"} />
            <InfoRow label="User ID" value={
              <Link href="/admin" style={{
                color: C.red,
                fontFamily: "'DM Mono',monospace",
                fontSize: 12,
                textDecoration: "none",
              }}>{assessment.user_id}</Link>
            } />
          </SectionCard>

          {/* Beta Feedback — prominent placement */}
          {(assessment.feedback_accuracy || assessment.feedback_new_insight !== null || assessment.feedback_open_text) ? (
            <div style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "24px 28px", marginBottom: 20,
              borderLeft: `4px solid ${C.sage}`,
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 600,
                color: C.ink, marginBottom: 16, paddingBottom: 12,
                borderBottom: `1px solid ${C.border}`,
              }}>Feedback</h3>

              <div style={{ display: "flex", gap: 24, marginBottom: assessment.feedback_open_text ? 16 : 0 }}>
                {assessment.feedback_accuracy && (
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: C.inkLight,
                      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Accuracy</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: C.ink }}>
                        {assessment.feedback_accuracy}
                      </span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: C.inkLight }}>/5</span>
                      <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                            background: n <= assessment.feedback_accuracy ? C.sage : C.border }} />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                {assessment.feedback_new_insight !== null && assessment.feedback_new_insight !== undefined && (
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: C.inkLight,
                      textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>New Insight</div>
                    <span style={{
                      display: "inline-block", padding: "4px 12px", borderRadius: 6,
                      background: assessment.feedback_new_insight ? C.sageLight : C.redLight,
                      fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600,
                      color: assessment.feedback_new_insight ? C.sage : C.red,
                    }}>{assessment.feedback_new_insight ? "Yes" : "No"}</span>
                  </div>
                )}
              </div>

              {assessment.feedback_open_text && (
                <div style={{
                  background: C.bg, borderRadius: 10, padding: "16px 20px", marginTop: 4,
                  borderLeft: `3px solid ${C.sage}`,
                }}>
                  <p style={{
                    fontFamily: "'Playfair Display',serif", fontStyle: "italic",
                    fontSize: 16, lineHeight: 1.6, color: C.inkMid, margin: 0,
                  }}>&ldquo;{assessment.feedback_open_text}&rdquo;</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "16px 28px", marginBottom: 20, opacity: 0.6,
            }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.inkLight,
                textTransform: "uppercase", letterSpacing: "0.06em" }}>No feedback submitted</span>
            </div>
          )}

          {/* Season Determination */}
          <SectionCard title="Season Determination">
            <InfoRow label="Presumed Season (from age)" value={
              <SeasonBadge season={assessment.season_presumed || assessment.season || "--"} />
            } />
            <InfoRow label="Self-Selected Season" value={
              assessment.season_self_select
                ? <SeasonBadge season={assessment.season_self_select} />
                : "--"
            } />
            <InfoRow label="Final Season" value={
              <SeasonBadge season={assessment.season || "--"} />
            } />
            <InfoRow label="Confidence Level" value={
              <ConfidenceBadge confidence={assessment.season_confidence} />
            } />
            <InfoRow label="Confirmation Score" value={
              <span style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 13,
              }}>{assessment.season_confirmation_score != null ? `${Number(assessment.season_confirmation_score).toFixed(1)}/5` : "--"}</span>
            } />
          </SectionCard>

          {/* Season Confirmation Answers */}
          <SectionCard title={`Season Confirmation \u2014 ${assessment.season || "Unknown"}`}>
            {Object.keys(seasonQuestions).length > 0 ? (
              Object.entries(seasonQuestions).map(([key, text]) => (
                <AnswerRow
                  key={key}
                  questionKey={key}
                  questionText={text}
                  score={seasonAnswers[key] ?? 0}
                  tag={BS_KEYS.has(key) ? "BS" : undefined}
                />
              ))
            ) : (
              <p style={{ color: C.inkLight, fontSize: 13 }}>No season confirmation data available.</p>
            )}
          </SectionCard>

          {/* Expertise Answers */}
          <SectionCard title="Expertise">
            {Object.entries(EXPERTISE_QUESTIONS).map(([key, text]) => (
              <AnswerRow
                key={key}
                questionKey={key}
                questionText={text}
                score={expertiseAnswers[key] ?? 0}
                tag={BS_KEYS.has(key) ? "BS" : INVERSE_KEYS.has(key) ? "INV" : undefined}
              />
            ))}
          </SectionCard>

          {/* Passion Answers */}
          <SectionCard title="Passion">
            {Object.entries(PASSION_QUESTIONS).map(([key, text]) => (
              <AnswerRow
                key={key}
                questionKey={key}
                questionText={text}
                score={passionAnswers[key] ?? 0}
                tag={BS_KEYS.has(key) ? "BS" : INVERSE_KEYS.has(key) ? "INV" : undefined}
              />
            ))}
          </SectionCard>

          {/* Computed Scores */}
          <SectionCard title="Computed Scores">
            <InfoRow label="Season Score (avg of 4)" value={
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 600 }}>
                {assessment.season_score != null ? `${(assessment.season_score / 4).toFixed(1)}/5` : "--"}
              </span>
            } />
            <InfoRow label="Expertise Score (avg of 8)" value={
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 600 }}>
                {assessment.expertise_score != null ? `${(assessment.expertise_score / 8).toFixed(1)}/5` : "--"}
              </span>
            } />
            <InfoRow label="Passion Score (avg of 7)" value={
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 600 }}>
                {assessment.passion_score != null ? `${(assessment.passion_score / 7).toFixed(1)}/5` : "--"}
              </span>
            } />
            <InfoRow label="BS Score (avg of 2)" value={
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 600, color: C.red }}>
                {assessment.bs_score != null ? `${(assessment.bs_score / 2).toFixed(1)}/5` : "--"}
              </span>
            } />
          </SectionCard>

          {/* Result */}
          <SectionCard title="Result">
            <InfoRow label="Season" value={<SeasonBadge season={assessment.season || "--"} />} />
            <InfoRow label="Profile Name" value={assessment.profile_name || "--"} />
            <InfoRow label="Season Cohort" value={assessment.season_cohort || "--"} />
          </SectionCard>

          {/* Life Events */}
          <SectionCard title="Life Events">
            {lifeEvents.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {lifeEvents.map((event, i) => (
                  <span key={i} style={{
                    display: "inline-block",
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: C.sageLight,
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 13,
                    color: C.sage,
                  }}>{event}</span>
                ))}
              </div>
            ) : (
              <p style={{ color: C.inkLight, fontSize: 13 }}>None recorded.</p>
            )}
          </SectionCard>

          {/* Feeling Words */}
          <SectionCard title="Feeling Words">
            {feelingWords.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {feelingWords.map((word, i) => (
                  <span key={i} style={{
                    display: "inline-block",
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: C.redLight,
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 13,
                    color: C.red,
                  }}>{word}</span>
                ))}
              </div>
            ) : (
              <p style={{ color: C.inkLight, fontSize: 13 }}>None recorded.</p>
            )}
          </SectionCard>

          {/* Submission Timestamp */}
          <div style={{
            textAlign: "center",
            marginTop: 32,
            color: C.inkLight,
            fontFamily: "'DM Mono',monospace",
            fontSize: 12,
            letterSpacing: "0.03em",
          }}>
            Submitted {assessment.created_at ? formatDateTime(assessment.created_at) : "--"}
          </div>

        </div>
      </div>
    </>
  );
}
