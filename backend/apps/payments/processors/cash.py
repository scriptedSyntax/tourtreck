from .base import BasePaymentProcessor, PaymentResult


class CashProcessor(BasePaymentProcessor):
    def process(self, *, order, method, request_data=None):
        return PaymentResult(message="Cash payment will be confirmed manually.")
