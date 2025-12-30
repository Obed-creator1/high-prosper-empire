# high_prosper/urls.py — FINAL CLEAN VERSION (NO WebSocket routes!)
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import views as auth_views
from whatsapp.views import whatsapp_webhook
from django.views.generic import TemplateView
from django.contrib import admin

from billing.webhooks import stripe_webhook

admin.site.login_template = 'admin/login.html'

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1
    path('api/v1/', include([
        path('stock/', include('stock.urls')),
        path('hr/', include('hr.urls')),
        path('accounting/', include('accounting.urls')),
        path('payments/', include('payments.urls')),
        path('fleet/', include('fleet.urls')),
        path('customers/', include('customers.urls')),
        path('users/', include('users.urls')),
        path('dashboard/', include('dashboard.urls')),
        path('reports/', include('reports.urls')),
        path('notifications/', include('notifications.urls')),
        path('procurement/', include('procurement.urls')),
        path('collector/', include('collector.urls')),
    ])),

    # Legacy
    path('asset/', include('asset.urls')),


    # Auth
    path('accounts/login/', auth_views.LoginView.as_view(), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('accounts/', include('django.contrib.auth.urls')),

    # JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Webhooks
    path('webhook/whatsapp/', whatsapp_webhook, name="whatsapp-webhook"),
    path('webpush/', include('webpush.urls')),
    path('webhook/stripe/', stripe_webhook),

    # Frontend (dev)
    path('', TemplateView.as_view(template_name='index.html')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)