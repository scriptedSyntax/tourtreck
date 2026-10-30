import logging
import uuid

from django.conf import settings
from django.core.checks import Error, register
from rest_framework.views import exception_handler

logger = logging.getLogger("security")


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = uuid.uuid4().hex
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        if request.path.startswith(("/api/auth/", "/api/customer/", "/api/admin/")):
            response["Cache-Control"] = "no-store, max-age=0"
            response["Pragma"] = "no-cache"
        return response


def safe_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get("request")
    request_id = getattr(request, "request_id", uuid.uuid4().hex)
    if response is None or response.status_code >= 500:
        logger.exception("Unhandled request failure request_id=%s path=%s", request_id, getattr(request, "path", ""))
        from rest_framework.response import Response
        return Response({"code": "service_unavailable", "message": "Something went wrong. Please try again.", "request_id": request_id}, status=500)
    messages = {
        400: ("invalid_request", "Please check the information provided."),
        401: ("authentication_required", "Please sign in to continue."),
        403: ("forbidden", "You are not allowed to perform this action."),
        404: ("not_found", "The requested item could not be found."),
        429: ("too_many_requests", "Too many attempts. Please wait and try again."),
    }
    code, message = messages.get(response.status_code, ("request_failed", "The request could not be completed."))
    response.data = {"code": code, "message": message, "request_id": request_id}
    return response


@register()
def production_security_check(app_configs, **kwargs):
    if settings.DEBUG:
        return []
    errors = []
    if settings.SECRET_KEY.startswith("django-insecure") or len(settings.SECRET_KEY) < 32:
        errors.append(Error("Production SECRET_KEY must be strong and non-default.", id="security.E001"))
    if not settings.FRONTEND_URL.startswith("https://") or not settings.BACKEND_URL.startswith("https://"):
        errors.append(Error("Production frontend and backend URLs must use HTTPS.", id="security.E002"))
    origins = [*settings.CORS_ALLOWED_ORIGINS, *settings.CSRF_TRUSTED_ORIGINS]
    if any("localhost" in value or "127.0.0.1" in value or "*" in value for value in origins):
        errors.append(Error("Production origin allowlists cannot contain local or wildcard values.", id="security.E003"))
    if not settings.COOKIE_SECURE:
        errors.append(Error("Production cookies must be secure.", id="security.E004"))
    return errors
