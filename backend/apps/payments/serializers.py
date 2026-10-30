from rest_framework import serializers

from .models import PaymentMethod, PaymentTransaction


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ("id", "name", "code", "instructions", "is_active")


class PaymentTransactionSerializer(serializers.ModelSerializer):
    method_name = serializers.CharField(source="method.name", read_only=True)
    order_customer_name = serializers.CharField(source="order.customer_name", read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = (
            "id", "order", "order_customer_name", "method", "method_name", "amount",
            "reference", "status", "paid_at", "notes", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "order", "order_customer_name", "method", "method_name", "amount",
            "created_at", "updated_at",
        )
