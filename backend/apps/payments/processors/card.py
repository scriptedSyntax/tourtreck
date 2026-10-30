from .base import BasePaymentProcessor, PaymentResult


class CardProcessor(BasePaymentProcessor):
    """Placeholder for a future card gateway integration."""

    def process(self, *, order, method, request_data=None):
        return PaymentResult(message="Card processing is not connected yet.")
