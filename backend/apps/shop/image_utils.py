from io import BytesIO
from pathlib import Path

from django.apps import apps
from django.core.files.base import ContentFile
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps
from PIL import UnidentifiedImageError
from django.conf import settings
from django.core.exceptions import ValidationError

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "ICO"}


def validate_uploaded_image(image_field):
    if not image_field:
        return
    if getattr(image_field, "size", 0) > settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
        raise ValidationError("Image is too large.")
    try:
        image_field.open("rb")
        with Image.open(image_field) as image:
            image.verify()
        image_field.seek(0)
        with Image.open(image_field) as image:
            if image.format not in ALLOWED_IMAGE_FORMATS:
                raise ValidationError("Unsupported image format.")
            if image.width > 6000 or image.height > 6000:
                raise ValidationError("Image dimensions are too large.")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationError("Invalid image file.") from exc
    finally:
        try: image_field.seek(0)
        except (AttributeError, ValueError): pass


def sanitize_uploaded_image(image_field):
    """Validate and re-encode a newly uploaded raster image before storage."""
    if not image_field or getattr(image_field, "_committed", True):
        return image_field
    validate_uploaded_image(image_field)
    image_field.seek(0)
    with Image.open(image_field) as source:
        image = ImageOps.exif_transpose(source)
        original_name = Path(image_field.name).name
        suffix = Path(original_name).suffix.lower()
        output_format = {".png": "PNG", ".webp": "WEBP", ".ico": "ICO"}.get(suffix, "JPEG")
        output = BytesIO()
        if output_format == "JPEG":
            image.convert("RGB").save(output, format="JPEG", quality=92, optimize=True)
        elif output_format == "ICO":
            image.convert("RGBA").save(output, format="ICO")
        else:
            image.save(output, format=output_format, optimize=True)
        return ContentFile(output.getvalue(), name=original_name)


def _logo_watermark(site_setting, product_size):
    if not site_setting.logo:
        return None

    site_setting.logo.open("rb")
    with Image.open(site_setting.logo) as logo_source:
        logo = ImageOps.exif_transpose(logo_source).convert("RGBA")
        max_width = max(80, int(product_size[0] * 0.28))
        max_height = max(40, int(product_size[1] * 0.18))
        logo.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        alpha = ImageEnhance.Brightness(logo.getchannel("A")).enhance(0.38)
        logo.putalpha(alpha)
        return logo


def _text_watermark(text, product_size):
    width, height = product_size
    font_size = max(18, int(min(width, height) * 0.07))
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()

    layer = Image.new("RGBA", product_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    bounds = draw.textbbox((0, 0), text, font=font)
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    position = ((width - text_width) // 2, (height - text_height) // 2)
    draw.text((position[0] + 2, position[1] + 2), text, font=font, fill=(0, 0, 0, 90))
    draw.text(position, text, font=font, fill=(255, 255, 255, 105))
    return layer


def brand_product_image(image_field):
    """Return an uploaded product image with permanent centered branding."""
    SiteSetting = apps.get_model("shop", "SiteSetting")
    site_setting = SiteSetting.objects.filter(is_active=True).first()
    if site_setting is None:
        return None

    image_field.open("rb")
    with Image.open(image_field) as source:
        product = ImageOps.exif_transpose(source).convert("RGBA")
        watermark = _logo_watermark(site_setting, product.size)
        if watermark is None:
            overlay = _text_watermark(site_setting.business_name, product.size)
            product = Image.alpha_composite(product, overlay)
        else:
            position = (
                (product.width - watermark.width) // 2,
                (product.height - watermark.height) // 2,
            )
            product.alpha_composite(watermark, position)

        original_name = Path(image_field.name).name
        suffix = Path(original_name).suffix.lower()
        output_format = {".png": "PNG", ".webp": "WEBP"}.get(suffix, "JPEG")
        output = BytesIO()
        if output_format == "JPEG":
            product.convert("RGB").save(output, format="JPEG", quality=92, optimize=True)
        else:
            product.save(output, format=output_format, quality=92, optimize=True)
        output.seek(0)
        return ContentFile(output.read(), name=original_name)
