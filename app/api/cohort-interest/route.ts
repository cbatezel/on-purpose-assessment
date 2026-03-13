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

    // Slack notification (fire and forget)
    const slackUrl = process.env.SLACK_COHORT_WEBHOOK_URL;
    if (slackUrl) {
      const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
      const fields = [
        { type: "mrkdwn", text: `*Name:*\n${name}` },
        { type: "mrkdwn", text: `*Email:*\n${email}` },
      ];
      if (season) fields.push({ type: "mrkdwn", text: `*Season:*\n${season}` });
      if (profile_name) fields.push({ type: "mrkdwn", text: `*Profile:*\n${profile_name}` });

      const blocks: Record<string, unknown>[] = [
        { type: "header", text: { type: "plain_text", text: "🔥 New Cohort Interest", emoji: true } },
        { type: "section", fields },
      ];
      if (message) {
        blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Message:*\n> ${message}` } });
      }
      blocks.push(
        { type: "context", elements: [{ type: "mrkdwn", text: now }] },
        { type: "actions", elements: [
          { type: "button", text: { type: "plain_text", text: "View in Admin" }, url: "https://onpurposeassessment.com/admin?tab=cohort" },
        ]},
      );

      fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
