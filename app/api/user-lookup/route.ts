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

    // Get birth_year and gender from profiles (source of truth)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("birth_year, gender")
      .eq("id", user.id)
      .single();

    const name = user.user_metadata?.name || "";
    const hasFullDemographics = !!(profile?.birth_year && profile?.gender);

    return NextResponse.json({
      found: true,
      name,
      birth_year: profile?.birth_year || null,
      gender: profile?.gender || null,
      hasFullDemographics,
    });
  } catch (err) {
    console.error("[user-lookup] Error:", err);
    return NextResponse.json({ found: false });
  }
}
