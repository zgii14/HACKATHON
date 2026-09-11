# GitHub OAuth Verification for Candidate Accounts

**Date:** 2026-09-11
**Status:** Approved design; implementation not started

## Purpose

GitHire will verify ownership of a candidate's GitHub account through a backend-managed GitHub OAuth connection. This closes the current gap where a candidate can enter another person's GitHub username manually while retaining Clerk as the primary GitHire authentication and role system.

## Product Decisions

- Clerk remains the primary authentication provider for every GitHire role.
- GitHub is a required OAuth connection for new candidate accounts, not a replacement sign-in method.
- Recruiter and admin accounts are not required to connect GitHub.
- Existing candidate profiles with a manually saved GitHub username remain usable as legacy profiles.
- Legacy profiles display `Belum diverifikasi kepemilikan akun GitHub` in recruiter-facing and public portfolio contexts.
- OAuth-connected profiles display `GitHub terverifikasi`.
- A GitHub account can be connected to exactly one GitHire candidate account.
- Version one reads public GitHub data only. OAuth access and refresh tokens are never persisted after identity verification.

## OAuth Architecture

The frontend uses a Clerk-authenticated request to start an OAuth attempt. The backend owns the authorization callback and every secret exchange.

```text
Candidate Clerk session
  -> POST /profiles/github/oauth/start
  -> GitHub authorization page
  -> GET /profiles/github/oauth/callback
  -> validate one-time state and PKCE
  -> exchange code server-side
  -> call GitHub /user
  -> persist verified GitHub identity
  -> discard OAuth token
  -> redirect to candidate onboarding
```

The start endpoint creates a random, single-use OAuth state and PKCE verifier. A short-lived database attempt record belongs to the current GitHire user and expires after ten minutes. The state is stored only as a hash. The verifier is encrypted at rest and is deleted or marked used after a callback succeeds, fails, or expires.

The callback verifies the state, expiry, one-time usage, and PKCE verifier before exchanging the authorization code. It obtains the GitHub identity from the authenticated `/user` response; browser-provided usernames are never authoritative.

## Data Model

`CandidateProfile` gains the following fields:

- `github_user_id`: nullable GitHub numeric identity, unique when present.
- `github_verified_at`: nullable timestamp of the successful OAuth connection.
- `github_legacy_grandfathered`: non-null boolean identifying a profile preserved from the prior manual-username flow.

An OAuth attempt table stores the candidate user ID, hashed state, encrypted PKCE verifier, expiry time, and consumed time. It does not store GitHub tokens.

Migration behavior:

- Existing candidate profiles with a `github_username` become `github_legacy_grandfathered = true`.
- Existing profiles without a GitHub username are not grandfathered.
- New candidates are not grandfathered.

## Authorization Rules

| Candidate state | Access | Visible status |
|---|---|---|
| New candidate without OAuth | Onboarding and account only | Connect GitHub required |
| Legacy manual profile | Existing candidate features remain available | Ownership unverified |
| OAuth-connected profile | Full candidate access | GitHub verified |

Frontend route protection redirects a new unconnected candidate to onboarding. Backend authorization enforces the same rule for protected candidate actions, including CV sync, portfolio, applications, roadmap generation, and quiz generation. Public job browsing, recruiter routes, and admin routes are outside this gate.

## Profile Sync and GitHub Data

The manual GitHub URL/username form field is removed from onboarding. CV sync resolves the GitHub username from the candidate profile:

- OAuth-connected candidates use the GitHub username returned by OAuth.
- Grandfathered legacy profiles use their existing stored username.
- A legacy candidate cannot replace the saved manual username through the sync endpoint; connecting GitHub is the supported upgrade path.

GitHub signal fetching, matching, and system-derived verified skills continue to use the existing public-data pipeline after the account identity has been resolved.

## Changing a GitHub Account

Candidates change GitHub accounts only by starting OAuth again. Before starting, the UI explains that a successful account change will unpublish the existing public portfolio.

After a successful callback with a unique GitHub identity:

1. The profile identity and GitHub signals are replaced.
2. Verified skills are recalculated.
3. Roadmap cache and progress are reset only if merged skills change, preserving existing behavior.
4. Public portfolio content is unpublished; its editable draft and photos remain intact.
5. The candidate reviews the refreshed data and publishes again deliberately.

If OAuth is cancelled, invalid, expired, duplicated, or otherwise fails, the existing profile and published portfolio remain unchanged.

## API and UI Contract

Profile responses expose:

- `github_connection`: `required`, `legacy_unverified`, or `verified`.
- `github_username`: nullable display username.
- `github_verified`: boolean.
- `github_verified_at`: nullable timestamp.

New backend endpoints:

- `POST /profiles/github/oauth/start`
- `GET /profiles/github/oauth/callback`
- `POST /profiles/github/change/start`

The onboarding interface shows a primary `Hubungkan GitHub` action for new candidates, verified identity after success, and `Verifikasi dengan GitHub` or `Ganti akun GitHub` for legacy profiles. Candidate-facing messaging describes the public-repository-only scope and does not request private repository access.

## Error Handling

- OAuth cancellation returns the candidate to onboarding without any profile mutation.
- Expired, mismatched, or replayed state returns a safe retry message.
- A GitHub account already linked to another candidate is rejected without exposing the other candidate's identity.
- GitHub API failures leave prior candidate data unchanged and offer a retry.
- OAuth tokens and client secrets never reach browser JavaScript, logs, profile responses, or the database.

## Configuration and Deployment

The backend deployment requires these secrets:

```env
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=
GITHUB_OAUTH_STATE_ENCRYPTION_KEY=
```

The redirect URI configured in the GitHub OAuth App must exactly equal `GITHUB_OAUTH_REDIRECT_URI`. Production values belong in the Railway backend environment, while local development uses a local backend callback URL. Secrets are excluded from git.

## Verification Strategy

Automated tests will cover:

- valid callback and persistence of a verified GitHub identity;
- state expiry, mismatch, replay, and PKCE validation failures;
- uniqueness of `github_user_id` across candidates;
- token non-persistence;
- legacy access preservation and labels;
- new-candidate frontend redirect and backend protected-route denial;
- recruiter and admin exemption;
- account-change confirmation, public portfolio unpublish, and draft retention;
- failure paths that leave prior profile and published portfolio unchanged.

Manual end-to-end checks will use a separate GitHub test account and verify local plus Railway callback URLs, cancellation, account duplication, legacy behavior, and public portfolio visibility before and after an approved account change.

## Non-Goals

- GitHub private repository analysis.
- GitHub as a replacement for Clerk authentication.
- Persistent OAuth access or refresh tokens.
- Changing recruiter or admin identity flows.
- Retroactively blocking or deleting legacy candidate profiles.
