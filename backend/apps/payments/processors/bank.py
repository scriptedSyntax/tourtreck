from .base import BasePaymentProcessor, PaymentResult


class BankProcessor(BasePaymentProcessor):
    def process(self, *, order, method, request_data=None):
        reference = (request_data or {}).get("payment_reference", "")
        return PaymentResult(reference=reference, message="Bank transfer is awaiting confirmation.")
