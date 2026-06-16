"use client";

import Link from "next/link";
import { formatRelativeDate } from "@/lib/groups";
import type { NewsImageType } from "@/lib/news";
import type { NewsWithMatch } from "@/lib/db/news";

type Accent = { emoji: string; border: string; glow: string };

const ACCENTS: Record<NewsImageType, Accent> = {
  home_win:    { emoji: "⚽", border: "border-[#22c55e]/25",  glow: "bg-[#22c55e]/[0.04]"  },
  away_win:    { emoji: "⚽", border: "border-[#38bdf8]/25",  glow: "bg-[#38bdf8]/[0.04]"  },
  draw:        { emoji: "🤝", border: "border-[#94a3b8]/20",  glow: "bg-transparent"         },
  goal_fest:   { emoji: "🔥", border: "border-[#f97316]/30",  glow: "bg-[#f97316]/[0.04]"  },
  shutout:     { emoji: "🛡️", border: "border-[#818cf8]/25",  glow: "bg-[#818cf8]/[0.04]"  },
  exacto_fest: { emoji: "⚡", border: "border-[#f59e0b]/35",  glow: "bg-[#f59e0b]/[0.04]"  },
  all_lost:    { emoji: "😅", border: "border-[#475569]/20",  glow: "bg-transparent"         },
  default:     { emoji: "📰", border: "border-[#1e1e35]",     glow: "bg-transparent"         },
};

// Skip first 2 body lines (match info, redundant with headline).
// Show prediction stats instead.
function statsPreview(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.slice(2, 4).join(" · ");
}

export default function NewsCard({ item }: { item: NewsWithMatch }) {
  const imageType = (item.image_type as NewsImageType) in ACCENTS
    ? (item.image_type as NewsImageType)
    : "default";
  const { emoji, border, glow } = ACCENTS[imageType];
  const preview = statsPreview(item.body);

  return (
    <Link
      href={`/noticias/${item.id}`}
      className={`block rounded-2xl border ${border} ${glow} bg-[#11111c] p-4 hover:opacity-90 transition-opacity`}
    >
      {/* Header: emoji + label / date */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#64748b] uppercase tracking-widest flex items-center gap-1.5">
          <span>{emoji}</span>
          <span>Pollita Techtivo</span>
        </span>
        <time
          dateTime={item.created_at}
          className="text-[10px] text-[#475569] tabular-nums shrink-0"
        >
          {formatRelativeDate(item.created_at)}
        </time>
      </div>

      {/* Headline */}
      <p className="text-sm font-bold text-[#f1f5f9] leading-snug mb-2">
        {item.headline}
      </p>

      {/* Stats preview */}
      {preview && (
        <p className="text-xs text-[#94a3b8] leading-relaxed line-clamp-2 mb-3">
          {preview}
        </p>
      )}

      {/* Read indicator */}
      <p className="text-[11px] text-[#475569] font-medium">
        Leer →
      </p>
    </Link>
  );
}
