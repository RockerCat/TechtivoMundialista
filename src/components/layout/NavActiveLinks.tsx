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

export default function NavActiveLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href === "/community" && pathname.startsWith("/groups"));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors",
              active
                ? "text-[#f1f5f9] bg-[#18182a]"
                : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a]/60"
            )}
          >
            <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        );
      })}
    </>
  );
}
