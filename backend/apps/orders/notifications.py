import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator

from apps.core.emails import email_branding, send_branded_email

from .models import Order

logger = logging.getLogger(__name__)


def _customer_access(order):
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    customer = order.customer
    if customer and customer.is_customer_role and not customer.has_usable_password():
        query = urlencode({
            "account_id": str(customer.public_id),
            "token": default_token_generator.make_token(customer),
        })
        return {
            "message": "We created a secure customer account for this order.",
            "url": f"{frontend_url}/set-password#{query}",
            "button": "Secure your account",
        }
    if customer and customer.is_customer_role:
        return {
            "message": "This order is linked to your customer account.",
            "url": f"{frontend_url}/account",
            "button": "View your order",
        }
    return {"message": "We will contact you as your order progresses.", "url": "", "button": ""}


def _send(template_name, subject, recipients, context, development_link=""):
    try:
        send_branded_email(template_name, subject, recipients, context)
        if development_link and settings.DEBUG and settings.EMAIL_BACKEND.endswith("console.EmailBackend"):
            print("\nCOPY THIS ONE-TIME ACCOUNT SETUP LINK:\n" + development_link + "\n")
    except Exception:
        logger.exception("Email could not be sent template=%s", template_name)


def send_order_created_notifications(order_id):
    order = Order.objects.select_related("customer").prefetch_related("items").get(pk=order_id)
    brand = email_branding()
    access = _customer_access(order)
    context = {"order": order, "items": order.items.all(), "access": access}
    _send(
        "order_customer",
        f"Your {brand['business_name']} order #{order.reference}",
        [order.customer_email],
        context,
        development_link=access["url"] if access["button"] == "Secure your account" else "",
    )
    _send(
        "order_shop",
        f"New order #{order.reference} - {brand['business_name']}",
        [brand["shop_email"]],
        context,
    )


def send_order_status_notification(order_id):
    order = Order.objects.prefetch_related("items").get(pk=order_id)
    if not order.customer_email:
        return
    _send(
        "order_status",
        f"Order #{order.reference} update - {order.get_status_display()}",
        [order.customer_email],
        {"order": order, "items": order.items.all(), "access": _customer_access(order)},
    )
