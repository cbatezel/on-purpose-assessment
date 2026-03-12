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
          background: "#F0EDE8",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
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
            fontSize: "56px",
            fontWeight: 700,
            color: "#1C1B19",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "800px",
            marginBottom: "24px",
            fontFamily: "serif",
          }}
        >
          Most people feel behind.
        </div>
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "#1C1B19",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: "800px",
            marginBottom: "36px",
            fontFamily: "serif",
          }}
        >
          This will help you figure out why
          <span style={{ color: "#B22234" }}>.</span>
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#4A4742",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          A quarterly diagnostic for your clarity and engagement with purpose.
        </div>
      </div>
    ),
    { ...size }
  );
}
