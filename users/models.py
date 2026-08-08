import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, device_id=None, email=None, password=None, **extra_fields):
        if not device_id and not email:
            raise ValueError("Нужен либо device_id, либо email")

        email = self.normalize_email(email) if email else None
        user = self.model(device_id=device_id, email=email, **extra_fields)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_id = models.UUIDField(unique=True, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)

    is_anonymous_account = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email or f"Device user {self.device_id}"