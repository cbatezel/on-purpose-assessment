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

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete all assessment_results
    const { error: assessmentError } = await adminClient
      .from("assessment_results")
      .delete()
      .eq("user_id", userId);

    if (assessmentError) {
      return NextResponse.json(
        {
          error: "Failed to delete assessment results",
          details: assessmentError.message,
        },
        { status: 500 }
      );
    }

    // Delete all cohort_interest entries
    const { error: cohortError } = await adminClient
      .from("cohort_interest")
      .delete()
      .eq("user_id", userId);

    if (cohortError) {
      return NextResponse.json(
        {
          error: "Failed to delete cohort interest entries",
          details: cohortError.message,
        },
        { status: 500 }
      );
    }

    // Delete profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json(
        {
          error: "Failed to delete profile",
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    // Delete auth user
    const { error: authError } =
      await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      return NextResponse.json(
        {
          error: "Failed to delete auth user",
          details: authError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/delete] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
