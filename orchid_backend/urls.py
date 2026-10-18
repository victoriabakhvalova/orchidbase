from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import render
from django.urls import path, include
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from orchids.views import OrchidViewSet, OrchidEventViewSet, PreorderViewSet, OrchidPhotoViewSet

router = DefaultRouter()
router.register(r'orchids', OrchidViewSet, basename='orchid')
router.register(r'preorders', PreorderViewSet, basename='preorder')
router.register(r'photos', OrchidPhotoViewSet, basename='orchidphoto')
router.register(r'events', OrchidEventViewSet, basename='orchidevent')


@ensure_csrf_cookie
def home(request):
    return render(request, 'orchids/home.html')

urlpatterns = [
    path('', home, name='home'),
    path('preorders/', home, name='preorders-page'),
    path('wishlist/', home, name='wishlist-page'),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/', include(router.urls)),  # вот тут подключаем все роутеры
    path('api/', include('users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
