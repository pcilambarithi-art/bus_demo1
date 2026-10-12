import hashlib
import time
import json
import base64
import hmac
from typing import Optional, Dict, Any
from ..config import settings

def hash_password(password: str) -> str:
    """Computes a SHA-256 hex digest of the password."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hash or direct equality fallback."""
    if not plain_password or not hashed_password:
        return False
    computed = hash_password(plain_password)
    if hmac.compare_digest(computed, hashed_password):
        return True
    # Fallback for seeded plaintext passwords
    if hmac.compare_digest(plain_password, hashed_password):
        return True
    return False

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(data: Dict[str, Any], expires_delta_minutes: Optional[int] = None) -> str:
    """Creates a signed HMAC-SHA256 JWT-compatible token without requiring external cryptography binary."""
    to_encode = data.copy()
    expire_minutes = expires_delta_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expire_epoch = int(time.time()) + (expire_minutes * 60)
    to_encode.update({"exp": expire_epoch, "iat": int(time.time())})

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
    actual_sig = base64url_decode(signature_b64)

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
