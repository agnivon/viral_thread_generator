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
          background: "linear-gradient(135deg, #0a090e 0%, #0e0c15 50%, #14111f 100%)",
          borderRadius: "44px",
          border: "4px solid rgba(124, 58, 237, 0.25)",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Glow ambient effects in background */}
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            left: "20px",
            width: "100px",
            height: "100px",
            background: "#7c3aed",
            opacity: 0.15,
            filter: "blur(20px)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "80px",
            height: "80px",
            background: "#06b6d4",
            opacity: 0.12,
            filter: "blur(15px)",
            borderRadius: "50%",
          }}
        />

        <svg
          width="135"
          height="135"
          viewBox="0 0 512 512"
          style={{ display: "flex" }}
        >
          <defs>
            <linearGradient id="brand-gradient-apple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="bolt-grad-apple" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="60%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <linearGradient id="spark-grad-apple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Dynamic Rings */}
          <circle cx="256" cy="360" r="72" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="16 12" opacity="0.25" />
          <circle cx="198" cy="260" r="54" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="8 8" opacity="0.25" />

          {/* Thread Connection Line */}
          <path d="M 140,160 L 256,360" stroke="url(#brand-gradient-apple)" strokeWidth="12" strokeLinecap="round" />

          {/* Thread Nodes */}
          <circle cx="256" cy="360" r="32" fill="url(#brand-gradient-apple)" />
          <circle cx="256" cy="360" r="32" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.4" />

          <circle cx="198" cy="260" r="24" fill="url(#brand-gradient-apple)" />
          <circle cx="198" cy="260" r="24" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.4" />

          <circle cx="140" cy="160" r="16" fill="url(#brand-gradient-apple)" />
          <circle cx="140" cy="160" r="16" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.4" />

          {/* Lightning Bolt */}
          <polygon points="256,360 330,265 305,265 395,130 325,225 350,225" fill="url(#bolt-grad-apple)" />

          {/* Sparks */}
          <path d="M 405,100 Q 405,120 425,120 Q 405,120 405,140 Q 405,120 385,120 Q 405,120 405,100 Z" fill="#ffffff" />
          <path d="M 115,105 Q 115,115 125,115 Q 115,115 115,125 Q 115,115 105,115 Q 115,115 115,105 Z" fill="#a5f3fc" opacity="0.8" />
          <path d="M 370,295 Q 370,302 377,302 Q 370,302 370,309 Q 370,302 363,302 Q 370,302 370,295 Z" fill="#7c3aed" opacity="0.7" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
