from concurrent.futures import ThreadPoolExecutor

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.core.throttles import OperationRateThrottle, PasswordResetClientRateThrottle

from .models import APISession, User
from .serializers import (
    LoginSerializer,
    InitialPasswordSetupSerializer,
    LogoutSerializer,
    CustomerRegistrationSerializer,
    UserProfileSerializer,
    VersionedTokenRefreshSerializer,
    PasswordCheckSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
)
from .notifications import send_account_setup_email, send_password_reset_email
from .session_utils import rotate_api_session

password_email_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="password-email")


class NoStoreResponseMixin:
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        response["Pragma"] = "no-cache"
        return response


class LoginView(NoStoreResponseMixin, APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = serializer.create_tokens(user)
        return Response({**tokens, "user": UserProfileSerializer(user).data})


class RefreshView(NoStoreResponseMixin, TokenRefreshView):
    permission_classes = (AllowAny,)
    serializer_class = VersionedTokenRefreshSerializer
    throttle_scope = "refresh"


class RegisterView(NoStoreResponseMixin, APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "register"

    def post(self, request):
        serializer = CustomerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_201_CREATED)


class PasswordCheckView(NoStoreResponseMixin, APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "register"

    def post(self, request):
        serializer = PasswordCheckSerializer(data=request.data)
        if serializer.is_valid():
            return Response({"valid": True})
        password_errors = serializer.errors.get("password") or []
        message = str(password_errors[0]) if password_errors else "Choose a stronger password."
        return Response({"valid": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)


class InitialPasswordSetupView(NoStoreResponseMixin, APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "register"

    def post(self, request):
        serializer = InitialPasswordSetupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True})

        token_errors = serializer.errors.get("token") or serializer.errors.get("account_id")
        password_errors = serializer.errors.get("password")
        if token_errors:
            message = "This setup link is invalid or has expired."
        elif password_errors:
            message = str(password_errors[0])
        else:
            message = "We could not set your password. Please check the details and try again."
        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(NoStoreResponseMixin, APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "password_reset"
    throttle_classes = (OperationRateThrottle, PasswordResetClientRateThrottle)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"],
            is_active=True,
            role=User.Role.CUSTOMER,
        ).first()
        if user:
            sender = send_password_reset_email if user.has_usable_password() else send_account_setup_email
            password_email_executor.submit(sender, user)
        return Response(
            {"message": "If an account matches that email, password recovery instructions have been sent."},
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetConfirmView(NoStoreResponseMixin, APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True})
        password_errors = serializer.errors.get("password")
        message = (
            str(password_errors[0])
            if password_errors
            else "This reset link is invalid or has expired."
        )
        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(NoStoreResponseMixin, APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "refresh"

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.validated_data["token"].blacklist()
        rotate_api_session(serializer.validated_data["user"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(NoStoreResponseMixin, APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
