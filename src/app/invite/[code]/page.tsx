import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/layout/Navbar";
import InviteJoinForm from "@/components/invite/InviteJoinForm";
import RulesDrawer from "@/components/invite/RulesDrawer";
import Card from "@/components/ui/Card";
import { formatCOP } from "@/lib/groups";
import type { Metadata } from "next";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

// ── Open Graph metadata for invite links ─────────────────────────────
// Phase 1: static image + group name in title.
// Phase 2: swap opengraph-image.tsx to render the dynamic card with
//          group stats and prize pool (see that file for the scaffold).

export async function generateMetadata({ params }: InvitePageProps): Promise<Metadata> {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Fetch just the group name so the title is personalised.
  const supabase = await createClient();
  const { data: groups } = await supabase.rpc("get_group_by_invite_code", {
    code: upperCode,
  });
  const groupName = (groups?.[0] as { name?: string } | null)?.name;

  const title = groupName
    ? `Únete a ${groupName} - Polla Mundialista Interna`
    : "Techtivo Mundialista - Polla Mundialista Interna";
  const description = "Predice, compite y pelea por la bolsa del Mundial. Solo para amigos.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:   "website",
      // Next.js serves opengraph-image.tsx from this route automatically.
      // Explicit image entry ensures crawlers that ignore the convention also pick it up.
      images: [{ url: `/invite/${upperCode}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [`/invite/${upperCode}/opengraph-image`],
    },
  };
}

type InviteGroup = {
  id:               string;
  name:             string;
  invite_code:      string;
  owner_id:         string;
  created_at:       string;
  entry_fee:        number | null;
  first_place_pct:  number | null;
  second_place_pct: number | null;
  payment_key:      string | null;
  active_players:   number;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const supabase = await createClient();

  // Look up the group — works for both anon and authenticated users
  // (get_group_by_invite_code grants EXECUTE to anon via migration 004)
  const { data: groups, error: rpcError } = await supabase.rpc(
    "get_group_by_invite_code",
    { code: upperCode }
  );

  // Invalid or expired code
  if (rpcError || !groups || groups.length === 0) {
    return <InvalidCodePage code={upperCode} />;
  }

  const group = groups[0] as InviteGroup;

  // Check auth — determines which CTA to show
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Unauthenticated ────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <Navbar />
        <InviteLayout group={group}>
          <p className="text-sm text-[#94a3b8] text-center mb-5">
            Crea tu cuenta, únete al grupo y demuestra que sabes más fútbol que tus amigos.
          </p>

          <div className="flex flex-col gap-2 w-full">
            <Link
              href={`/signup?invite=${group.invite_code}&group=${encodeURIComponent(group.name)}`}
              className="flex items-center justify-center h-12 w-full bg-[#00c85a] text-[#0a0a12] font-bold text-sm rounded-xl hover:bg-[#00e87a] transition-colors"
            >
              Crear cuenta y unirme
            </Link>
            <Link
              href={`/login?invite=${group.invite_code}`}
              className="flex items-center justify-center h-11 w-full bg-[#18182a] text-[#94a3b8] text-sm font-medium rounded-xl border border-[#2a2a45] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
            >
              Ya tengo cuenta — Ingresar
            </Link>
          </div>
        </InviteLayout>
      </>
    );
  }

  // ── Authenticated — check if already a member ──────────────────────
  // The group_members SELECT RLS allows seeing rows in groups you belong to.
  // If the query returns a row, the user is already a member.
  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    return (
      <>
        <Navbar />
        <InviteLayout group={group}>
          <div className="text-center">
            <p className="text-sm text-[#94a3b8] mb-5">
              Ya eres parte de este grupo. ¡Ve a ver los partidos y tus predicciones!
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-12 px-8 bg-[#00c85a] text-[#0a0a12] font-bold text-sm rounded-xl hover:bg-[#00e87a] transition-colors"
            >
              Ir al dashboard
            </Link>
          </div>
        </InviteLayout>
      </>
    );
  }

  // ── Authenticated, not yet a member → show join form ──────────────
  const username = user.user_metadata?.username as string | undefined;
  const displayName = username ?? user.email?.split("@")[0] ?? "tú";

  return (
    <>
      <Navbar />
      <InviteLayout group={group}>
        <p className="text-sm text-[#94a3b8] text-center mb-1">
          Ingresando como{" "}
          <span className="text-[#94a3b8] font-semibold">{displayName}</span>
        </p>
        <p className="text-xs text-[#64748b] text-center mb-5">
          Únete para predecir los marcadores del Mundial 2026 con tus amigos.
        </p>
        <InviteJoinForm inviteCode={upperCode} />
        <p className="text-xs text-[#64748b] text-center mt-3">
          ¿No eres tú?{" "}
          <Link href="/login" className="text-[#00c85a] hover:text-[#00e87a]">
            Cambiar de cuenta
          </Link>
        </p>
      </InviteLayout>
    </>
  );
}

// ── Shared layout wrapper ──────────────────────────────────────────────

function InviteLayout({
  group,
  children,
}: {
  group: InviteGroup;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#00c85a]/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18182a] border border-[#2a2a45] text-xs text-[#94a3b8] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c85a] animate-live-pulse" />
            Te invitaron a jugar Techtivo Mundialista
          </div>
          <p className="text-sm text-[#94a3b8] mb-2">Únete al grupo y demuestra que sabes más fútbol que tus amigos.</p>
          <h1 className="text-2xl font-black text-[#f1f5f9]">{group.name}</h1>
        </div>

        {/* Group card */}
        <Card className="p-5 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00c85a]/10 flex items-center justify-center shrink-0 text-xl">
              ⚽
            </div>
            <div>
              <p className="text-sm font-bold text-[#f1f5f9]">{group.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-[#64748b] mt-0.5">
                <Users size={11} strokeWidth={1.8} />
                <span>Polla Mundialista · Mundial 2026</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Participation card */}
        {group.entry_fee && (
          <Card className="p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center shrink-0 text-lg">
                💰
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#64748b] uppercase tracking-wide mb-0.5">
                  Inscripción única
                </p>
                <p className="text-xl font-black text-[#f1f5f9] tabular-nums">
                  {formatCOP(group.entry_fee)}
                </p>
                <p className="text-xs text-[#94a3b8] mt-1 leading-snug">
                  Pago único para participar durante todo el Mundial 2026.
                </p>
                <p className="text-xs text-[#64748b]">
                  No se cobra por partido ni por ronda.
                </p>
                {group.payment_key && (
                  <p className="text-xs text-[#64748b] mt-1">
                    Llave:{" "}
                    <span className="font-mono text-[#94a3b8]">{group.payment_key}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Rules card with drawer */}
        <RulesDrawer
          entryFee={group.entry_fee}
          firstPlacePct={group.first_place_pct}
          secondPlacePct={group.second_place_pct}
        />

        {children}
      </div>
    </main>
  );
}

// ── Invalid code state ─────────────────────────────────────────────────

function InvalidCodePage({ code }: { code: string }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center animate-fade-in-up">
          <div className="text-5xl mb-4">🟥</div>
          <h1 className="text-xl font-black text-[#f1f5f9] mb-2">
            Enlace no válido
          </h1>
          <p className="text-sm text-[#94a3b8] mb-1">
            El código de invitación{" "}
            <span className="font-mono text-[#94a3b8]">{code}</span> no existe
            o ya expiró.
          </p>
          <p className="text-xs text-[#64748b] mb-8">
            Pídele al organizador que te comparta el enlace actualizado.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 bg-[#18182a] text-[#94a3b8] text-sm font-medium rounded-xl border border-[#2a2a45] hover:border-[#3b3b60] hover:text-[#f1f5f9] transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </>
  );
}
