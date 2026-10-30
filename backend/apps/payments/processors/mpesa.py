from .base import BasePaymentProcessor, PaymentResult


class MpesaProcessor(BasePaymentProcessor):
    """Placeholder for a future real M-Pesa integration."""

    def process(self, *, order, method, request_data=None):
        reference = (request_data or {}).get("payment_reference", "")
        return PaymentResult(reference=reference, message="M-Pesa payment is awaiting confirmation.")
