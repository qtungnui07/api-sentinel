import pytest
from app.services.ssrf import SSRFProtectionError, validate_and_resolve_url


def test_valid_public_domain(monkeypatch):
    # Mock DNS resolution for predictable test
    def mock_getaddrinfo(host, port, type=None):
        return [(2, 1, 6, "", ("93.184.216.34", port))]

    monkeypatch.setattr("socket.getaddrinfo", mock_getaddrinfo)
    hostname, port, pinned_ip = validate_and_resolve_url("https://example.com/api/test")
    assert hostname == "example.com"
    assert port == 443
    assert pinned_ip == "93.184.216.34"


def test_reject_invalid_scheme():
    with pytest.raises(SSRFProtectionError, match="Invalid URL scheme"):
        validate_and_resolve_url("ftp://example.com")

    with pytest.raises(SSRFProtectionError, match="Invalid URL scheme"):
        validate_and_resolve_url("file:///etc/passwd")


def test_reject_embedded_credentials():
    with pytest.raises(SSRFProtectionError, match="embedded credentials"):
        validate_and_resolve_url("https://user:pass@example.com")


def test_reject_forbidden_ports():
    with pytest.raises(SSRFProtectionError, match="Port 8080 is not allowed"):
        validate_and_resolve_url("http://example.com:8080")

    with pytest.raises(SSRFProtectionError, match="Port 22 is not allowed"):
        validate_and_resolve_url("https://example.com:22")


def test_reject_loopback_destinations():
    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://127.0.0.1")

    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://127.0.0.1:80")

    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://localhost")


def test_reject_private_ips():
    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://10.0.0.1")

    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://192.168.1.1")

    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://172.16.0.1")


def test_reject_cloud_metadata():
    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(SSRFProtectionError):
        validate_and_resolve_url("http://metadata.google.internal")


def test_reject_when_dns_resolves_to_private(monkeypatch):
    def mock_getaddrinfo(host, port, type=None):
        return [
            (2, 1, 6, "", ("93.184.216.34", port)),
            (2, 1, 6, "", ("127.0.0.1", port)),  # Rebinding attempt!
        ]

    monkeypatch.setattr("socket.getaddrinfo", mock_getaddrinfo)
    with pytest.raises(SSRFProtectionError, match="resolved to blocked/private IP"):
        validate_and_resolve_url("https://evil-rebind.com")
