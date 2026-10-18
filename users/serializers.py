from rest_framework import serializers

from .models import User


class CredentialsSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate_email(self, value):
        return value.strip().lower()


class RegistrationSerializer(CredentialsSerializer):
    legacy_device_id = serializers.UUIDField(required=False, write_only=True)
    password = serializers.CharField(min_length=7, trim_whitespace=False, write_only=True)

    def validate_email(self, value):
        email = super().validate_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email
