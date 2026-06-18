import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isUserDisabled } from "@/lib/db/admin";
import { getNewsById } from "@/lib/db/news";
import { formatRelativeDate } from "@/lib/groups";
import NewsShareButton from "@/components/groups/NewsShareButton";

const STAGE_LABEL: Record<string, string> = {
  group:         "Fase de grupos",
  round_of_32:   "Dieciseisavos de final",
  round_of_16:   "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final:    "Semifinales",
  third_place:   "Tercer puesto",
  final:         "Final",
};

const NEWS_EMOJI: Record<string, string> = {
  home_win:    "⚽",
  away_win:    "⚽",
  draw:        "🤝",
  goal_fest:   "🔥",
  shutout:     "🛡️",
  exacto_fest: "⚡",
  all_lost:    "😅",
  default:     "📰",
};

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ newsId: string }>;
}) {
  const { newsId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isUserDisabled(user.id)) redirect("/disabled");

  const item = await getNewsById(newsId);
  if (!item) notFound();

  const emoji = NEWS_EMOJI[item.image_type] ?? NEWS_EMOJI.default;
  const stageLabel = STAGE_LABEL[item.stage] ?? item.stage;
  const hasScore = item.home_score !== null && item.away_score !== null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Back link */}
      <Link
        href="/noticias"
        className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1"
      >
        ← Noticias
      </Link>

      {/* Banner */}
      <Image
        src="/img/corresponsal_pollita.png"
        alt="Pollita News"
        width={2883}
        height={1667}
        className="w-full h-auto rounded-2xl"
      />

      {/* Badge + date */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#64748b] uppercase tracking-widest flex items-center gap-1.5">
          <span>{emoji}</span>
          <span>Pollita Techtivo</span>
        </span>
        <time
          dateTime={item.created_at}
          className="text-[10px] text-[#475569] tabular-nums"
        >
          {formatRelativeDate(item.created_at)}
        </time>
      </div>

      {/* Headline */}
      <h1 className="text-xl font-black text-[#f1f5f9] leading-snug">
        {item.headline}
      </h1>

      {/* Match info */}
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-4">
        <p className="text-[10px] text-[#64748b] uppercase tracking-widest font-semibold mb-3">
          {stageLabel}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl leading-none shrink-0">{item.home_flag}</span>
            <span className="text-sm font-semibold text-[#f1f5f9] truncate">{item.home_name}</span>
          </div>
          {hasScore ? (
            <span className="text-2xl font-black text-[#f1f5f9] tabular-nums shrink-0 px-2">
              {item.home_score} – {item.away_score}
            </span>
          ) : (
            <span className="text-sm text-[#475569] shrink-0">vs</span>
          )}
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <span className="text-sm font-semibold text-[#f1f5f9] truncate text-right">{item.away_name}</span>
            <span className="text-xl leading-none shrink-0">{item.away_flag}</span>
          </div>
        </div>
      </div>

      {/* Body — full text, respects newlines */}
      <div className="space-y-3">
        {item.body.split("\n\n").map((section, i) => (
          <p
            key={i}
            className="text-sm text-[#94a3b8] leading-relaxed whitespace-pre-line"
          >
            {section}
          </p>
        ))}
      </div>

      {/* Share */}
      <div className="pt-2">
        <NewsShareButton
          headline={item.headline}
          body={item.body}
        />
      </div>

      <div className="h-4" />
    </div>
  );
}
