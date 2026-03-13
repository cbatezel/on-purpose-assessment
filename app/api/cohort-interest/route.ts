import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, season, profile_name, user_id } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const { error } = await adminClient
      .from("cohort_interest")
      .insert({
        name,
        email,
        message: message || null,
        season: season || null,
        profile_name: profile_name || null,
        user_id: user_id || null,
      });

    if (error) {
      console.error("cohort_interest insert error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
