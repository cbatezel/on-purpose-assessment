import { ImageResponse } from "next/og";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "edge";
export const alt = "On Purpose Assessment Results";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: result } = await adminClient
    .from("assessment_results")
    .select("season, profile_name")
    .eq("id", id)
    .single();

  const season = result?.season || "Your Season";
  const profileName = result?.profile_name || "Your Profile";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F0EDE8",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#B22234",
            }}
          />
          <span
            style={{
              fontSize: "18px",
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#6B7D6A",
              fontFamily: "monospace",
            }}
          >
            The On Purpose Assessment
          </span>
        </div>
        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "#6B7D6A",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "12px",
            fontFamily: "serif",
          }}
        >
          {season}
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            color: "#1C1B19",
            textAlign: "center",
            lineHeight: 1.15,
            marginBottom: "40px",
            fontFamily: "serif",
          }}
        >
          {profileName}
          <span style={{ color: "#B22234" }}>.</span>
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#4A4742",
            textAlign: "center",
          }}
        >
          Discover your season at onpurposeassessment.com
        </div>
      </div>
    ),
    { ...size }
  );
}
