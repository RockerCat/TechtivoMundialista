export default function Footer() {
  return (
    <footer className="border-t border-[#1e1e35] px-4 py-8 mt-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#38BDF8] flex items-center justify-center">
            <span className="text-xs leading-none">⚽</span>
          </div>
          <span className="text-sm font-bold text-[#f1f5f9]">
            Techtivo <span className="text-[#38BDF8]">Mundialista</span>
          </span>
        </div>
        <p className="text-xs text-[#475569] text-center">
          No afiliado a la FIFA. Solo para entretenimiento. Copa del Mundo 2026.
        </p>
        <p className="text-xs text-[#475569]">
          Hecho para los fanáticos del fútbol ⚽
        </p>
      </div>
    </footer>
  );
}
