# Auth & Session Concurrency Bugfix Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Resolve authentication race conditions on concurrent database synchronization and optimize frontend token caching for superior performance and resilience.

**Architecture:**
1. Use SQLAlchemy savepoints (`begin_nested()`) and targeted database `flush()` to handle concurrent unique constraint violations (`IntegrityError`) gracefully when writing new users in `get_current_user`.
2. Modify frontend `useApi` hook to use standard cached tokens on component mount, restricting `skipCache: true` solely to 401 retry blocks, preventing unnecessary networks requests.
3. Enhance email extraction in the token decoder to handle custom and standard Clerk JWT layouts dynamically.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, Next.js, Clerk SDK

---

### Task 1: Fix Concurrency Race Condition in `get_current_user`

**Files:**
- Modify: [auth.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/auth.py)

**Step 1: Write a concurrent database synchronization test case**

We'll add a helper test or verify by checking that `db.begin_nested()` safely catches concurrent database registration.
```python
# To test this logic, we will inspect auth.py's implementation and verify transaction savepoint rollback behavior
```

**Step 2: Update the implementation in `backend/app/auth.py`**

Modify [auth.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/auth.py) to wrap user creation inside a savepoint and handle `IntegrityError` from parallel inserts:
```python
    user = db.query(User).filter(User.clerk_user_id == clerk_id).first()
    if not user:
        from sqlalchemy.exc import IntegrityError
        try:
            with db.begin_nested():
                user = User(clerk_user_id=clerk_id, email=email)
                db.add(user)
                db.flush()
            db.commit()
        except IntegrityError:
            # Savepoint was rolled back, outer transaction remains active. Retrieve the created user.
            user = db.query(User).filter(User.clerk_user_id == clerk_id).first()
            if not user:
                raise HTTPException(500, "Gagal mensinkronisasikan user ke database")
    elif email and user.email != email:
        user.email = email
        db.commit()
        db.refresh(user)
```

**Step 3: Verify execution**
Verify by compiling/linting backend and ensuring the syntax is clean and transaction handling functions as expected.

---

### Task 2: Optimize Frontend Token Fetching Cache

**Files:**
- Modify: [use-api.ts](file:///c:/Users/muham/Downloads/HACKATHON/linkify/src/hooks/use-api.ts)

**Step 1: Update token initialization in `linkify/src/hooks/use-api.ts`**

Change:
```typescript
        getToken({ skipCache: true })
```
To:
```typescript
        getToken()
```
This lets Clerk leverage its highly optimized in-memory/cookie cache, removing the heavy network penalty when loading pages.

**Step 2: Verify Frontend compilation**
Ensure TypeScript compiles successfully and Clerk Auth states load instantaneously without continuous loading flickers.

---

### Task 3: Support Resilient Email Parsing in Backend Authentication

**Files:**
- Modify: [auth.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/auth.py)

**Step 1: Enhance email claim parser**

Make parsing in `decode_clerk_token` / `get_current_user` look for keys like `primary_email_address`, `email_address`, or raw `email` values:
```python
    email = None
    if isinstance(payload.get("email"), str):
        email = payload["email"]
    elif isinstance(payload.get("email_address"), str):
        email = payload["email_address"]
    elif isinstance(payload.get("primary_email_address"), str):
        email = payload["primary_email_address"]
    elif isinstance(payload.get("email_addresses"), list) and payload["email_addresses"]:
        first = payload["email_addresses"][0]
        if isinstance(first, dict) and first.get("email_address"):
            email = first["email_address"]
        elif isinstance(first, str):
            email = first
```

**Step 2: Commit and verify backend functionality**

---

## Verification Plan

### Automated Verification
- Run local unit tests in the backend to ensure routers still compile and pass auth validation checks.
- Test that frontend compiles cleanly with TypeScript.

### Manual Verification
- Acknowledge database schema matches and constraints are properly configured.
