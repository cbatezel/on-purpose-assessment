import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function PUT(request: NextRequest) {
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
    const { userId, name, email, birth_year, gender, is_admin } =
      await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Update user metadata (name) and email via auth admin
    const updatePayload: Record<string, unknown> = {};
    if (name !== undefined) {
      updatePayload.user_metadata = { name };
    }
    if (email !== undefined) {
      updatePayload.email = email;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } =
        await adminClient.auth.admin.updateUserById(userId, updatePayload);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update user", details: updateError.message },
          { status: 500 }
        );
      }
    }

    // Upsert profiles table for is_admin field
    if (is_admin !== undefined) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({ id: userId, is_admin }, { onConflict: "id" });

      if (profileError) {
        return NextResponse.json(
          {
            error: "Failed to update profile",
            details: profileError.message,
          },
          { status: 500 }
        );
      }
    }

    // Update birth_year and gender on the most recent assessment_results record
    if (birth_year !== undefined || gender !== undefined) {
      // Find the most recent assessment_results record for this user
      const { data: latestResult, error: fetchError } = await adminClient
        .from("assessment_results")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        return NextResponse.json(
          {
            error: "Failed to find assessment record",
            details: fetchError.message,
          },
          { status: 500 }
        );
      }

      const assessmentUpdate: Record<string, unknown> = {};
      if (birth_year !== undefined) assessmentUpdate.birth_year = birth_year;
      if (gender !== undefined) assessmentUpdate.gender = gender;

      const { error: assessmentError } = await adminClient
        .from("assessment_results")
        .update(assessmentUpdate)
        .eq("id", latestResult.id);

      if (assessmentError) {
        return NextResponse.json(
          {
            error: "Failed to update assessment record",
            details: assessmentError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/user] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
