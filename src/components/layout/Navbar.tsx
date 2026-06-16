import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavActiveLinks from "./NavActiveLinks";
import UserMenu from "./UserMenu";
import TechtivoWordmark from "@/components/ui/TechtivoWordmark";

export default async function Navbar({ hasLiveMatch = false }: { hasLiveMatch?: boolean }) {
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
        <Link href={user ? "/dashboard" : "/login"} className="shrink-0">
          <TechtivoWordmark width={88} height={19} subtitleClassName="text-[9px]" />
        </Link>

        {user ? (
          <AuthenticatedNav displayName={displayName} initial={initial} hasLiveMatch={hasLiveMatch} />
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
  hasLiveMatch,
}: {
  displayName: string;
  initial: string;
  hasLiveMatch: boolean;
}) {
  return (
    <>
      {/* Desktop center links */}
      <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
        <NavActiveLinks hasLiveMatch={hasLiveMatch} />
      </nav>

      {/* Right side — UserMenu handles both mobile and desktop */}
      <UserMenu displayName={displayName} initial={initial} />
    </>
  );
}

/* ── Guest nav ──────────────────────────────────────────────────────── */

function GuestNav() {
  return (
    <Link
      href="/login"
      className="text-sm font-semibold bg-[#38BDF8] text-[#0a0a12] px-4 py-2 rounded-xl hover:bg-[#7DD3FC] transition-colors"
    >
      Ingresar
    </Link>
  );
}
