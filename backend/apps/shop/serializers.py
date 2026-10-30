from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from .models import AdHero, Category, ContactInquiry, ContentPage, HomepageSection, NewsletterSubscriber, Product, ProductImage, ProductReview, ShopProfile, SiteSetting


class PublicSiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = (
            "business_name",
            "logo",
            "favicon",
            "primary_color",
            "secondary_color",
            "accent_color",
            "default_seo_title",
            "default_seo_description",
            "featured_product_limit",
        )


class SiteSettingAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")


class ShopProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopProfile
        fields = (
            "phone",
            "whatsapp",
            "email",
            "location",
            "currency",
            "delivery_payment_timing",
            "pickup_enabled",
        )


class HomepageSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageSection
        fields = (
            "id",
            "title",
            "subtitle",
            "image",
            "button_text",
            "button_link",
            "order",
        )


class AdHeroSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdHero
        fields = ("id", "title", "subtitle", "image", "link", "order")


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ("email",)

    def validate_email(self, value):
        return value.strip().lower()

    def create(self, validated_data):
        subscriber, _ = NewsletterSubscriber.objects.update_or_create(
            email=validated_data["email"],
            defaults={"is_active": True},
        )
        return subscriber


class ContactInquirySerializer(serializers.ModelSerializer):
    purpose = serializers.ChoiceField(choices=("Buy a bicycle", "Find accessories", "Spare parts", "Delivery or pickup question"))
    rider = serializers.ChoiceField(choices=("Adult commuter", "Student", "Child or teen", "Fitness or weekend rider"))
    budget = serializers.ChoiceField(choices=("Below KES 10,000", "KES 10,000 - 30,000", "KES 30,000 - 80,000", "Above KES 80,000"))
    location = serializers.ChoiceField(choices=("Nairobi", "Mombasa", "Kisumu", "Nakuru", "Other town in Kenya"))

    class Meta:
        model = ContactInquiry
        fields = ("purpose", "rider", "budget", "location", "name", "phone", "email", "message")

    def validate(self, attrs):
        for field in ("purpose", "rider", "budget", "location", "name", "phone"):
            attrs[field] = " ".join(attrs[field].split())
        attrs["email"] = attrs.get("email", "").strip().lower()
        attrs["message"] = " ".join(attrs.get("message", "").split())
        if len(attrs["name"]) < 2 or len(attrs["phone"]) < 7:
            raise serializers.ValidationError("Enter a valid name and phone number.")
        if any(character not in "+()- 0123456789" for character in attrs["phone"]):
            raise serializers.ValidationError({"phone": "Enter a valid phone number."})
        return attrs


class ContentPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentPage
        fields = (
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "show_in_footer",
            "order",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "updated_at")


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "image", "parent", "parent_name", "is_active", "created_at", "updated_at")
        read_only_fields = ("slug", "created_at", "updated_at")


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text", "is_main")


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "category_name",
            "name",
            "slug",
            "description",
            "price",
            "old_price",
            "stock",
            "available_colours",
            "is_active",
            "is_featured",
            "seo_title",
            "seo_description",
            "rating",
            "rating_count",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("slug", "created_at", "updated_at")


class ProductReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    verified_purchase = serializers.SerializerMethodField()
    comment = serializers.CharField(max_length=4000, trim_whitespace=True)

    class Meta:
        model = ProductReview
        fields = ("id", "customer_name", "rating", "title", "comment", "verified_purchase", "created_at", "updated_at")
        read_only_fields = ("id", "customer_name", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context.get("request")
        product = self.context.get("product")
        if request and product and ProductReview.objects.filter(product=product, customer=request.user).exists():
            raise serializers.ValidationError("You have already reviewed this product.")
        if request and product:
            from apps.orders.models import OrderItem
            purchased = OrderItem.objects.filter(order__customer=request.user, order__status="DELIVERED", product=product).exists()
            if not purchased:
                raise PermissionDenied("Only delivered purchases can be reviewed.")
        return attrs

    def get_verified_purchase(self, obj):
        return True


class WishlistProductSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
