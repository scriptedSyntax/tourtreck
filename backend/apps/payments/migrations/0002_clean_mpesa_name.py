from django.db import migrations


def clean_mpesa_name(apps, schema_editor):
    PaymentMethod = apps.get_model("payments", "PaymentMethod")
    PaymentMethod.objects.filter(code="MPESA_MANUAL").update(
        name="M-Pesa",
        instructions="Enter the confirmation code from your M-Pesa message.",
    )


class Migration(migrations.Migration):
    dependencies = [("payments", "0001_initial")]

    operations = [migrations.RunPython(clean_mpesa_name, migrations.RunPython.noop)]
