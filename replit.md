# NutriVault

A personal nutrition coach web app for tracking pantry ingredients, recipes, supplements, and reward points.

## Run & Operate

- `pnpm --filter @workspace/nutrivault run dev` — run the frontend (Vite, assigned port)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- Required secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Routing: Wouter
- Data: Supabase (`@supabase/supabase-js`) — all queries go directly from the frontend
- API: Express 5 (monorepo shared backend, not used by NutriVault directly)
- Build: Vite

## Where things live

- `artifacts/nutrivault/src/lib/supabase.ts` — Supabase client (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)
- `artifacts/nutrivault/src/pages/` — all page components (Dashboard, Perfil, Tickets, Despensa, Recetas, Suplementos, Puntos)
- `artifacts/nutrivault/src/components/layout/Layout.tsx` — persistent sidebar + mobile nav
- `artifacts/nutrivault/src/index.css` — green & white theme tokens

## Architecture decisions

- Supabase is queried directly from the React frontend — no custom backend for NutriVault data
- The `supabase` client is exported as `null` when env vars are missing or invalid, and all pages guard against this gracefully (show 0 / empty state instead of crashing)
- All data fetching uses `useState` + `useEffect` — no React Query for Supabase calls
- Wouter handles SPA routing with `BASE_URL` base path for proxy compatibility

## Product

NutriVault is a clean, green-themed nutrition coach dashboard. Users see a welcome message with their Supabase auth username, plus summary cards showing counts from: `ingredients`, `recipes`, `supplements` (active only), and `user_points` tables. Each section (Despensa, Recetas, Suplementos, Puntos, Perfil, Tickets) has its own page with graceful empty states.

## Supabase tables expected

| Table | Key columns |
|---|---|
| `ingredientes` | `id`, `nombre`, `cantidad`, `unidad`, `categoria`, `usuario_id` |
| `recetas` | `id`, `titulo`, `descripcion`, `imagen_url`, `tiempo_prep`, `created_at` |
| `suplementos` | `id`, `nombre_producto`, `marca`, `dosis_por_servicio`, `unidad_dosis`, `frecuencia_diaria`, `momento_toma`, `activo`, `usuario_id`, `fecha_inicio`, `total_unidades`, `unidades_restantes`, `cantidad_escaneada` |
| `puntos` | `id`, `usuario_id`, `concepto`, `cantidad`, `created_at` |
| `usuarios` | `id`, `email`, `nombre`, `edad`, `peso_kg`, `altura_cm`, `unidad_peso`, `unidad_altura`, `objetivo`, `peso_meta_kg`, `nivel_actividad`, `horas_sueno`, `antecedentes_salud`, `restricciones_alimentarias`, `avatar_url` |
| `pesajes` | `id`, `usuario_id`, `peso` (numeric, always kg), `fecha` (date), `created_at` |
| `laboratorios` | `id`, `usuario_id`, `nombre_archivo`, `archivo_url`, `fecha_laboratorio`, `notas`, `tipo`, `created_at` |

## Supabase Storage buckets needed

| Bucket | Use | Access |
|---|---|---|
| `avatares` | User profile photos | Public |
| `laboratorios` | Lab PDFs and images | Public |

## User preferences

- Language: Spanish (UI labels in Spanish)
- Color palette: green (#22c55e range) and white
- No emojis in the UI

## Gotchas

- `VITE_SUPABASE_URL` must be a valid `https://` URL — supabase-js validates this strictly
- Restart the Vite dev server after adding/changing `VITE_*` secrets
- The shared `api-server` is not used by NutriVault; it's the monorepo's Express backend for future use
