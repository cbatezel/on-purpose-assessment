import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[assessment/submit] Incoming body:", JSON.stringify(body, null, 2));

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
      season_confidence,
      season_presumed,
      season_self_select,
      season_confirmation_score,
    } = body;

    // 1. Look up user by email (filtered query, not full list)
    let userId: string | undefined;

    const { data: userList, error: listError } =
      await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

    console.log("[assessment/submit] listUsers error:", listError);

    // Search through users for matching email, or use getUserByEmail if available
    // listUsers with filter isn't supported, so look up directly
    const { data: lookupData, error: lookupError } = await adminClient
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .single();

    // If direct query doesn't work, fall back to iterating
    if (lookupError) {
      console.log("[assessment/submit] Direct auth lookup failed, trying listUsers scan:", lookupError.message);
      // Scan through listUsers results
      const { data: allUsers, error: allErr } = await adminClient.auth.admin.listUsers();
      console.log("[assessment/submit] listUsers count:", allUsers?.users?.length, "error:", allErr);
      const found = allUsers?.users?.find((u) => u.email === email);
      if (found) userId = found.id;
    } else {
      userId = lookupData.id;
    }

    console.log("[assessment/submit] Found userId:", userId);

    if (!userId) {
      // Create user with email confirmed
      console.log("[assessment/submit] Creating new user for:", email);
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { name },
        });

      if (createError) {
        console.error("[assessment/submit] createUser error:", createError.message);
        return NextResponse.json(
          { error: "Failed to create user", details: createError.message },
          { status: 500 }
        );
      }
      userId = newUser.user.id;
      console.log("[assessment/submit] Created user:", userId);
    }

    // 2. Insert assessment result
    const insertPayload = {
      user_id: userId,
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
      season_confidence: season_confidence || "high",
      season_presumed: season_presumed || null,
      season_self_select: season_self_select || null,
      season_confirmation_score: season_confirmation_score || null,
    };
    console.log("[assessment/submit] Inserting assessment_results:", JSON.stringify(insertPayload, null, 2));

    const { data: assessmentResult, error: insertError } =
      await adminClient
        .from("assessment_results")
        .insert(insertPayload)
        .select("id")
        .single();

    if (insertError) {
      console.error("[assessment/submit] assessment_results insert error:", insertError.message, insertError.details, insertError.hint);
      return NextResponse.json(
        { error: "Failed to save assessment", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("[assessment/submit] Inserted assessment_results id:", assessmentResult.id);

    // 3. Insert pdf_jobs row
    const { error: pdfError } = await adminClient
      .from("pdf_jobs")
      .insert({
        assessment_id: assessmentResult.id,
        status: "pending",
      });

    if (pdfError) {
      console.error("[assessment/submit] pdf_jobs insert error:", pdfError.message, pdfError.details, pdfError.hint);
    } else {
      console.log("[assessment/submit] Created pdf_job for assessment:", assessmentResult.id);
    }

    // 4. Send magic link (fire and forget) — so user gets it after completing assessment
    const origin = request.headers.get("origin") || "https://onpurposeassessment.com";
    adminClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    }).catch(() => {});

    // 5. Slack notification (fire and forget)
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      const qCounts = { season: 4, expertise: 8, passion: 7 };
      const sAvg = (season_score / qCounts.season).toFixed(1);
      const eAvg = (expertise_score / qCounts.expertise).toFixed(1);
      const pAvg = (passion_score / qCounts.passion).toFixed(1);
      const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: [
            { type: "header", text: { type: "plain_text", text: "New Assessment Completed", emoji: true } },
            { type: "section", fields: [
              { type: "mrkdwn", text: `*Name:*\n${name || "—"}` },
              { type: "mrkdwn", text: `*Email:*\n${email}` },
            ]},
            { type: "section", fields: [
              { type: "mrkdwn", text: `*Season:*\n${season} (${season_confidence || "high"})` },
              { type: "mrkdwn", text: `*Profile:*\n${profile_name}` },
            ]},
            { type: "section", text: { type: "mrkdwn", text: `*Scores:*  Season ${sAvg}/5  •  Expertise ${eAvg}/5  •  Passion ${pAvg}/5` } },
            { type: "context", elements: [{ type: "mrkdwn", text: now }] },
            { type: "actions", elements: [
              { type: "button", text: { type: "plain_text", text: "View in Admin" }, url: `https://onpurposeassessment.com/admin/assessment/${assessmentResult.id}` },
            ]},
          ],
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ assessment_id: assessmentResult.id });
  } catch (err) {
    console.error("[assessment/submit] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
