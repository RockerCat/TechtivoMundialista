import type { NewsWithMatch } from "@/lib/db/news";
import NewsCard from "./NewsCard";

export default function NewsFeed({ items }: { items: NewsWithMatch[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#1e1e35] bg-transparent p-6 text-center">
        <p className="text-xs text-[#475569]">
          Aún no hay noticias. Aparecerán cuando se cierre un partido.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  );
}
