import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { computePrizePool, formatCOP } from "@/lib/groups";

export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ code: string }>;
}

// ── Phase 2: dynamic invite OG image ─────────────────────────────────
//
// When ready to implement dynamic generation, wire in the Supabase data
// below and replace the static fallback render with the dynamic one.
//
// Data to fetch:
//   - group.name          (from get_group_by_invite_code RPC)
//   - group member count  (from group_members aggregate)
//   - prize pool          (from entry_fee + first/second_place_pct columns)
//   - invite code         (from params.code)
//
// The scaffolding is in place; uncomment the dynamic section and delete
// the static fallback once the feature is ready to ship.

export default async function InviteOgImage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // ── Phase 2: uncomment to enable dynamic data ──────────────────────
  //
  // const supabase = await createClient();
  //
  // const { data: groups } = await supabase.rpc("get_group_by_invite_code", {
  //   code: upperCode,
  // });
  // const group = groups?.[0] ?? null;
  //
  // let groupName    = "Techtivo Mundialista";
  // let memberCount  = 0;
  // let prizeDisplay: string | null = null;
  //
  // if (group) {
  //   groupName = group.name;
  //
  //   const { count } = await supabase
  //     .from("group_members")
  //     .select("id", { count: "exact", head: true })
  //     .eq("group_id", group.id);
  //   memberCount = count ?? 0;
  //
  //   const pool = computePrizePool(
  //     {
  //       entry_fee:        group.entry_fee        ?? 0,
  //       first_place_pct:  group.first_place_pct  ?? 70,
  //       second_place_pct: group.second_place_pct ?? 30,
  //     },
  //     memberCount
  //   );
  //   if (pool) prizeDisplay = formatCOP(pool.total);
  // }
  //
  // return new ImageResponse(<DynamicCard groupName={groupName} memberCount={memberCount} prizeDisplay={prizeDisplay} code={upperCode} />, size);

  // ── Phase 1 fallback — static image until dynamic is enabled ───────
  return new ImageResponse(
    <StaticCard code={upperCode} />,
    { ...size }
  );
}

// ── Static fallback (Phase 1) ─────────────────────────────────────────

function StaticCard({ code }: { code: string }) {
  return (
    <div style={{
      width: 1200, height: 630,
      backgroundColor: "#0a0a12",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif", position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)",
        width: 800, height: 500, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(0,200,90,0.18) 0%, transparent 70%)",
      }} />

      <div style={{
        width: 88, height: 88, borderRadius: 20,
        backgroundColor: "#00c85a",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 52, marginBottom: 28,
      }}>🏆</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 60, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-1px" }}>La </span>
        <span style={{ fontSize: 60, fontWeight: 900, color: "#00c85a", letterSpacing: "-1px" }}>Mundialista</span>
      </div>

      <p style={{ fontSize: 26, fontWeight: 700, color: "#94a3b8", margin: "0 0 10px 0", textAlign: "center" }}>
        Te invitan a la Polla Mundialista
      </p>
      <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 28px 0", textAlign: "center" }}>
        Demuestra que sabes más fútbol que tus amigos
      </p>

      {/* Invite code badge */}
      <div style={{
        backgroundColor: "#18182a", border: "1px solid #2a2a45",
        borderRadius: 14, padding: "12px 28px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 14, color: "#64748b", letterSpacing: "0.1em" }}>CÓDIGO</span>
        <span style={{ fontSize: 26, fontWeight: 900, color: "#f1f5f9", fontFamily: "monospace", letterSpacing: "0.2em" }}>
          {code}
        </span>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
        background: "linear-gradient(90deg, transparent, #00c85a, transparent)",
      }} />
    </div>
  );
}

// ── Dynamic card (Phase 2 — ready to use once data is wired in) ───────

// function DynamicCard({
//   groupName,
//   memberCount,
//   prizeDisplay,
//   code,
// }: {
//   groupName:    string;
//   memberCount:  number;
//   prizeDisplay: string | null;
//   code:         string;
// }) {
//   return (
//     <div style={{
//       width: 1200, height: 630,
//       backgroundColor: "#0a0a12",
//       display: "flex", flexDirection: "column",
//       alignItems: "center", justifyContent: "center",
//       fontFamily: "sans-serif", position: "relative", overflow: "hidden",
//     }}>
//       {/* Background glow */}
//       <div style={{
//         position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)",
//         width: 800, height: 500, borderRadius: "50%",
//         background: "radial-gradient(ellipse, rgba(0,200,90,0.18) 0%, transparent 70%)",
//       }} />
//
//       <div style={{
//         width: 80, height: 80, borderRadius: 18, backgroundColor: "#00c85a",
//         display: "flex", alignItems: "center", justifyContent: "center",
//         fontSize: 46, marginBottom: 24,
//       }}>🏆</div>
//
//       {/* Group name */}
//       <p style={{ fontSize: 52, fontWeight: 900, color: "#f1f5f9", margin: "0 0 8px 0", textAlign: "center", maxWidth: 900 }}>
//         {groupName}
//       </p>
//       <p style={{ fontSize: 22, color: "#94a3b8", margin: "0 0 28px 0", textAlign: "center" }}>
//         Únete a la Polla Mundialista Interna
//       </p>
//
//       {/* Stats row */}
//       <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
//         <Stat label="Participantes" value={String(memberCount)} />
//         {prizeDisplay && <Stat label="Bolsa" value={prizeDisplay} accent />}
//         <Stat label="Código" value={code} mono />
//       </div>
//
//       <div style={{
//         position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
//         background: "linear-gradient(90deg, transparent, #00c85a, transparent)",
//       }} />
//     </div>
//   );
// }
//
// function Stat({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
//   return (
//     <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
//       <span style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
//       <span style={{ fontSize: 32, fontWeight: 900, color: accent ? "#00c85a" : "#f1f5f9", fontFamily: mono ? "monospace" : "sans-serif", letterSpacing: mono ? "0.15em" : 0 }}>
//         {value}
//       </span>
//     </div>
//   );
// }
