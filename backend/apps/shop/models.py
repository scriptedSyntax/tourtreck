from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.conf import settings
from django.db.models import Avg
from django.utils.text import slugify
from urllib.parse import urlparse


def validate_safe_link(value):
    if not value:
        return
    value = value.strip()
    if not value or any(not character.isprintable() for character in value) or "\\" in value:
        raise ValidationError("Use a relative path, anchor, or HTTPS URL.")
    if value.startswith("//"):
        raise ValidationError("Use a relative path, anchor, or HTTPS URL.")
    if value.startswith(("/", "#")):
        return
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValidationError("Use a relative path, anchor, or HTTPS URL.")


def validate_model_images(instance, *names):
    from .image_utils import validate_uploaded_image
    for name in names:
        validate_uploaded_image(getattr(instance, name, None))


def sanitize_model_images(instance, *names):
    from .image_utils import sanitize_uploaded_image
    for name in names:
        field = getattr(instance, name, None)
        sanitized = sanitize_uploaded_image(field)
        if sanitized is not field:
            setattr(instance, name, sanitized)


color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a valid hex color such as #1A2B3C.",
)


def unique_slug(instance, value):
    model = type(instance)
    base_slug = slugify(value) or model._meta.model_name
    slug = base_slug
    number = 2
    queryset = model.objects.exclude(pk=instance.pk)
    while queryset.filter(slug=slug).exists():
        slug = f"{base_slug}-{number}"
        number += 1
    return slug


class SingletonModel(models.Model):
    class Meta:
        abstract = True

    def clean(self):
        super().clean()
        validate_model_images(self, "logo", "favicon")
        if not self.pk and type(self).objects.exists():
            raise ValidationError("Only one record is allowed.")


class SiteSetting(SingletonModel):
    business_name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="branding/logos/", blank=True)
    favicon = models.ImageField(upload_to="branding/favicons/", blank=True)
    primary_color = models.CharField(max_length=7, default="#0D6EFD", validators=[color_validator])
    secondary_color = models.CharField(max_length=7, default="#6C757D", validators=[color_validator])
    accent_color = models.CharField(max_length=7, default="#FFC107", validators=[color_validator])
    default_seo_title = models.CharField(max_length=255, blank=True)
    default_seo_description = models.TextField(blank=True)
    homepage_section_limit = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of homepage sections the shop can create.",
    )
    featured_product_limit = models.PositiveSmallIntegerField(
        default=10,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of featured products shown on the homepage.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "site setting"
        verbose_name_plural = "site settings"

    def clean(self):
        super().clean()
        existing_sections = HomepageSection.objects.count()
        if self.homepage_section_limit < existing_sections:
            raise ValidationError(
                {
                    "homepage_section_limit": (
                        f"There are already {existing_sections} homepage sections. "
                        "Delete sections before lowering this limit."
                    )
                }
            )

    def __str__(self):
        return self.business_name

    def save(self, *args, **kwargs):
        sanitize_model_images(self, "logo", "favicon")
        self.full_clean()
        super().save(*args, **kwargs)


class ShopProfile(SingletonModel):
    class DeliveryPaymentTiming(models.TextChoices):
        BEFORE_DISPATCH = "BEFORE_DISPATCH", "Before dispatch"
        ON_DELIVERY = "ON_DELIVERY", "On delivery"

    phone = models.CharField(max_length=30)
    whatsapp = models.CharField(max_length=30, blank=True)
    email = models.EmailField()
    location = models.TextField()
    currency = models.CharField(max_length=10, default="KES")
    delivery_payment_timing = models.CharField(
        max_length=20,
        choices=DeliveryPaymentTiming.choices,
        default=DeliveryPaymentTiming.BEFORE_DISPATCH,
        help_text="Choose when customers pay the delivery fee after the shop confirms the distance-based quote.",
    )
    pickup_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "shop profile"
        verbose_name_plural = "shop profile"

    def __str__(self):
        return self.email


class HomepageSection(models.Model):
    title = models.CharField(max_length=255)
    subtitle = models.TextField(blank=True)
    image = models.ImageField(upload_to="homepage/", blank=True)
    button_text = models.CharField(max_length=100, blank=True)
    button_link = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "id")

    @classmethod
    def configured_limit(cls):
        setting = SiteSetting.objects.first()
        return setting.homepage_section_limit if setting else 5

    def clean(self):
        super().clean()
        validate_model_images(self, "image")
        validate_safe_link(self.button_link)
        existing_sections = type(self).objects.exclude(pk=self.pk).count()
        if existing_sections >= self.configured_limit():
            raise ValidationError(
                f"The homepage section limit is {self.configured_limit()}."
            )

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        sanitize_model_images(self, "image")
        self.full_clean()
        super().save(*args, **kwargs)


