# Password Recovery via Email (Resend) — Implementation Plan

End-to-end plan for adding "forgot password" → emailed reset link → "set new password" flow. Follows existing patterns in this repo (Next.js App Router, Neon via `@neondatabase/serverless`, bcryptjs, `jose` JWTs, JSON routes under `app/api`).

Empty directories already exist and should be filled in:
- `app/forgot-password/`
- `app/reset-password/[token]/`
- `app/api/auth/forgot-password/`
- `app/api/auth/reset-password/`

---

## 1. Prerequisites

1. Create a Resend account at resend.com.
2. Verify the sending domain (e.g. `lawbrokr.ca`) with the DNS records Resend provides. Without a verified domain, production email will not send.
3. Generate an API key in the Resend dashboard.
4. Decide the `from` address (e.g. `no-reply@lawbrokr.ca`) and display name (e.g. `LawBrokr Partners`).

## 2. Environment variables

Add to `.env.local` (and production env):

```
RESEND_API_KEY=re_xxx
EMAIL_FROM="LawBrokr Partners <no-reply@lawbrokr.ca>"
APP_URL=https://partners.lawbrokr.ca   # used to build reset links
```

For local dev, `APP_URL=http://localhost:3000` (or the `https://localhost:3000` used by `dev:https`).

## 3. Dependencies

```
npm install resend
```

No other deps needed — `crypto` (node built-in), `bcryptjs`, and `@neondatabase/serverless` are already present.

## 4. Database schema

New table `password_reset_tokens`. Store a **hash** of the token, not the token itself, so a DB leak cannot be used to reset passwords.

Per repo convention, schema lives in `scripts/seed.ts` and is applied via `npm run db:seed` (this drops/recreates tables — coordinate timing with the user).

Add to `scripts/seed.ts`:

```ts
await sql`DROP TABLE IF EXISTS password_reset_tokens`;
await sql`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id)`;
```

Place this block alongside the other `CREATE TABLE` statements (before the user-seeding section). Remember to add the matching `DROP TABLE IF EXISTS password_reset_tokens` to the top-of-file drop list so reseeds stay clean.

## 5. Email helper — `lib/email.ts`

Single module that wraps Resend and exposes typed helpers. Keeps the Resend import and key lookup in one place.

Responsibilities:
- Lazy-init a `Resend` client (read `RESEND_API_KEY` at call time, mirroring `getDb()` in `lib/db.ts`).
- Export `sendPasswordResetEmail({ to, firstName, resetUrl })`.
- Render a minimal HTML + plaintext email body inline (no template engine yet — keep it simple). Include the reset link, expiry window ("expires in 1 hour"), and a "you can ignore this if you didn't request it" line.
- Return `{ ok: true }` on success; throw on Resend error so the route can log it.

## 6. API routes

### `app/api/auth/forgot-password/route.ts` — `POST`

Request: `{ email: string }`

Behavior:
1. Validate `email` is a non-empty string.
2. Look up user by email. **Always return the same 200 response** regardless of whether the user exists — this prevents email enumeration. Response: `{ ok: true }` with a generic message.
3. If the user exists AND `status === 'active'`:
   a. Invalidate any existing unused tokens for the user (`UPDATE ... SET used_at = NOW() WHERE user_id = ... AND used_at IS NULL`) so only the latest link works.
   b. Generate a raw token: `crypto.randomBytes(32).toString("hex")`.
   c. Hash it for storage: `crypto.createHash("sha256").update(raw).digest("hex")`.
   d. Insert row with `expires_at = NOW() + INTERVAL '1 hour'`.
   e. Build `resetUrl = ${APP_URL}/reset-password/${raw}`.
   f. Call `sendPasswordResetEmail(...)`. If it throws, log server-side but still return the generic success response to the client.
4. If user exists but `status !== 'active'` (pending_approval, disabled, etc.), skip the email silently and still return generic success.

Rate-limit note: full rate limiting is out of scope for v1; document the risk in the route header and add a TODO to revisit once infra is in place.

### `app/api/auth/reset-password/[token]/route.ts`

