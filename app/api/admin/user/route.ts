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

    // Upsert profiles table for is_admin, birth_year, and gender
    const profileUpdate: Record<string, unknown> = { id: userId };
    if (is_admin !== undefined) profileUpdate.is_admin = is_admin;
    if (birth_year !== undefined) profileUpdate.birth_year = birth_year;
    if (gender !== undefined) profileUpdate.gender = gender;

    if (Object.keys(profileUpdate).length > 1) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert(profileUpdate, { onConflict: "id" });

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/user] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
