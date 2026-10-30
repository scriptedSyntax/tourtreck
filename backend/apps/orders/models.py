from decimal import Decimal
from math import asin, cos, radians, sin, sqrt
import secrets

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction

from apps.shop.models import Product


ORDER_REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
NAIROBI_CENTER = (-1.2921, 36.8219)
NAIROBI_RADIUS_KM = 35
OUTSIDE_NAIROBI_RADIUS_KM = 100


def delivery_zone_for_coordinates(latitude, longitude):
    if latitude is None or longitude is None:
        return ""
    lat1, lon1 = radians(float(latitude)), radians(float(longitude))
    lat2, lon2 = radians(NAIROBI_CENTER[0]), radians(NAIROBI_CENTER[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    haversine = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    distance = 6371 * 2 * asin(sqrt(haversine))
    if distance <= NAIROBI_RADIUS_KM:
        return "NAIROBI"
    if distance <= OUTSIDE_NAIROBI_RADIUS_KM:
        return "OUTSIDE_NAIROBI"
    return "COUNTRYWIDE"


def generate_order_reference():
    return "".join(secrets.choice(ORDER_REFERENCE_ALPHABET) for _ in range(8))


class Cart(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="carts",
        blank=True,
        null=True,
    )
    session_key = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        verbose_name = "logged-in cart"
        verbose_name_plural = "logged-in carts"
        constraints = [
            models.UniqueConstraint(
                fields=("customer",),
                condition=models.Q(customer__isnull=False),
                name="one_logged_in_cart_per_customer",
            )
        ]

    def __str__(self):
        return f"Cart {self.pk}" if self.pk else "New cart"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    selected_colour = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("cart", "product", "selected_colour"),
                name="unique_product_per_cart",
            )
        ]

    @property
    def subtotal(self):
        return self.quantity * self.product.price

    def __str__(self):
        return f"{self.quantity} × {self.product.name}"


class Order(models.Model):
    class DeliveryZone(models.TextChoices):
        NAIROBI = "NAIROBI", "Within Nairobi"
        OUTSIDE_NAIROBI = "OUTSIDE_NAIROBI", "Outside Nairobi"
        COUNTRYWIDE = "COUNTRYWIDE", "Countrywide"

    DELIVERY_FEES = {
        DeliveryZone.NAIROBI: Decimal("650.00"),
        DeliveryZone.OUTSIDE_NAIROBI: Decimal("1200.00"),
        DeliveryZone.COUNTRYWIDE: Decimal("1450.00"),
    }
    class DeliveryMethod(models.TextChoices):
        PICKUP = "PICKUP", "Pickup"
        DELIVERY = "DELIVERY", "Delivery"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        EN_ROUTE = "EN_ROUTE", "En route"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    reference = models.CharField(
        max_length=8,
        unique=True,
        default=generate_order_reference,
        editable=False,
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="orders",
        blank=True,
        null=True,
    )
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=30)
    customer_email = models.EmailField(blank=True)
    delivery_method = models.CharField(
        max_length=20,
        choices=DeliveryMethod.choices,
    )
    delivery_zone = models.CharField(max_length=20, choices=DeliveryZone.choices, blank=True, help_text="Calculated automatically from the delivery map coordinates.")
    delivery_location = models.TextField(blank=True)
    delivery_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
    )
    delivery_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
    )
    delivery_place_id = models.CharField(max_length=255, blank=True)
    delivery_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    delivery_fee_confirmed = models.BooleanField(
        default=False,
        help_text="Confirm after the shop has calculated the distance-based delivery charge.",
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        editable=False,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    exchange_requested = models.BooleanField(default=False)
    exchange_request_notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)

    def clean(self):
        super().clean()
        if self.delivery_method == self.DeliveryMethod.DELIVERY:
            if not self.delivery_location or not self.delivery_location.strip():
                raise ValidationError(
                    {"delivery_location": "A delivery location is required."}
                )
            if (self.delivery_latitude is None) != (self.delivery_longitude is None):
                raise ValidationError(
                    {"delivery_location": "Both delivery coordinates are required."}
                )
            if self.delivery_latitude is not None and not Decimal("-5.0") <= self.delivery_latitude <= Decimal("5.5"):
                raise ValidationError({"delivery_latitude": "Select a location within Kenya."})
            if self.delivery_longitude is not None and not Decimal("33.5") <= self.delivery_longitude <= Decimal("42.5"):
                raise ValidationError({"delivery_longitude": "Select a location within Kenya."})

    def save(self, *args, **kwargs):
        previous_status = None
        if self.pk:
            previous_status = type(self).objects.filter(pk=self.pk).values_list("status", flat=True).first()
        if self.delivery_method == self.DeliveryMethod.PICKUP:
            self.delivery_location = ""
            self.delivery_latitude = None
            self.delivery_longitude = None
            self.delivery_place_id = ""
            self.delivery_zone = ""
            self.delivery_fee = Decimal("0.00")
            self.delivery_fee_confirmed = True
        elif self.delivery_latitude is not None and self.delivery_longitude is not None:
            self.delivery_zone = delivery_zone_for_coordinates(
                self.delivery_latitude,
                self.delivery_longitude,
            )
            self.delivery_fee = self.DELIVERY_FEES[self.delivery_zone]
            self.delivery_fee_confirmed = True
        if self.status == self.Status.DELIVERED and self.delivered_at is None:
            from django.utils import timezone
            self.delivered_at = timezone.now()
        self.total = self.subtotal + self.delivery_fee
        self.full_clean()
        if self.status == self.Status.DELIVERED and kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = tuple(set(kwargs["update_fields"]) | {"delivered_at"})
        super().save(*args, **kwargs)
        if previous_status is not None and previous_status != self.status:
            from .notifications import send_order_status_notification
            transaction.on_commit(lambda order_id=self.pk: send_order_status_notification(order_id))

    def __str__(self):
        return f"Order {self.reference} - {self.customer_name}"

    @property
    def delivery_map_url(self):
        if self.delivery_latitude is None or self.delivery_longitude is None:
            return ""
        return (
            "https://www.google.com/maps/search/?api=1&query="
            f"{self.delivery_latitude},{self.delivery_longitude}"
        )


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        related_name="order_items",
        blank=True,
        null=True,
    )
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    selected_colour = models.CharField(max_length=60, blank=True)
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} × {self.product_name}"
