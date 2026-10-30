from decimal import Decimal

from django.contrib import admin
from django import forms
from django.db.models import Count, DecimalField, F, IntegerField, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce, Greatest
from django.forms.models import BaseInlineFormSet
from django.utils import timezone
from django.utils.html import format_html

from apps.payments.models import PaymentTransaction
from apps.accounts.models import User
from apps.core.admin import export_as_csv
from .models import Cart, CartItem, Order, OrderItem


MONEY_FIELD = DecimalField(max_digits=12, decimal_places=2)


def has_order_access(user):
    return user.is_active and (user.is_super_admin_role or user.is_admin_role)


class OrderAccessAdminMixin:
    actions = (export_as_csv,)

    def has_module_permission(self, request):
        return has_order_access(request.user)

    def has_view_permission(self, request, obj=None):
        return has_order_access(request.user)

    def has_add_permission(self, request):
        return has_order_access(request.user)

    def has_change_permission(self, request, obj=None):
        return has_order_access(request.user)

    def has_delete_permission(self, request, obj=None):
        return has_order_access(request.user)


class OrderAccessInlineMixin:
    def has_view_permission(self, request, obj=None):
        return has_order_access(request.user)

    def has_add_permission(self, request, obj=None):
        return has_order_access(request.user)

    def has_change_permission(self, request, obj=None):
        return has_order_access(request.user)

    def has_delete_permission(self, request, obj=None):
        return has_order_access(request.user)


class CartItemInline(OrderAccessInlineMixin, admin.TabularInline):
    model = CartItem
    extra = 1
    fields = ("product", "quantity", "subtotal_display")
    readonly_fields = ("subtotal_display",)

    @admin.display(description="Subtotal")
    def subtotal_display(self, obj):
        return obj.subtotal if obj and obj.pk else "—"


class OrderItemInlineFormSet(BaseInlineFormSet):
    def save_new(self, form, commit=True):
        if form.instance.product:
            form.instance.product_name = form.instance.product.name
        return super().save_new(form, commit)

    def save_existing(self, form, instance, commit=True):
        if form.instance.product:
            form.instance.product_name = form.instance.product.name
        return super().save_existing(form, instance, commit)


class OrderItemInline(OrderAccessInlineMixin, admin.TabularInline):
    model = OrderItem
    formset = OrderItemInlineFormSet
    fields = ("product", "product_name", "quantity", "unit_price", "selected_colour", "total_price")
    readonly_fields = ("product_name", "total_price")
    extra = 1

class OrderAdminForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = "__all__"

    def clean(self):
        data = super().clean()
        if not self.instance.pk and data.get("delivery_method") == Order.DeliveryMethod.DELIVERY and (data.get("delivery_latitude") is None or data.get("delivery_longitude") is None):
            self.add_error("delivery_location", "Add the delivery map coordinates so the fee can be calculated.")
        return data


@admin.register(Cart)
class CartAdmin(OrderAccessAdminMixin, admin.ModelAdmin):
    list_display = ("customer", "item_count", "cart_total", "created_at", "updated_at")
    search_fields = ("customer__email", "customer__full_name", "session_key")
    list_filter = ("created_at", "updated_at")
    ordering = ("-updated_at",)
    readonly_fields = ("created_at", "updated_at")
    inlines = (CartItemInline,)
    list_select_related = ("customer",)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(customer__isnull=False).prefetch_related("items__product")

    @admin.display(description="Items")
    def item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())

    @admin.display(description="Cart total")
    def cart_total(self, obj):
        return sum((item.subtotal for item in obj.items.all()), Decimal("0.00"))


@admin.register(CartItem)
class CartItemAdmin(OrderAccessAdminMixin, admin.ModelAdmin):
    list_display = ("cart", "product", "quantity", "subtotal_display", "updated_at")
    search_fields = ("cart__session_key", "cart__customer__email", "product__name")
    list_filter = ("created_at", "updated_at")
    ordering = ("-updated_at",)
    readonly_fields = ("created_at", "updated_at", "subtotal_display")
    list_select_related = ("cart", "product")

    @admin.display(description="Subtotal")
    def subtotal_display(self, obj):
        return obj.subtotal


