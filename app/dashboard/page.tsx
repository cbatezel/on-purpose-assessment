import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import Link from "next/link";

const C = {
  bg:"#F0EDE8", white:"#FAFAF8", ink:"#1C1B19", inkMid:"#4A4742",
  inkLight:"#9A9590", red:"#B22234", border:"#DDD9D2", sage:"#6B7D6A",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.name || user.email;

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"48px 24px"}}>
      <div style={{width:"100%",maxWidth:480,textAlign:"center"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.12em",
          textTransform:"uppercase",color:C.sage,marginBottom:20}}>
          Dashboard
        </div>

        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:30,
          fontWeight:700,color:C.ink,marginBottom:12,lineHeight:1.25}}>
          Welcome, {name}<span style={{color:C.red}}>.</span>
        </h1>

        <p style={{fontSize:16,lineHeight:1.65,color:C.inkMid,marginBottom:36}}>
          Your dashboard is coming soon.
        </p>

        <div style={{display:"flex",flexDirection:"column",gap:12,
          maxWidth:260,margin:"0 auto"}}>
          <Link href="/" style={{
            display:"flex",alignItems:"center",justifyContent:"center",
            width:"100%",height:50,borderRadius:10,border:"none",
            fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,
            background:C.red,color:"white",textDecoration:"none",
            letterSpacing:"0.01em",transition:"background 0.15s",
          }}>
            Take the Assessment
          </Link>
          <SignOutButton />
        </div>

        <div style={{textAlign:"center",padding:"40px 0 4px",fontSize:11,
          fontFamily:"'DM Mono',monospace",letterSpacing:"0.08em",
          textTransform:"uppercase",color:C.inkLight}}>
          Powered by Third Space
        </div>
      </div>
    </div>
  );
}
