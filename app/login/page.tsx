"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", border:"#DDD9D2", sage:"#6B7D6A",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (otpError) {
      setError("Something went wrong. Please try again.");
    } else {
      setSent(true);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",padding:"80px 24px 48px"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{marginBottom:24}}>
          <Link href="/" style={{
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
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.12em",
          textTransform:"uppercase",color:C.sage,marginBottom:20,textAlign:"center"}}>
          Sign In
        </div>

        {sent ? (
          <div style={{textAlign:"center"}}>
            <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,
              fontWeight:700,color:C.ink,marginBottom:12,lineHeight:1.25}}>
              Check your email<span style={{color:C.red}}>.</span>
            </h1>
            <p style={{fontSize:15,lineHeight:1.65,color:C.inkMid,marginBottom:28}}>
              We sent a sign-in link to <strong>{email}</strong>. Click the link in your email to continue.
            </p>
            <button onClick={()=>{setSent(false);setEmail("");}} style={{
              fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,
              color:C.red,background:"none",border:"none",cursor:"pointer",
              textDecoration:"underline",textUnderlineOffset:3,
            }}>Try a different email</button>
          </div>
        ) : (
          <>
            <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,
              fontWeight:700,color:C.ink,marginBottom:8,textAlign:"center",lineHeight:1.25}}>
              Welcome back<span style={{color:C.red}}>.</span>
            </h1>
            <p style={{fontSize:15,lineHeight:1.65,color:C.inkMid,marginBottom:28,textAlign:"center"}}>
              Enter your email and we&apos;ll send you a magic link to sign in.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,
                padding:24,boxShadow:"0 1px 8px rgba(28,27,25,0.05)",marginBottom:16}}>
                <label style={{display:"block",fontSize:13,fontWeight:600,color:C.ink,marginBottom:7}}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e=>setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  inputMode="email"
                  style={{
                    width:"100%",height:50,boxSizing:"border-box",
                    border:`1.5px solid ${email ? C.ink : C.border}`,
                    borderRadius:10,padding:"0 14px",
                    fontFamily:"'DM Sans',sans-serif",fontSize:16,
                    color:C.ink,background:C.white,
                    WebkitAppearance:"none",appearance:"none",outline:"none",
                    transition:"border-color 0.15s",
                  }}
                  onFocus={e=>e.target.style.borderColor=C.red}
                  onBlur={e=>e.target.style.borderColor=email?C.ink:C.border}
                />
              </div>
              {error && (
                <p style={{fontSize:13,color:C.red,marginBottom:12,textAlign:"center"}}>{error}</p>
              )}
              <button type="submit" disabled={!email.includes("@") || loading} style={{
                display:"flex",alignItems:"center",justifyContent:"center",
                width:"100%",height:50,borderRadius:10,border:"none",
                fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,
                background:(!email.includes("@") || loading) ? "#DDD9D2" : C.red,
                color:(!email.includes("@") || loading) ? C.inkLight : "white",
                cursor:(!email.includes("@") || loading) ? "not-allowed" : "pointer",
                transition:"background 0.15s",letterSpacing:"0.01em",
              }}>
                {loading ? "Sending…" : "Send Magic Link"}
              </button>
            </form>
          </>
        )}

        <div style={{textAlign:"center",padding:"30px 0 4px",fontSize:11,
          fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
          textTransform:"uppercase",color:C.inkLight}}>
          Powered by Third Space
        </div>
      </div>
    </div>
  );
}
