import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The On Purpose Assessment";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          background: "#FAF7F2",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            color: "#1C1B19",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "900px",
            marginBottom: "32px",
            fontFamily: "serif",
          }}
        >
          The On Purpose Assessment
          <span style={{ color: "#8B2635" }}>.</span>
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#4A4742",
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: "700px",
          }}
        >
          A quarterly diagnostic for your clarity and engagement with purpose.
        </div>
      </div>
    ),
    { ...size }
  );
}
