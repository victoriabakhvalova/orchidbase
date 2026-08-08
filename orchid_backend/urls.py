from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from orchids.views import OrchidViewSet, PreorderViewSet, OrchidPhotoViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,)

router = DefaultRouter()
router.register(r'orchids', OrchidViewSet, basename='orchid')
router.register(r'preorders', PreorderViewSet, basename='preorder')
router.register(r'photos', OrchidPhotoViewSet, basename='orchidphoto')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
# 🔑 JWT логин и обновление
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),  # вот тут подключаем все роутеры
    path('api/', include('users.urls')),  # 👈 добавили: вход по device_id
]