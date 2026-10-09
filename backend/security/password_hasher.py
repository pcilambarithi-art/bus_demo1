import hashlib

def hash_password(password: str) -> str:
    """Computes SHA-256 hash matching frontend and Node backend authentication."""
    if not password:
        return ""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(raw_password: str, stored_hash: str) -> bool:
    if not raw_password or not stored_hash:
        return False
    return hash_password(raw_password) == stored_hash
