from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView


urlpatterns = [
    path('', RedirectView.as_view(pattern_name='admin:index', permanent=False), name='backend-home'),
    path('admin/', admin.site.urls),
    path('api/', include('config.api_urls')),
]


if settings.DEBUG:
    from apps.core.views import email_preview, email_preview_index

    urlpatterns += [
        path('email-previews/', email_preview_index, name='email-preview-index'),
        path('email-previews/<slug:template_name>/', email_preview, name='email-preview'),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
