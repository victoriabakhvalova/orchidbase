from rest_framework import viewsets, permissions
from .models import Orchid, Preorder, OrchidPhoto
from .serializers import OrchidSerializer, PreorderSerializer, OrchidPhotoSerializer


class OrchidViewSet(viewsets.ModelViewSet):
    serializer_class = OrchidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Orchid.objects.filter(owner=self.request.user, is_deleted=False)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PreorderViewSet(viewsets.ModelViewSet):
    serializer_class = PreorderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Preorder.objects.filter(owner=self.request.user, is_deleted=False)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class OrchidPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = OrchidPhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OrchidPhoto.objects.filter(orchid__owner=self.request.user, is_deleted=False)