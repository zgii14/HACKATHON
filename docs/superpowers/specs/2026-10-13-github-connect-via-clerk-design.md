# GitHub Connection via Clerk (Optional, Verified)

Date: 2026-10-13
Status: Approved design
Supersedes: `2026-09-11-github-oauth-verification-design.md` (custom backend OAuth; never implemented)

## Context

GitHire is a production startup product. Today candidates type a GitHub username/URL during onboarding (`POST /profiles/sync`), so anyone can claim another person's repositories. Recruiters treat GitHub evidence as a trust signal, so ownership must be verified.

## Product Decisions

- GitHub is connected through **Clerk's GitHub social connection** (sign in with GitHub, or connect GitHub to an existing Clerk account). No custom OAuth code in the backend.
- Connecting GitHub is **optional but strongly encouraged**. Candidates can use CV-based features without GitHub. GitHub-derived features require a verified connection.
- The backend never trusts a browser-supplied GitHub username. Identity = Clerk-verified `oauth_github` external account → GitHub numeric id → current login from the public GitHub API.
- One GitHub account belongs to at most one GitHire candidate (DB-enforced).
- Profiles created with a typed username before this change are **legacy**: they keep working and are labelled "Belum diverifikasi" to recruiters until the candidate connects GitHub.
- Recruiter and admin accounts are unaffected.
- Scope: public data only. GitHire never requests private repository access and never stores GitHub tokens.

## Data Model (`candidate_profiles`)

| Column | Type | Notes |
|---|---|---|
| `github_user_id` | `BIGINT NULL` | GitHub numeric id. Unique when not null (partial unique index). |
| `github_verified_at` | `TIMESTAMPTZ NULL` | Set on successful connect. |
| `github_legacy_grandfathered` | `BOOLEAN NOT NULL DEFAULT false` | True for profiles that had a typed username before this change. |

Idempotent migration in `main.py` lifespan: add columns, `CREATE UNIQUE INDEX IF NOT EXISTS ... WHERE github_user_id IS NOT NULL`, backfill `github_legacy_grandfathered = true WHERE github_username IS NOT NULL AND github_user_id IS NULL`.

Derived API field `github_connection`:
- `verified`: `github_user_id` set.
- `legacy_unverified`: no `github_user_id`, `github_legacy_grandfathered` true and `github_username` set.
- `none`: otherwise.

## Backend

### Clerk client (`services/clerk_client.py`)
`fetch_verified_github_id(clerk_user_id) -> int | None`: `GET https://api.clerk.com/v1/users/{id}` with `Authorization: Bearer CLERK_SECRET_KEY`; from `external_accounts[]` pick `provider == "oauth_github"` with `verification.status == "verified"`; return `int(provider_user_id)`. Timeouts and non-2xx raise a typed error (mapped to HTTP 502/503). A pure helper parses the user JSON so it is unit-testable.

### GitHub login lookup
`github_client.fetch_login_by_id(github_id) -> str`: `GET https://api.github.com/user/{id}` (uses `GITHUB_TOKEN` when set). Returns `login`.

### Identity service (`services/github_identity.py`)
- `connect_github(db, user, profile) -> ConnectResult`: resolve id via Clerk, login via GitHub, reject if another profile owns the id (HTTP 409, generic message), handle account change, set `github_user_id`, `github_username`, `github_verified_at`, clear legacy flag, fetch GitHub signals, recompute `merged_skills` and `verified_skills` (same rules as sync, including roadmap reset only when merged skills change). Unique violation from a concurrent request → 409.
- Account change (existing `github_user_id` differs): replace GitHub data and unpublish the public portfolio (draft kept).
- `revoke_github(db, profile)`: clear `github_user_id`, `github_verified_at`, `github_username`, `github_signals`, `verified_skills`; recompute `merged_skills` from CV skills only; unpublish portfolio.

