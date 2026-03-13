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

  // Get birth_year and gender from profiles (source of truth)
  const { data: profile } = await adminClient
    .from("profiles")
    .select("birth_year, gender")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({
    profile: {
      birth_year: profile.birth_year,
      gender: profile.gender,
    },
  });
}
