from django.shortcuts import redirect
from django.urls import reverse
# core/middleware.py
import jwt
from urllib.parse import parse_qs
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication


@database_sync_to_async
def get_user(validated_token):
    """
    Returns user instance from validated token.
    """
    jwt_auth = JWTAuthentication()
    user, _ = jwt_auth.get_user(validated_token), validated_token
    return user


class JWTAuthMiddleware:
    """
    Custom middleware to authenticate WebSocket connections using JWT.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope["query_string"].decode())
        token = None

        # Token can be passed via ?token=<JWT> or Authorization header
        if "token" in query_string:
            token = query_string["token"][0]
        else:
            headers = dict(scope["headers"])
            if b"authorization" in headers:
                auth_header = headers[b"authorization"].decode()
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]

        if token is None:
            scope["user"] = AnonymousUser()
            return await self.inner(scope, receive, send)

        try:
            # Validate token
            validated_token = UntypedToken(token)
            user = await get_user(validated_token)
            scope["user"] = user
        except (InvalidToken, TokenError, jwt.DecodeError):
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)



class RoleRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        if path.startswith("/staff/"):
            if not request.user.is_authenticated or not hasattr(request.user, "userprofile") or request.user.userprofile.role != "Staff":
                return redirect(reverse("login"))

        return self.get_response(request)
