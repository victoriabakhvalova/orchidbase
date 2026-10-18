from orchids.models import Orchid

def test_orchid_list_empty(authenticated_client):
    response = authenticated_client.get("/api/orchids/")

    assert response.status_code == 200
    assert response.data == []
    assert response.wsgi_request.user.is_authenticated


def test_create_orchid(authenticated_client):
    payload = {"name": "Тестовая орхидея"}

    response = authenticated_client.post(
        "/api/orchids/",
        data=payload,
        format ="json",
    )

    assert response.status_code == 201

    created_id = response.data["id"]
    saved_orchid = Orchid.objects.get(id=created_id)

    assert response.data["name"] == payload["name"]
    assert response.data["name"] == saved_orchid.name


