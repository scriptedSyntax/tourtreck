import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator

from apps.core.emails import email_branding, send_branded_email

logger = logging.getLogger(__name__)


def _send_account_email(user, template_name, path, subject_action):
    query = urlencode({
        "account_id": str(user.public_id),
        "token": default_token_generator.make_token(user),
    })
    action_url = f"{settings.FRONTEND_URL.rstrip('/')}/{path}#{query}"
    brand = email_branding()
    try:
        send_branded_email(
            template_name,
            f"{subject_action} - {brand['business_name']}",
            [user.email],
            {
                "user": user,
                "action_url": action_url,
                "expiry_minutes": max(1, settings.PASSWORD_RESET_TIMEOUT // 60),
            },
        )
        if settings.DEBUG and settings.EMAIL_BACKEND.endswith("console.EmailBackend"):
            print("\nCOPY THIS ONE-TIME ACCOUNT LINK:\n" + action_url + "\n")
    except Exception:
        logger.exception("Customer account email could not be sent")


def send_password_reset_email(user):
    _send_account_email(user, "password_reset", "reset-password", "Reset your password")


def send_account_setup_email(user):
    _send_account_email(user, "account_setup", "set-password", "Secure your account")
