import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# We patch the database creation so it doesn't crash if Postgres isn't running during simple unit tests
with patch("app.db.base.Base.metadata.create_all"):
    from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to eFiche AI API",
        "docs": "/docs",
        "status": "online"
    }

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()