class AdHero(models.Model):
    title = models.CharField(max_length=255)
    subtitle = models.TextField(blank=True)
    image = models.ImageField(upload_to="ad-heroes/")
    link = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "-created_at")
        verbose_name = "ad hero"
        verbose_name_plural = "ad heroes"

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        validate_model_images(self, "image")
        validate_safe_link(self.link)

    def save(self, *args, **kwargs):
        sanitize_model_images(self, "image")
        self.full_clean()
        super().save(*args, **kwargs)


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.email


class ContactInquiry(models.Model):
    purpose = models.CharField(max_length=120)
    rider = models.CharField(max_length=120)
    budget = models.CharField(max_length=120)
    location = models.CharField(max_length=120)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    message = models.TextField(blank=True)
    is_handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "contact inquiry"
        verbose_name_plural = "contact inquiries"

    def __str__(self):
        return f"{self.name} - {self.purpose}"


class ContentPage(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    summary = models.TextField(blank=True)
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    show_in_footer = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "title")
        verbose_name = "content page"
        verbose_name_plural = "content pages"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.title)
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Category(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey("self", on_delete=models.PROTECT, related_name="subcategories", blank=True, null=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    image = models.ImageField(upload_to="categories/", blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        sanitize_model_images(self, "image")
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        validate_model_images(self, "image")
        if self.parent_id == self.pk and self.pk:
            raise ValidationError({"parent": "A category cannot be its own parent."})
        if self.parent and self.parent.parent_id:
            raise ValidationError({"parent": "Choose a main category as the parent."})

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    old_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(Decimal("0.00"))])
    stock = models.PositiveIntegerField(default=0)
    available_colours = models.CharField(max_length=500, blank=True, help_text="Choose all available colours from the list.")
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=Decimal("0.0"),
        validators=[MinValueValidator(Decimal("0.0")), MaxValueValidator(Decimal("5.0"))],
    )
    rating_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    def update_rating(self):
        summary = self.reviews.filter(is_approved=True).aggregate(
            average=Avg("rating"),
            count=models.Count("id"),
        )
        type(self).objects.filter(pk=self.pk).update(
            rating=summary["average"] or Decimal("0.0"),
            rating_count=summary["count"],
        )


class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=120, blank=True)
    comment = models.TextField()
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [models.UniqueConstraint(fields=("product", "customer"), name="one_review_per_customer_product")]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.product.update_rating()

    def delete(self, *args, **kwargs):
        product = self.product
        result = super().delete(*args, **kwargs)
        product.update_rating()
        return result

    def __str__(self):
        return f"{self.product.name} - {self.rating}/5"


class WishlistItem(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlist_items")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("customer", "product"),
                name="one_wishlist_item_per_customer_product",
            )
        ]

    def __str__(self):
        return f"{self.customer.email} - {self.product.name}"


class ProductImage(models.Model):
    MAX_IMAGES_PER_PRODUCT = 5

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=255, blank=True)
    is_main = models.BooleanField(default=False)
    branding_applied = models.BooleanField(default=False, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_main", "id")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_image_name = self.image.name if self.image else ""

    def clean(self):
        super().clean()
        validate_model_images(self, "image")
        if not self.product_id:
            return

        existing_images = type(self).objects.filter(product_id=self.product_id)
        if self.pk:
            existing_images = existing_images.exclude(pk=self.pk)
        if existing_images.count() >= self.MAX_IMAGES_PER_PRODUCT:
            raise ValidationError(
                {"image": "A product can have a maximum of 5 images."}
            )

    def save(self, *args, **kwargs):
        image_changed = bool(self.image) and self.image.name != self._original_image_name
        if self.image and (image_changed or not self.branding_applied):
            from .image_utils import brand_product_image

            branded_image = brand_product_image(self.image)
            if branded_image is not None:
                self.image = branded_image
                self.branding_applied = True
                if kwargs.get("update_fields") is not None:
                    kwargs["update_fields"] = set(kwargs["update_fields"]) | {
                        "image",
                        "branding_applied",
                    }
        self.full_clean()
        super().save(*args, **kwargs)
        self._original_image_name = self.image.name

    def __str__(self):
        return f"{self.product.name} image"
