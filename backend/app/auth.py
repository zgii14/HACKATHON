import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

security = HTTPBearer(auto_error=False)

_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if not settings.clerk_jwks_url:
        raise HTTPException(
            status_code=500,
            detail="Konfigurasi server bermasalah: CLERK_JWKS_URL belum diset",
        )
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwks_client


def decode_clerk_token(token: str) -> dict:
    if not settings.clerk_issuer:
        raise HTTPException(
            status_code=500,
            detail="Konfigurasi server bermasalah: CLERK_ISSUER belum diset",
        )
    jwks = get_jwks_client()
    signing_key = jwks.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        issuer=settings.clerk_issuer,
        options={"verify_aud": False},
        leeway=60,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        print("DEBUG 401: Header Authorization tidak ada atau bukan bearer")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header Authorization tidak ada atau tidak valid",
        )
    try:
        payload = decode_clerk_token(credentials.credentials)
    except jwt.PyJWTError as e:
        print(f"DEBUG 401: Token decode failed: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token tidak valid: {e!s}",
        ) from e

    clerk_id = payload.get("sub")
    if not clerk_id or not isinstance(clerk_id, str):
        print("DEBUG 401: Token tidak memiliki klaim 'sub'")
        raise HTTPException(status_code=401, detail="Token tidak memiliki klaim 'sub'")

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
            # Race condition: User was already created by another parallel request.
            # The savepoint has rolled back automatically. Retrieve that user.
            user = db.query(User).filter(User.clerk_user_id == clerk_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Gagal mensinkronisasikan user ke database",
                )
    elif email and user.email != email:
        user.email = email
        db.commit()
        db.refresh(user)

    return user
