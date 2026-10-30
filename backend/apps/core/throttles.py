import hashlib

from rest_framework.throttling import ScopedRateThrottle
from rest_framework.throttling import SimpleRateThrottle


class OperationRateThrottle(ScopedRateThrottle):
    """Scope throttles by operation and account/cart identity, never a shared proxy IP alone."""

    def get_cache_key(self, request, view):
        scope = getattr(view, "throttle_scope", None)
        if not scope:
            return None
        if request.user and request.user.is_authenticated:
            identity = f"user:{request.user.pk}"
        else:
            email = str(request.data.get("email", "")).strip().lower() if request.method in {"POST", "PATCH"} else ""
            cart = request.headers.get("X-Cart-Token", "")
            fingerprint = request.headers.get("X-Client-Fingerprint", "").strip().lower()
            valid_fingerprint = len(fingerprint) == 64 and all(
                character in "0123456789abcdef" for character in fingerprint
            )
            if scope in {"login", "password_reset"} and email:
                identity = f"email:{email}"
            elif cart:
                identity = f"cart:{cart}"
            elif scope in {"register", "newsletter", "cart", "password_reset_confirm"} and valid_fingerprint:
                identity = f"fingerprint:{fingerprint}"
            else:
                identity = f"client:{self.get_ident(request)}"
        digest = hashlib.sha256(identity.encode()).hexdigest()
        return self.cache_format % {"scope": scope, "ident": digest}


class PasswordResetClientRateThrottle(SimpleRateThrottle):
    scope = "password_reset_client"

    def get_cache_key(self, request, view):
        identity = f"client:{self.get_ident(request)}"
        digest = hashlib.sha256(identity.encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}
