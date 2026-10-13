import hashlib
import secrets
import time
import json
import base64
import hmac
import uuid
from typing import Optional, Dict, Any
from ..config import settings


def hash_password(password: str) -> str:
    """
    Computes a salted PBKDF2-HMAC-SHA256 password hash:
    Format: pbkdf2:sha256:<iterations>$<salt_hex>$<derived_key_hex>
    """
    iterations = settings.PASSWORD_PBKDF2_ITERATIONS
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations
    ).hex()
    return f"pbkdf2:sha256:{iterations}${salt}${dk}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against salted PBKDF2-HMAC-SHA256 hash or legacy SHA-256 fallback."""
    if not plain_password or not hashed_password:
        return False

    if hashed_password.startswith("pbkdf2:sha256:"):
        try:
            header, salt, expected_dk = hashed_password.split("$", 2)
            iterations = int(header.split(":")[-1])
            computed_dk = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                iterations
            ).hex()
            return hmac.compare_digest(computed_dk, expected_dk)
        except Exception:
            return False

    # Legacy SHA-256 hex digest fallback
    legacy_sha256 = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy_sha256, hashed_password):
        return True

    # Fallback for seeded plaintext passwords
    if hmac.compare_digest(plain_password, hashed_password):
        return True
    return False


def hash_token(token: str) -> str:
    """Returns a SHA-256 digest of a bearer token for revocation tracking."""
    clean = token.replace("Bearer ", "").strip()
    return hashlib.sha256(clean.encode("utf-8")).hexdigest()


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(data: Dict[str, Any], expires_delta_minutes: Optional[int] = None) -> str:
    """Creates a signed HMAC-SHA256 JWT-compatible token with unique JTI."""
    to_encode = data.copy()
    expire_minutes = expires_delta_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    now_epoch = int(time.time())
    expire_epoch = now_epoch + (expire_minutes * 60)
    to_encode.update({
        "exp": expire_epoch,
        "iat": now_epoch,
        "jti": to_encode.get("jti") or uuid.uuid4().hex
    })

    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = base64url_encode(json.dumps(to_encode).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates HMAC-SHA256 signature and expiration."""
    if not token:
        return None
    token = token.replace("Bearer ", "").strip()
    parts = token.split(".")
    if len(parts) != 3:
        return None

    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    try:
        actual_sig = base64url_decode(signature_b64)
    except Exception:
        return None

    if not hmac.compare_digest(expected_sig, actual_sig):
        return None

    try:
        payload = json.loads(base64url_decode(payload_b64).decode("utf-8"))
        exp = payload.get("exp")
        if exp and int(time.time()) > exp:
            return None
        return payload
    except Exception:
        return None
