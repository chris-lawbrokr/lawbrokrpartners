# Lawbrokr Internal Dashboard

## Getting Started

### Local backend

```bash
cp .env.example .env.local   # adjust API URL if needed
npm install
npm run dev
```

Set `AUTH_COOKIE_DOMAIN=""` on the backend so cookies are scoped to localhost.

Open [http://localhost:3000](http://localhost:3000).

### Staging API (api.lawbrokr.ca)

The staging API sets cookies with `domain=lawbrokr.ca` and the `Secure` flag, so the app must run on a `*.lawbrokr.ca` hostname over HTTPS.

```bash
# 1. Install mkcert (one-time)
brew install mkcert
mkcert -install

# 2. Generate certificates
mkdir -p certs
mkcert -key-file certs/key.pem -cert-file certs/cert.pem app.lawbrokr.ca dev.lawbrokr.ca

# 3. Add /etc/hosts entries (one-time)
sudo sh -c 'echo "127.0.0.1 app.lawbrokr.ca" >> /etc/hosts'
sudo sh -c 'echo "127.0.0.1 dev.lawbrokr.ca" >> /etc/hosts'

# 4. Run
npm run dev:https
```

Open [https://app.lawbrokr.ca:3000](https://app.lawbrokr.ca:3000) or [https://dev.lawbrokr.ca:3000](https://dev.lawbrokr.ca:3000).

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

## Auth

The browser calls the backend API directly using `credentials: "include"` for CORS cookie support. The access token is stored in-memory only, and the refresh token is an httpOnly cookie managed by the backend.

### Flow

1. User submits email/password on `/login`
2. Browser POSTs to `{API_BASE_URL}/auth/login` with `credentials: "include"`
3. Backend returns a JWT access token and user info, and sets an httpOnly `refresh_token` cookie
4. AuthProvider stores the access token in a `useRef` (in-memory) and user info in React state
5. Client-side `session` and `session_user` cookies are set for middleware route protection and page-reload persistence
6. A refresh is scheduled based on the JWT `exp` claim (default: 60s before expiry)
7. On refresh failure, retries 3 times at 10s intervals before forcing logout

### Files

| File                 | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `middleware.ts`      | Route protection — redirects to `/login` if no session |
| `lib/auth.tsx`       | `AuthProvider` context, `useAuth` hook, all auth logic |
| `lib/api.ts`         | Fetch wrapper — adds Bearer token and `credentials`    |
| `app/login/page.tsx` | Login form                                             |

### Cookies

| Cookie          | Set by    | HttpOnly | TTL     | Purpose                           |
| --------------- | --------- | -------- | ------- | --------------------------------- |
| `refresh_token` | Backend   | Yes      | Backend | Used to obtain new access tokens  |
| `session`       | Client JS | No       | 7 days  | Middleware auth gate              |
| `session_user`  | Client JS | No       | 7 days  | Hydrate user state on page reload |

### Token Storage

| Token         | Storage            | Accessible to JS          | Purpose                                         |
| ------------- | ------------------ | ------------------------- | ----------------------------------------------- |
| Access token  | In-memory `useRef` | Yes (same component tree) | Bearer token for API calls                      |
| Refresh token | httpOnly cookie    | No                        | Sent automatically via `credentials: "include"` |

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
