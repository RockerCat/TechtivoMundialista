"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, Trophy, ListOrdered, Radio } from "lucide-react";
import { useTabTransition, tabForPathname, type TabId } from "./TabTransitionProvider";

const navItems: { href: string; label: string; icon: typeof Home; tab: TabId }[] = [
  { href: "/dashboard",   label: "Inicio",    icon: Home,        tab: "dashboard"   },
  { href: "/leaderboard", label: "Tabla",     icon: ListOrdered, tab: "leaderboard" },
  { href: "/en-vivo",     label: "En Vivo",   icon: Radio,       tab: "en-vivo"     },
  { href: "/copa",        label: "Copa",      icon: Trophy,      tab: "copa"        },
  { href: "/community",   label: "Comunidad", icon: Users,       tab: "community"   },
];

export default function BottomNav({ hasLiveMatch = false }: { hasLiveMatch?: boolean }) {
  const pathname = usePathname();
  const { pendingTab, startTabTransition } = useTabTransition();
  const activeTab = pendingTab ?? tabForPathname(pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a12]/90 backdrop-blur-xl border-t border-[#1e1e35] overflow-hidden">
      <div className="flex items-stretch h-16 w-full">
        {navItems.map(({ href, label, icon: Icon, tab }) => {
          const active = activeTab === tab;
          const isEnVivo = tab === "en-vivo";

          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                if (tab !== tabForPathname(pathname)) startTabTransition(tab);
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                active
                  ? "text-[#38BDF8]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              )}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                {isEnVivo && hasLiveMatch && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
