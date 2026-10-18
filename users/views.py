from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import CredentialsSerializer, RegistrationSerializer


def set_auth_cookies(response, access, refresh):
    cookie_settings = {
        'httponly': True,
        'secure': not settings.DEBUG,
        'samesite': 'Lax',
        'path': '/api/',
    }
    access_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    refresh_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
    response.set_cookie('orchid_access', access, max_age=int(access_lifetime.total_seconds()), **cookie_settings)
    response.set_cookie('orchid_refresh', refresh, max_age=int(refresh_lifetime.total_seconds()), **cookie_settings)


def clear_auth_cookies(response):
    response.delete_cookie('orchid_access', path='/api/', samesite='Lax')
    response.delete_cookie('orchid_refresh', path='/api/', samesite='Lax')


def token_response(user, status_code=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    response = Response({
        'access': str(access),
        'refresh': str(refresh),
        'user_id': str(user.id),
        'email': user.email,
    }, status=status_code)
    set_auth_cookies(response, str(access), str(refresh))
    return response


@method_decorator(csrf_protect, name='dispatch')
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=serializer.validated_data['email'],
                    password=serializer.validated_data['password'],
                    is_anonymous_account=False,
                )
                legacy_device_id = serializer.validated_data.get('legacy_device_id')
                if legacy_device_id:
                    guest = User.objects.filter(device_id=legacy_device_id, is_anonymous_account=True, email__isnull=True).first()
                    if guest:
                        from orchids.models import Orchid, Preorder
                        Orchid.objects.filter(owner=guest).update(owner=user)
                        Preorder.objects.filter(owner=guest).update(owner=user)
                        guest.delete()
        except IntegrityError:
            return Response({'email': ['An account with this email already exists.']}, status=status.HTTP_400_BAD_REQUEST)
        update_last_login(None, user)
        return token_response(user, status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = CredentialsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, email=email, password=password)
        if user is None:
            raise AuthenticationFailed('Incorrect email or password.')
        update_last_login(None, user)
        return token_response(user)


class CurrentUserView(APIView):
    def get(self, request):
        return Response({'user_id': str(request.user.id), 'email': request.user.email})


@method_decorator(csrf_protect, name='dispatch')
class RefreshCookieView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get('orchid_refresh')
        if not refresh_token:
            raise AuthenticationFailed('Please sign in again.')
        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        new_refresh = data.get('refresh', refresh_token)
        response = Response({
            'access': data['access'],
            'refresh': new_refresh,
        })
        set_auth_cookies(response, data['access'], new_refresh)
        return response


class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get('orchid_refresh')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response
