import { ImageResponse } from "next/og";

export const runtime = "edge";

// Image metadata for OpenGraph
export const alt = "Viral Thread Generator - Next-Gen AI Creator Studio";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #07060a 0%, #0c0a15 40%, #151124 100%)",
          padding: "60px 80px",
          position: "relative",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Large Decorative Ambient Glows */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            left: "100px",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0) 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            right: "-50px",
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0) 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Left Side: Brand Logo Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "440px",
            height: "440px",
            background: "rgba(255, 255, 255, 0.015)",
            borderRadius: "80px",
            border: "1.5px solid rgba(255, 255, 255, 0.04)",
            position: "relative",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
          }}
        >
          {/* Logo Ambient Glow */}
          <div
            style={{
              position: "absolute",
              width: "260px",
              height: "260px",
              background: "#8b5cf6",
              opacity: 0.18,
              filter: "blur(40px)",
              borderRadius: "50%",
            }}
          />
          
          <svg
            width="320"
            height="320"
            viewBox="0 0 512 512"
            style={{ display: "flex" }}
          >
            <defs>
              <linearGradient id="brand-gradient-og" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              
              <mask id="bubble-mask-og">
                <rect x="0" y="0" width="512" height="512" fill="#ffffff" />
                <polygon points="256,135 315,225 270,225 295,325 205,215 250,215" fill="#000000" />
              </mask>
            </defs>

            {/* Masked Speech Bubble */}
            <g mask="url(#bubble-mask-og)">
              <circle cx="256" cy="240" r="135" fill="url(#brand-gradient-og)" />
              <path d="M 175,325 L 130,365 L 210,345 Z" fill="url(#brand-gradient-og)" />
            </g>

            {/* Elegant Sparks */}
            <path d="M 375,85 Q 375,110 400,110 Q 375,110 375,135 Q 375,110 350,110 Q 375,110 375,85 Z" fill="#ffffff" />
            <path d="M 125,125 Q 125,140 140,140 Q 125,140 125,155 Q 125,140 110,140 Q 125,140 125,125 Z" fill="#a5f3fc" opacity="0.85" />
          </svg>
        </div>

        {/* Right Side: Text & Brand Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "560px",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "9999px",
              border: "1.5px solid rgba(139, 92, 246, 0.3)",
              background: "rgba(139, 92, 246, 0.08)",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#a5f3fc",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              ★ Next-Gen AI Creator Studio
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                fontSize: "64px",
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                background: "linear-gradient(to right, #ffffff, #e9d5ff)",
                backgroundClip: "text",
              }}
            >
              Viral Thread
            </span>
            <span
              style={{
                fontSize: "64px",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                background: "linear-gradient(to right, #a855f7, #06b6d4)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Generator
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: "18px",
              color: "#9ca3af",
              lineHeight: 1.6,
              marginBottom: "36px",
              margin: 0,
            }}
          >
            Create high-performing, engaging Threads sequences from any source link in seconds. Optimize your reach, formatting, and hooks with AI.
          </p>

          {/* Feature Highlights */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "16px",
            }}
          >
            {["Batch Generation", "Virality Scoring", "Post Critiques"].map((feat, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  padding: "6px 12px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#e5e7eb",
                  }}
                >
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
