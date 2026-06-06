import { Users, Target, Zap } from "lucide-react";
import { SoccerBallIcon } from "@/components/ui/SoccerBallIcon";
import Card from "@/components/ui/Card";

const features = [
  {
    icon: Users,
    color: "#38BDF8",
    title: "Grupos Privados",
    description:
      "Arma tu grupo cerrado e invita con un enlace único. Tus predicciones son solo entre ustedes.",
  },
  {
    icon: Target,
    color: "#3b82f6",
    title: "Predicciones de Marcador",
    description:
      "Predice el marcador exacto de cada partido. Adivinar el resultado exacto vale más puntos — la precisión tiene recompensa.",
  },
  {
    icon: SoccerBallIcon,
    color: "#f59e0b",
    title: "Tabla de Posiciones en Vivo",
    description:
      "Mira cómo cambia el ranking en tiempo real con cada resultado. Un gol puede cambiarlo todo.",
  },
  {
    icon: Zap,
    color: "#ef4444",
    title: "La Polémica del Partido",
    description:
      "Los cobros dudosos, los giros dramáticos, la predicción que \"casi\" salía — todo queda registrado. Nunca fue tan divertido reclamar.",
  },
];

export default function Features() {
  return (
    <section className="px-4 py-20 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-xs font-mono text-[#38BDF8] uppercase tracking-widest mb-3">
          ¿Cómo funciona?
        </p>
        <h2 className="text-3xl md:text-4xl font-black text-[#f1f5f9] mb-3">
          Hecho para los 90 minutos
        </h2>
        <p className="text-[#64748b] max-w-md mx-auto">
          Todo lo que necesitas para armar tu grupo del Mundial — sin nada que sobre.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>

      {/* Scoring breakdown */}
      <div className="mt-16">
        <ScoringBreakdown />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  color,
  title,
  description,
}: (typeof features)[0]) {
  return (
    <Card className="p-6 hover:border-[#2a2a45]/80 transition-all duration-200 group hover:-translate-y-0.5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} style={{ color }} strokeWidth={1.8} />
      </div>
      <h3 className="font-bold text-[#f1f5f9] mb-2">{title}</h3>
      <p className="text-sm text-[#64748b] leading-relaxed">{description}</p>
    </Card>
  );
}

function ScoringBreakdown() {
  const tiers = [
    {
      label: "Resultado exacto",
      points: "+10",
      example: "Predijiste 2–1, salió 2–1",
      color: "#fbbf24",
      badge: "⚡",
    },
    {
      label: "Ganador correcto + diferencia de goles",
      points: "+7",
      example: "Predijiste 3–1, salió 2–0",
      color: "#38BDF8",
      badge: "✓",
    },
    {
      label: "Ganador correcto",
      points: "+5",
      example: "Predijiste 1–0, salió 3–1",
      color: "#3b82f6",
      badge: "→",
    },
    {
      label: "Empate correcto",
      points: "+5",
      example: "Predijiste 1–1, salió 0–0",
      color: "#94a3b8",
      badge: "≈",
    },
    {
      label: "Predicción incorrecta",
      points: "+0",
      example: "Predijiste victoria, salió derrota",
      color: "#475569",
      badge: "✗",
    },
  ];

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-mono text-[#3b82f6] uppercase tracking-widest">
          Sistema de puntuación
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-[#1e1e35] last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm" style={{ color: tier.color }}>
                {tier.badge}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#94a3b8] truncate">
                  {tier.label}
                </p>
                <p className="text-xs text-[#475569]">{tier.example}</p>
              </div>
            </div>
            <span
              className="text-sm font-bold tabular-nums shrink-0"
              style={{ color: tier.color }}
            >
              {tier.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
