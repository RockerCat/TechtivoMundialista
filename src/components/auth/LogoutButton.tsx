"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  /** compact: icon-only square, used in the navbar on small screens */
  compact?: boolean;
  /** menuItem: full-width left-aligned row, used inside dropdown menus */
  menuItem?: boolean;
}

export default function LogoutButton({ compact = false, menuItem = false }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      aria-label="Cerrar sesión"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl transition-colors",
        "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "active:scale-[0.97]",
        compact
          ? "w-9 h-9"
          : menuItem
          ? "w-full justify-start gap-3 px-4 py-2.5 rounded-none text-sm"
          : "h-9 px-3 text-sm"
      )}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <>
          <LogOut size={menuItem ? 14 : 15} strokeWidth={1.8} />
          {!compact && <span className="font-medium">Cerrar sesión</span>}
        </>
      )}
    </button>
  );
}
