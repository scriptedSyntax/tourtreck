from django.db import migrations


def clean_mpesa_code(apps, schema_editor):
    PaymentMethod = apps.get_model("payments", "PaymentMethod")
    PaymentMethod.objects.filter(code="MPESA_MANUAL").update(code="MPESA")


class Migration(migrations.Migration):
    dependencies = [("payments", "0002_clean_mpesa_name")]

    operations = [migrations.RunPython(clean_mpesa_code, migrations.RunPython.noop)]
