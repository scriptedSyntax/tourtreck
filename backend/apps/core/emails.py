from urllib.parse import urljoin

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from apps.shop.models import ShopProfile, SiteSetting


def email_branding():
    site = SiteSetting.objects.filter(is_active=True).first()
    profile = ShopProfile.objects.first()
    logo_url = ""
    if site and site.logo:
        logo_url = urljoin(f"{settings.BACKEND_URL.rstrip('/')}/", site.logo.url.lstrip("/"))
    return {
        "business_name": site.business_name if site else "Online Shop",
        "logo_url": logo_url,
        "primary_color": site.primary_color if site else "#0D6EFD",
        "secondary_color": site.secondary_color if site else "#6C757D",
        "accent_color": site.accent_color if site else "#FFC107",
        "shop_phone": profile.phone if profile else "",
        "shop_whatsapp": profile.whatsapp if profile else "",
        "shop_email": profile.email if profile else "",
        "shop_location": profile.location if profile else "",
        "currency": "KSh" if not profile or profile.currency == "KES" else profile.currency,
        "frontend_url": settings.FRONTEND_URL.rstrip("/"),
        "backend_url": settings.BACKEND_URL.rstrip("/"),
    }


def send_branded_email(template_name, subject, recipients, context=None):
    recipients = [email for email in dict.fromkeys(recipients) if email]
    if not recipients:
        return 0
    branding = email_branding()
    template_context = {"brand": branding, **(context or {})}
    safe_subject = " ".join(str(subject).splitlines())[:998]
    text = render_to_string(f"emails/{template_name}.txt", template_context)
    html = render_to_string(f"emails/{template_name}.html", template_context)
    message = EmailMultiAlternatives(
        safe_subject,
        text,
        settings.DEFAULT_FROM_EMAIL,
        recipients,
        reply_to=[branding["shop_email"]] if branding["shop_email"] else None,
    )
    message.attach_alternative(html, "text/html")
    return message.send(fail_silently=False)
