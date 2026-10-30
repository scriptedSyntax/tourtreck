from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.core.admin import export_as_csv

from .forms import UserChangeForm, UserCreationForm
from .models import User
from apps.orders.models import Cart


class CustomerCartInline(admin.TabularInline):
    model = Cart
    extra = 0
    fields = ("cart_items", "cart_total", "created_at", "updated_at")
    readonly_fields = fields
    can_delete = False
    verbose_name = "logged-in cart"
    verbose_name_plural = "logged-in cart"

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description="Items")
    def cart_items(self, obj):
        return ", ".join(f"{item.product.name} × {item.quantity}" for item in obj.items.select_related("product")) or "Empty"

    @admin.display(description="Total")
    def cart_total(self, obj):
        return sum((item.subtotal for item in obj.items.select_related("product")), 0)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    model = User

    list_display = (
        "email",
        "full_name",
        "phone",
        "role",
        "is_active",
        "is_staff",
        "date_joined",
    )
    search_fields = ("email", "full_name", "phone")
    list_filter = ("role", "is_active", "is_staff")
    ordering = ("-date_joined",)
    actions = (export_as_csv,)
    inlines = (CustomerCartInline,)

    customer_list_display = (
        "email",
        "full_name",
        "phone",
        "is_active",
        "date_joined",
    )
    customer_list_filter = ("is_active",)

    fieldsets = (
        ("Account info", {"fields": ("public_id", "email", "password")}),
        ("Personal info", {"fields": ("full_name", "phone")}),
        (
            "Role and access",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Dates",
            {"fields": ("last_login", "date_joined", "created_at", "updated_at")},
        ),
    )
    add_fieldsets = (
        ("Account info", {"fields": ("email", "password1", "password2")}),
        ("Personal info", {"fields": ("full_name", "phone")}),
        ("Role and access", {"fields": ("role", "is_active")}),
    )
    readonly_fields = ("public_id", "last_login", "date_joined", "created_at", "updated_at")
    filter_horizontal = ("groups", "user_permissions")

    customer_fieldsets = (
        ("Account info", {"fields": ("public_id", "email", "password")}),
        ("Personal info", {"fields": ("full_name", "phone")}),
        ("Role and access", {"fields": ("is_active",)}),
        (
            "Dates",
            {"fields": ("last_login", "date_joined", "created_at", "updated_at")},
        ),
    )
    customer_add_fieldsets = (
        ("Account info", {"fields": ("email", "password1", "password2")}),
        ("Personal info", {"fields": ("full_name", "phone")}),
        ("Role and access", {"fields": ("is_active",)}),
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_super_admin_role:
            return queryset
        if request.user.is_admin_role:
            return queryset.filter(role=User.Role.CUSTOMER)
        return queryset.none()

    def get_list_display(self, request):
        if request.user.is_admin_role:
            return self.customer_list_display
        return super().get_list_display(request)

    def get_list_filter(self, request):
        if request.user.is_admin_role:
            return self.customer_list_filter
        return super().get_list_filter(request)

    def get_fieldsets(self, request, obj=None):
        if request.user.is_admin_role:
            return self.customer_fieldsets if obj else self.customer_add_fieldsets
        return super().get_fieldsets(request, obj)

    def has_module_permission(self, request):
        return request.user.is_active and (
            request.user.is_super_admin_role or request.user.is_admin_role
        )

    def has_view_permission(self, request, obj=None):
        if request.user.is_super_admin_role:
            return True
        return request.user.is_admin_role and (
            obj is None or obj.is_customer_role
        )

    def has_add_permission(self, request):
        return request.user.is_super_admin_role or request.user.is_admin_role

    def has_change_permission(self, request, obj=None):
        if request.user.is_super_admin_role:
            return True
        return request.user.is_admin_role and (
            obj is None or obj.is_customer_role
        )

    def has_delete_permission(self, request, obj=None):
        if request.user.is_super_admin_role:
            return True
        return request.user.is_admin_role and (
            obj is None or obj.is_customer_role
        )

    def save_model(self, request, obj, form, change):
        if request.user.is_admin_role:
            obj.role = User.Role.CUSTOMER
        super().save_model(request, obj, form, change)
