from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    message = "Administrator access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and (user.is_super_admin_role or user.is_admin_role)
        )


class IsSuperAdminRole(BasePermission):
    message = "Super administrator access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.is_super_admin_role
        )


class IsCustomerRole(BasePermission):
    message = "Customer access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.is_customer_role
        )
