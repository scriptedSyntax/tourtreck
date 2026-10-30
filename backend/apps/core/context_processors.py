from django.apps import apps
from django.db import DatabaseError
from django.db.models import Count, Sum
from django.utils import timezone


def _admin_dashboard_stats(request):
    match = getattr(request, "resolver_match", None)
    user = getattr(request, "user", None)
    if not match or match.namespace != "admin" or match.url_name != "index":
        return None
    if not user or not user.is_authenticated or not user.is_active:
        return None
    if not (getattr(user, "is_super_admin_role", False) or getattr(user, "is_admin_role", False)):
        return None

    User = apps.get_model("accounts", "User")
    Product = apps.get_model("shop", "Product")
    WishlistItem = apps.get_model("shop", "WishlistItem")
    NewsletterSubscriber = apps.get_model("shop", "NewsletterSubscriber")
    ContactInquiry = apps.get_model("shop", "ContactInquiry")
    ShopProfile = apps.get_model("shop", "ShopProfile")
    Order = apps.get_model("orders", "Order")
    PaymentTransaction = apps.get_model("payments", "PaymentTransaction")

    active_orders = Order.objects.exclude(status="CANCELLED")
    total_sales = active_orders.aggregate(value=Sum("total"))["value"] or 0
    total_paid = PaymentTransaction.objects.filter(
        status="PAID",
        order__status__in=("PENDING", "PROCESSING", "EN_ROUTE", "DELIVERED"),
    ).aggregate(value=Sum("amount"))["value"] or 0
    order_statuses = {
        row["status"]: row["count"]
        for row in Order.objects.values("status").annotate(count=Count("id"))
    }

    return {
        "currency": ShopProfile.objects.values_list("currency", flat=True).first() or "KES",
        "customers": User.objects.filter(role="CUSTOMER", is_active=True).count(),
        "active_products": Product.objects.filter(is_active=True).count(),
        "low_stock_products": Product.objects.filter(is_active=True, stock__lte=5).count(),
        "orders_today": Order.objects.filter(created_at__date=timezone.localdate()).count(),
        "pending_orders": order_statuses.get("PENDING", 0),
        "processing_orders": order_statuses.get("PROCESSING", 0),
        "en_route_orders": order_statuses.get("EN_ROUTE", 0),
        "delivered_orders": order_statuses.get("DELIVERED", 0),
        "total_sales": total_sales,
        "total_paid": total_paid,
        "outstanding": max(total_sales - total_paid, 0),
        "wishlist_items": WishlistItem.objects.count(),
        "subscribers": NewsletterSubscriber.objects.filter(is_active=True).count(),
        "open_inquiries": ContactInquiry.objects.filter(is_handled=False).count(),
    }


def admin_branding(request):
    """Expose the configured shop name to every Django Admin page."""
    brand_name = "Admin"
    primary_color = "#007BFF"
    secondary_color = "#6C757D"
    accent_color = "#FFC107"

    try:
        site_setting_model = apps.get_model("shop", "SiteSetting")
    except LookupError:
        site_setting_model = None

    if site_setting_model is not None:
        try:
            site_setting = site_setting_model.objects.filter(is_active=True).first()
            configured_name = getattr(site_setting, "business_name", "")
            if configured_name and configured_name.strip():
                brand_name = configured_name.strip()
            if site_setting:
                primary_color = site_setting.primary_color
                secondary_color = site_setting.secondary_color
                accent_color = site_setting.accent_color
        except DatabaseError:
            # Branding must not make Admin unavailable during migrations.
            pass

    # Jazzmin falls back to these AdminSite values when theme titles are unset.
    try:
        from django.contrib import admin

        admin.site.site_header = brand_name
        admin.site.site_title = brand_name
        admin.site.index_title = "Store management"
    except (ImportError, AttributeError):
        pass

    try:
        dashboard_stats = _admin_dashboard_stats(request)
    except (DatabaseError, LookupError):
        dashboard_stats = None

    return {
        "admin_brand_name": brand_name,
        "admin_primary_color": primary_color,
        "admin_secondary_color": secondary_color,
        "admin_accent_color": accent_color,
        "admin_dashboard_stats": dashboard_stats,
    }
