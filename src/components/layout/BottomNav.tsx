"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, User, BookOpen } from "lucide-react";
import { SoccerBallIcon } from "@/components/ui/SoccerBallIcon";

const navItems = [
  { href: "/dashboard",   label: "Inicio",    icon: Home     },
  { href: "/leaderboard", label: "Tabla",     icon: SoccerBallIcon },
  { href: "/community",   label: "Comunidad", icon: Users    },
  { href: "/profile",     label: "Perfil",    icon: User     },
  { href: "/rules",       label: "Reglas",    icon: BookOpen },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0a12]/90 backdrop-blur-xl border-t border-[#1e1e35] overflow-hidden">
      <div className="flex items-stretch h-16 w-full">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === "/community" && pathname.startsWith("/groups"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
                active
                  ? "text-[#38BDF8]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
