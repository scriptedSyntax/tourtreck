import json

from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet
from django.utils.html import format_html, format_html_join
from apps.core.admin import export_as_csv

from .models import AdHero, Category, ContactInquiry, ContentPage, HomepageSection, NewsletterSubscriber, Product, ProductImage, ProductReview, ShopProfile, SiteSetting, WishlistItem


THEME_PRESETS = {
    "ocean": ("Ocean Blue", "#0F4C81", "#1E6F8F", "#F2B134"),
    "emerald": ("Emerald Green", "#166534", "#047857", "#F59E0B"),
    "sunset": ("Sunset Orange", "#C2410C", "#9A3412", "#FACC15"),
    "royal": ("Royal Indigo", "#4338CA", "#6D28D9", "#F59E0B"),
    "rose": ("Rose Red", "#BE123C", "#9F1239", "#F59E0B"),
    "teal": ("Modern Teal", "#0F766E", "#155E75", "#F97316"),
    "sky": ("Sky Blue", "#0369A1", "#0E7490", "#EAB308"),
    "violet": ("Violet Bloom", "#6D28D9", "#7E22CE", "#EC4899"),
    "earth": ("Natural Earth", "#57534E", "#3F6212", "#D97706"),
    "rainbow": ("Rainbow Bright", "#DC2626", "#2563EB", "#FACC15"),
}


