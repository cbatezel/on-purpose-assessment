import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ profile: null });
  }

  // Find user by email
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const user = authUsers?.users?.find(u => u.email === email);

  if (!user) {
    return NextResponse.json({ profile: null });
  }

  // Get most recent assessment result
  const { data: result } = await adminClient
    .from("assessment_results")
    .select("birth_year, gender")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!result) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({
    profile: {
      birth_year: result.birth_year,
      gender: result.gender,
    },
  });
}
