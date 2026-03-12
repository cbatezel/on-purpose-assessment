"use client";
import { useState } from "react";
import { seasonDescriptions } from "@/lib/assessment-data";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", redLight:"#F5E8EA",
  sage:"#6B7D6A", sageLight:"#E8EEE7", border:"#DDD9D2",
};

export interface ResultsDisplayProps {
  behavioral: string;
  profile: { name: string; mirrorLine: string; description: string; question: string };
  gap: string | null;
  mismatch: string | null;
  email?: string;
  showShare?: boolean;
  showStartOver?: boolean;
  onStartOver?: () => void;
  animated?: boolean;
}

function Divider() {
  return <hr style={{border:"none",borderTop:`1px solid ${C.border}`,margin:"28px 0"}}/>;
}

function SecondaryBtn({children,onClick}: {children: React.ReactNode; onClick?: () => void}) {
  return (
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:"100%",height:42,borderRadius:9,
      border:`1.5px solid ${C.red}`,background:"transparent",
      fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,
      color:C.red,cursor:"pointer",transition:"background 0.15s",
    }}>{children}</button>
  );
}

export default function ResultsDisplay({
  behavioral, profile, gap, mismatch, email,
  showShare = false, showStartOver = false, onStartOver, animated = true,
}: ResultsDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async(platform: string) => {
    const text = `I just took the On Purpose Assessment and got "${profile.name}". Find out where you are: `;
    const url  = typeof window !== "undefined" ? window.location.origin : "";
    if (platform==="copy"){
      try{await navigator.clipboard.writeText(url);}catch(_){}
      setCopied(true); setTimeout(()=>setCopied(false),2000); return;
    }
    if (platform==="x")     window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text+url)}`);
    if (platform==="li")    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
    if (platform==="email") window.open(`mailto:?subject=On Purpose Assessment&body=${encodeURIComponent(text+url)}`);
  };

  const a = animated ? "fu" : "";
  const delay = (s: string) => animated ? {animationDelay: s} : {};

  return (
    <div style={{maxWidth:620,margin:"0 auto",padding:"64px 24px 72px"}}>

      <div className={a} style={{fontFamily:"'DM Mono',monospace",fontSize:11,
        letterSpacing:"0.12em",textTransform:"uppercase",color:C.sage,
        marginBottom:14,...delay("0.1s")}}>
        Your Season
      </div>

      <div className={a} style={{fontFamily:"'Playfair Display',Georgia,serif",
        fontSize:"clamp(26px,5.5vw,38px)",fontWeight:700,color:C.sage,
        lineHeight:1.1,marginBottom:6,...delay("0.15s")}}>
        {behavioral}
      </div>

      <h1 className={a} style={{fontFamily:"'Playfair Display',Georgia,serif",
        fontSize:"clamp(34px,7vw,50px)",fontWeight:700,color:C.ink,
        marginBottom:12,lineHeight:1.1,...delay("0.2s")}}>
        {profile.name}
        <span style={{display:"inline-block",width:9,height:9,borderRadius:"50%",
          background:C.red,marginLeft:4,verticalAlign:"middle",marginBottom:5}}/>
      </h1>

      <p className={a} style={{fontFamily:"'Playfair Display',Georgia,serif",
        fontSize:18,fontStyle:"italic",color:C.inkMid,lineHeight:1.55,
        marginBottom:10,...delay("0.3s")}}>
        &ldquo;{profile.mirrorLine}&rdquo;
      </p>

      {mismatch && (
        <div className={a} style={{background:C.redLight,borderLeft:`3px solid ${C.red}`,
          borderRadius:"0 9px 9px 0",padding:"13px 17px",marginTop:13,
          fontSize:14,lineHeight:1.65,color:C.inkMid,...delay("0.35s")}}>
          {mismatch}
        </div>
      )}

      <div className={a} style={{marginTop:16,...delay("0.35s")}}>
        <p style={{fontSize:16,lineHeight:1.75,color:C.ink}}>{seasonDescriptions[behavioral]}</p>
      </div>

      <Divider/>

      {/* Where the Tension Is */}
      <div style={animated ? {animation:"fadeUp 0.5s ease-out 0.5s both"} : {}}>
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

      {/* Question */}
      <div style={animated ? {animation:"fadeUp 0.5s ease-out 0.65s both"} : {
        textAlign:"center",padding:"32px 22px",background:C.white,
        borderRadius:14,border:`1px solid ${C.border}`,
      }}>
        <div style={animated ? {
          textAlign:"center",padding:"32px 22px",background:C.white,
          borderRadius:14,border:`1px solid ${C.border}`,
        } : {
          textAlign:"center",padding:"32px 22px",background:C.white,
          borderRadius:14,border:`1px solid ${C.border}`,
        }}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.1em",
            textTransform:"uppercase",color:C.sage,marginBottom:13}}>
            A question worth sitting with
          </div>
          <div style={{fontFamily:"'Playfair Display',Georgia,serif",
            fontSize:"clamp(18px,3vw,22px)",fontWeight:600,lineHeight:1.4,color:C.ink}}>
            &ldquo;{profile.question}&rdquo;
          </div>
        </div>
      </div>

      <Divider/>

      {/* What's Next */}
      <div style={animated ? {animation:"fadeUp 0.5s ease-out 0.8s both",paddingTop:16} : {paddingTop:16}}>
        <h2 style={{fontFamily:"'Playfair Display',Georgia,serif",
          fontSize:"clamp(24px,5vw,32px)",fontWeight:700,lineHeight:1.2,
          color:C.ink,marginBottom:8}}>
          What&apos;s Next<span style={{color:C.red}}>.</span>
        </h2>
        <p style={{fontSize:16,lineHeight:1.75,color:C.ink,marginBottom:20}}>
          The On Purpose Assessment is a starting point. If something in your results landed — or if something felt unresolved — there are a few ways to keep going.
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
          {[
            {label:"Cohort",title:"Coaching Cohort",    body:"Work through purpose in a small group with others in a similar season. Built for people ready to go deeper together."},
            {label:"Summit",title:"Spring Summit",  body:"A focused experience for people ready to go deep on what's next. Two days. Small group. Real clarity."},
            {label:"Go Deeper",title:"On Purpose by Beau Johnson", body:"Most ways of finding purpose don\u2019t work. If you\u2019ve wrestled with wanting to live big without losing contentment, this book is for you. Clarity about our lives is possible. Purpose is within reach in every industry and every stage of life. This book shows you how.", href:"https://www.amazon.com/Purpose-Beau-Johnson/dp/B0FRMXCDWS", btnText:"Get the Book"},
          ].map(cta=>(
            <div key={cta.label} style={{background:C.white,border:`1px solid ${C.border}`,
              borderRadius:12,padding:22}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"0.1em",
                textTransform:"uppercase",color:C.red,marginBottom:6}}>{cta.label}</div>
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,
                fontWeight:600,color:C.ink,marginBottom:8}}>{cta.title}</div>
              <p style={{fontSize:14,lineHeight:1.6,color:C.inkMid,marginBottom:16}}>{cta.body}</p>
              {cta.href ? (
                <a href={cta.href} target="_blank" rel="noopener noreferrer" style={{
                  display:"flex",alignItems:"center",justifyContent:"center",
                  width:"100%",height:42,borderRadius:9,
                  border:`1.5px solid ${C.red}`,background:"transparent",
                  fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,
                  color:C.red,cursor:"pointer",textDecoration:"none",transition:"background 0.15s",
                }}>{cta.btnText}</a>
              ) : (
                <SecondaryBtn>Learn More &rarr;</SecondaryBtn>
              )}
            </div>
          ))}
        </div>
        <p style={{textAlign:"center",fontSize:12,color:C.inkLight}}>
          Not sure which is right for you?{" "}
          <a href="mailto:hello@onpurpose.com" style={{color:C.red,textDecoration:"none"}}>
            Send us a message.
          </a>
        </p>
      </div>

      {showShare && (
        <>
          <Divider/>
          <div style={{textAlign:"center",paddingTop:24,...(animated ? {animation:"fadeUp 0.5s ease-out 1.05s both"} : {})}}>
            <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:20,
              fontWeight:600,color:C.ink,marginBottom:7}}>
              Share your snapshot<span style={{color:C.red}}>.</span>
            </div>
            <p style={{fontSize:14,color:C.inkMid,marginBottom:18,lineHeight:1.6}}>
              Send this to someone who knows you well. See if they agree.
            </p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
              {[
                {id:"copy",  label:copied?"✓ Copied":"Copy link"},
                {id:"x",    label:"Share on X"},
                {id:"li",   label:"Share on LinkedIn"},
                {id:"email",label:"Email a friend"},
              ].map(s=>(
                <button key={s.id} onClick={()=>handleShare(s.id)} style={{
                  display:"inline-flex",alignItems:"center",gap:6,
                  padding:"9px 15px",border:`1.5px solid ${C.border}`,
                  borderRadius:100,fontFamily:"'DM Sans',sans-serif",
                  fontSize:13,fontWeight:500,color:C.ink,
                  cursor:"pointer",background:C.white,transition:"all 0.15s",
                }}>{s.label}</button>
              ))}
            </div>
            {email && (
              <p style={{fontSize:12,color:C.inkLight,marginTop:18,lineHeight:1.55}}>
                Your full results are on their way to {email}.<br/>
                Check your inbox in the next few minutes.
              </p>
            )}
          </div>
        </>
      )}

      {showStartOver && onStartOver && (
        <>
          <Divider/>
          <div style={{textAlign:"center"}}>
            <button onClick={onStartOver} style={{
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              padding:"10px 24px",border:`1.5px solid ${C.border}`,
              borderRadius:10,fontFamily:"'DM Sans',sans-serif",
              fontSize:14,fontWeight:500,color:C.inkMid,
              cursor:"pointer",background:C.white,transition:"all 0.15s",
            }}>Start Over</button>
          </div>
        </>
      )}

      <div style={{textAlign:"center",padding:"30px 0 4px",fontSize:11,
        fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
        textTransform:"uppercase",color:C.inkLight}}>
        Powered by Third Space
      </div>
    </div>
  );
}
