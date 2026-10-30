import re
from decimal import Decimal

from rest_framework import serializers

from apps.payments.models import PaymentMethod, PaymentTransaction
from apps.shop.models import Product
from apps.shop.serializers import ProductImageSerializer

from .models import Cart, CartItem, Order, OrderItem


class CartProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "price", "stock", "available_colours", "images")


class CartItemSerializer(serializers.ModelSerializer):
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    product_detail = CartProductSerializer(source="product", read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ("id", "product", "product_detail", "quantity", "selected_colour", "subtotal", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_product(self, product):
        if not product.is_active or not product.category.is_active:
            raise serializers.ValidationError("This product is not available.")
        return product

    def validate(self, attrs):
        product = attrs.get("product") or getattr(self.instance, "product", None)
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", None))
        if product and quantity and quantity > product.stock:
            raise serializers.ValidationError(
                {"quantity": f"Only {product.stock} item(s) are currently available."}
            )
        colour = attrs.get("selected_colour", getattr(self.instance, "selected_colour", ""))
        colours = [value.strip() for value in product.available_colours.split(",") if value.strip()] if product else []
        if colours and colour not in colours:
            raise serializers.ValidationError({"selected_colour": "Choose an available product colour."})
        if not colours and colour:
            raise serializers.ValidationError({"selected_colour": "This product has no colour choices."})
        return attrs


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    cart_total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "customer", "session_key", "items", "cart_total", "created_at", "updated_at")
        read_only_fields = fields

    def get_cart_total(self, obj):
        return sum((item.subtotal for item in obj.items.all()), 0)


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id", "product", "product_slug", "product_image", "product_name",
            "quantity", "selected_colour", "unit_price", "total_price",
        )

    def get_product_slug(self, obj):
        if not obj.product or not obj.product.is_active:
            return None
        return obj.product.slug

    def get_product_image(self, obj):
        if not obj.product:
            return None
        image = next(iter(obj.product.images.all()), None)
        if not image:
            return None
        return ProductImageSerializer(image, context=self.context).data["image"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_map_url = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "reference", "customer", "customer_name", "customer_phone", "customer_email",
            "delivery_method", "delivery_location", "delivery_latitude", "delivery_longitude",
            "delivery_place_id", "delivery_zone", "delivery_map_url", "delivery_fee", "delivery_fee_confirmed", "subtotal", "total",
            "status", "notes", "items", "created_at", "updated_at",
            "delivered_at", "exchange_requested", "exchange_request_notes",
        )
        read_only_fields = fields


class AdminOrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_map_url = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "reference", "customer", "customer_name", "customer_phone", "customer_email",
            "delivery_method", "delivery_location", "delivery_latitude", "delivery_longitude",
            "delivery_place_id", "delivery_zone", "delivery_map_url", "delivery_fee", "delivery_fee_confirmed", "subtotal", "total",
            "status", "notes", "items", "created_at", "updated_at",
            "delivered_at", "exchange_requested", "exchange_request_notes",
        )
        read_only_fields = (
            "id", "reference", "customer", "customer_name", "customer_phone", "customer_email",
            "delivery_method", "delivery_latitude", "delivery_longitude", "delivery_place_id", "delivery_map_url",
            "delivery_zone", "delivery_fee_confirmed", "subtotal", "total", "items", "created_at", "updated_at", "delivered_at", "exchange_requested", "exchange_request_notes",
        )


class CheckoutSerializer(serializers.Serializer):
    cart_id = serializers.IntegerField()
    customer_name = serializers.CharField(max_length=255)
    customer_phone = serializers.CharField(max_length=30)
    customer_email = serializers.EmailField()
    delivery_method = serializers.ChoiceField(choices=Order.DeliveryMethod.choices)
    delivery_location = serializers.CharField(required=False, allow_blank=True)
    delivery_latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    delivery_longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    delivery_place_id = serializers.CharField(required=False, allow_blank=True, max_length=255)
    notes = serializers.CharField(required=False, allow_blank=True)
    payment_reference = serializers.CharField(required=False, allow_blank=True, max_length=100)
    payment_method = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethod.objects.filter(is_active=True)
    )

    def validate(self, attrs):
        attrs["customer_email"] = attrs["customer_email"].strip().lower()
        if attrs["delivery_method"] == Order.DeliveryMethod.DELIVERY:
            if not attrs.get("delivery_location", "").strip():
                raise serializers.ValidationError(
                    {"delivery_location": "A delivery location is required."}
                )
            latitude = attrs.get("delivery_latitude")
            longitude = attrs.get("delivery_longitude")
            if latitude is None or longitude is None:
                raise serializers.ValidationError(
                    {"delivery_location": "Select and confirm the delivery pin."}
                )
            if not Decimal("-5.0") <= latitude <= Decimal("5.5") or not Decimal("33.5") <= longitude <= Decimal("42.5"):
                raise serializers.ValidationError(
                    {"delivery_location": "Select a location within Kenya."}
                )
        else:
            attrs["delivery_location"] = ""
            attrs["delivery_latitude"] = None
            attrs["delivery_longitude"] = None
            attrs["delivery_place_id"] = ""
        reference = attrs.get("payment_reference", "").strip().upper()
        method_code = attrs["payment_method"].code
        if method_code in {"MPESA", "BANK_TRANSFER"} and not reference:
            raise serializers.ValidationError(
                {"payment_reference": "Enter the payment confirmation reference."}
            )
        if reference and not re.fullmatch(r"[A-Z0-9-]{4,100}", reference):
            raise serializers.ValidationError(
                {"payment_reference": "Use only letters, numbers, or hyphens."}
            )
        if reference and PaymentTransaction.objects.filter(reference__iexact=reference).exists():
            raise serializers.ValidationError(
                {"payment_reference": "This payment reference has already been used."}
            )
        attrs["payment_reference"] = reference
        return attrs
