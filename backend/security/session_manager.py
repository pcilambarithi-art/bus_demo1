import time
import uuid

# In-memory session token dictionary: token -> session dict
active_tokens = {}

def generate_token(user: dict, role: str) -> str:
    token = f"dce_{role}_{uuid.uuid4().hex}_{int(time.time() * 1000)}"
    active_tokens[token] = {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": role,
        "expires_at": int(time.time() * 1000) + 7 * 24 * 60 * 60 * 1000
    }
    return token

def verify_token(token_str: str) -> dict | None:
    if not token_str:
        return None
    clean = token_str.replace("Bearer ", "").strip()
    session = active_tokens.get(clean)
    if not session:
        return None
    if (time.time() * 1000) > session["expires_at"]:
        active_tokens.pop(clean, None)
        return None
    return session

def revoke_token(token_str: str) -> bool:
    if not token_str:
        return False
    clean = token_str.replace("Bearer ", "").strip()
    return active_tokens.pop(clean, None) is not None
