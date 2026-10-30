import secrets

import apps.orders.models
from django.db import migrations, models


ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def populate_order_references(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    used = set(Order.objects.exclude(reference__isnull=True).values_list("reference", flat=True))

    for order in Order.objects.filter(reference__isnull=True).iterator():
        reference = "".join(secrets.choice(ALPHABET) for _ in range(8))
        while reference in used:
            reference = "".join(secrets.choice(ALPHABET) for _ in range(8))
        used.add(reference)
        Order.objects.filter(pk=order.pk).update(reference=reference)


class Migration(migrations.Migration):
    dependencies = [("orders", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="order",
            name="reference",
            field=models.CharField(blank=True, editable=False, max_length=8, null=True),
        ),
        migrations.RunPython(populate_order_references, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="order",
            name="reference",
            field=models.CharField(
                default=apps.orders.models.generate_order_reference,
                editable=False,
                max_length=8,
                unique=True,
            ),
        ),
    ]
