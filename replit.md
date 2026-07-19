# SubTrack – Subscription Tracker

A production-quality SaaS subscription tracker. Track all your recurring subscriptions in one place: see monthly/yearly spend, upcoming renewals, spending by category, and more.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/subtrack run dev` — run the frontend (port 24210, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Recharts, Wouter routing
- Auth: Clerk (Replit-managed)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/subtrack/` — React + Vite frontend
- `artifacts/api-server/` — Express API server
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation (do not edit)
- `lib/db/src/schema/` — Drizzle table definitions (one file per entity)

## Schema Entities

- `users` — Clerk user records (keyed by `clerk_id`)
- `user_settings` — per-user preferences (currency, theme, timezone)
- `categories` — default + user-created subscription categories
- `subscriptions` — the core entity; tracks price, billing cycle, renewal date, etc.
- `reminders` — per-subscription reminder preferences (days before renewal)

## Architecture decisions

- Auth is cookie-based via Clerk; no manual token handling on the web client
- All costs normalized to `monthlyEquivalent` and `annualEquivalent` computed server-side
- Default categories seeded once on server startup (idempotent)
- `renewalDate` stored as a date string (`YYYY-MM-DD`) to avoid timezone shifting
- API routes all require auth (`requireAuth` middleware from `lib/auth.ts`)

## Product

Users can: add/edit/delete/archive subscriptions, view dashboard with spending stats, see upcoming renewals, browse analytics charts, view a calendar of renewal dates, configure reminders, and manage profile/settings with dark/light/system theme support.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code
- After adding new schema files to `lib/db/src/schema/`, run `pnpm run typecheck:libs` to rebuild declarations before typechecking the server
- Clerk dev keys warning in console is expected and harmless in development
- `renewalDate` is a `date` column with `mode: "string"` — keep values as `YYYY-MM-DD`, never convert to Date objects

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `clerk-auth/references/setup-and-customization.md` for Clerk integration details
