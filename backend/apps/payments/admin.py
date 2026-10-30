from django.contrib import admin
from django.utils import timezone

from apps.core.admin import export_as_csv

from .models import PaymentMethod, PaymentTransaction


def has_payment_access(user):
    return user.is_active and (user.is_super_admin_role or user.is_admin_role)


class PaymentAccessAdminMixin:
    actions = (export_as_csv,)

    def has_module_permission(self, request):
        return has_payment_access(request.user)

    def has_view_permission(self, request, obj=None):
        return has_payment_access(request.user)

    def has_add_permission(self, request):
        return has_payment_access(request.user)

    def has_change_permission(self, request, obj=None):
        return has_payment_access(request.user)

    def has_delete_permission(self, request, obj=None):
        return has_payment_access(request.user)


@admin.register(PaymentMethod)
class PaymentMethodAdmin(PaymentAccessAdminMixin, admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "created_at")
    search_fields = ("name", "code", "instructions")
    list_filter = ("is_active", "created_at")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Payment method", {"fields": ("name", "code", "instructions")}),
        ("Availability", {"fields": ("is_active",)}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(PaymentAccessAdminMixin, admin.ModelAdmin):
    list_display = (
        "order",
        "method",
        "amount",
        "status",
        "reference",
        "paid_at",
        "created_at",
    )
    search_fields = (
        "reference",
        "order__customer_name",
        "order__customer_phone",
        "order__customer_email",
    )
    list_filter = ("status", "method", "paid_at", "created_at")
    ordering = ("-created_at",)
    actions = (export_as_csv, "mark_as_paid")
    readonly_fields = ("created_at", "updated_at")
    list_select_related = ("order", "method")
    fieldsets = (
        ("Payment", {"fields": ("order", "method", "amount", "reference")}),
        ("Status", {"fields": ("status", "paid_at")}),
        ("Notes", {"fields": ("notes",)}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.action(description="Mark selected transactions as paid")
    def mark_as_paid(self, request, queryset):
        now = timezone.now()
        queryset.filter(paid_at__isnull=True).update(paid_at=now)
        updated = queryset.update(
            status=PaymentTransaction.Status.PAID,
            updated_at=now,
        )
        self.message_user(request, f"Marked {updated} transaction(s) as paid.")
