import uuid
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api_permissions import IsAdminRole, IsCustomerRole
from apps.accounts.models import User
from apps.payments.models import PaymentTransaction
from apps.payments.processors import get_processor
from apps.shop.models import ShopProfile

from .models import Cart, CartItem, Order, OrderItem
from .serializers import (
    AdminOrderSerializer,
    CartItemSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
)
from .notifications import send_order_created_notifications


def cart_queryset():
    return Cart.objects.select_related("customer").prefetch_related(
        "items__product__category", "items__product__images"
    )


def cart_token_from_request(request):
    return request.headers.get("X-Cart-Token") or request.COOKIES.get(
        settings.CART_COOKIE_NAME
    )


def get_accessible_cart(request, cart_id, queryset=None):
    queryset = queryset if queryset is not None else cart_queryset()
    token = cart_token_from_request(request)

    if request.user.is_authenticated:
        if not request.user.is_customer_role:
            raise PermissionDenied("Only customers can use storefront carts.")
        allowed = Q(customer=request.user)
        if token:
            allowed |= Q(customer__isnull=True, session_key=token)
        return get_object_or_404(queryset, allowed, pk=cart_id)

    if not token:
        raise NotFound("Cart not found.")
    return get_object_or_404(
        queryset,
        pk=cart_id,
        customer__isnull=True,
        session_key=token,
    )


class CartCreateView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "cart"

    def post(self, request):
        if request.user.is_authenticated and not request.user.is_customer_role:
            raise PermissionDenied("Only customers can use storefront carts.")
        customer = request.user if request.user.is_authenticated else None
        if customer:
            cart, _ = Cart.objects.get_or_create(
                customer=customer,
                defaults={"session_key": uuid.uuid4().hex},
            )
        else:
            cart = Cart.objects.create(session_key=uuid.uuid4().hex)
        response = Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)
        if customer is None:
            response.set_cookie(
                settings.CART_COOKIE_NAME,
                cart.session_key,
                max_age=settings.CART_COOKIE_MAX_AGE,
                httponly=True,
                secure=settings.CART_COOKIE_SECURE,
                samesite="Lax",
                path="/api/",
            )
        return response


class CustomerCartMergeView(APIView):
    permission_classes = (IsCustomerRole,)
    throttle_scope = "cart"

    @transaction.atomic
    def post(self, request):
        submitted = request.data.get("items")
        if not isinstance(submitted, list) or not 1 <= len(submitted) <= 50:
            return Response({"items": ["Submit between 1 and 50 products."]}, status=status.HTTP_400_BAD_REQUEST)
        cart, _ = Cart.objects.select_for_update().get_or_create(
            customer=request.user,
            defaults={"session_key": uuid.uuid4().hex},
        )
        seen = set()
        validated = []
        for value in submitted:
            serializer = CartItemSerializer(data=value)
            serializer.is_valid(raise_exception=True)
            product = serializer.validated_data["product"]
            if product.pk in seen:
                return Response({"items": ["A product can only appear once."]}, status=status.HTTP_400_BAD_REQUEST)
            seen.add(product.pk)
            validated.append(serializer.validated_data)
        existing_products = set(cart.items.values_list("product_id", flat=True))
        if len(existing_products | seen) > 50:
            return Response({"items": ["A cart can contain up to 50 products."]}, status=status.HTTP_400_BAD_REQUEST)
        for item_data in validated:
            product = item_data["product"]
            quantity = item_data["quantity"]
            colour = item_data.get("selected_colour", "")
            item = CartItem.objects.filter(cart=cart, product=product, selected_colour=colour).first()
            if item:
                if quantity > item.quantity:
                    item.quantity = quantity
                    item.save(update_fields=("quantity", "updated_at"))
            else:
                CartItem.objects.create(cart=cart, product=product, quantity=quantity, selected_colour=colour)
        return Response(CartSerializer(cart_queryset().get(pk=cart.pk)).data)


class CartDetailView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "cart"

    def get(self, request, pk):
        cart = get_accessible_cart(request, pk)
        return Response(CartSerializer(cart).data)


class CartItemCreateView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "cart"

    def post(self, request, cart_id):
        cart = get_accessible_cart(request, cart_id, Cart.objects.all())
        serializer = CartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]
        colour = serializer.validated_data.get("selected_colour", "")
        item = CartItem.objects.filter(cart=cart, product=product, selected_colour=colour).first()
        if item:
            serializer = CartItemSerializer(item, data={"quantity": min(item.quantity + quantity, 100)}, partial=True)
            serializer.is_valid(raise_exception=True)
        item = serializer.save(cart=cart) if item is None else serializer.save()
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)


