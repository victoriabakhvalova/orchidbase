import uuid
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def authenticated_client(db, django_user_model):
    user = django_user_model.objects.create_user(
        device_id=uuid.uuid4()
    )

    client = APIClient()
    client.force_authenticate(user=user)

    return client