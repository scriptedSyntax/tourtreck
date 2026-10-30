from django.contrib import admin

# Register your models here.
import csv

from django.contrib import admin
from django.http import HttpResponse


admin.site.site_title = "Admin"
admin.site.site_header = "Admin"
admin.site.index_title = "Store management"
admin.site.empty_value_display = "—"


@admin.action(description="Export selected records as CSV")
def export_as_csv(modeladmin, request, queryset):
    excluded_fields = {"password", "token", "session_key"}
    fields = [
        field
        for field in queryset.model._meta.fields
        if field.name not in excluded_fields
    ]
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = (
        f'attachment; filename="{queryset.model._meta.model_name}-export.csv"'
    )
    writer = csv.writer(response)
    writer.writerow([field.verbose_name for field in fields])

    for record in queryset.iterator():
        row = []
        for field in fields:
            value = field.value_from_object(record)
            text = "" if value is None else str(value)
            if text.startswith(("=", "+", "-", "@")):
                text = f"'{text}"
            row.append(text)
        writer.writerow(row)
    return response
