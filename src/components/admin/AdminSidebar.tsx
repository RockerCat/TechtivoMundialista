"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Trophy,
  BarChart3,
  Link2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";

const NAV = [
  { href: "/admin",             label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/matches",     label: "Partidos",     icon: CalendarDays    },
  { href: "/admin/users",       label: "Usuarios",     icon: Users           },
  { href: "/admin/ranking",         label: "Ranking",        icon: Trophy      },
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
        <div className="px-5 py-5 border-b border-[#1e1e35]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00c85a] flex items-center justify-center">
              <span className="text-sm leading-none">🏆</span>
            </div>
            <div>
              <p className="text-xs font-black text-[#f1f5f9] leading-none">La Penúltima</p>
              <p className="text-[9px] text-[#64748b] font-mono mt-0.5">Admin</p>
            </div>
          </div>
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
                  ? "bg-[#00c85a]/10 text-[#00c85a]"
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
          <span className="text-xs font-black text-[#f1f5f9]">
            La <span className="text-[#00c85a]">Penúltima</span>
            <span className="text-[#64748b] font-mono font-normal ml-1.5">Admin</span>
          </span>
          <nav className="flex items-center gap-0.5">
            {NAV.map(({ href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
                  isActive(href)
                    ? "text-[#00c85a] bg-[#00c85a]/10"
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
