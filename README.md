# El VAR ⚽

**Private FIFA World Cup 2026 prediction groups.**

Predict match scores, compete with friends on private leaderboards, and experience the drama of VAR moments — all from your phone during the game.

> "El VAR is reviewing your prediction..."

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Auth & DB | Supabase *(coming soon)* |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup — no bottom nav
│   │   ├── login/
│   │   └── signup/
│   ├── (app)/            # Authenticated app — with bottom nav
│   │   └── dashboard/
│   ├── layout.tsx        # Root layout (Navbar, fonts, metadata)
│   ├── page.tsx          # Landing page
│   └── globals.css       # Design tokens + animations
├── components/
│   ├── ui/               # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── layout/           # Navigation components
│   │   ├── Navbar.tsx    # Desktop top nav
│   │   └── BottomNav.tsx # Mobile fixed bottom nav
│   ├── landing/          # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   └── Footer.tsx
│   └── dashboard/        # App feature components
│       ├── MatchCard.tsx
│       └── LeaderboardCard.tsx
├── lib/
│   └── utils.ts          # cn() and shared utilities
└── types/
    └── index.ts          # Domain types (Match, Prediction, Group...)
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero + features |
| `/login` | Email/password login |
| `/signup` | Registration via invite link |
| `/dashboard` | Match predictions + leaderboard |

---

## Design System

Dark-first. Broadcast-inspired. Mobile-first.

**Colors**
- Background: `#0a0a12` — deep pitch black
- Surface: `#18182a` — card backgrounds
- Green accent: `#00c85a` — primary actions, brand
- Blue accent: `#3b82f6` — VAR review states
- Gold: `#f59e0b` — trophies, top scores
- Live red: `#ef4444` — live matches

**Typography**
- Font: Geist Sans (system-ui fallback)
- Score displays: `font-black tabular-nums`
- Labels: `font-mono uppercase tracking-widest`

---

## Scoring System

| Result | Points |
|--------|--------|
| Exact score | +10 |
| Correct winner + goal difference | +7 |
| Correct winner | +5 |
| Correct draw | +5 |
| Wrong | +0 |

---

## Roadmap

### Phase 1 — Foundation ✅
- [x] Next.js 15 + TypeScript setup
- [x] Tailwind v4 design system
- [x] Landing page
- [x] Auth pages (login / signup)
- [x] Dashboard placeholder
- [x] Mobile-first navigation

### Phase 2 — Backend
- [ ] Supabase project setup
- [ ] User authentication (email/password)
- [ ] Groups + invite links
- [ ] Match data (World Cup 2026 fixture list)
- [ ] Predictions CRUD

### Phase 3 — Live Experience
- [ ] Real-time score updates
- [ ] Live leaderboard updates
- [ ] Push notifications for match starts
- [ ] VAR review animations

### Phase 4 — Polish
- [ ] Prediction deadline enforcement (match kickoff lock)
- [ ] Multiple groups per user
- [ ] Group admin tools
- [ ] Season summary / stats

---

## Authentication Flow

Registration is **invite-only** by design:

1. Group admin creates a group → gets a unique invite link
2. Friend opens the link (`/signup?invite=CODE`)
3. Friend creates an account
4. Account is automatically joined to the group

No OAuth. No Google. Email + password only.

---

## Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set environment variables in Vercel dashboard (Supabase keys once configured).

---

## Development Notes

- **Mobile-first**: Always test at 390px width first
- **Dark only**: No light mode — intentional design decision
- **No betting**: This is a social prediction game for entertainment only
- **Route groups**: `(auth)` and `(app)` organize layouts without affecting URLs

---

*Not affiliated with FIFA. For entertainment purposes only.*
