import { ImageResponse } from "next/og";

export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt         = "Techtivo Pollita - Polla Interna";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width:           1200,
        height:          630,
        backgroundColor: "#0a0a12",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        fontFamily:      "sans-serif",
        position:        "relative",
        overflow:        "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position:        "absolute",
        top:             -160,
        left:            "50%",
        transform:       "translateX(-50%)",
        width:           800,
        height:          500,
        borderRadius:    "50%",
        background:      "radial-gradient(ellipse, rgba(56,189,248,0.18) 0%, transparent 70%)",
        pointerEvents:   "none",
      }} />

      {/* Brand icon */}
      <div style={{
        width:           96,
        height:          96,
        borderRadius:    22,
        backgroundColor: "#38BDF8",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        fontSize:        56,
        marginBottom:    32,
      }}>
        ⚽
      </div>

      {/* App name */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          12,
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 64, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-1px" }}>
          Techtivo{" "}
        </span>
        <span style={{ fontSize: 64, fontWeight: 900, color: "#38BDF8", letterSpacing: "-1px" }}>
          Pollita
        </span>
      </div>

      {/* Tagline 1 */}
      <p style={{
        fontSize:     28,
        fontWeight:   700,
        color:        "#94a3b8",
        margin:       "0 0 12px 0",
        textAlign:    "center",
      }}>
        Polla Pollita Interna
      </p>

      {/* Tagline 2 */}
      <p style={{
        fontSize:     22,
        fontWeight:   400,
        color:        "#64748b",
        margin:       0,
        textAlign:    "center",
        maxWidth:     700,
      }}>
        Predice, compite y pelea por la bolsa del Mundial
      </p>

      {/* Bottom accent bar */}
      <div style={{
        position:        "absolute",
        bottom:          0,
        left:            0,
        right:           0,
        height:          4,
        background:      "linear-gradient(90deg, transparent, #38BDF8, transparent)",
      }} />
    </div>,
    { ...size }
  );
}
