"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { seasonDescriptions } from "@/lib/assessment-data";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

const seasonAccent: Record<string, string> = {
  Identity: "#C4956A",
  Exploration: "#6B8F71",
  Influence: "#8B2635",
  Multiplication: "#2D3A5E",
};

export interface ResultsDisplayProps {
  behavioral: string;
  profile: { name: string; mirrorLine: string; description: string; question: string };
  gap: string | null;
  mismatch: string | null;
  email?: string;
  userName?: string;
  userEmail?: string;
  userGender?: string;
  showShare?: boolean;
  showStartOver?: boolean;
  onStartOver?: () => void;
  animated?: boolean;
  isAuthenticated?: boolean;
  saveFailed?: boolean;
  seasonConfidence?: string;
  confidenceNarrative?: string;
  divergenceNarrative?: string | null;
  lifeEventsNarrative?: string | null;
}

function Divider() {
  return <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"28px 0"}}/>;
}

// Staged reveal: returns inline style for opacity/transform transition
function revealStyle(stage: number, threshold: number, animated: boolean): React.CSSProperties {
  if (!animated) return {};
  return {
    opacity: stage >= threshold ? 1 : 0,
    transform: stage >= threshold ? "translateY(0)" : "translateY(14px)",
    transition: "opacity 0.55s ease-out, transform 0.55s ease-out",
  };
}

// Hover-enabled CTA button
function CtaButton({children,href,onClick}: {children: React.ReactNode; href?: string; onClick?: () => void}) {
  const style: React.CSSProperties = {
    display:"flex",alignItems:"center",justifyContent:"center",
    width:"100%",height:42,borderRadius:9,
    border:`1.5px solid ${C.red}`,background:"transparent",
    fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,
    color:C.red,cursor:"pointer",textDecoration:"none",
    transition:"transform 0.2s, background 0.2s, color 0.2s",
  };
  const enter = (e: React.MouseEvent) => {
    const t = e.currentTarget as HTMLElement;
    t.style.transform="scale(1.02)"; t.style.background=C.red; t.style.color="white";
  };
  const leave = (e: React.MouseEvent) => {
    const t = e.currentTarget as HTMLElement;
    t.style.transform="scale(1)"; t.style.background="transparent"; t.style.color=C.red;
  };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={enter} onMouseLeave={leave}>{children}</a>;
  return <button onClick={onClick} style={style} onMouseEnter={enter} onMouseLeave={leave}>{children}</button>;
}

// Share pill button with hover
function SharePill({children,onClick}: {children: React.ReactNode; onClick: () => void}) {
  return (
    <button onClick={onClick} style={{
      display:"inline-flex",alignItems:"center",gap:6,
      padding:"9px 15px",border:`1.5px solid ${C.border}`,
      borderRadius:100,fontFamily:"'DM Sans',sans-serif",
      fontSize:13,fontWeight:500,color:C.ink,
      cursor:"pointer",background:C.white,
      transition:"all 0.2s",
    }}
      onMouseEnter={e=>{e.currentTarget.style.background=C.sageLight;e.currentTarget.style.borderColor=C.sage;}}
      onMouseLeave={e=>{e.currentTarget.style.background=C.white;e.currentTarget.style.borderColor=C.border;}}
    >{children}</button>
  );
}

// Card download button with hover
function CardBtn({children,onClick}: {children: React.ReactNode; onClick: () => void}) {
  return (
    <button onClick={onClick} style={{
      display:"inline-flex",alignItems:"center",gap:6,
      padding:"10px 18px",border:`1.5px solid ${C.border}`,
      borderRadius:8,fontFamily:"'DM Sans',sans-serif",
      fontSize:13,fontWeight:500,color:C.ink,
      cursor:"pointer",background:C.white,transition:"all 0.2s",
    }}
      onMouseEnter={e=>{e.currentTarget.style.background=C.sageLight;e.currentTarget.style.borderColor=C.sage;}}
      onMouseLeave={e=>{e.currentTarget.style.background=C.white;e.currentTarget.style.borderColor=C.border;}}
    >{children}</button>
  );
}

