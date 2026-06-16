import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isUserDisabled } from "@/lib/db/admin";
import { getRecentNews } from "@/lib/db/news";
import NewsCard from "@/components/groups/NewsCard";

export default async function NoticiasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await isUserDisabled(user.id)) redirect("/disabled");

  const news = await getRecentNews(100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      <Link
        href="/community"
        className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors inline-flex items-center gap-1"
      >
        ← Comunidad
      </Link>

      {/* Banner principal */}
      <Image
        src="/img/corresponsal_pollita.png"
        alt="Pollita News"
        width={2883}
        height={1667}
        className="w-full h-auto rounded-2xl"
        priority
      />

      {/* Título y descripción */}
      <div>
        <h1 className="text-2xl font-black text-[#f1f5f9]">Pollita News</h1>
        <p className="text-sm text-[#64748b] mt-2 leading-relaxed">
          Las últimas novedades del Mundial, movimientos en la tabla, líderes, premios proyectados y resultados destacados.
        </p>
      </div>

      <div className="border-t border-[#1e1e35]" />

      {news.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#1e1e35] p-10 text-center">
          <p className="text-sm text-[#475569]">
            Aún no hay noticias. Aparecerán cuando se cierre un partido.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