@admin.register(Order)
class OrderAdmin(OrderAccessAdminMixin, admin.ModelAdmin):
    form = OrderAdminForm
    change_list_template = "admin/orders/order/change_list.html"
    list_display = (
        "reference",
        "customer_name",
        "customer_phone",
        "delivery_method",
        "status",
        "subtotal",
        "delivery_fee",
        "delivery_quote_status",
        "total",
        "payment_status_display",
        "total_paid_display",
        "balance_display",
        "created_at",
    )
    search_fields = (
        "reference",
        "customer_name",
        "customer_phone",
        "customer_email",
        "items__product_name",
    )
    list_filter = ("status", "delivery_method", "created_at")
    ordering = ("-created_at",)
    readonly_fields = (
        "reference",
        "total",
        "payment_status_display",
        "total_paid_display",
        "balance_display",
        "created_at",
        "updated_at",
        "delivery_map_link",
        "delivery_zone",
    )
    actions = (
        export_as_csv,
        "mark_as_processing",
        "mark_as_en_route",
        "mark_as_delivered",
        "mark_as_cancelled",
    )
    inlines = (OrderItemInline,)
    list_select_related = ("customer",)
    fieldsets = (
        ("Customer", {"fields": ("customer", "customer_name", "customer_phone", "customer_email")}),
        ("Delivery", {"fields": (
            "delivery_method", "delivery_location", "delivery_latitude", "delivery_longitude",
            "delivery_map_link", "delivery_zone", "delivery_fee", "delivery_fee_confirmed",
        )}),
        (
            "Order totals",
            {
                "fields": (
                    "subtotal",
                    "total",
                    "payment_status_display",
                    "total_paid_display",
                    "balance_display",
                )
            },
        ),
        ("Status and notes", {"fields": ("reference", "status", "notes", "exchange_requested", "exchange_request_notes")}),
        ("Dates", {"fields": ("created_at", "updated_at", "delivered_at")}),
    )

    def get_queryset(self, request):
        paid_transactions = (
            PaymentTransaction.objects.filter(
                order_id=OuterRef("pk"),
                status=PaymentTransaction.Status.PAID,
            )
            .values("order_id")
            .annotate(total_paid=Sum("amount"), transaction_count=Count("pk"))
        )
        return super().get_queryset(request).annotate(
            _total_paid=Coalesce(
                Subquery(paid_transactions.values("total_paid")[:1]),
                Value(Decimal("0.00")),
                output_field=MONEY_FIELD,
            ),
            _paid_transaction_count=Coalesce(
                Subquery(paid_transactions.values("transaction_count")[:1]),
                Value(0),
                output_field=IntegerField(),
            ),
        )

    def save_model(self, request, obj, form, change):
        if not obj.customer and obj.customer_email:
            customer = User.objects.filter(email__iexact=obj.customer_email, role=User.Role.CUSTOMER).first()
            if customer is None and not User.objects.filter(email__iexact=obj.customer_email).exists():
                customer = User.objects.create_user(
                    email=obj.customer_email,
                    password=None,
                    full_name=obj.customer_name,
                    phone=obj.customer_phone,
                    role=User.Role.CUSTOMER,
                )
                from django.db import transaction
                from apps.accounts.notifications import send_account_setup_email
                transaction.on_commit(lambda user_id=customer.pk: send_account_setup_email(User.objects.get(pk=user_id)))
            if customer:
                obj.customer = customer
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        order = form.instance
        total = sum((item.total_price for item in order.items.all()), Decimal("0.00"))
        if order.subtotal != total:
            order.subtotal = total
            order.save(update_fields=("subtotal", "total", "updated_at"))

    @admin.display(description="Payment status")
    def payment_status_display(self, obj):
        if obj._paid_transaction_count == 0:
            return "UNPAID"
        if obj._total_paid < obj.total:
            return "PARTIAL"
        return "PAID"

    @admin.display(description="Total paid", ordering="_total_paid")
    def total_paid_display(self, obj):
        return obj._total_paid

    @admin.display(description="Balance")
    def balance_display(self, obj):
        return max(obj.total - obj._total_paid, Decimal("0.00"))

    @admin.display(description="Delivery quote", boolean=True, ordering="delivery_fee_confirmed")
    def delivery_quote_status(self, obj):
        return obj.delivery_fee_confirmed

    @admin.display(description="Delivery map")
    def delivery_map_link(self, obj):
        if not obj or not obj.delivery_map_url:
            return "—"
        return format_html(
            '<a href="{}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>',
            obj.delivery_map_url,
        )

    def _update_status(self, request, queryset, status):
        updated = 0
        for order in queryset.exclude(status=status):
            order.status = status
            order.updated_at = timezone.now()
            order.save(update_fields=("status", "updated_at", "total"))
            updated += 1
        self.message_user(request, f"Updated {updated} order(s).")

    @admin.action(description="Mark selected orders as processing")
    def mark_as_processing(self, request, queryset):
        self._update_status(request, queryset, Order.Status.PROCESSING)

    @admin.action(description="Mark selected orders as en route")
    def mark_as_en_route(self, request, queryset):
        self._update_status(request, queryset, Order.Status.EN_ROUTE)

    @admin.action(description="Mark selected orders as delivered")
    def mark_as_delivered(self, request, queryset):
        self._update_status(request, queryset, Order.Status.DELIVERED)

    @admin.action(description="Mark selected orders as cancelled")
    def mark_as_cancelled(self, request, queryset):
        self._update_status(request, queryset, Order.Status.CANCELLED)

    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(request, extra_context=extra_context)
        if not hasattr(response, "context_data") or "cl" not in response.context_data:
            return response

        queryset = response.context_data["cl"].queryset
        totals = queryset.aggregate(
            total_order_value=Coalesce(
                Sum("total"), Value(Decimal("0.00")), output_field=MONEY_FIELD
            ),
            total_paid=Coalesce(
                Sum("_total_paid"), Value(Decimal("0.00")), output_field=MONEY_FIELD
            ),
            outstanding_balance=Coalesce(
                Sum(
                    Greatest(
                        F("total") - F("_total_paid"),
                        Value(Decimal("0.00")),
                        output_field=MONEY_FIELD,
                    )
                ),
                Value(Decimal("0.00")),
                output_field=MONEY_FIELD,
            ),
        )
        response.context_data["sales_summary"] = {
            "total_orders": queryset.count(),
            **totals,
        }
        return response


@admin.register(OrderItem)
class OrderItemAdmin(OrderAccessAdminMixin, admin.ModelAdmin):
    list_display = ("order", "product_name", "quantity", "unit_price", "total_price", "created_at")
    search_fields = ("product_name", "order__customer_name", "order__customer_phone")
    list_filter = ("created_at",)
    ordering = ("-created_at",)
    readonly_fields = ("total_price", "created_at", "updated_at")
    list_select_related = ("order", "product")
