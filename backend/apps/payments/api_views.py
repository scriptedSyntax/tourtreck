from decimal import Decimal

from django.db.models import Prefetch
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api_permissions import IsAdminRole
from apps.orders.models import Order

from .models import PaymentMethod, PaymentTransaction
from .serializers import PaymentMethodSerializer, PaymentTransactionSerializer


class PublicPaymentMethodListView(generics.ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = PaymentMethodSerializer
    pagination_class = None
    queryset = PaymentMethod.objects.filter(is_active=True).order_by("name")


class AdminPaymentViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminRole,)
    serializer_class = PaymentTransactionSerializer
    http_method_names = ("get", "patch", "head", "options")
    queryset = PaymentTransaction.objects.select_related("order", "method")


class AdminSummaryView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        paid_transactions = PaymentTransaction.objects.filter(
            status=PaymentTransaction.Status.PAID
        )
        orders = Order.objects.prefetch_related(
            Prefetch("payment_transactions", queryset=paid_transactions, to_attr="paid_records")
        )
        total_orders = 0
        total_sales = Decimal("0.00")
        total_paid = Decimal("0.00")
        outstanding = Decimal("0.00")
        pending_orders = 0
        delivered_orders = 0

        for order in orders:
            total_orders += 1
            total_sales += order.total
            paid = sum((payment.amount for payment in order.paid_records), Decimal("0.00"))
            total_paid += paid
            outstanding += max(order.total - paid, Decimal("0.00"))
            if order.status == Order.Status.PENDING:
                pending_orders += 1
            if order.status == Order.Status.DELIVERED:
                delivered_orders += 1

        return Response(
            {
                "total_orders": total_orders,
                "total_sales_value": total_sales,
                "total_paid": total_paid,
                "outstanding_balance": outstanding,
                "pending_orders": pending_orders,
                "delivered_orders": delivered_orders,
            }
        )
