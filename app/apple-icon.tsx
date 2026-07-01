import { ImageResponse } from "next/og";

export const runtime = "edge";

// Image metadata for Apple touch icon
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0812 0%, #141124 100%)",
          borderRadius: "44px",
          border: "4px solid rgba(124, 92, 246, 0.2)",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        <svg
          width="135"
          height="135"
          viewBox="0 0 512 512"
          style={{ display: "flex" }}
        >
          <defs>
            <linearGradient id="brand-gradient-apple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            
            <mask id="bubble-mask-apple">
              <rect x="0" y="0" width="512" height="512" fill="#ffffff" />
              <polygon points="256,135 315,225 270,225 295,325 205,215 250,215" fill="#000000" />
            </mask>
          </defs>

          {/* Masked Speech Bubble */}
          <g mask="url(#bubble-mask-apple)">
            <circle cx="256" cy="240" r="135" fill="url(#brand-gradient-apple)" />
            <path d="M 175,325 L 130,365 L 210,345 Z" fill="url(#brand-gradient-apple)" />
          </g>

          {/* Elegant 4-point Sparks */}
          <path d="M 375,85 Q 375,110 400,110 Q 375,110 375,135 Q 375,110 350,110 Q 375,110 375,85 Z" fill="#ffffff" />
          <path d="M 125,125 Q 125,140 140,140 Q 125,140 125,155 Q 125,140 110,140 Q 125,140 125,125 Z" fill="#a5f3fc" opacity="0.85" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
