# Bug Audit — GitHire

**Date:** 2026-07-03
**Last verified:** 2026-07-03 (after user fixes)
**Scope:** Full-stack (`backend/` + `linkify/`)
**Method:** Static analysis + TypeScript `tsc --noEmit` + Python `py_compile`

---

## Status Ringkasan

| Level | Total | ✅ Fixed | ❌ Belum |
|-------|-------|---------|---------|
| 🔴 Critical | 5 | 3 | 2 |
| 🟡 Medium | 5 | 0 | 5 |
| 🔵 Low | 6 | 0 | 6 |
| **Total** | **16** | **3** | **13** |

---

## 🔴 KRITIS

### 1. `PUT /me/profile/cv-data` — ✅ FIXED

**File:** `backend/app/routers/me.py:568`
**Fix:** `payload: dict` → `payload: CVDataSchema` (Pydantic model). Juga pake `sa_update` langsung ke DB, bukan assign via ORM.

---

### 2. Letter service — ✅ FIXED

**File:** `backend/app/services/letter_service.py:95`
**Fix:** Hapus duplicate Gemini client, pake `_call_gemini_with_retry` dari `gemini_service.py`. File dari 113 baris → 95 baris.

---

### 3. `StatusUpdate.status` — ✅ FIXED

**File:** `backend/app/routers/recruiter.py:32`
**Fix:** Import `ApplicationStatus` enum, ganti `str` → `ApplicationStatus`.

---

### 4. `IntegrityError` handler — ❌ BELUM

**File:** `backend/app/auth.py:114`
**Bug:** `except IntegrityError:` masih tanpa `db.rollback()`.
**Fix:** Tambah `db.rollback()` di line 114 sebelum query retry.

---

### 5. Copy button — ✅ FIXED

**File:** `linkify/src/components/ui/copy-button.tsx:33`
**Fix:** Tambah `onClick={handleClick}` di `<button>`. Tombol copy sekarang jalan.

---

## 🟡 SEDANG

### 6. User input di LIKE pattern — ❌ BELUM

**File:** `backend/app/routers/recruiter.py:277-283`
**Bug:** `q` dan `location` langsung di `ilike(f"%{q}%")` — wildcard `%`/`_` bisa leak ke unintended rows.

---

### 7. Missing API key crash saat import — ❌ BELUM

**File:** `backend/app/services/gemini_service.py:9-12`
**Bug:** `RuntimeError` di module level. Seluruh app mati kalau API key kosong.

---

### 8. Force `Content-Type: application/json` — ❌ BELUM

**File:** `linkify/src/lib/api.ts:30-32`
**Bug:** Gak ngecek `body instanceof FormData` — upload file pake `apiFetch` bakal broken.

---

### 9. Raw `fetch()` bypass `withAuth` — ❌ BELUM

**File:** `linkify/src/app/(main)/dashboard/onboarding/page.tsx:106-128`
**Bug:** Manual `getToken()` + `fetch()` — gak dapet retry logic, bisa expired silent.

---

### 10. Clipboard write tanpa `.catch` — ❌ BELUM

**File:** `linkify/src/app/(main)/dashboard/applications/page.tsx:113`
**Bug:** `navigator.clipboard.writeText(letter)` — unhandled promise rejection kalau permission ditolak.

---

## 🔵 RENDAH

### 11. 22 React Query calls tanpa `isError` — ❌ BELUM

### 12. Index-as-key di dynamic list — ❌ BELUM

**File:** `linkify/src/app/(main)/dashboard/cv-generator/page.tsx:1013,1128,1248,1368`
**Bug:** Masih pake `key={idx}` di education, workExperience, orgExperience, training.

### 13. Debug log bocor ke production — ❌ BELUM

| File | Line | Issue |
|------|------|-------|
| `signup-form.tsx` | 57 | `console.log` di catch (harusnya `.error`) |
| `signup-form.tsx` | 104 | `console.log(JSON.stringify(completeSignUp, ...))` |
| `signin-form.tsx` | 49 | `console.log(JSON.stringify(signInAttempt, ...))` |

### 14. `_extract_json` return type salah — ❌ BELUM

**File:** `backend/app/services/gemini_service.py:307`
**Bug:** `def _extract_json(text: str) -> dict | None` — `json.loads` bisa return `list`/`str`/`int`.

### 15. f-string di DDL pattern — ❌ BELUM (low risk)

**File:** `backend/app/main.py:87`
**Bug:** Pattern bahaya kalau di-extend pake user input.

### 16. Clipboard promise tanpa `.catch` di CopyButton — ❌ BELUM

**File:** `linkify/src/components/ui/copy-button.tsx:23`
**Bug:** `.then()` tapi gak ada `.catch()`.

---

## ✅ FALSE POSITIVES

| Temuan | File | Reason |
|--------|------|--------|
| `ProfileOut` gak return `role` | `dashboard-shell.tsx:55` | `ProfileOut` punya field `role`, endpoint inject `user.role` |
| `jaccard_score` bukan Jaccard | `matching.py:127` | Recall-based, sengaja, docstring jelas |
| `cors_origins` empty string | `main.py:148` | Empty list = blocked all, acceptable default |

---

## Statistik

| Kategori | Total | ✅ Fixed | ❌ Open |
|----------|-------|---------|--------|
| 🔴 Critical | 5 | 3 | 2 |
| 🟡 Medium | 5 | 0 | 5 |
| 🔵 Low | 6 | 0 | 6 |
| **Total** | **16** | **3** | **13** |
