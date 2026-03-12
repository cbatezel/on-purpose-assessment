"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const C = {
  inkMid:"#4A4742", inkLight:"#9A9590", red:"#B22234",
  white:"#FAFAF8", border:"#DDD9D2",
};

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button onClick={handleSignOut} style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:"100%",height:42,borderRadius:9,
      border:`1.5px solid ${C.border}`,background:C.white,
      fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,
      color:C.inkMid,cursor:"pointer",transition:"all 0.15s",
    }}>
      Sign Out
    </button>
  );
}
