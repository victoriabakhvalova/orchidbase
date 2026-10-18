from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieOrHeaderJWTAuthentication(JWTAuthentication):
    """Accept API-test Bearer tokens and browser JWTs stored in HttpOnly cookies."""

    def authenticate(self, request):
        if self.get_header(request):
            return super().authenticate(request)

        raw_token = request.COOKIES.get('orchid_access')
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token.encode())
        self.enforce_csrf(request)
        return self.get_user(validated_token), validated_token

    @staticmethod
    def enforce_csrf(request):
        csrf_check = CSRFCheck(lambda http_request: None)
        csrf_check.process_request(request._request)
        reason = csrf_check.process_view(request._request, lambda http_request: None, (), {})
        if reason:
            raise PermissionDenied(f'CSRF Failed: {reason}')
