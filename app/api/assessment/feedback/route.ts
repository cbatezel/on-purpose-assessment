import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { assessment_id, feedback_accuracy, feedback_new_insight, feedback_open_text } = body;

    if (!assessment_id) {
      return NextResponse.json({ error: "assessment_id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (feedback_accuracy !== undefined) updates.feedback_accuracy = feedback_accuracy;
    if (feedback_new_insight !== undefined) updates.feedback_new_insight = feedback_new_insight;
    if (feedback_open_text !== undefined) updates.feedback_open_text = feedback_open_text || null;

    const { error } = await adminClient
      .from("assessment_results")
      .update(updates)
      .eq("id", assessment_id);

    if (error) {
      console.error("[assessment/feedback] update error:", error.message);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    // Slack follow-up (fire and forget)
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl && (feedback_accuracy || feedback_new_insight !== undefined || feedback_open_text)) {
      // Look up the assessment to get user info
      const { data: assessment } = await adminClient
        .from("assessment_results")
        .select("user_id, season, profile_name")
        .eq("id", assessment_id)
        .single();

      if (assessment) {
        let name = "";
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(u => u.id === assessment.user_id);
        if (authUser) name = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "";

        const parts: string[] = [];
        if (feedback_accuracy) parts.push(`Accuracy: ${feedback_accuracy}/5`);
        if (feedback_new_insight !== undefined) parts.push(`New insight: ${feedback_new_insight ? "Yes" : "No"}`);
        let text = `*Feedback from ${name || "Anonymous"}* — ${parts.join(" · ")}`;
        if (feedback_open_text) text += ` · _'${feedback_open_text}'_`;

        fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
