from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import APISession


@transaction.atomic
def rotate_api_session(user):
    """Atomically invalidate older API tokens and return the new version."""
    session, _ = APISession.objects.get_or_create(user=user)
    APISession.objects.filter(pk=session.pk).update(
        token_version=F("token_version") + 1,
        updated_at=timezone.now(),
    )
    session.refresh_from_db(fields=("token_version", "updated_at"))
    return session.token_version
