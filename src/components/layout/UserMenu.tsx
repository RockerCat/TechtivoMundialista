"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Newspaper, User, BookOpen } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";

const MENU_ITEMS = [
  { href: "/noticias", label: "Noticias", icon: Newspaper },
  { href: "/profile",  label: "Perfil",   icon: User      },
  { href: "/rules",    label: "Reglas",   icon: BookOpen  },
];

export default function UserMenu({
  displayName,
  initial,
}: {
  displayName: string;
  initial: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEscape);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">

      {/* Trigger chip */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 bg-[#18182a] border border-[#2a2a45] rounded-xl px-3 py-1.5 hover:border-[#38BDF8]/40 transition-colors"
      >
        <div className="w-5 h-5 rounded-full bg-[#38BDF8]/20 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-[#38BDF8]">{initial}</span>
        </div>
        <span className="text-sm text-[#94a3b8] max-w-[110px] truncate">{displayName}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`text-[#475569] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[#1A2140] bg-[#0B1020] shadow-xl shadow-black/40 overflow-hidden z-50"
        >
          {MENU_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#18182a] transition-colors"
            >
              <Icon size={14} strokeWidth={1.8} className="shrink-0" />
              {label}
            </Link>
          ))}
          <div className="border-t border-[#1A2140]">
            <LogoutButton menuItem />
          </div>
        </div>
      )}

    </div>
  );
}