export default function ResultsDisplay({
  behavioral, profile, gap, mismatch,
  userName, userEmail, userGender,
  showShare = false, showStartOver = false, onStartOver, animated = true,
  isAuthenticated = false, saveFailed = false,
  seasonConfidence, confidenceNarrative, divergenceNarrative, lifeEventsNarrative,
}: ResultsDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [cohortForm, setCohortForm] = useState({ name: userName || "", email: userEmail || "", message: "" });
  const [cohortSubmitting, setCohortSubmitting] = useState(false);
  const [cohortSubmitted, setCohortSubmitted] = useState(false);

  // Staged reveal: 0=hidden, 1=season, 2=profile name, 3=mirror line, 4=description, 5=question, 6=CTAs+share
  const [stage, setStage] = useState(animated ? 0 : 6);

  useEffect(() => {
    if (!animated) return;
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 800),
      setTimeout(() => setStage(3), 1300),
      setTimeout(() => setStage(4), 1800),
      setTimeout(() => setStage(5), 2500),
      setTimeout(() => setStage(6), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [animated]);

  const handleShare = async(platform: string) => {
    const text = `I just took the On Purpose Assessment and got "${profile.name}". Find out where you are: `;
    const url  = "https://onpurposeassessment.com";
    if (platform==="native"){
      if (navigator.share) { try { await navigator.share({title:"On Purpose Assessment",text,url}); } catch {} }
      else { try { await navigator.clipboard.writeText(text+url); setCopied(true); setTimeout(()=>setCopied(false),2000); } catch {} }
      return;
    }
    if (platform==="copy"){
      try{await navigator.clipboard.writeText(url);}catch{}
      setCopied(true); setTimeout(()=>setCopied(false),2000); return;
    }
    if (platform==="x")     window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text+url)}`);
    if (platform==="li")    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
    if (platform==="email") window.open(`mailto:?subject=On Purpose Assessment&body=${encodeURIComponent(text+url)}`);
  };

  // ── Canvas card generation ──
  const generateCard = useCallback(async (width: number, height: number): Promise<HTMLCanvasElement> => {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const accent = seasonAccent[behavioral] || C.sage;
    const isStory = height > width;
    const scale = width / (isStory ? 1080 : 1200);

    // Background
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, width, height);

    // Decorative accent bar at top
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width, Math.round(6 * scale));

    // Decorative circle
    const circleR = Math.round((isStory ? 120 : 60) * scale);
    ctx.beginPath();
    ctx.arc(width - Math.round((isStory ? 140 : 100) * scale), Math.round((isStory ? 300 : 120) * scale), circleR, 0, Math.PI * 2);
    ctx.fillStyle = accent + "18";
    ctx.fill();

    // Small accent dot
    const dotR = Math.round((isStory ? 30 : 16) * scale);
    ctx.beginPath();
    ctx.arc(Math.round((isStory ? 120 : 80) * scale), Math.round((isStory ? 1500 : 460) * scale), dotR, 0, Math.PI * 2);
    ctx.fillStyle = accent + "25";
    ctx.fill();

    // Branding at top
    const padX = Math.round((isStory ? 80 : 60) * scale);
    const topY = Math.round((isStory ? 100 : 50) * scale);
    ctx.font = `${Math.round((isStory ? 24 : 14) * scale)}px "DM Mono", monospace`;
    ctx.fillStyle = "#9A9590";
    ctx.textAlign = "left";
    ctx.letterSpacing = `${Math.round(2 * scale)}px`;
    ctx.fillText("THE ON PURPOSE ASSESSMENT", padX, topY);

    // Season label
    const seasonY = Math.round((isStory ? 500 : 180) * scale);
    ctx.font = `${Math.round((isStory ? 36 : 20) * scale)}px "DM Mono", monospace`;
    ctx.fillStyle = accent;
    ctx.letterSpacing = `${Math.round(3 * scale)}px`;
    ctx.fillText(behavioral.toUpperCase(), padX, seasonY);

    // Profile name
    const nameY = seasonY + Math.round((isStory ? 120 : 60) * scale);
    ctx.font = `bold ${Math.round((isStory ? 96 : 48) * scale)}px "Playfair Display", Georgia, serif`;
    ctx.fillStyle = "#1C1B19";
    ctx.letterSpacing = "0px";
    const nameWords = profile.name.split(" ");
    let nameLine = "";
    let nameLineY = nameY;
    const maxTextW = width - padX * 2;
    const nameLineH = Math.round((isStory ? 110 : 56) * scale);
    for (const word of nameWords) {
      const test = nameLine ? nameLine + " " + word : word;
      if (ctx.measureText(test).width > maxTextW && nameLine) {
        ctx.fillText(nameLine, padX, nameLineY);
        nameLine = word;
        nameLineY += nameLineH;
      } else {
        nameLine = test;
      }
    }
    ctx.fillText(nameLine, padX, nameLineY);

    // Red dot after name
    const dotAfterX = padX + ctx.measureText(nameLine).width + Math.round(8 * scale);
    const dotSize = Math.round((isStory ? 14 : 8) * scale);
    ctx.beginPath();
    ctx.arc(dotAfterX, nameLineY - Math.round(dotSize * 0.5), dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = C.red;
    ctx.fill();

    // Mirror line
    const mirrorY = nameLineY + Math.round((isStory ? 100 : 50) * scale);
    ctx.font = `italic ${Math.round((isStory ? 40 : 22) * scale)}px "Playfair Display", Georgia, serif`;
    ctx.fillStyle = "#4A4742";
    const mirrorWords = (`\u201C${profile.mirrorLine}\u201D`).split(" ");
    let mirrorLine = "";
    let mirrorLineY = mirrorY;
    const mirrorLineH = Math.round((isStory ? 56 : 32) * scale);
    for (const word of mirrorWords) {
      const test = mirrorLine ? mirrorLine + " " + word : word;
      if (ctx.measureText(test).width > maxTextW && mirrorLine) {
        ctx.fillText(mirrorLine, padX, mirrorLineY);
        mirrorLine = word;
        mirrorLineY += mirrorLineH;
      } else {
        mirrorLine = test;
      }
    }
    ctx.fillText(mirrorLine, padX, mirrorLineY);

    // Bottom accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, height - Math.round(6 * scale), width, Math.round(6 * scale));

    // Footer
    const footerY = height - Math.round((isStory ? 80 : 40) * scale);
    ctx.font = `${Math.round((isStory ? 24 : 13) * scale)}px "DM Mono", monospace`;
    ctx.fillStyle = "#9A9590";
    ctx.textAlign = "center";
    ctx.letterSpacing = `${Math.round(2 * scale)}px`;
    ctx.fillText("ONPURPOSEASSESSMENT.COM", width / 2, footerY);

    return canvas;
  }, [behavioral, profile.name, profile.mirrorLine]);

  const handleDownload = async (w: number, h: number, filename: string) => {
    const canvas = await generateCard(w, h);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const handleCopyImage = async () => {
    try {
      const canvas = await generateCard(1200, 630);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 2000);
    } catch {
      handleDownload(1200, 630, "on-purpose-results.png");
    }
  };

  // Card preview ref
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (stage < 6 || !previewContainerRef.current) return;
    let cancelled = false;
    generateCard(1200, 630).then(canvas => {
      if (cancelled || !previewContainerRef.current) return;
      const existing = previewRef.current;
      if (existing && previewContainerRef.current.contains(existing)) {
        previewContainerRef.current.removeChild(existing);
      }
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      canvas.style.borderRadius = "10px";
      canvas.style.border = `1px solid ${C.border}`;
      previewContainerRef.current.appendChild(canvas);
      previewRef.current = canvas;
    });
    return () => { cancelled = true; };
  }, [stage, generateCard]);

  const rs = (threshold: number) => revealStyle(stage, threshold, animated);

  return (
    <div style={{maxWidth:620,margin:"0 auto",padding:"64px 24px 72px"}}>

      {/* Season label + name */}
      <div style={rs(1)}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,
          letterSpacing:"0.12em",textTransform:"uppercase",color:C.sage,
          marginBottom:14}}>
          Your Season
        </div>
        <div style={{fontFamily:"'Playfair Display',Georgia,serif",
          fontSize:"clamp(26px,5.5vw,38px)",fontWeight:700,color:seasonAccent[behavioral] || C.sage,
          lineHeight:1.1,marginBottom:6}}>
          {behavioral}
        </div>
      </div>

      <h1 style={{...rs(2),fontFamily:"'Playfair Display',Georgia,serif",
        fontSize:"clamp(34px,7vw,50px)",fontWeight:700,color:C.ink,
        marginBottom:12,lineHeight:1.1}}>
        {profile.name}
      </h1>

      <div style={rs(3)}>
        <p style={{fontFamily:"'Playfair Display',Georgia,serif",
          fontSize:18,fontStyle:"italic",color:C.inkMid,lineHeight:1.55,
          marginBottom:10}}>
          &ldquo;{profile.mirrorLine}&rdquo;
        </p>

        {confidenceNarrative && (
          <div style={{fontSize:15,lineHeight:1.7,color:C.inkMid,
            marginTop:8,marginBottom:4}}>
            {confidenceNarrative}
          </div>
        )}

        {mismatch && (
          <div style={{background:C.redLight,borderLeft:`3px solid ${C.red}`,
            borderRadius:"0 9px 9px 0",padding:"13px 17px",marginTop:13,
            fontSize:14,lineHeight:1.65,color:C.inkMid}}>
            {mismatch}
          </div>
        )}

        {lifeEventsNarrative && (
          <div style={{background:C.sageLight,borderLeft:`3px solid ${C.sage}`,
            borderRadius:"0 9px 9px 0",padding:"13px 17px",marginTop:13,
            fontSize:14,lineHeight:1.65,color:C.inkMid}}>
            {lifeEventsNarrative}
          </div>
        )}
      </div>

      <div style={rs(4)}>
        <div style={{marginTop:16}}>
          <p style={{fontSize:16,lineHeight:1.75,color:C.ink}}>{seasonDescriptions[behavioral]}</p>
        </div>

        <Divider/>

        {divergenceNarrative && (
          <div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.08em",
              textTransform:"uppercase",color:C.sage,marginBottom:9}}>Expertise &amp; Passion</div>
            <p style={{fontSize:15,lineHeight:1.7,color:C.inkMid}}>{divergenceNarrative}</p>
            <Divider/>
          </div>
        )}

        <div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.08em",
            textTransform:"uppercase",color:C.sage,marginBottom:9}}>Where the Tension Is</div>
          <p style={{fontSize:16,lineHeight:1.75,color:C.ink}}>{profile.description}</p>
          {gap && (
            <div style={{background:C.sageLight,borderLeft:`3px solid ${C.sage}`,
              borderRadius:"0 9px 9px 0",padding:"13px 17px",marginTop:13,
              fontSize:14,lineHeight:1.65,color:C.inkMid}}>{gap}</div>
          )}
        </div>

        <Divider/>
      </div>

      {/* Question */}
      <div style={rs(5)}>
        <div style={{
          textAlign:"center",padding:"32px 22px",background:C.white,
          borderRadius:14,border:`1px solid ${C.border}`,
          transition:"box-shadow 0.2s",
        }}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(28,27,25,0.08)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
        >
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.1em",
            textTransform:"uppercase",color:C.sage,marginBottom:13}}>
            A question worth sitting with
          </div>
          <div style={{fontFamily:"'Playfair Display',Georgia,serif",
            fontSize:"clamp(18px,3vw,22px)",fontWeight:600,lineHeight:1.4,color:C.ink}}>
            &ldquo;{profile.question}&rdquo;
          </div>
        </div>

        <Divider/>
      </div>

      {/* What's Next + CTAs + Share — all fade in last */}
      <div style={rs(6)}>

        {/* ── Share Section (prominent, before CTAs) ── */}
        {showShare && (
          <>
            <div style={{textAlign:"center",paddingBottom:8}}>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,
                fontWeight:600,color:C.ink,marginBottom:7}}>
                Share your results<span style={{color:C.red}}>.</span>
              </div>
              <p style={{fontSize:14,color:C.inkMid,marginBottom:18,lineHeight:1.6}}>
                Send this to someone who knows you well. See if they agree.
              </p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:8}}>
                <SharePill onClick={()=>handleShare("native")}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
                  Share
                </SharePill>
                <SharePill onClick={()=>handleShare("copy")}>{copied?"Copied":"Copy link"}</SharePill>
                <SharePill onClick={()=>handleShare("x")}>Share on X</SharePill>
                <SharePill onClick={()=>handleShare("li")}>LinkedIn</SharePill>
                <SharePill onClick={()=>handleShare("email")}>Email</SharePill>
              </div>
            </div>

            {/* Shareable results card */}
            <div style={{paddingTop:8,marginBottom:8}}>
              <div ref={previewContainerRef} style={{marginBottom:12}} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                <CardBtn onClick={()=>handleDownload(1200,630,"on-purpose-results.png")}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v9M3 7l4 4 4-4M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download Card
                </CardBtn>
                <CardBtn onClick={()=>handleDownload(1080,1920,"on-purpose-story.png")}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="3" y="1" width="8" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    <line x1="5.5" y1="11" x2="8.5" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Story Size
                </CardBtn>
                <CardBtn onClick={handleCopyImage}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    <path d="M10 4V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5.5A1.5 1.5 0 003 10h1" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                  {copiedImg ? "Copied" : "Copy Image"}
                </CardBtn>
              </div>
            </div>

            <Divider/>
          </>
        )}

        {/* What's Next */}
        <div style={{paddingTop:16}}>
          <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",
            fontSize:"clamp(24px,5vw,32px)",fontWeight:700,lineHeight:1.2,
            color:C.ink,marginBottom:8}}>
            What&apos;s Next<span style={{color:C.red}}>.</span>
          </h2>
          <p style={{fontSize:16,lineHeight:1.75,color:C.ink,marginBottom:20}}>
            The On Purpose Assessment is a starting point. If something in your results landed — or if something felt unresolved — there are a few ways to keep going.
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>

            {/* Coaching Cohort — opens modal */}
            <div style={{background:C.white,border:`1px solid ${C.border}`,
              borderRadius:12,padding:22,transition:"box-shadow 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(28,27,25,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
            >
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                textTransform:"uppercase",color:C.red,marginBottom:6}}>Cohort</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,
                fontWeight:600,color:C.ink,marginBottom:8}}>Coaching Cohort</div>
              <p style={{fontSize:14,lineHeight:1.6,color:C.inkMid,marginBottom:16}}>
                Work through purpose in a small group with others in a similar season. Built for people ready to go deeper together.
              </p>
              <CtaButton onClick={()=>setShowCohortModal(true)}>I&apos;m Interested &rarr;</CtaButton>
            </div>

            {/* Spring Summit — only for Male / Prefer not to say */}
            {userGender !== "Female" && (
              <div style={{background:C.white,border:`1px solid ${C.border}`,
                borderRadius:12,padding:22,transition:"box-shadow 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(28,27,25,0.08)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
              >
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                  textTransform:"uppercase",color:C.red,marginBottom:6}}>Summit</div>
                <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,
                  fontWeight:600,color:C.ink,marginBottom:8}}>Spring Summit</div>
                <p style={{fontSize:14,lineHeight:1.6,color:C.inkMid,marginBottom:16}}>
                  A focused experience for people ready to go deep on what&apos;s next. Two days. Small group. Real clarity.
                </p>
                <CtaButton href="https://thirdspacepublishing.com">Learn More &rarr;</CtaButton>
              </div>
            )}

            {/* Go Deeper — book */}
            <div style={{background:C.white,border:`1px solid ${C.border}`,
              borderRadius:12,padding:22,transition:"box-shadow 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 16px rgba(28,27,25,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
            >
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                textTransform:"uppercase",color:C.red,marginBottom:6}}>Go Deeper</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,
                fontWeight:600,color:C.ink,marginBottom:8}}>On Purpose by Beau Johnson</div>
              <p style={{fontSize:14,lineHeight:1.6,color:C.inkMid,marginBottom:16}}>
                Most ways of finding purpose don&apos;t work. If you&apos;ve wrestled with wanting to live big without losing contentment, this book is for you. Clarity about our lives is possible. Purpose is within reach in every industry and every stage of life. This book shows you how.
              </p>
              <CtaButton href="https://www.amazon.com/Purpose-Beau-Johnson/dp/B0FRMXCDWS">Get the Book</CtaButton>
            </div>
          </div>
          <p style={{textAlign:"center",fontSize:12,color:C.inkLight}}>
            Not sure which is right for you?{" "}
            <a href="mailto:hello@onpurpose.com" style={{color:C.red,textDecoration:"none",transition:"opacity 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              Send us a message.
            </a>
          </p>
        </div>

        {/* ── Cohort Interest Modal ── */}
        {showCohortModal && (
          <div style={{
            position:"fixed",top:0,left:0,right:0,bottom:0,
            background:"rgba(28,27,25,0.5)",zIndex:1000,
            display:"flex",alignItems:"center",justifyContent:"center",
            padding:20,
          }} onClick={e=>{if(e.target===e.currentTarget)setShowCohortModal(false)}}>
            <div style={{
              background:C.white,borderRadius:16,padding:"32px 28px",
              maxWidth:460,width:"100%",boxShadow:"0 8px 40px rgba(28,27,25,0.18)",
              maxHeight:"90vh",overflowY:"auto",
            }}>
              {cohortSubmitted ? (
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:C.sageLight,
                    margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M6 11l4 4 6-8" stroke={C.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,
                    fontWeight:600,color:C.ink,marginBottom:8}}>
                    You&apos;re on the list<span style={{color:C.red}}>.</span>
                  </h3>
                  <p style={{fontSize:14,color:C.inkMid,lineHeight:1.6,marginBottom:20}}>
                    We&apos;ll be in touch with details about the next coaching cohort.
                  </p>
                  <button onClick={()=>{setShowCohortModal(false);}} style={{
                    fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,
                    color:C.inkLight,background:"none",border:"none",cursor:"pointer",
                  }}>Close</button>
                </div>
              ) : (
                <>
                  <h3 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,
                    fontWeight:600,color:C.ink,marginBottom:4}}>
                    Coaching Cohort Interest<span style={{color:C.red}}>.</span>
                  </h3>
                  <p style={{fontSize:14,color:C.inkMid,lineHeight:1.6,marginBottom:20}}>
                    Let us know you&apos;re interested and we&apos;ll reach out with details.
                  </p>
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    <div>
                      <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,
                        letterSpacing:"0.08em",textTransform:"uppercase",color:C.inkLight,
                        display:"block",marginBottom:5}}>Name</label>
                      <input value={cohortForm.name}
                        onChange={e=>setCohortForm(f=>({...f,name:e.target.value}))}
                        style={{
                          width:"100%",height:42,border:`1.5px solid ${C.border}`,
                          borderRadius:9,padding:"0 13px",fontFamily:"'DM Sans',sans-serif",
                          fontSize:14,color:C.ink,background:C.bg,outline:"none",
                        }}
                        onFocus={e=>e.target.style.borderColor=C.red}
                        onBlur={e=>e.target.style.borderColor=C.border}
                      />
                    </div>
                    <div>
                      <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,
                        letterSpacing:"0.08em",textTransform:"uppercase",color:C.inkLight,
                        display:"block",marginBottom:5}}>Email</label>
                      <input value={cohortForm.email} type="email"
                        onChange={e=>setCohortForm(f=>({...f,email:e.target.value}))}
                        style={{
                          width:"100%",height:42,border:`1.5px solid ${C.border}`,
                          borderRadius:9,padding:"0 13px",fontFamily:"'DM Sans',sans-serif",
                          fontSize:14,color:C.ink,background:C.bg,outline:"none",
                        }}
                        onFocus={e=>e.target.style.borderColor=C.red}
                        onBlur={e=>e.target.style.borderColor=C.border}
                      />
                    </div>
                    <div>
                      <label style={{fontFamily:"'DM Mono',monospace",fontSize:10,
                        letterSpacing:"0.08em",textTransform:"uppercase",color:C.inkLight,
                        display:"block",marginBottom:5}}>Message (optional)</label>
                      <textarea value={cohortForm.message}
                        onChange={e=>setCohortForm(f=>({...f,message:e.target.value}))}
                        rows={3}
                        style={{
                          width:"100%",border:`1.5px solid ${C.border}`,
                          borderRadius:9,padding:"10px 13px",fontFamily:"'DM Sans',sans-serif",
                          fontSize:14,color:C.ink,background:C.bg,outline:"none",resize:"vertical",
                        }}
                        onFocus={e=>e.target.style.borderColor=C.red}
                        onBlur={e=>e.target.style.borderColor=C.border}
                      />
                    </div>
                    <div style={{display:"flex",gap:10,marginTop:4}}>
                      <button onClick={()=>setShowCohortModal(false)} style={{
                        flex:1,height:44,borderRadius:9,border:`1.5px solid ${C.border}`,
                        background:"transparent",fontFamily:"'DM Sans',sans-serif",
                        fontSize:14,fontWeight:500,color:C.inkMid,cursor:"pointer",
                      }}>Cancel</button>
                      <button disabled={cohortSubmitting || !cohortForm.name.trim() || !cohortForm.email.trim()}
                        onClick={async()=>{
                          setCohortSubmitting(true);
                          try {
                            await fetch("/api/cohort-interest",{
                              method:"POST",
                              headers:{"Content-Type":"application/json"},
                              body:JSON.stringify({
                                name:cohortForm.name.trim(),
                                email:cohortForm.email.trim(),
                                message:cohortForm.message.trim() || null,
                                season:behavioral,
                                profile_name:profile.name,
                              }),
                            });
                            setCohortSubmitted(true);
                          } catch { /* ignore */ }
                          setCohortSubmitting(false);
                        }}
                        style={{
                          flex:1,height:44,borderRadius:9,border:"none",
                          background:(!cohortForm.name.trim()||!cohortForm.email.trim()) ? C.border : C.red,
                          fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:600,
                          color:"white",cursor:(!cohortForm.name.trim()||!cohortForm.email.trim()) ? "default" : "pointer",
                          opacity:cohortSubmitting ? 0.6 : 1,transition:"background 0.15s",
                        }}
                      >{cohortSubmitting ? "Sending..." : "Submit"}</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Save failed note */}
        {saveFailed && (
          <div style={{textAlign:"center",marginTop:20,padding:"12px 16px",
            background:C.sageLight,borderRadius:8}}>
            <p style={{fontSize:12,color:C.inkMid,lineHeight:1.5,margin:0}}>
              Your results are shown below but may not have saved. Visit your dashboard later to confirm.
            </p>
          </div>
        )}

        {/* Sign-in link callout for non-authenticated users */}
        {!isAuthenticated && (
          <>
            <Divider/>
            <div style={{textAlign:"center",padding:"0 8px"}}>
              <p style={{fontSize:13,color:C.inkLight,lineHeight:1.6,margin:0}}>
                We sent a sign-in link to your email. Click it to access your dashboard — where you can revisit your results, track your growth, and retake the assessment anytime.
              </p>
            </div>
          </>
        )}

        {showStartOver && onStartOver && (
          <>
            <Divider/>
            <div style={{textAlign:"center",display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={onStartOver} style={{
                display:"inline-flex",alignItems:"center",justifyContent:"center",
                padding:"10px 24px",border:`1.5px solid ${C.border}`,
                borderRadius:10,fontFamily:"'DM Sans',sans-serif",
                fontSize:14,fontWeight:500,color:C.inkMid,
                cursor:"pointer",background:C.white,transition:"all 0.2s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.color=C.ink;e.currentTarget.style.borderColor=C.ink;}}
                onMouseLeave={e=>{e.currentTarget.style.color=C.inkMid;e.currentTarget.style.borderColor=C.border;}}
              >Start Over</button>
              {isAuthenticated && (
                <a href="/dashboard" style={{
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  padding:"10px 24px",border:`1.5px solid ${C.border}`,
                  borderRadius:10,fontFamily:"'DM Sans',sans-serif",
                  fontSize:14,fontWeight:500,color:C.inkMid,
                  textDecoration:"none",transition:"all 0.2s",
                }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=C.ink;(e.currentTarget as HTMLElement).style.borderColor=C.ink;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=C.inkMid;(e.currentTarget as HTMLElement).style.borderColor=C.border;}}
                >Go to Dashboard</a>
              )}
            </div>
          </>
        )}

        <div style={{textAlign:"center",padding:"30px 0 4px",fontSize:11,
          fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
          textTransform:"uppercase"}}>
          <a href="https://thirdspacepublishing.com" target="_blank" rel="noopener noreferrer"
            style={{color:C.inkLight,textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.color=C.ink}
            onMouseLeave={e=>e.currentTarget.style.color=C.inkLight}>
            Powered by Third Space
          </a>
        </div>
      </div>
    </div>
  );
}