class CartClearView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "cart"

    def delete(self, request, cart_id):
        cart = get_accessible_cart(request, cart_id, Cart.objects.all())
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemDetailView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "cart"

    def patch(self, request, cart_id, item_id):
        cart = get_accessible_cart(request, cart_id, Cart.objects.all())
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        serializer = CartItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, cart_id, item_id):
        cart = get_accessible_cart(request, cart_id, Cart.objects.all())
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CheckoutView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "checkout"

    @transaction.atomic
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        cart = get_accessible_cart(
            request,
            data["cart_id"],
            cart_queryset().select_for_update(),
        )
        items = list(cart.items.select_related("product"))
        if not items:
            return Response(
                {"cart": ["The cart is empty."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        unavailable = [
            item.product.name
            for item in items
            if not item.product.is_active or not item.product.category.is_active
        ]
        if unavailable:
            return Response(
                {"cart": [f"Unavailable products: {', '.join(unavailable)}"]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        insufficient_stock = [
            item.product.name for item in items if item.quantity > item.product.stock
        ]
        if insufficient_stock:
            return Response(
                {"cart": [f"Insufficient stock: {', '.join(insufficient_stock)}"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subtotal = sum((item.subtotal for item in items), Decimal("0.00"))
        delivery_fee = Decimal("0.00")
        delivery_fee_confirmed = data["delivery_method"] == Order.DeliveryMethod.PICKUP

        signed_in_customer = None
        if request.user.is_authenticated and request.user.is_customer_role:
            signed_in_customer = request.user
        elif cart.customer and cart.customer.is_customer_role:
            signed_in_customer = cart.customer

        customer_name = signed_in_customer.full_name if signed_in_customer else data["customer_name"]
        customer_phone = signed_in_customer.phone if signed_in_customer else data["customer_phone"]
        customer_email = signed_in_customer.email if signed_in_customer else data["customer_email"]
        customer = signed_in_customer

        if customer is None:
            existing_user = User.objects.filter(email__iexact=customer_email).first()
            if existing_user is None:
                try:
                    with transaction.atomic():
                        customer = User.objects.create_user(
                            email=customer_email,
                            password=None,
                            full_name=customer_name,
                            phone=customer_phone,
                            role=User.Role.CUSTOMER,
                        )
                except IntegrityError:
                    existing_user = User.objects.filter(email__iexact=customer_email).first()
            if customer is None and existing_user and existing_user.is_active and existing_user.is_customer_role:
                customer = existing_user

        order = Order.objects.create(
            customer=customer,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            delivery_method=data["delivery_method"],
            delivery_location=data.get("delivery_location", ""),
            delivery_latitude=data.get("delivery_latitude"),
            delivery_longitude=data.get("delivery_longitude"),
            delivery_place_id=data.get("delivery_place_id", ""),
            delivery_fee=delivery_fee,
            delivery_fee_confirmed=delivery_fee_confirmed,
            subtotal=subtotal,
            notes=data.get("notes", ""),
        )
        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product.name,
                quantity=item.quantity,
                unit_price=item.product.price,
                selected_colour=item.selected_colour,
            )

        method = data["payment_method"]
        result = get_processor(method.code).process(
            order=order,
            method=method,
            request_data=data,
        )
        PaymentTransaction.objects.create(
            order=order,
            method=method,
            amount=order.total,
            reference=result.reference,
            status=result.status,
            notes=result.message,
        )

        transaction.on_commit(lambda order_id=order.pk: send_order_created_notifications(order_id))

        was_guest_cart = cart.customer_id is None
        cart.delete()
        response = Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        if was_guest_cart:
            response.delete_cookie(settings.CART_COOKIE_NAME, path="/api/")
        return response


class CustomerOrderListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated, IsCustomerRole)
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__product__images")


class CustomerOrderDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated, IsCustomerRole)
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__product__images")


class CustomerOrderCancelView(APIView):
    permission_classes = (IsAuthenticated, IsCustomerRole)

    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_for_update().prefetch_related("items__product__images"),
            pk=pk,
            customer=request.user,
        )
        from django.utils import timezone
        from datetime import timedelta
        if order.status != Order.Status.PENDING or timezone.now() - order.created_at > timedelta(hours=48):
            return Response(
                {"order": ["Contact the shop to request cancellation."]},
                status=status.HTTP_409_CONFLICT,
            )
        if order.payment_transactions.filter(status=PaymentTransaction.Status.PAID).exists():
            return Response(
                {"order": ["Contact the shop to request cancellation for a paid order."]},
                status=status.HTTP_409_CONFLICT,
            )
        order.status = Order.Status.CANCELLED
        order.save(update_fields=("status", "updated_at", "total"))
        return Response(OrderSerializer(order).data)


class CustomerOrderExchangeView(APIView):
    permission_classes = (IsAuthenticated, IsCustomerRole)

    @transaction.atomic
    def post(self, request, pk):
        from datetime import timedelta
        from django.utils import timezone
        order = get_object_or_404(Order.objects.select_for_update(), pk=pk, customer=request.user)
        if order.status != Order.Status.DELIVERED or not order.delivered_at or timezone.now() - order.delivered_at > timedelta(hours=48):
            return Response({"order": ["Exchange requests are available within 48 hours of delivery."]}, status=status.HTTP_409_CONFLICT)
        note = str(request.data.get("notes", "")).strip()[:2000]
        if not note:
            return Response({"notes": ["Tell us which same-value product you would like to exchange for."]}, status=status.HTTP_400_BAD_REQUEST)
        order.exchange_requested = True
        order.exchange_request_notes = note
        order.save(update_fields=("exchange_requested", "exchange_request_notes", "updated_at", "total"))
        return Response(OrderSerializer(order).data)


class AdminOrderViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminRole,)
    serializer_class = AdminOrderSerializer
    http_method_names = ("get", "patch", "head", "options")
    queryset = Order.objects.select_related("customer").prefetch_related("items")
