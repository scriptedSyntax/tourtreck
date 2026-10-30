from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import APISession


class VersionedJWTAuthentication(JWTAuthentication):
    """Reject JWTs issued before the user's latest login or logout."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        token_version = validated_token.get("token_version")
        current_version = APISession.objects.filter(user=user).values_list(
            "token_version", flat=True
        ).first()
        if current_version is None or token_version != current_version:
            raise AuthenticationFailed("This login session is no longer active.")
        return user
