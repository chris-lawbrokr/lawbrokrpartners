# Lawbrokr Internal Dashboard

## Getting Started

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — run `openssl rand -base64 32` to generate one

Then:

```bash
npm install
# creates users table + test user
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Test login: `admin@lawbrokr.ca` / `password123`

## Deployment (Vercel + Neon)

1. Push to GitHub and import the repo in Vercel
2. Add `DATABASE_URL` and `JWT_SECRET` as environment variables in Vercel project settings
3. Run `npm run db:seed` locally (or via Vercel CLI) to create the table and seed data

## Scripts

| Script              | Command                  | Purpose                           |
| ------------------- | ------------------------ | --------------------------------- |
| `npm run dev`       | `next dev --turbopack`   | Local development (HTTP)          |
| `npm run dev:https` | `next dev --turbopack …` | Local development (HTTPS + certs) |
| `npm run build`     | `next build`             | Production build                  |
| `npm run start`     | `next start`             | Start production server           |
| `npm run typecheck` | `tsc --noEmit`           | Type-check without emitting files |
| `npm run lint`      | `eslint`                 | Run ESLint                        |
| `npm run check`     | `tsc --noEmit && eslint` | Run both in sequence              |
| `npm run db:seed`   | `tsx scripts/seed.ts`    | Create tables and seed test user  |

## Auth

The backend is built into the Next.js app as API routes (`/api/auth/*`) backed by Neon PostgreSQL. The access token is stored in-memory only, and the refresh token is an httpOnly cookie.

### Flow

1. User submits email/password on `/login`
2. Browser POSTs to `/api/auth/login`
3. API route verifies credentials against Neon, returns a JWT access token and user info, and sets an httpOnly `refresh_token` cookie
4. AuthProvider stores the access token in a `useRef` (in-memory) and user info in React state
5. Client-side `session` and `session_user` cookies are set for middleware route protection and page-reload persistence
6. A refresh is scheduled based on the JWT `exp` claim (default: 60s before expiry)
7. On refresh failure, retries 3 times at 10s intervals before forcing logout

### Files

| File                            | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `middleware.ts`                 | Route protection — redirects to `/login` if no session |
| `lib/auth.tsx`                  | `AuthProvider` context, `useAuth` hook, all auth logic |
| `lib/api.ts`                    | Fetch wrapper — adds Bearer token and `credentials`    |
| `lib/db.ts`                     | Neon serverless database connection                    |
| `lib/jwt.ts`                    | JWT signing and verification with `jose`               |
| `app/api/auth/login/route.ts`   | Login endpoint                                         |
| `app/api/auth/refresh/route.ts` | Token refresh endpoint                                 |
| `app/api/auth/logout/route.ts`  | Logout endpoint                                        |
| `app/login/page.tsx`            | Login form                                             |

### Cookies

| Cookie          | Set by    | HttpOnly | TTL    | Purpose                           |
| --------------- | --------- | -------- | ------ | --------------------------------- |
| `refresh_token` | API route | Yes      | 7 days | Used to obtain new access tokens  |
| `session`       | Client JS | No       | 7 days | Middleware auth gate              |
| `session_user`  | Client JS | No       | 7 days | Hydrate user state on page reload |

### Token Storage

| Token         | Storage            | Accessible to JS          | Purpose                                         |
| ------------- | ------------------ | ------------------------- | ----------------------------------------------- |
| Access token  | In-memory `useRef` | Yes (same component tree) | Bearer token for API calls                      |
| Refresh token | httpOnly cookie    | No                        | Sent automatically via `credentials: "include"` |

## Database Schema

**users** table (Neon PostgreSQL):

| Column          | Type          | Notes             |
| --------------- | ------------- | ----------------- |
| `id`            | SERIAL PK     |                   |
| `first_name`    | TEXT NOT NULL |                   |
| `last_name`     | TEXT NOT NULL |                   |
| `email`         | TEXT UNIQUE   |                   |
| `password_hash` | TEXT NOT NULL | bcrypt            |
| `website`       | TEXT NOT NULL | defaults to `''`  |
| `created_at`    | TIMESTAMPTZ   | defaults to NOW() |

## Linting & Type Checking

Strict TypeScript and ESLint rules are enforced to catch bugs early.

### TypeScript (`tsconfig.json`)

`"strict": true` plus additional flags:

| Flag                         | What it does                                             |
| ---------------------------- | -------------------------------------------------------- |
| `noUncheckedIndexedAccess`   | Array/object index access returns `T \| undefined`       |
| `noUnusedLocals`             | Errors on unused local variables                         |
| `noUnusedParameters`         | Errors on unused function parameters                     |
| `exactOptionalPropertyTypes` | Distinguishes `undefined` values from missing properties |
| `noFallthroughCasesInSwitch` | Requires `break`/`return` in every `switch` case         |

### ESLint (`eslint.config.mjs`)

Uses `typescript-eslint` strict type-checked rules on top of the Next.js defaults:

- **`no-floating-promises`** — unhandled async calls
- **`no-misused-promises`** — passing promises where booleans are expected
- **`no-unsafe-*`** — `any` leaking into typed code
- **`restrict-template-expressions`** — non-string types in template literals

#### min details

company name
comnpany website
lead email
lead phone number

---

```bash
rm -rf .next && npm run dev
```

```bash
npm run dev
```

```bash
npm run db:seed
```

```bash
https://lawbrokrpartners-9hbb.vercel.app
```

---

Admin
admin@lawbrokr.ca
password123

Partner
test@gmail.com
password123

---

x - hide 'Select an offer' partner side submit lead form
x - show offer as soon as the card reaches the /dashboard/referrals regardless of column
x - analytyics - referral amount x 12
x - mark as paid on card
x - remove manual input

countdown once pushed to close won
update drive assets page
