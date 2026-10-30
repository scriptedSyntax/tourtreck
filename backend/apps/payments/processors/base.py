from dataclasses import dataclass


@dataclass
class PaymentResult:
    status: str = "PENDING"
    reference: str = ""
    message: str = "Payment is awaiting confirmation."


class BasePaymentProcessor:
    def process(self, *, order, method, request_data=None):
        return PaymentResult()
