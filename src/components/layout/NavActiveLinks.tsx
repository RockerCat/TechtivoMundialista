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

export default function NavActiveLinks({ hasLiveMatch = false }: { hasLiveMatch?: boolean }) {
  const pathname = usePathname();
  const { pendingTab, startTabTransition } = useTabTransition();
  const activeTab = pendingTab ?? tabForPathname(pathname);

  return (
    <>
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
              "flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors",
              active
                ? "text-[#f1f5f9] bg-[#18182a]"
                : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a]/60"
            )}
          >
            <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
            {label}
            {isEnVivo && hasLiveMatch && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
            )}
          </Link>
        );
      })}
    </>
  );
}
