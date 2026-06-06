"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  Link2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import { SoccerBallIcon } from "@/components/ui/SoccerBallIcon";
import TechtivoWordmark from "@/components/ui/TechtivoWordmark";

const NAV = [
  { href: "/admin",             label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/matches",     label: "Partidos",     icon: CalendarDays    },
  { href: "/admin/users",       label: "Usuarios",     icon: Users           },
  { href: "/admin/ranking",         label: "Ranking",        icon: SoccerBallIcon },
  { href: "/admin/classification",  label: "Clasificación",  icon: BarChart3   },
  { href: "/admin/invitations",     label: "Invitaciones",   icon: Link2       },
  { href: "/admin/activity",    label: "Actividad",    icon: Activity        },
  { href: "/admin/security",    label: "Seguridad",    icon: ShieldCheck     },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 min-h-dvh bg-[#080810] border-r border-[#1e1e35] shrink-0">

        {/* Brand */}
        <div className="px-5 py-4 border-b border-[#1e1e35]">
          <TechtivoWordmark
            width={100}
            height={22}
            subtitleClassName="text-[9px]"
            className="items-start"
          />
          <p className="text-[9px] text-[#64748b] font-mono mt-1">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-[#38BDF8]/10 text-[#38BDF8]"
                  : "text-[#94a3b8] hover:text-[#94a3b8] hover:bg-[#18182a]"
              )}
            >
              <Icon size={16} strokeWidth={isActive(href) ? 2.2 : 1.8} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-5 border-t border-[#1e1e35] pt-3">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-50 bg-[#080810]/90 backdrop-blur border-b border-[#1e1e35]">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <TechtivoWordmark width={72} height={16} subtitleClassName="text-[8px]" />
            <span className="text-[9px] text-[#64748b] font-mono">Admin</span>
          </div>
          <nav className="flex items-center gap-0.5">
            {NAV.map(({ href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
                  isActive(href)
                    ? "text-[#38BDF8] bg-[#38BDF8]/10"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                )}
              >
                <Icon size={16} strokeWidth={isActive(href) ? 2.2 : 1.8} />
              </Link>
            ))}
            <LogoutButton compact />
          </nav>
        </div>
      </header>
    </>
  );
}
