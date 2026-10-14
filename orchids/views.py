from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Orchid, OrchidEvent, Preorder, OrchidPhoto
from .serializers import OrchidSerializer, OrchidEventSerializer, PreorderSerializer, OrchidPhotoSerializer


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

    def perform_create(self, serializer):
        orchid = serializer.validated_data['orchid']
        if orchid.owner_id != self.request.user.id:
            raise PermissionDenied('You can only add photos to your own orchids.')
        serializer.save()

    def perform_update(self, serializer):
        orchid = serializer.validated_data.get('orchid', serializer.instance.orchid)
        if orchid.owner_id != self.request.user.id:
            raise PermissionDenied('You can only add photos to your own orchids.')
        serializer.save()


class OrchidEventViewSet(viewsets.ModelViewSet):
    serializer_class = OrchidEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = OrchidEvent.objects.filter(orchid__owner=self.request.user, orchid__is_deleted=False)
        orchid_id = self.request.query_params.get('orchid')
        if orchid_id:
            queryset = queryset.filter(orchid_id=orchid_id)
        return queryset

    def perform_create(self, serializer):
        orchid = serializer.validated_data['orchid']
        if orchid.owner_id != self.request.user.id:
            raise PermissionDenied('You can only add events to your own orchids.')
        serializer.save()

    def perform_update(self, serializer):
        orchid = serializer.validated_data.get('orchid', serializer.instance.orchid)
        if orchid.owner_id != self.request.user.id:
            raise PermissionDenied('You can only add events to your own orchids.')
        serializer.save()
