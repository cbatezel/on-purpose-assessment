import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, device_type, timezone, referrer, utm_source, utm_medium, utm_campaign } = body;

    const { data, error } = await adminClient
      .from("assessment_sessions")
      .insert({
        email: email || null,
        device_type: device_type || null,
        timezone: timezone || null,
        referrer: referrer || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("session insert error:", error);
    }

    return NextResponse.json({ session_id: data?.id ?? null });
  } catch (err) {
    console.error("session POST error:", err);
    return NextResponse.json({ session_id: null });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      current_step,
      furthest_step,
      last_active_at,
      completed_at,
      time_to_complete_seconds,
      assessment_result_id,
    } = body;

    if (!session_id) {
      return NextResponse.json({ success: true });
    }

    const updates: Record<string, unknown> = {};
    if (current_step !== undefined) updates.current_step = current_step;
    if (furthest_step !== undefined) updates.furthest_step = furthest_step;
    if (last_active_at !== undefined) updates.last_active_at = last_active_at;
    if (completed_at !== undefined) updates.completed_at = completed_at;
    if (time_to_complete_seconds !== undefined) updates.time_to_complete_seconds = time_to_complete_seconds;
    if (assessment_result_id !== undefined) updates.assessment_result_id = assessment_result_id;

    const { error } = await adminClient
      .from("assessment_sessions")
      .update(updates)
      .eq("id", session_id);

    if (error) {
      console.error("session update error:", error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("session PATCH error:", err);
    return NextResponse.json({ success: true });
  }
}
