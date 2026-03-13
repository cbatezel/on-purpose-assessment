"use client";
import ResultsDisplay from "@/components/results-display";
import Link from "next/link";

const C = {
  bg:"#F0EDE8", inkLight:"#9A9590",
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#F0EDE8;font-family:'DM Sans',system-ui,sans-serif;color:#1C1B19;-webkit-font-smoothing:antialiased}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fadeUp 0.3s ease-out both}
`;

interface Props {
  behavioral: string;
  profile: { name: string; mirrorLine: string; description: string; question: string };
  gap: string | null;
  mismatch: string | null;
  seasonConfidence?: string;
  confidenceNarrative?: string;
  divergenceNarrative?: string | null;
  lifeEventsNarrative?: string | null;
  userName?: string;
  userEmail?: string;
  userGender?: string;
}

export default function ResultsPageClient({
  behavioral, profile, gap, mismatch,
  seasonConfidence, confidenceNarrative, divergenceNarrative, lifeEventsNarrative,
  userName, userEmail, userGender,
}: Props) {
  return (
    <>
      <style>{globalCss}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>
        <div style={{maxWidth:620,margin:"0 auto",padding:"14px 20px 0"}}>
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
        <ResultsDisplay
          behavioral={behavioral}
          profile={profile}
          gap={gap}
          mismatch={mismatch}
          showShare={true}
          showCTAs={false}
          animated={false}
          isAuthenticated={true}
          seasonConfidence={seasonConfidence}
          confidenceNarrative={confidenceNarrative}
          divergenceNarrative={divergenceNarrative}
          lifeEventsNarrative={lifeEventsNarrative}
          userName={userName}
          userEmail={userEmail}
          userGender={userGender}
        />
      </div>
    </>
  );
}
