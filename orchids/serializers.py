from rest_framework import serializers
from .models import Orchid, Preorder, OrchidPhoto


class DeviceAuthSerializer(serializers.Serializer):
    device_id = serializers.UUIDField()

class OrchidSerializer(serializers.ModelSerializer):
    class Meta:
        model = Orchid
        fields = '__all__'

class PreorderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preorder
        fields = '__all__'

class OrchidPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrchidPhoto
        fields = '__all__'