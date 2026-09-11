# Quiz Recovery and AI Guardrail Repair

**Date:** 2026-09-11
**Status:** Approved design; implementation not started

## Purpose

Repair the confirmed quiz-cache deadlock and harden the AI guardrail introduced for Gemini-backed actions. The repair is intentionally separate from GitHub OAuth work and does not alter its approved design.

## Scope

The repair covers:

1. Expired and exhausted roadmap quiz recovery.
2. No-op AI guardrail behavior while all demo limits are disabled.
3. Transaction isolation for AI reservation records when guardrails are enabled.
4. Accurate quota-window messaging and safer Gemini error classification.
5. Exception chaining cleanup in recruiter screening.
6. Tests for every corrected behavior.

The repair does not change the unrelated landing `pinSpacing` diff, perform the broader historical bug-audit sweep, or implement GitHub OAuth.

## Quiz Recovery

`GET /me/roadmap/quiz` must return a cached quiz only if all of these are true:

- the payload is structurally valid;
- the issued timestamp is within the existing 30-minute TTL; and
- attempts are fewer than `MAX_ATTEMPTS`.

If a stored quiz is expired or exhausted, the endpoint generates and persists a fresh quiz for the same roadmap step. The fresh issue timestamp and attempt count replace the stale values. The roadmap, other progress rows, and XP ledger remain untouched.

This lets a candidate recover from the existing `Mulai ulang uji pemahaman` response without deleting a whole roadmap or paying for a new roadmap generation.

## Demo Guardrail Behavior

When both `user_daily_limit` and `global_rpm_limit` are zero or below, `reserve_ai_generation` returns before acquiring a PostgreSQL advisory lock, querying `ai_usage_events`, adding an event, or committing a transaction.

This preserves all cache and provider-error handling while avoiding database writes, global lock contention, and unbounded event-table growth during the demo configuration.

## Guardrail Transaction Boundary

When a guardrail is active, reservation uses an isolated, short-lived database transaction. It serializes the quota check and event insert, commits only that reservation, and closes before the caller invokes Gemini.

The helper must not commit or roll back the request session passed to an endpoint. This prevents a quota denial from unexpectedly discarding caller changes and prevents an AI call from keeping the advisory lock open.

The active quota period remains a rolling 24-hour period. Candidate-facing messages say `coba lagi setelah 24 jam`, not `coba lagi besok`.

## Portfolio Contract

Portfolio generation keeps its deterministic editable fallback for Gemini failures, provider rate limits, quota errors, invalid output, and README retrieval failures. It must not change to a 429 or 503 response because AI enhancement is optional for this feature.

The implementation will log a safe reason category for the fallback without including secrets, CV content, or README content. The API continues to indicate `ai_enhanced: false` for a fallback result.

## Gemini Error Classification

Classify provider errors in this order:

1. Structured quota code or clear quota phrases, including `quota_exceeded` and `exceeded your current quota`.
2. Structured rate-limit/overload code or known rate-limit phrases.
3. Other failures.

Do not classify errors only because an arbitrary string happens to contain `503`. Temporary rate-limit failures receive bounded exponential backoff. Daily quota failures do not retry. Recruiter screening preserves the original exception as the cause of the returned HTTP error.

## Verification

Automated tests will prove:

- re-opening a valid issued quiz does not generate a second quiz;
- an expired quiz generates a replacement without deleting roadmap data;
- a quiz at max attempts generates a replacement without deleting roadmap data;
- disabled guardrails make no database reservation;
- enabled guardrails record a reservation without committing or rolling back caller-owned state;
- rolling 24-hour quota responses use accurate wording;
- quota and temporary rate-limit messages are classified separately;
- portfolio fallback remains successful and is marked `ai_enhanced: false`.

Final verification runs the full backend unittest discovery suite, Python compilation for modified files, and `git diff --check`.