Follow the `app/api/invite/[token]/route.ts` pattern (dynamic param + `GET` validation + `POST` commit).

**`GET`** — validate a token before rendering the page. Hash the incoming token, look it up, and return 200 `{ ok: true }` only if a row exists, `used_at IS NULL`, and `expires_at > NOW()`. Otherwise 410 `{ message: "This reset link is invalid or has expired" }`. Never echo the token or user email back.

**`POST`** — body `{ password: string }`.
1. Require `password.length >= 8` (match the invite route's rule).
2. Hash the URL token; look it up with the same validity checks as `GET`. 410 on failure.
3. `bcrypt.hash(password, 12)`, then `UPDATE users SET password_hash = ... WHERE id = ...`.
4. `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ...` (single-use).
5. Return `{ ok: true }`. Do **not** auto-login — force them to use the login page with the new password (keeps this flow orthogonal to the JWT issuance code).

## 7. Pages

### `app/forgot-password/page.tsx`

Client component. Email input + submit. On submit, `POST /api/auth/forgot-password`. Always show the same confirmation copy regardless of response ("If an account exists for that email, we've sent a reset link."). Link back to `/login`. Match styling with `app/login/page.tsx`.

### `app/reset-password/[token]/page.tsx`

Client component. On mount, `GET /api/auth/reset-password/[token]` to validate the token:
- While validating: spinner (no empty-state text — follow the loading-state convention already used elsewhere).
- If invalid/expired: show an error card with a link to `/forgot-password`.
- If valid: render a form with `password` + `confirm password`. On submit, `POST` to the same route, then redirect to `/login?reset=1` (or just `/login` with a one-time success toast).

### `app/login/page.tsx`

Add a "Forgot password?" link under the password field pointing to `/forgot-password`. Single-line edit.

## 8. Security checklist

- [ ] Token stored only as SHA-256 hash; raw token never persisted or logged.
- [ ] Tokens expire in 1 hour.
- [ ] Single-use (`used_at` set on success).
- [ ] Issuing a new token invalidates prior unused tokens for the user.
- [ ] Forgot-password response is identical for "user exists" vs. "user does not exist" — no enumeration via response body, status code, or timing (if timing matters, add a constant `await new Promise(r => setTimeout(r, 200))` branch for the no-user case).
- [ ] Reset-password response does not leak whether the token was valid vs. expired vs. already-used — single "invalid or expired" message.
- [ ] Password minimum length enforced server-side, not just client-side.
- [ ] New password replaces `password_hash`; no refresh token reuse or session reuse from the reset flow.
- [ ] `APP_URL` is validated at startup (fail fast if missing) so reset links can't be built against an unexpected host.
- [ ] Email template does not include the user's password or any PII beyond first name.

## 9. Testing plan

Local manual test:
1. Run `npm run db:seed` to pick up the new table.
2. Trigger `/forgot-password` with `test@gmail.com` → confirm Resend dashboard shows the send and the email arrives.
3. Click the link → verify the reset page loads the form.
4. Submit a new password → verify login with the new password works and the old password fails.
5. Click the same link again → expect "invalid or expired".
6. Request two resets in a row, use the first link → expect "invalid or expired" (superseded).
7. Wait past expiry (or manually set `expires_at` in the past) → expect "invalid or expired".
8. `/forgot-password` with a non-existent email → expect the same generic success message; no row inserted; no email sent.
9. `/forgot-password` with `pending@gmail.com` (non-active status) → same generic success; no email sent.

## 10. Rollout order

1. Add `password_reset_tokens` to `scripts/seed.ts`; run `npm run db:seed`.
2. Install `resend`; add env vars.
3. Build `lib/email.ts`.
4. Build both API routes.
5. Build both pages + login link.
6. Manual QA against Resend (start with a test address, then a real inbox).
7. Verify the production `EMAIL_FROM` domain is verified in Resend before flipping the feature on for real users.

## Out of scope (flag for later)

- Rate limiting on `/api/auth/forgot-password` (per IP + per email).
- Audit log of reset attempts.
- Email templating system / branded HTML beyond the minimal inline version.
- Admin-triggered password resets from the admin console.
