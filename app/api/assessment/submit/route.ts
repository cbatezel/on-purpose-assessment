import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      birth_year,
      gender,
      life_events,
      feeling_words,
      season_answers,
      expertise_answers,
      passion_answers,
      season_score,
      expertise_score,
      passion_score,
      bs_score,
      season,
      profile_name,
      season_cohort,
    } = body;

    // 1. Check if user exists in auth.users by email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    let userId: string | undefined;
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user with email confirmed
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name },
        });

      if (createError) {
        return NextResponse.json(
          { error: "Failed to create user", details: createError.message },
          { status: 500 }
        );
      }
      userId = newUser.user.id;
    }

    // 2. Insert assessment result
    const { data: assessmentResult, error: insertError } =
      await adminClient
        .from("assessment_results")
        .insert({
          user_id: userId,
          email,
          name,
          birth_year,
          gender,
          life_events,
          feeling_words,
          season_answers,
          expertise_answers,
          passion_answers,
          season_score,
          expertise_score,
          passion_score,
          bs_score,
          season,
          profile_name,
          season_cohort,
        })
        .select("id")
        .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save assessment", details: insertError.message },
        { status: 500 }
      );
    }

    // 3. Insert pdf_jobs row
    const { error: pdfError } = await adminClient
      .from("pdf_jobs")
      .insert({
        assessment_id: assessmentResult.id,
        status: "pending",
      });

    if (pdfError) {
      // Assessment saved, PDF job failed — log but don't fail the request
      console.error("Failed to create PDF job:", pdfError.message);
    }

    return NextResponse.json({ assessment_id: assessmentResult.id });
  } catch (err) {
    console.error("Assessment submit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
