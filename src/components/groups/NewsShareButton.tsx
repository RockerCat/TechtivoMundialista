"use client";

const NEWS_HUB_URL = "https://pollita.techtivo.com/noticias";

export default function NewsShareButton({
  headline,
  body,
}: {
  headline: string;
  body: string;
}) {
  function handleShare() {
    const text = [
      "🎙️ Pollita News",
      "🤖 Generado por IA",
      "",
      headline,
      "",
      body,
      "",
      "📰 Más noticias:",
      NEWS_HUB_URL,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      onClick={handleShare}
      type="button"
      className="inline-flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/15 border border-[#25D366]/20 text-[#25D366] hover:text-[#22c55e] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
    >
      💬 Compartir en WhatsApp
    </button>
  );
}
