/**
 * LATAM Spanish string catalog — single source of truth for all UI text.
 *
 * i18n strategy: strings are used inline for now (no i18n framework).
 * When adding next-intl or similar, replace inline strings with t('key')
 * and move content here into a proper namespace structure.
 *
 * Tone guidelines:
 *   - Casual, futbolero, social
 *   - LATAM Spanish — avoid Spain-specific vocabulary (e.g. use "computadora"
 *     not "ordenador", "carro" / "auto" not "coche")
 *   - No gambling/betting language
 *   - Prefer second person singular informal (tú), not vosotros
 */

export const es = {
  // ─── Navigation ──────────────────────────────────────────────────────────
  nav: {
    home: "Inicio",
    table: "Tabla",
    groups: "Grupos",
    profile: "Perfil",
    signIn: "Ingresar",
    joinGroup: "Unirse al grupo",
  },

  // ─── Common actions ───────────────────────────────────────────────────────
  actions: {
    loading: "Cargando...",
    viewAll: "Ver todos",
    create: "Crear",
    join: "Unirme",
    save: "Guardar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    edit: "Editar",
    delete: "Eliminar",
    share: "Compartir enlace",
  },

  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: {
    login: {
      title: "La Penúltima",
      subtitle: "El lugar donde se sufre pero se gana",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tú@ejemplo.com",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "••••••••",
      forgotPassword: "¿Olvidaste tu contraseña?",
      submitButton: "Ingresar",
      noAccount: "¿No tienes cuenta?",
      joinViaInvite: "Únete por invitación",
      statusMessages: [
        "Revisando la jugada...",
        "Consultando la mesa arbitral...",
        "Buscando culpables...",
        "Confirmando tu versión de los hechos...",
      ],
    },
    signup: {
      title: "Únete a La Penúltima",
      subtitle: "Demuestra que sabes más fútbol que tus amigos.",
      invitedTo: "Te invitaron a jugar",
      usernameLabel: "Nombre de usuario",
      usernamePlaceholder: "ej. goleador_9",
      usernameHint: "Así te van a ver tus amigos",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tú@ejemplo.com",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Mín. 8 caracteres",
      submitButton: "Crear cuenta y unirme",
      terms: "Al registrarte aceptas nuestros",
      termsLink: "términos",
      hasAccount: "¿Ya tienes cuenta?",
      signIn: "Ingresar",
      inviteValidated: "Invitación validada",
    },
  },

  // ─── Landing page ─────────────────────────────────────────────────────────
  landing: {
    pill: "Copa del Mundo 2026 · Grupos de predicciones",
    tagline: "El lugar donde se sufre pero se gana",
    description:
      "Arma grupos privados de predicciones con tus amigos y compite en cada partido del Mundial 2026.",
    ctaCreate: "Crear grupo",
    ctaSignIn: "Ingresar",
    disclaimer: "Únete por invitación · Sin apuestas · Solo el orgullo futbolero",
    scrollHint: "Desliza para explorar",
    varReview: "La Penúltima",
    yourPick: "Tu predicción",
    finalScore: "Marcador final",
    predictionResult: "Resultado de tu predicción",
    exactBadge: "⚡ Resultado exacto · +10 pts",
  },

  // ─── Features section ─────────────────────────────────────────────────────
  features: {
    sectionLabel: "¿Cómo funciona?",
    title: "Hecho para los 90 minutos",
    subtitle: "Todo lo que necesitas para armar tu grupo del Mundial — sin nada que sobre.",
    cards: {
      groups: {
        title: "Grupos Privados",
        description:
          "Arma tu grupo cerrado e invita a tus amigos con un enlace único. Tus predicciones son solo entre ustedes.",
      },
      predictions: {
        title: "Predicciones de Marcador",
        description:
          "Predice el marcador exacto de cada partido. Adivinar el resultado exacto vale más puntos — la precisión tiene recompensa.",
      },
      leaderboard: {
        title: "Tabla de Posiciones en Vivo",
        description:
          "Mira cómo cambia el ranking en tiempo real con cada resultado. Un gol puede cambiarlo todo.",
      },
      var: {
        title: "La Polémica del Partido",
        description:
          "Los cobros dudosos, los giros dramáticos, la predicción que \"casi\" salía — todo queda registrado. Nunca fue tan divertido reclamar.",
      },
    },
    scoring: {
      label: "Sistema de puntuación",
      exact: { label: "Resultado exacto", example: "Predijiste 2–1, salió 2–1" },
      winnerDiff: {
        label: "Ganador correcto + diferencia de goles",
        example: "Predijiste 3–1, salió 2–0",
      },
      winner: { label: "Ganador correcto", example: "Predijiste 1–0, salió 3–1" },
      draw: { label: "Empate correcto", example: "Predijiste 1–1, salió 0–0" },
      wrong: {
        label: "Predicción incorrecta",
        example: "Predijiste victoria, salió derrota",
      },
    },
  },

  // ─── Footer ───────────────────────────────────────────────────────────────
  footer: {
    disclaimer: "No afiliado a la FIFA. Solo para entretenimiento. Copa del Mundo 2026.",
    tagline: "Hecho para los fanáticos del fútbol ⚽",
  },

  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    groupLabel: "Grupo",
    matchDay: "Jornada",
    yourPoints: "tus pts",
    varReviewing: "Consultando la mesa arbitral...",
    sections: {
      today: "Hoy",
      recentResults: "Resultados recientes",
      standings: "Tabla de posiciones",
    },
  },

  // ─── Match card ───────────────────────────────────────────────────────────
  match: {
    live: "EN VIVO",
    finished: "PT", // Partido terminado
    yourPrediction: "Tu predicción",
    vs: "vs",
    badges: {
      exact: "⚡ Exacto",
      correct: "✓ Correcto",
      wrong: "✗ Incorrecto",
      pending: "· Pendiente",
    },
  },

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  leaderboard: {
    title: "Tabla de posiciones",
    viewAll: "Ver todos",
    you: "(tú)",
    exactScores: "exactos",
    points: "pts",
  },

  // ─── Match stages ─────────────────────────────────────────────────────────
  stages: {
    group:         "Fase de grupos",
    round_of_32:   "Dieciseisavos de final",
    round_of_16:   "Octavos de final",
    quarter_final: "Cuartos de final",
    semi_final:    "Semifinal",
    third_place:   "Tercer puesto",
    final:         "Final",
  },

  // ─── Metadata ─────────────────────────────────────────────────────────────
  meta: {
    title: "La Penúltima — Predicciones Copa del Mundo 2026",
    description:
      "Crea grupos privados de predicciones con tus amigos para el Mundial 2026. Predice marcadores, compite en la tabla de posiciones.",
    ogDescription: "Predice. Compite. Reclama que te robaron puntos. Grupos privados para el Mundial 2026.",
  },
} as const;

export type Strings = typeof es;
