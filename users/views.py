from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import DeviceAuthSerializer


class DeviceAuthView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = DeviceAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        device_id = serializer.validated_data["device_id"]

        user, created = User.objects.get_or_create(
            device_id=device_id,
            defaults={"is_anonymous_account": True},
        )

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user_id": str(user.id),
            "is_new_user": created,
        })

