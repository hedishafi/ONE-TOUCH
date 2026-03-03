from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Root → redirect to API docs
    path('', RedirectView.as_view(url='/api/docs/', permanent=False)),

    # Django admin
    path('admin/', admin.site.urls),

    # API v1 — each app owns its own router/urlpatterns
    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('services.urls')),
    path('api/v1/', include('orders.urls')),
    path('api/v1/', include('payments.urls')),
    path('api/v1/', include('notifications.urls')),

    # Auto-generated API docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/',   SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
