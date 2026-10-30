from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.orders.models import Order
from apps.payments.models import PaymentTransaction


class Command(BaseCommand):
    help = "Cancel pending unpaid orders after 48 hours (cash-on-delivery orders are kept)."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=48)
        candidates = Order.objects.filter(status=Order.Status.PENDING, created_at__lte=cutoff)
        cancelled = 0
        for order in candidates.iterator():
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order.pk)
                if order.status != Order.Status.PENDING:
                    continue
                payments = order.payment_transactions.all()
                if payments.filter(status=PaymentTransaction.Status.PAID).exists():
                    continue
                if payments.filter(method__code__icontains="CASH").exists():
                    continue
                order.status = Order.Status.CANCELLED
                order.save(update_fields=("status", "updated_at", "total"))
                cancelled += 1
        self.stdout.write(self.style.SUCCESS(f"Cancelled {cancelled} unpaid order(s)."))