### Endpoints
- `POST /profiles/github/connect` (candidate, rate limited by the existing sync cooldown pattern): calls `connect_github`; 404-style error `GITHUB_NOT_CONNECTED` if Clerk has no verified GitHub account.
- `POST /profiles/sync`: `cv` becomes optional; `github_url` is accepted but ignored. GitHub source = verified username, else legacy username, else none. CV source = uploaded file, else existing parsed CV. Error 400 if neither CV nor GitHub is available.
- `POST /webhooks/clerk` (public): verify Svix signature (headers `svix-id`, `svix-timestamp`, `svix-signature`; HMAC-SHA256 over `{id}.{timestamp}.{body}` with base64-decoded `whsec_` secret; constant-time compare; reject timestamps older/newer than 5 minutes). On `user.updated`: if the user's profile is verified and the payload no longer contains a verified `oauth_github` account with the same id → `revoke_github`. Other events are acknowledged with 200 and ignored. `user.deleted` is out of scope.

### Gating
GitHub-required actions (portfolio generate/rewrite) are allowed when `github_connection` is `verified` or `legacy_unverified` (legacy keeps current behavior). When it is `none` they return HTTP 409 with `detail = {"code": "GITHUB_REQUIRED", "message": ...}`. CV-based features (matching, skill gap, roadmap, quiz, applications, CV generator) are not gated.

### Responses
`/me/profile` adds `github_connection`, `github_verified_at`. Recruiter candidate list/detail and application payloads add `github_verified: bool`. Public portfolio view adds `github_verified: bool`.

## Frontend

- Auth pages: "Masuk dengan GitHub" next to the Google button (`oauth_github` strategy, existing `/auth/sso-callback`).
- Data GitHub & CV page: remove the GitHub URL field. GitHub block states: `none` → "Hubungkan GitHub" (`user.createExternalAccount({ strategy: "oauth_github", redirectUrl: "/dashboard/onboarding?github=connected" })`); `legacy_unverified` → "Verifikasi dengan GitHub"; `verified` → `@login`, verified time, "Ganti akun GitHub" (confirm: public portfolio will be unpublished). On return (`?github=connected`) or when Clerk already has a verified GitHub account but the backend says `none`/`legacy_unverified`, call `POST /profiles/github/connect`. CV block works independently.
- Overview and Portfolio: CTA to connect GitHub when `github_connection != "verified"`; Portfolio handles `GITHUB_REQUIRED`.
- Recruiter candidate list/detail: "GitHub terverifikasi" / "Belum diverifikasi" label.
- Public portfolio: "GitHub terverifikasi" badge only when verified.

## Configuration (owner actions)

- GitHub OAuth App owned by the company GitHub organization; callback URL from the Clerk dashboard; Client ID/Secret entered in Clerk production (SSO connections → GitHub, custom credentials, sign-up and sign-in enabled).
- Railway: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`.
- Clerk webhook endpoint `https://githire.up.railway.app/webhooks/clerk`, event `user.updated`.

## Observability

Structured log lines (no tokens, no emails): `github_connect result=success|duplicate|not_connected|error`, `github_revoke reason=webhook`, `clerk_webhook rejected reason=signature|timestamp`.

## Rollout

1. Backend (migration, endpoints, webhook) pushed and deployed first, backward compatible with the current frontend (see note).
2. Owner configures Clerk GitHub + Railway secrets + webhook.
3. Frontend pushed.

Note on step 1 compatibility: until the frontend ships, `POST /profiles/sync` keeps using `github_url` for profiles with `github_connection == "none"` (so the live onboarding keeps working). The frontend release removes the field; a follow-up backend change then stops honoring it. This avoids a broken window caused by Vercel deploying faster than Railway.

## Testing

Unit tests (backend, `unittest`): Clerk user JSON parsing (verified, unverified, missing, other providers); connect success, duplicate id, account change unpublishes portfolio, concurrent unique violation → 409; revoke clears derived data and recomputes skills; Svix signature valid / tampered body / wrong secret / stale timestamp; sync matrix (CV only, GitHub only, both, legacy, none → 400); gating returns `GITHUB_REQUIRED`. Frontend: `tsc`, lint, build. Manual E2E by the owner on production with a GitHub test account.

## Out of Scope

`user.deleted` handling, private repo analysis, storing GitHub tokens, mandatory GitHub gate, recruiter/admin identity changes.
