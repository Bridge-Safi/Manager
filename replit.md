# GradoEats / Bridge Safi — Monorepo

Plateforme de livraison et de transport à Safi (Maroc). Monorepo pnpm avec plusieurs apps React + un backend Express.

## Structure

```
artifacts/
  api-server/          → Backend Express (port $PORT / 8080) — JWT auth, PostgreSQL, SSE
  restaurant-dashboard/ → Dashboard restaurants (port auto, préfixe /restaurant-dashboard/)
  driver-app/          → App livreurs / chauffeurs (port auto, préfixe /driver-app/)
  delivery-manager/    → Interface admin GradoEats (port auto, préfixe /)
  safi-runner/         → Jeu 3D React Three Fiber + Supabase (préfixe /safi-runner/)
lib/
  api-zod/             → Schémas Zod générés depuis OpenAPI
  api-client-react/    → Hooks TanStack Query générés (orval)
  api-spec/            → openapi.yaml source
  db/                  → Drizzle ORM + schéma PostgreSQL
```

## Lancer le projet

```bash
pnpm install
# Chaque workflow démarre automatiquement
```

## Variables d'environnement requises

| Variable | Usage |
|---|---|
| `DATABASE_URL` | PostgreSQL (obligatoire pour l'API) |
| `SESSION_SECRET` | JWT signing secret |
| `SUPABASE_URL` | Safi Runner / scores |
| `SUPABASE_SERVICE_ROLE_KEY` | Safi Runner admin |
| `LIVREUR_API_KEY` | Auth livreurs externe |
| `VITE_SUPABASE_URL` | Safi Runner frontend |
| `VITE_SUPABASE_ANON_KEY` | Safi Runner frontend |

## Repos GitHub source

| Repo | Contenu transféré |
|---|---|
| [Bridge-Safi/Manager](https://github.com/Bridge-Safi/Manager) | Ce repo principal |
| [Bridge-Safi/Livreurs](https://github.com/Bridge-Safi/Livreurs) | driver-app + routes assign/dispatch/geocode |
| [Bridge-Safi/Jeux](https://github.com/Bridge-Safi/Jeux) | 3d-game = safi-runner (identique) |

## Notes techniques

- L'API utilise JWT via `SESSION_SECRET` ; les livreurs ont un auth séparé (`livreur-auth.ts`)
- SSE pour les événements temps réel (nouvelles commandes → restaurants) — routes EventSource sans Bearer token
- Les statuts de commande : `pending` → `assigned` → `in_delivery` → `delivered`
- `face-api.js` est utilisé dans le driver-app pour la vérification photo du livreur

## User preferences

- Répondre en français
