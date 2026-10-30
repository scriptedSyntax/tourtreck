from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.orders.models import Cart, CartItem, Order, OrderItem
from apps.payments.models import PaymentMethod, PaymentTransaction
from apps.shop.models import Category, ContentPage, HomepageSection, Product, ShopProfile


class Command(BaseCommand):
    help = "Populate the database with reusable ecommerce demo data."

    @transaction.atomic
    def handle(self, *args, **options):
        self._create_shop_profile()
        self._create_homepage_sections()
        self._create_content_pages()
        categories = self._create_categories()
        products = self._create_products(categories)
        methods = self._create_payment_methods()
        customer = self._create_customer()
        self._create_cart(customer, products)
        order = self._create_order(customer, products)
        self._create_payment(order, methods["MPESA"])

        self.stdout.write(
            self.style.SUCCESS(
                "Demo ecommerce data seeded successfully. It is safe to run this command again."
            )
        )

    def _create_shop_profile(self):
        if ShopProfile.objects.exists():
            return ShopProfile.objects.first()
        return ShopProfile.objects.create(
            phone="0712345678",
            whatsapp="0712345678",
            email="info@example.com",
            location="Nairobi, Kenya",
            currency="KES",
            delivery_payment_timing=ShopProfile.DeliveryPaymentTiming.BEFORE_DISPATCH,
            pickup_enabled=True,
        )

    def _create_homepage_sections(self):
        section_limit = HomepageSection.configured_limit()
        samples = (
            ("Find Your Perfect Bicycle", "Explore bicycles for every kind of ride.", "Shop Bicycles", "/products/"),
            ("Ride Safely", "Helmets and accessories for safer journeys.", "View Accessories", "/products/"),
            ("Keep Your Bike Moving", "Reliable spare parts and maintenance essentials.", "Shop Spare Parts", "/products/"),
            ("Featured Products", "Discover popular products selected by the shop.", "View Featured", "/products/"),
            ("Visit Our Shop", "Find us in Nairobi or arrange convenient delivery.", "Contact Us", "/contact/"),
        )

        for index in range(section_limit):
            if HomepageSection.objects.count() >= section_limit:
                break
            if index < len(samples):
                title, subtitle, button_text, button_link = samples[index]
            else:
                title = f"Featured Collection {index + 1}"
                subtitle = "Explore more products available from our shop."
                button_text = "Shop Now"
                button_link = "/products/"

            if HomepageSection.objects.filter(title=title).exists():
                continue
            HomepageSection.objects.create(
                title=title,
                subtitle=subtitle,
                button_text=button_text,
                button_link=button_link,
                is_active=True,
                order=index + 1,
            )

    def _create_content_pages(self):
        page_data = (
            (
                "Terms and Conditions",
                "terms-and-conditions",
                "Simple terms for using the shop and placing orders.",
                (
                    "These terms explain how customers use this shop, place orders, and contact the business.\n\n"
                    "Product information, prices, and availability may change from time to time. Orders are reviewed and confirmed by the shop before fulfilment.\n\n"
                    "Customers should provide accurate contact and delivery details. The shop may contact the customer to confirm an order, arrange pickup, or arrange delivery within Kenya.\n\n"
                    "This demo text should be reviewed and replaced with final business terms before production launch."
                ),
                1,
            ),
            (
                "Privacy Policy",
                "privacy-policy",
                "How customer information is handled by the shop.",
                (
                    "The shop collects basic customer details needed to process orders, respond to messages, and provide customer support.\n\n"
                    "Customer information is used for shop operations such as order confirmation, delivery communication, and account access.\n\n"
                    "The shop should keep customer information private and only share it where needed to complete an order or comply with lawful requirements.\n\n"
                    "This demo text should be reviewed and replaced with a final privacy policy before production launch."
                ),
                2,
            ),
            (
                "Delivery and Pickup",
                "delivery-and-pickup",
                "Delivery and pickup information for customers in Kenya.",
                (
                    "Pickup may be available when enabled by the shop. Customers can contact the shop to confirm pickup arrangements.\n\n"
                    "Delivery is handled within Kenya based on the order details provided during checkout. Delivery fees are shown during checkout where applicable.\n\n"
                    "Customers should ensure their phone number and delivery location are correct so the shop can complete fulfilment smoothly."
                ),
                3,
            ),
            (
                "Returns Policy",
                "returns-policy",
                "Basic return guidance for shop customers.",
                (
                    "Customers should contact the shop as soon as possible if there is a concern with an order.\n\n"
                    "Returns or exchanges may depend on product condition, proof of purchase, and the nature of the issue.\n\n"
                    "This demo text should be replaced with the final business return policy before production launch."
                ),
                4,
            ),
        )

        for title, slug, summary, content, order in page_data:
            ContentPage.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "summary": summary,
                    "content": content,
                    "is_active": True,
                    "show_in_footer": True,
                    "order": order,
                },
            )

    def _create_categories(self):
        categories = {}
        for name in ("Bicycles", "Accessories", "Spare Parts"):
            category = Category.objects.filter(name=name).first()
            if category is None:
                category = Category.objects.create(name=name, is_active=True)
            categories[name] = category
        return categories

    def _create_products(self, categories):
        product_data = (
            ("Mountain Bike", "Bicycles", "85000.00", 8, True),
            ("Road Bike", "Bicycles", "120000.00", 5, True),
            ("Helmet", "Accessories", "3500.00", 25, True),
            ("Bike Lock", "Accessories", "1800.00", 30, False),
            ("Brake Pads", "Spare Parts", "1200.00", 40, False),
            ("Bicycle Pump", "Accessories", "2500.00", 20, False),
        )
        products = {}
        for name, category_name, price, stock, featured in product_data:
            product = Product.objects.filter(name=name).first()
            if product is None:
                product = Product.objects.create(
                    category=categories[category_name],
                    name=name,
                    description=f"Demo {name.lower()} for ecommerce admin testing.",
                    price=Decimal(price),
                    stock=stock,
                    is_active=True,
                    is_featured=featured,
                    seo_title=f"{name} in Kenya",
                    seo_description=f"Shop for a quality {name.lower()} from our bicycle store.",
                )
            products[name] = product
        return products

    def _create_payment_methods(self):
        method_data = (
            ("Cash on Delivery", "CASH_ON_DELIVERY", "Pay when your order is delivered."),
            ("M-Pesa", "MPESA", "Enter the confirmation code from your M-Pesa message."),
            ("Bank Transfer", "BANK_TRANSFER", "Pay using the shop bank account details."),
        )
        methods = {}
        for name, code, instructions in method_data:
            method, _ = PaymentMethod.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "instructions": instructions,
                    "is_active": True,
                },
            )
            methods[code] = method
        return methods

    def _create_customer(self):
        customer = User.objects.filter(email="customer@example.com").first()
        if customer is None:
            customer = User.objects.create_user(
                email="customer@example.com",
                password="customer12345",
                full_name="Demo Customer",
                phone="0700000000",
                role=User.Role.CUSTOMER,
            )
        return customer

    def _create_cart(self, customer, products):
        cart = Cart.objects.filter(customer=customer, session_key="demo-cart").first()
        if cart is None:
            cart = Cart.objects.create(customer=customer, session_key="demo-cart")

        for product_name, quantity in (("Mountain Bike", 1), ("Helmet", 2)):
            CartItem.objects.update_or_create(
                cart=cart,
                product=products[product_name],
                defaults={"quantity": quantity},
            )
        return cart

    def _create_order(self, customer, products):
        marker = "Demo order for admin testing"
        order = Order.objects.filter(customer=customer, notes=marker).first()
        if order is None:
            order = Order.objects.create(
                customer=customer,
                customer_name=customer.full_name,
                customer_phone=customer.phone,
                customer_email=customer.email,
                delivery_method=Order.DeliveryMethod.DELIVERY,
                delivery_location="Nairobi CBD",
                delivery_fee=Decimal("300.00"),
                delivery_fee_confirmed=True,
                subtotal=Decimal("0.00"),
                status=Order.Status.PROCESSING,
                notes=marker,
            )

        item_data = (("Mountain Bike", 1), ("Helmet", 2))
        for product_name, quantity in item_data:
            product = products[product_name]
            item = OrderItem.objects.filter(order=order, product=product).first()
            if item is None:
                item = OrderItem(order=order, product=product)
            item.product_name = product.name
            item.quantity = quantity
            item.unit_price = product.price
            item.save()

        order.subtotal = sum(
            (item.total_price for item in order.items.all()),
            Decimal("0.00"),
        )
        order.delivery_method = Order.DeliveryMethod.DELIVERY
        order.delivery_location = "Nairobi CBD"
        order.delivery_fee = Decimal("300.00")
        order.delivery_fee_confirmed = True
        order.status = Order.Status.PROCESSING
        order.notes = marker
        order.save()
        return order

    def _create_payment(self, order, method):
        reference = "DEMO-PARTIAL-PAYMENT"
        transaction_record = PaymentTransaction.objects.filter(
            order=order,
            reference=reference,
        ).first()
        if transaction_record is None:
            transaction_record = PaymentTransaction.objects.create(
                order=order,
                method=method,
                amount=(order.total / 2).quantize(Decimal("0.01")),
                reference=reference,
                status=PaymentTransaction.Status.PAID,
                paid_at=timezone.now(),
                notes="Demo partial payment for admin testing.",
            )
        return transaction_record
