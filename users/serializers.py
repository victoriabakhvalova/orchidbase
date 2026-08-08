from rest_framework import serializers


class DeviceAuthSerializer(serializers.Serializer):
    device_id = serializers.UUIDField()