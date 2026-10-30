from decimal import Decimal

from django.conf import settings
from django.http import Http404
from django.shortcuts import render
from django.views.decorators.cache import never_cache

from .emails import email_branding


PREVIEW_TEMPLATES = {
    "order-customer": ("Customer order confirmation", "emails/order_customer.html"),
    "order-shop": ("Shop new-order notification", "emails/order_shop.html"),
    "order-status": ("Customer order status", "emails/order_status.html"),
    "password-reset": ("Customer password reset", "emails/password_reset.html"),
    "account-setup": ("Customer account setup", "emails/account_setup.html"),
}


def _preview_context():
    order = {
        "reference": "RIDE2026",
        "customer_name": "Wanjiku Mwangi",
        "customer_phone": "0712 345 678",
        "customer_email": "wanjiku@example.co.ke",
        "get_status_display": "Processing",
        "get_delivery_method_display": "Delivery",
        "delivery_location": "Nairobi CBD, Kenya",
        "delivery_map_url": "https://www.google.com/maps/search/?api=1&query=-1.286389,36.817223",
        "subtotal": Decimal("88500.00"),
        "delivery_fee": Decimal("300.00"),
        "total": Decimal("88800.00"),
    }
    return {
        "brand": email_branding(),
        "order": order,
        "items": [
            {"product_name": "Mountain Bike", "quantity": 1, "total_price": Decimal("85000.00")},
            {"product_name": "Helmet", "quantity": 1, "total_price": Decimal("3500.00")},
        ],
        "access": {
            "message": "This order is linked to your customer account.",
            "url": f"{settings.FRONTEND_URL.rstrip('/')}/account",
            "button": "View your order",
        },
        "user": {"full_name": "Wanjiku Mwangi"},
        "action_url": f"{settings.FRONTEND_URL.rstrip('/')}/reset-password#account_id=00000000-0000-4000-8000-000000000000&token=development-preview-only",
        "expiry_minutes": max(1, settings.PASSWORD_RESET_TIMEOUT // 60),
    }


def _require_local_debug(request):
    if not settings.DEBUG or request.META.get("REMOTE_ADDR") not in {"127.0.0.1", "::1"}:
        raise Http404


@never_cache
def email_preview_index(request):
    _require_local_debug(request)
    response = render(request, "email_previews/index.html", {"previews": PREVIEW_TEMPLATES})
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response


@never_cache
def email_preview(request, template_name):
    _require_local_debug(request)
    preview = PREVIEW_TEMPLATES.get(template_name)
    if not preview:
        raise Http404
    context = _preview_context()
    if template_name == "account-setup":
        context["action_url"] = context["action_url"].replace("/reset-password#", "/set-password#")
    response = render(request, preview[1], context)
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response
