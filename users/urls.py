from django.urls import path
from .views import DeviceAuthView

urlpatterns = [
    path("auth/device/", DeviceAuthView.as_view()),
]