import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Branded social card, served at /og and referenced by metadata with an
 * absolute canonical URL (see SOCIAL_IMAGE in src/lib/site.ts). Kept as a plain
 * route rather than Next's `opengraph-image` file convention so the advertised
 * URL never depends on the host the request arrived on.
 *
 * Inline styles only — no external fonts or images, so it renders anywhere
 * without a network dependency.
 */
export const dynamic = "force-static";

const HOST = SITE_URL.replace(/^https?:\/\//, "");
const SIZE = { width: 1200, height: 630 };

const PILLS = [
  "Integrated AI — gated & audited",
  "Lock on sign-off",
  "360° feedback (MSF)",
  "RO compliance centre",
];

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#005EB8",
          padding: "60px 64px",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        {/* Masthead */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 14, height: 14, background: "#FFB81C", borderRadius: 999 }} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }}>
              {SITE_NAME}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 1.5, color: "rgba(255,255,255,0.78)" }}>
            {HOST}
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "#FFB81C" }}>
            MAG 2022 · GMC REVALIDATION · NHS ENGLAND
          </div>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2.5 }}>
            Medical appraisal,
          </div>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2.5, color: "#FFB81C" }}>
            without the drag.
          </div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, color: "rgba(255,255,255,0.9)" }}>
            360° feedback, CPD portfolios and a PDP that carries forward — with appraiser
            sign-off and a GMC-ready dossier.
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 14 }}>
          {PILLS.map((pill) => (
            <div
              key={pill}
              style={{
                display: "flex",
                padding: "12px 20px",
                border: "1px solid rgba(255,255,255,0.45)",
                borderRadius: 999,
                fontSize: 21,
                color: "#ffffff",
              }}
            >
              {pill}
            </div>
          ))}
        </div>
      </div>
    ),
    SIZE,
  );
}
