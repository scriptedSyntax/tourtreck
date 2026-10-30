from .bank import BankProcessor
from .card import CardProcessor
from .cash import CashProcessor
from .mpesa import MpesaProcessor


def get_processor(method_code):
    processors = {
        "CASH_ON_DELIVERY": CashProcessor,
        "BANK_TRANSFER": BankProcessor,
        "MPESA": MpesaProcessor,
        "CARD": CardProcessor,
    }
    return processors.get(method_code.upper(), CashProcessor)()
