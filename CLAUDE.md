@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This directory (`fast-ecommerce/`) is the active Next.js application. The sibling `../src/` at the repo root is an earlier, abandoned scaffold with no `package.json` and is not wired up — do not edit it or treat it as the source of truth.

## Next.js 16 — not the version you know

This project runs **Next.js 16.2.7 with React 19**, which has breaking changes from earlier Next.js. Per `AGENTS.md` (imported above): read the relevant guide in `node_modules/next/dist/docs/` before writing routing, middleware, or App Router code, and heed deprecation notices. Concrete divergence already in the tree: **middleware lives in `src/proxy.ts`** (default-exported `proxy()` function with a `config.matcher`), not `middleware.ts`.

## Commands

```bash
npm install --legacy-peer-deps   # required: @prisma/client v5 vs @prisma/adapter-pg v7 peer conflict
npm run dev                      # dev server on :3000
npm run build                    # runs `prisma generate` then `next build`
npm run lint                     # eslint (flat config, next core-web-vitals + typescript)
npm run start                    # serve production build

npm run db:generate              # prisma generate
npm run db:push                  # push schema to DB without a migration
npm run db:migrate               # create + apply a dev migration
npm run db:studio                # Prisma Studio
npm run db:reset                 # drop + recreate (destructive)
```

Node 22 (`.nvmrc`). No test runner is configured. Vercel uses `npm run vercel-build` (`prisma generate && prisma db push --skip-generate && next build`) with `--legacy-peer-deps`.

Required env (`.env`): `DATABASE_URL`, `DIRECT_URL` (Postgres, direct connection for migrations), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_KEY`.

## Architecture

**Stack:** Next.js App Router (RSC) · Prisma 5 + PostgreSQL · NextAuth 4 · Zustand · Tailwind v4 · shadcn/ui (Radix primitives in `src/components/ui/`) · bcryptjs. Import alias `@/*` → `src/*`.

**Domain — Beeyond Trees, a multi-tier wholesale/retail store.** The defining concept is three pricing tiers, each carrying its own price column on `Product` and its own minimum order quantity, enforced in the cart:

| tier | min qty (`tierDefaults` in `src/store/cart-store.ts`) | price column |
|------|------|------|
| retail | 1 | `retailPrice` |
| wholesale | 12 | `wholesalePrice` |
| distributor | 37 | `distributorPrice` |

Cart items are keyed by `(productId, pricingTier)` — the same product at different tiers is distinct. Orders capture Kenya-style delivery (`county`, `town`, `landmark`) and an optional `Dispatch` record (rider name/phone, motorbike plate, rider ID).

**Data model** (`prisma/schema.prisma`): `User` (admin/merchant accounts) · `Product` · `Order` → `OrderItem[]` (each snapshots `productName`/`price`/`pricingTier` at purchase time) · `Order` → optional `Dispatch`. Product `images` is a `Json` array.

**Two separate auth paths — don't conflate them:**
- **Admin** (`/admin/*`): NextAuth Credentials provider at `src/app/api/auth/[...nextauth]/route.ts`, JWT sessions, `role` threaded through jwt/session callbacks. Access is gated by `src/proxy.ts`, which redirects unauthenticated `/admin` requests to `/admin/login`. ⚠️ `proxy.ts` currently verifies the token with a **hardcoded** secret string while the NextAuth handler signs with `process.env.NEXTAUTH_SECRET` — these must match or admin auth silently fails. Prefer fixing `proxy.ts` to read the env var.
- **B2B portal** (`/portal`, `/api/auth/portal-login`, `/api/auth/portal-register`): plain JSON endpoints that bcrypt-check credentials and return the user object directly. No NextAuth session — this is its own lightweight flow.

**State:** client state is Zustand stores in `src/store/` (`cart-store`, `ui-store`, `product-store`). Server state comes from Prisma via API route handlers / RSC.

**API routes** (`src/app/api/`): `products` (full CRUD: GET/POST/PUT/DELETE), `products/[id]`, `search`, `auth/*`, `webhook/stripe`. Note several handlers (`cart`, `checkout`) are currently stubs returning `{ ok: true }` — work in progress. Payments are oriented toward **Paystack** (env keys above); the `stripe` lib and `webhook/stripe` route are leftover scaffolding, not the active processor.

**Notable single-line infra:** `src/lib/redis.ts` exports an empty `{}` (Redis not yet implemented); `src/lib/db.ts` is the standard global-singleton PrismaClient.
