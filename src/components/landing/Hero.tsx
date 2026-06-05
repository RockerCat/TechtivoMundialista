import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      {/* Pitch grid background */}
      <PitchGrid />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#38BDF8]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#3b82f6]/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto gap-6">
        {/* VAR Review label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18182a] border border-[#2a2a45] text-xs text-[#94a3b8] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-live-pulse" />
          Copa del Mundo 2026 · Grupos de predicciones
        </div>

        {/* Main headline */}
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none text-[#f1f5f9]">
            Techtivo{" "}
            <span className="text-gradient-green relative">
              Mundialista
              <VarUnderline />
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-[#94a3b8] font-light">
            El lugar donde se sufre pero se gana
          </p>
        </div>

        {/* Description */}
        <p className="text-[#64748b] text-base md:text-lg max-w-md leading-relaxed">
          Arma grupos privados de predicciones con tus amigos y compite en
          cada partido del{" "}
          <span className="text-[#94a3b8]">Mundial 2026</span>.
        </p>

        {/* VAR review box */}
        <VarReviewBox />

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link href="/signup" className="flex-1">
            <Button size="lg" fullWidth>
              Crear grupo
            </Button>
          </Link>
          <Link href="/login" className="flex-1">
            <Button size="lg" variant="secondary" fullWidth>
              Ingresar
            </Button>
          </Link>
        </div>

        <p className="text-xs text-[#475569]">
          Únete por invitación · Sin apuestas · Solo el orgullo futbolero
        </p>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#475569]">
        <span className="text-xs">Desliza para explorar</span>
        <div className="w-5 h-8 rounded-full border border-[#2a2a45] flex items-start justify-center p-1">
          <div className="w-1 h-2 rounded-full bg-[#475569] animate-bounce" />
        </div>
      </div>
    </section>
  );
}

function VarUnderline() {
  return (
    <svg
      className="absolute -bottom-2 left-0 w-full"
      height="6"
      viewBox="0 0 80 6"
      fill="none"
      preserveAspectRatio="none"
    >
      <path
        d="M0 5 Q20 1 40 4 Q60 7 80 3"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VarReviewBox() {
  return (
    <div className="w-full max-w-sm bg-[#11111c] border border-[#2a2a45] rounded-2xl p-4 text-left">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-live-pulse" />
        <span className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">
          Techtivo Mundialista
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇧🇷</span>
          <div>
            <p className="text-sm font-bold text-[#f1f5f9]">Brasil</p>
            <p className="text-xs text-[#475569]">Tu predicción: 2–1</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-3xl font-black text-[#f1f5f9] tabular-nums">
            2<span className="text-[#475569] mx-1 font-light">–</span>1
          </p>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide">
            FT
          </p>
        </div>
        <div className="flex items-center gap-3 flex-row-reverse">
          <span className="text-2xl">🇦🇷</span>
          <div className="text-right">
            <p className="text-sm font-bold text-[#f1f5f9]">Argentina</p>
            <p className="text-xs text-[#475569]">Marcador final</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#1e1e35]">
        <span className="text-xs text-[#475569]">Resultado de tu predicción</span>
        <span className="text-xs font-bold text-[#fbbf24] bg-[#fbbf24]/10 px-2 py-0.5 rounded-full">
          ⚡ Resultado exacto · +10 pts
        </span>
      </div>
    </div>
  );
}

function PitchGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="pitch-grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pitch-grid)" />
      </svg>
    </div>
  );
}
