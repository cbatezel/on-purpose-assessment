import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ found: false });
    }

    // Find user by email
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const user = authUsers?.users?.find(u => u.email === email);

    if (!user) {
      return NextResponse.json({ found: false });
    }

    // Get most recent assessment result for demographics
    const { data: result } = await adminClient
      .from("assessment_results")
      .select("birth_year, gender, life_events")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const name = user.user_metadata?.name || "";
    const hasFullDemographics = !!(result?.birth_year && result?.gender);

    return NextResponse.json({
      found: true,
      name,
      birth_year: result?.birth_year || null,
      gender: result?.gender || null,
      hasFullDemographics,
    });
  } catch (err) {
    console.error("[user-lookup] Error:", err);
    return NextResponse.json({ found: false });
  }
}
