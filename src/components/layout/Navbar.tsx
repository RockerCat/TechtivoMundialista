import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";
import NavActiveLinks from "./NavActiveLinks";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const username = user?.user_metadata?.username as string | undefined;
  const displayName = username ?? user?.email?.split("@")[0] ?? "jugador";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-[#1e1e35]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link href={user ? "/dashboard" : "/login"} className="flex items-center gap-2 shrink-0">
          <VarLogo />
          <span className="font-bold text-lg tracking-tight text-[#f1f5f9]">
            La <span className="text-gradient-green">Penúltima</span>
          </span>
        </Link>

        {user ? (
          <AuthenticatedNav displayName={displayName} initial={initial} />
        ) : (
          <GuestNav />
        )}
      </div>
    </header>
  );
}

/* ── Authenticated nav ──────────────────────────────────────────────── */

function AuthenticatedNav({
  displayName,
  initial,
}: {
  displayName: string;
  initial: string;
}) {
  return (
    <>
      {/* Desktop center links */}
      <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
        <NavActiveLinks />
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* User chip — desktop only */}
        <div className="hidden sm:flex items-center gap-2 bg-[#18182a] border border-[#2a2a45] rounded-xl px-3 py-1.5">
          <div className="w-5 h-5 rounded-full bg-[#00c85a]/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#00c85a]">{initial}</span>
          </div>
          <span className="text-sm text-[#94a3b8] max-w-[110px] truncate">
            {displayName}
          </span>
        </div>

        {/* Mobile: avatar + name + logout — all in one flex row */}
        <div className="sm:hidden flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#00c85a]/20 border border-[#00c85a]/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#00c85a]">{initial}</span>
          </div>
          <span className="text-sm font-medium text-[#94a3b8] truncate max-w-[90px]">
            {displayName}
          </span>
          <LogoutButton compact />
        </div>

        {/* Desktop: text + icon */}
        <div className="hidden sm:block">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}

/* ── Guest nav ──────────────────────────────────────────────────────── */

function GuestNav() {
  return (
    <Link
      href="/login"
      className="text-sm font-semibold bg-[#00c85a] text-[#0a0a12] px-4 py-2 rounded-xl hover:bg-[#00e87a] transition-colors"
    >
      Ingresar
    </Link>
  );
}

/* ── Shared ─────────────────────────────────────────────────────────── */

function VarLogo() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#00c85a] flex items-center justify-center">
      <span className="text-base leading-none">🏆</span>
    </div>
  );
}
