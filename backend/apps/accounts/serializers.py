from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import APISession, User
from .session_utils import rotate_api_session


def normalize_text(value, max_length):
    value = "".join(char for char in str(value or "") if char.isprintable())
    value = " ".join(value.split())
    return value[:max_length]


def normalize_phone(value):
    value = normalize_text(value, 30)
    return "".join(char for char in value if char.isdigit() or char in "+()- ")


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone", "role", "date_joined")
        read_only_fields = ("id", "email", "role", "date_joined")

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = User.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_full_name(self, value):
        full_name = normalize_text(value, 255)
        if len(full_name) < 2:
            raise serializers.ValidationError("Enter your full name.")
        return full_name

    def validate_phone(self, value):
        phone = normalize_phone(value)
        if phone and len(phone) < 7:
            raise serializers.ValidationError("Enter a valid phone number.")
        return phone


class CustomerRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone", "password")
        read_only_fields = ("id",)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_full_name(self, value):
        full_name = normalize_text(value, 255)
        if len(full_name) < 2:
            raise serializers.ValidationError("Enter your full name.")
        return full_name

    def validate_phone(self, value):
        phone = normalize_phone(value)
        if len(phone) < 7:
            raise serializers.ValidationError("Enter a valid phone number.")
        return phone

    def validate_password(self, value):
        if any(not char.isprintable() for char in value) or len(value) > 128:
            raise serializers.ValidationError("Enter a valid password.")
        try:
            validate_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages)) from error
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            role=User.Role.CUSTOMER,
            **validated_data,
        )


class PasswordCheckSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        candidate = User(
            email=attrs["email"].strip().lower(),
            full_name=normalize_text(attrs["full_name"], 255),
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)}) from error
        return attrs


class InitialPasswordSetupSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        try:
            user = User.objects.get(public_id=attrs["account_id"])
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"token": "This setup link is invalid or has expired."}
            )

        if (
            not user.is_active
            or not user.is_customer_role
            or user.has_usable_password()
            or not default_token_generator.check_token(user, attrs["token"])
        ):
            raise serializers.ValidationError(
                {"token": "This setup link is invalid or has expired."}
            )

        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)}) from error

        attrs["user"] = user
        return attrs

    def save(self):
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=self.validated_data["user"].pk)
            if user.has_usable_password() or not default_token_generator.check_token(
                user, self.validated_data["token"]
            ):
                raise serializers.ValidationError({"token": "This setup link is invalid or has expired."})
            user.set_password(self.validated_data["password"])
            user.save(update_fields=("password", "updated_at"))
            rotate_api_session(user)
            return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        if set(self.initial_data) != {"email"}:
            raise serializers.ValidationError("Please submit only an email address.")
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        if set(self.initial_data) != {"account_id", "token", "password"}:
            raise serializers.ValidationError({"token": "This reset link is invalid or has expired."})
        try:
            user = User.objects.get(
                public_id=attrs["account_id"],
                is_active=True,
                role=User.Role.CUSTOMER,
            )
        except User.DoesNotExist:
            raise serializers.ValidationError({"token": "This reset link is invalid or has expired."})
        if not user.has_usable_password() or not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "This reset link is invalid or has expired."})
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)}) from error
        attrs["user"] = user
        return attrs

    def save(self):
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=self.validated_data["user"].pk)
            if not user.has_usable_password() or not default_token_generator.check_token(
                user, self.validated_data["token"]
            ):
                raise serializers.ValidationError({"token": "This reset link is invalid or has expired."})
            user.set_password(self.validated_data["password"])
            user.save(update_fields=("password", "updated_at"))
            rotate_api_session(user)
            return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        attrs["email"] = attrs["email"].strip().lower()
        if any(not char.isprintable() for char in attrs["password"]) or len(attrs["password"]) > 128:
            raise serializers.ValidationError("Invalid email or password.")
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"],
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid email or password.")
        attrs["user"] = user
        return attrs

    def create_tokens(self, user):
        token_version = rotate_api_session(user)
        refresh = RefreshToken.for_user(user)
        refresh["token_version"] = token_version
        refresh["role"] = user.role
        return {"refresh": str(refresh), "access": str(refresh.access_token)}


class VersionedTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        user_id = refresh.get("user_id")
        token_version = refresh.get("token_version")
        current_version = APISession.objects.filter(user_id=user_id).values_list(
            "token_version", flat=True
        ).first()
        if current_version is None or token_version != current_version:
            raise serializers.ValidationError("This login session is no longer active.")
        return super().validate(attrs)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        try:
            refresh = RefreshToken(attrs["refresh"])
        except TokenError as error:
            raise serializers.ValidationError("This login session is no longer active.") from error

        session = APISession.objects.select_related("user").filter(
            user_id=refresh.get("user_id")
        ).first()
        if session is None or refresh.get("token_version") != session.token_version:
            raise serializers.ValidationError("This login session is no longer active.")

        attrs["token"] = refresh
        attrs["user"] = session.user
        return attrs
