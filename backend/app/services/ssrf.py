import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple

import httpcore
import httpx


class SSRFProtectionError(Exception):
    """Raised when a URL violates SSRF protection rules."""
    pass


FORBIDDEN_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "instance-data",
    "metadata.tencentyun.com",
    "metadata.internal",
}

BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),  # CGNAT
    ipaddress.ip_network("127.0.0.0/8"),    # Loopback
    ipaddress.ip_network("169.254.0.0/16"), # Link-local / Cloud metadata (169.254.169.254)
    ipaddress.ip_network("172.16.0.0/12"),  # Private
    ipaddress.ip_network("192.0.0.0/24"),   # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),   # Documentation (TEST-NET-1)
    ipaddress.ip_network("192.168.0.0/16"), # Private
    ipaddress.ip_network("198.18.0.0/15"),  # Benchmarking
    ipaddress.ip_network("198.51.100.0/24"),# Documentation (TEST-NET-2)
    ipaddress.ip_network("203.0.113.0/24"), # Documentation (TEST-NET-3)
    ipaddress.ip_network("224.0.0.0/4"),    # Multicast
    ipaddress.ip_network("240.0.0.0/4"),    # Reserved
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6 blocked ranges
    ipaddress.ip_network("::/128"),         # Unspecified
    ipaddress.ip_network("::1/128"),        # Loopback
    ipaddress.ip_network("::ffff:0:0/96"),  # IPv4 mapped
    ipaddress.ip_network("100::/64"),       # Discard prefix
    ipaddress.ip_network("2001:db8::/32"),  # Documentation
    ipaddress.ip_network("fc00::/7"),       # Unique local address (ULA)
    ipaddress.ip_network("fe80::/10"),      # Link-local
    ipaddress.ip_network("ff00::/8"),       # Multicast
]


def is_ip_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
        return True

    # Check for IPv4 mapped in IPv6
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        if is_ip_blocked(ip.ipv4_mapped):
            return True

    for net in BLOCKED_NETWORKS:
        if ip in net:
            return True

    return False


def validate_and_resolve_url(raw_url: str) -> Tuple[str, int, str]:
    """
    Validates URL according to strict SSRF rules:
    - Scheme: http or https only.
    - No embedded credentials (username:password).
    - Port: 80 or 443 only.
    - Hostname: non-empty, not in forbidden names.
    - Resolve DNS and verify that ALL returned IPs are public/safe.
    - Returns: (hostname, port, pinned_ip)
    """
    if not raw_url or not isinstance(raw_url, str):
        raise SSRFProtectionError("URL cannot be empty")

    url = raw_url.strip()
    try:
        parsed = urlparse(url)
    except Exception as e:
        raise SSRFProtectionError(f"Malformed URL: {e}")

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        raise SSRFProtectionError(f"Invalid URL scheme '{scheme}'. Only HTTP and HTTPS are allowed.")

    if parsed.username or parsed.password:
        raise SSRFProtectionError("URL with embedded credentials is not allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFProtectionError("URL does not contain a valid hostname.")

    hostname_clean = hostname.strip().lower()
    if hostname_clean in FORBIDDEN_HOSTNAMES or hostname_clean.endswith(".local") or hostname_clean.endswith(".internal"):
        raise SSRFProtectionError(f"Target host '{hostname_clean}' is not permitted.")

    # Determine port
    default_port = 80 if scheme == "http" else 443
    port = parsed.port if parsed.port is not None else default_port

    if port not in (80, 443):
        raise SSRFProtectionError(f"Port {port} is not allowed. Only ports 80 and 443 are supported.")

    # Check if hostname itself is already an IP address
    try:
        ip_obj = ipaddress.ip_address(hostname_clean)
        if is_ip_blocked(ip_obj):
            raise SSRFProtectionError(f"Destination IP '{hostname_clean}' is private or reserved.")
        return hostname, port, str(ip_obj)
    except ValueError:
        pass  # It's a domain name, proceed to DNS resolution

    # Resolve hostname to IPs
    try:
        addr_infos = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise SSRFProtectionError(f"DNS resolution failed: {e}")
    except Exception as e:
        raise SSRFProtectionError(f"Could not resolve host: {e}")

    if not addr_infos:
        raise SSRFProtectionError("No IP addresses found for host.")

    safe_ips = []
    for info in addr_infos:
        sockaddr = info[4]
        raw_ip = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(raw_ip)
        except ValueError:
            raise SSRFProtectionError(f"Invalid resolved IP '{raw_ip}'.")

        if is_ip_blocked(ip_obj):
            raise SSRFProtectionError(
                f"Host '{hostname}' resolved to blocked/private IP address: {raw_ip}."
            )
        safe_ips.append(str(ip_obj))

    if not safe_ips:
        raise SSRFProtectionError("No safe IP addresses found for host.")

    # Pin to the first safe IP
    pinned_ip = safe_ips[0]
    return hostname, port, pinned_ip


class PinnedIPNetworkBackend(httpcore.AnyIOBackend):
    def __init__(self, pinned_ip: str):
        super().__init__()
        self.pinned_ip = pinned_ip

    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: float | None = None,
        local_address: str | None = None,
        socket_options=None,
    ):
        # Connect directly to the validated pinned IP to prevent DNS rebinding
        return await super().connect_tcp(
            self.pinned_ip,
            port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )


class SafeSSRFTransport(httpx.AsyncHTTPTransport):
    """
    Custom HTTPX Async Transport that pins connection to a pre-validated IP
    and does not follow redirects or use arbitrary proxies.
    """
    def __init__(self, pinned_ip: str, **kwargs):
        super().__init__(**kwargs)
        self._pool = httpcore.AsyncConnectionPool(
            network_backend=PinnedIPNetworkBackend(pinned_ip),
            ssl_context=self._pool._ssl_context,
            retries=0,
            max_connections=5,
            max_keepalive_connections=0,
        )
