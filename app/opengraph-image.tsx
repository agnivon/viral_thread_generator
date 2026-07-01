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
            background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0) 70%)",
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
            background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0) 70%)",
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
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "80px",
            border: "1.5px solid rgba(255, 255, 255, 0.05)",
            position: "relative",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Logo Glow */}
          <div
            style={{
              position: "absolute",
              width: "280px",
              height: "280px",
              background: "#7c3aed",
              opacity: 0.2,
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
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>

              <linearGradient id="bolt-grad-og" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="60%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>

            {/* Dynamic Rings */}
            <circle cx="256" cy="360" r="72" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="16 12" opacity="0.3" />
            <circle cx="198" cy="260" r="54" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="8 8" opacity="0.3" />

            {/* Thread Connection Line */}
            <path d="M 140,160 L 256,360" stroke="url(#brand-gradient-og)" strokeWidth="12" strokeLinecap="round" />

            {/* Thread Nodes */}
            <circle cx="256" cy="360" r="32" fill="url(#brand-gradient-og)" />
            <circle cx="256" cy="360" r="32" fill="none" stroke="#ffffff" strokeWidth="3.5" opacity="0.45" />

            <circle cx="198" cy="260" r="24" fill="url(#brand-gradient-og)" />
            <circle cx="198" cy="260" r="24" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.45" />

            <circle cx="140" cy="160" r="16" fill="url(#brand-gradient-og)" />
            <circle cx="140" cy="160" r="16" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.45" />

            {/* Lightning Bolt */}
            <polygon points="256,360 330,265 305,265 395,130 325,225 350,225" fill="url(#bolt-grad-og)" />

            {/* Sparks */}
            <path d="M 405,100 Q 405,120 425,120 Q 405,120 405,140 Q 405,120 385,120 Q 405,120 405,100 Z" fill="#ffffff" />
            <path d="M 115,105 Q 115,115 125,115 Q 115,115 115,125 Q 115,115 105,115 Q 115,115 115,105 Z" fill="#a5f3fc" opacity="0.8" />
            <path d="M 370,295 Q 370,302 377,302 Q 370,302 370,309 Q 370,302 363,302 Q 370,302 370,295 Z" fill="#7c3aed" opacity="0.7" />
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
              border: "1.5px solid rgba(124, 58, 237, 0.3)",
              background: "rgba(124, 58, 237, 0.08)",
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
                background: "linear-gradient(to right, #ffffff, #d8b4fe)",
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
                background: "linear-gradient(to right, #c084fc, #06b6d4)",
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