class SiteSettingAdminForm(forms.ModelForm):
    theme_preset = forms.ChoiceField(
        label="Colour theme",
        required=False,
        choices=(("custom", "Custom colours"),) + tuple(
            (key, values[0]) for key, values in THEME_PRESETS.items()
        ),
        help_text="Choose a coordinated theme, then fine-tune any colour with the colour wheel below.",
    )

    class Meta:
        model = SiteSetting
        fields = "__all__"
        widgets = {
            "primary_color": forms.TextInput(attrs={"type": "color", "title": "Choose primary colour"}),
            "secondary_color": forms.TextInput(attrs={"type": "color", "title": "Choose secondary colour"}),
            "accent_color": forms.TextInput(attrs={"type": "color", "title": "Choose accent colour"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        palettes = {
            key: values[1:]
            for key, values in THEME_PRESETS.items()
        }
        self.fields["theme_preset"].widget.attrs["data-theme-presets"] = json.dumps(palettes)

        if self.instance and self.instance.pk and not self.is_bound:
            current = tuple(
                value.upper()
                for value in (
                    self.instance.primary_color,
                    self.instance.secondary_color,
                    self.instance.accent_color,
                )
            )
            self.initial["theme_preset"] = next(
                (
                    key
                    for key, values in THEME_PRESETS.items()
                    if tuple(value.upper() for value in values[1:]) == current
                ),
                "custom",
            )

    def clean(self):
        cleaned_data = super().clean()
        preset = cleaned_data.get("theme_preset")
        if preset in THEME_PRESETS:
            _, primary, secondary, accent = THEME_PRESETS[preset]
            cleaned_data["primary_color"] = primary
            cleaned_data["secondary_color"] = secondary
            cleaned_data["accent_color"] = accent
        return cleaned_data

    class Media:
        js = ("shop/admin/site-setting-colors.js",)


def has_shop_access(user):
    return user.is_active and (user.is_super_admin_role or user.is_admin_role)


class ShopAccessAdminMixin:
    actions = (export_as_csv,)

    def has_module_permission(self, request):
        return has_shop_access(request.user)

    def has_view_permission(self, request, obj=None):
        return has_shop_access(request.user)

    def has_add_permission(self, request):
        return has_shop_access(request.user)

    def has_change_permission(self, request, obj=None):
        return has_shop_access(request.user)

    def has_delete_permission(self, request, obj=None):
        return has_shop_access(request.user)


class SingletonAdminMixin:
    def has_add_permission(self, request):
        return super().has_add_permission(request) and not self.model.objects.exists()


PRODUCT_COLOUR_CHOICES = (
    ("Black", "Black"), ("White", "White"), ("Red", "Red"), ("Blue", "Blue"),
    ("Navy", "Navy"), ("Green", "Green"), ("Yellow", "Yellow"), ("Orange", "Orange"),
    ("Purple", "Purple"), ("Pink", "Pink"), ("Brown", "Brown"), ("Grey", "Grey"),
    ("Silver", "Silver"), ("Gold", "Gold"), ("Teal", "Teal"), ("Maroon", "Maroon"),
    ("Beige", "Beige"),
)
PRODUCT_COLOUR_HEX = {
    "Black": "#171717", "White": "#FFFFFF", "Red": "#DC2626", "Blue": "#2563EB",
    "Navy": "#1E3A8A", "Green": "#16A34A", "Yellow": "#FACC15", "Orange": "#EA580C",
    "Purple": "#9333EA", "Pink": "#EC4899", "Brown": "#854D0E", "Grey": "#6B7280",
    "Silver": "#C0C0C0", "Gold": "#D4AF37", "Teal": "#0D9488", "Maroon": "#7F1D1D",
    "Beige": "#D6C4A8",
}


class ProductAdminForm(forms.ModelForm):
    available_colours = forms.MultipleChoiceField(
        choices=PRODUCT_COLOUR_CHOICES,
        required=False,
        widget=forms.CheckboxSelectMultiple,
        label="Available colours",
    )

    class Meta:
        model = Product
        fields = "__all__"
        widgets = {
            "description": forms.Textarea(attrs={"rows": 7}),
            "seo_description": forms.Textarea(attrs={"rows": 3}),
        }
        labels = {"price": "Current price", "old_price": "Previous price"}
        help_texts = {
            "old_price": "Optional. Enter the exact earlier price to show it to customers.",
            "stock": "Set to 0 when the product is unavailable.",
            "is_featured": "Featured products can appear in the homepage selection.",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.is_bound:
            self.initial["available_colours"] = [value.strip() for value in (self.instance.available_colours or "").split(",") if value.strip()]

    def clean_available_colours(self):
        return ",".join(self.cleaned_data["available_colours"])

class ProductImageAdminForm(forms.ModelForm):
    class Meta:
        model = ProductImage
        fields = "__all__"
        help_texts = {
            "image": "Upload a clear product photo. Up to five images are allowed.",
            "alt_text": "A short image description for accessibility.",
            "is_main": "Use this image as the product's main catalogue image.",
        }


class ProductImageInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        main_images = 0
        for form in self.forms:
            if not hasattr(form, "cleaned_data"):
                continue
            if form.cleaned_data.get("DELETE") or not form.cleaned_data.get("image"):
                continue
            if form.cleaned_data.get("is_main"):
                main_images += 1
        if main_images > 1:
            raise ValidationError("Choose only one main product image.")


class StockLevelFilter(admin.SimpleListFilter):
    title = "stock level"
    parameter_name = "stock_level"

    def lookups(self, request, model_admin):
        return (("available", "Available"), ("low", "Low stock"), ("out", "Out of stock"))

    def queryset(self, request, queryset):
        if self.value() == "available":
            return queryset.filter(stock__gt=5)
        if self.value() == "low":
            return queryset.filter(stock__range=(1, 5))
        if self.value() == "out":
            return queryset.filter(stock=0)
        return queryset


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    form = ProductImageAdminForm
    formset = ProductImageInlineFormSet
    extra = 1
    max_num = ProductImage.MAX_IMAGES_PER_PRODUCT
    fields = ("image_preview", "image", "alt_text", "is_main", "branding_applied")
    readonly_fields = ("image_preview", "branding_applied")
    verbose_name_plural = "Product images — maximum 5"

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if obj and obj.pk and obj.image:
            label = "Main image" if obj.is_main else "Uploaded"
            return format_html(
                '<span class="product-image-preview"><img src="{}" alt=""><small>{}</small></span>',
                obj.image.url,
                label,
            )
        return format_html('<span class="product-image-preview is-empty">{}</span>', "No image")

    def has_view_permission(self, request, obj=None):
        return has_shop_access(request.user)

    def has_add_permission(self, request, obj=None):
        return has_shop_access(request.user)

    def has_change_permission(self, request, obj=None):
        return has_shop_access(request.user)

    def has_delete_permission(self, request, obj=None):
        return has_shop_access(request.user)


@admin.register(SiteSetting)
class SiteSettingAdmin(SingletonAdminMixin, admin.ModelAdmin):
    form = SiteSettingAdminForm
    actions = (export_as_csv,)
    list_display = ("business_name", "is_active", "updated_at")
    search_fields = ("business_name", "default_seo_title")
    list_filter = ("is_active",)
    ordering = ("-updated_at",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Brand", {"fields": ("business_name", "logo", "favicon")}),
        ("Colours", {"fields": ("theme_preset", "primary_color", "secondary_color", "accent_color")}),
        ("Default SEO", {"fields": ("default_seo_title", "default_seo_description")}),
        ("Content limits", {"fields": ("homepage_section_limit", "featured_product_limit")}),
        ("Status", {"fields": ("is_active",)}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    def has_module_permission(self, request):
        return request.user.is_active and request.user.is_super_admin_role

    def has_view_permission(self, request, obj=None):
        return request.user.is_super_admin_role

    def has_add_permission(self, request):
        return request.user.is_super_admin_role and super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        return request.user.is_super_admin_role

    def has_delete_permission(self, request, obj=None):
        return request.user.is_super_admin_role


@admin.register(ShopProfile)
class ShopProfileAdmin(SingletonAdminMixin, ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("email", "phone", "currency", "delivery_payment_timing", "pickup_enabled", "updated_at")
    search_fields = ("email", "phone", "whatsapp", "location")
    list_filter = ("currency", "pickup_enabled")
    ordering = ("-updated_at",)
    readonly_fields = ("created_at", "updated_at")
    radio_fields = {"delivery_payment_timing": admin.HORIZONTAL}

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if request.user.is_super_admin_role:
            fields.append("delivery_payment_timing")
        return tuple(fields)


@admin.register(HomepageSection)
class HomepageSectionAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("title", "order", "is_active", "updated_at")
    search_fields = ("title", "subtitle", "button_text")
    list_filter = ("is_active",)
    ordering = ("order", "id")
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("order", "is_active")

    def has_add_permission(self, request):
        return (
            super().has_add_permission(request)
            and HomepageSection.objects.count() < HomepageSection.configured_limit()
        )


@admin.register(AdHero)
class AdHeroAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("title", "order", "is_active", "updated_at")
    search_fields = ("title", "subtitle", "link")
    list_filter = ("is_active",)
    ordering = ("order", "-created_at")
    list_editable = ("order", "is_active")
    readonly_fields = ("created_at", "updated_at")


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("email", "is_active", "created_at")
    search_fields = ("email",)
    list_filter = ("is_active", "created_at")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ContactInquiry)
class ContactInquiryAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("name", "phone", "purpose", "location", "is_handled", "created_at")
    search_fields = ("name", "phone", "email", "purpose", "message")
    list_filter = ("is_handled", "purpose", "location", "created_at")
    ordering = ("-created_at",)
    list_editable = ("is_handled",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Customer", {"fields": ("name", "phone", "email")}),
        ("Request", {"fields": ("purpose", "rider", "budget", "location", "message")}),
        ("Follow-up", {"fields": ("is_handled",)}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(ContentPage)
class ContentPageAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("title", "slug", "show_in_footer", "is_active", "order", "updated_at")
    search_fields = ("title", "slug", "summary", "content")
    list_filter = ("is_active", "show_in_footer")
    ordering = ("order", "title")
    readonly_fields = ("created_at", "updated_at")
    prepopulated_fields = {"slug": ("title",)}
    list_editable = ("show_in_footer", "is_active", "order")
    fieldsets = (
        ("Page", {"fields": ("title", "slug", "summary", "content")}),
        ("Display", {"fields": ("show_in_footer", "is_active", "order")}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(Category)
class CategoryAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("name", "parent", "slug", "is_active", "updated_at")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    form = ProductAdminForm
    list_display = (
        "main_image", "name", "category", "available_colour_chips", "price", "old_price", "stock",
        "availability", "is_active", "is_featured", "updated_at",
    )
    list_display_links = ("name",)
    list_editable = ("price", "old_price", "stock", "is_active", "is_featured")
    search_fields = ("name", "slug", "description", "category__name")
    list_filter = ("category", "is_active", "is_featured", StockLevelFilter)
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    prepopulated_fields = {"slug": ("name",)}
    list_select_related = ("category",)
    list_per_page = 25
    save_on_top = True
    inlines = (ProductImageInline,)
    fieldsets = (
        ("Product information", {"fields": (("category", "name"), "slug", "available_colours", ("is_active", "is_featured"))}),
        ("Description", {"fields": ("description",)}),
        ("Pricing", {
            "fields": (("price", "old_price"),),
            "description": "Enter the current selling price and, when applicable, the exact previous price.",
        }),
        ("Inventory", {
            "fields": ("stock",),
            "description": "Stock is shown to customers and can also be updated from the product list.",
        }),
        ("Customer ratings", {"fields": (("rating", "rating_count"),), "classes": ("collapse",)}),
        ("Search visibility", {"fields": ("seo_title", "seo_description"), "classes": ("collapse",)}),
        ("System information", {"fields": (("created_at", "updated_at"),), "classes": ("collapse",)}),
    )

    def get_readonly_fields(self, request, obj=None):
        return (*super().get_readonly_fields(request, obj), "rating", "rating_count")

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("images")

    @admin.display(description="Image")
    def main_image(self, obj):
        image = next(iter(obj.images.all()), None)
        if not image or not image.image:
            return format_html(
                '<span class="product-list-image is-empty" title="No image">{}</span>',
                "▧",
            )
        return format_html('<img class="product-list-image" src="{}" alt="">', image.image.url)

    @admin.display(description="Stock status", ordering="stock")
    def availability(self, obj):
        if obj.stock == 0:
            label, css_class = "Out of stock", "is-out"
        elif obj.stock <= 5:
            label, css_class = "Low stock", "is-low"
        else:
            label, css_class = "Available", "is-available"
        return format_html('<span class="stock-status {}">{}</span>', css_class, label)

    @admin.display(description="Colours")
    def available_colour_chips(self, obj):
        colours = [value.strip() for value in (obj.available_colours or "").split(",") if value.strip()]
        return format_html_join(" ", '<span style="display:inline-flex;align-items:center;gap:4px;margin:2px"><i style="display:inline-block;width:14px;height:14px;border:1px solid #999;border-radius:50%;background:{}"></i>{}</span>', ((PRODUCT_COLOUR_HEX.get(colour, "#999"), colour) for colour in colours)) or "—"

    class Media:
        css = {"all": ("shop/admin/product-admin.css",)}
        js = ("shop/admin/product-admin.js",)


@admin.register(ProductReview)
class ProductReviewAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("product", "customer", "rating", "is_approved", "created_at")
    search_fields = ("product__name", "customer__email", "customer__full_name", "title", "comment")
    list_filter = ("rating", "is_approved", "created_at")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    list_select_related = ("product", "customer")


@admin.register(WishlistItem)
class WishlistItemAdmin(ShopAccessAdminMixin, admin.ModelAdmin):
    list_display = ("customer", "product", "created_at")
    search_fields = ("customer__email", "customer__full_name", "product__name")
    list_filter = ("created_at", "product__category")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)
    list_select_related = ("customer", "product", "product__category")
