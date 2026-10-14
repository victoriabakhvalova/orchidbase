from rest_framework import serializers
from .models import Orchid, OrchidEvent, Preorder, OrchidPhoto


class DeviceAuthSerializer(serializers.Serializer):
    device_id = serializers.UUIDField()

class OrchidSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orchid
        fields = '__all__'
        read_only_fields = ('owner',)

class PreorderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preorder
        fields = '__all__'
        read_only_fields = ('owner',)

class OrchidPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrchidPhoto
        fields = '__all__'

class OrchidEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrchidEvent
        fields = '__all__'
