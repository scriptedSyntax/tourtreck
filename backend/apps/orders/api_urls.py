from django.urls import path

from .api_views import (
    CartCreateView,
    CartDetailView,
    CartItemCreateView,
    CartItemDetailView,
    CartClearView,
    CustomerCartMergeView,
    CheckoutView,
    CustomerOrderDetailView,
    CustomerOrderCancelView,
    CustomerOrderExchangeView,
    CustomerOrderListView,
)


urlpatterns = [
    path("cart/", CartCreateView.as_view(), name="cart-create"),
    path("cart/merge/", CustomerCartMergeView.as_view(), name="cart-merge"),
    path("cart/<int:pk>/", CartDetailView.as_view(), name="cart-detail"),
    path("cart/<int:cart_id>/items/", CartItemCreateView.as_view(), name="cart-item-create"),
    path("cart/<int:cart_id>/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("cart/<int:cart_id>/clear/", CartClearView.as_view(), name="cart-clear"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("customer/orders/", CustomerOrderListView.as_view(), name="customer-orders"),
    path("customer/orders/<int:pk>/", CustomerOrderDetailView.as_view(), name="customer-order-detail"),
    path("customer/orders/<int:pk>/cancel/", CustomerOrderCancelView.as_view(), name="customer-order-cancel"),
    path("customer/orders/<int:pk>/exchange/", CustomerOrderExchangeView.as_view(), name="customer-order-exchange"),
]
