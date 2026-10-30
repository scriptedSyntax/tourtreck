from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.orders.api_views import AdminOrderViewSet
from apps.payments.api_views import AdminPaymentViewSet, AdminSummaryView, PublicPaymentMethodListView
from apps.shop.api_views import AdminCategoryViewSet, AdminProductViewSet, AdminSiteSettingView, CustomerWishlistView


router = DefaultRouter()
router.register("admin/categories", AdminCategoryViewSet, basename="admin-category")
router.register("admin/products", AdminProductViewSet, basename="admin-product")
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")
router.register("admin/payments", AdminPaymentViewSet, basename="admin-payment")


urlpatterns = [
    path("auth/", include("apps.accounts.api_urls")),
    path("shop/", include("apps.shop.api_urls")),
    path("", include("apps.orders.api_urls")),
    path("admin/site/", AdminSiteSettingView.as_view(), name="admin-site-setting"),
    path("admin/summary/", AdminSummaryView.as_view(), name="admin-summary"),
    path("shop/payment-methods/", PublicPaymentMethodListView.as_view(), name="public-payment-methods"),
    path("customer/wishlist/", CustomerWishlistView.as_view(), name="customer-wishlist"),
    path("", include(router.urls)),
]
