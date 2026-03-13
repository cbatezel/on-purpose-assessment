import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Parse request body
    const { sourceUserId, targetUserId } = await request.json();

    if (!sourceUserId || !targetUserId) {
      return NextResponse.json(
        { error: "sourceUserId and targetUserId are required" },
        { status: 400 }
      );
    }

    if (sourceUserId === targetUserId) {
      return NextResponse.json(
        { error: "Source and target users must be different" },
        { status: 400 }
      );
    }

    // Move all assessment_results from source to target
    const { error: moveError } = await adminClient
      .from("assessment_results")
      .update({ user_id: targetUserId })
      .eq("user_id", sourceUserId);

    if (moveError) {
      return NextResponse.json(
        {
          error: "Failed to move assessment results",
          details: moveError.message,
        },
        { status: 500 }
      );
    }

    // Delete source user's profile
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", sourceUserId);

    if (profileDeleteError) {
      return NextResponse.json(
        {
          error: "Failed to delete source profile",
          details: profileDeleteError.message,
        },
        { status: 500 }
      );
    }

    // Delete source auth user
    const { error: authDeleteError } =
      await adminClient.auth.admin.deleteUser(sourceUserId);

    if (authDeleteError) {
      return NextResponse.json(
        {
          error: "Failed to delete source auth user",
          details: authDeleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/merge] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
