"""Geocode directory entries using Google Maps Geocoding API."""

import re

import httpx

from app.config import settings
from app.schemas.location import is_us_country, normalize_country, validate_us_state

_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
_US_ZIP_RE = re.compile(r"^\d{5}$")


def _is_valid_zip_for_geocoding(zip_code: str) -> bool:
    """Reject Kumu-style values like 'Brixton, UK' stored in the zip column."""
    s = zip_code.strip()
    if not s:
        return False
    if " " in s or len(s) > 10:
        return False
    return True


def build_geocode_address(location: dict | None) -> str | None:
    if not location:
        return None

    zip_code = str(location.get("zip_code") or "").strip()
    city = str(location.get("city") or "").strip()
    state = str(location.get("state") or "").strip()
    country = str(location.get("country") or "").strip()

    if zip_code and _is_valid_zip_for_geocoding(zip_code):
        if _US_ZIP_RE.match(zip_code):
            suffix = f", {country}" if country else ""
            return f"{zip_code}{suffix}"
        if country:
            return f"{zip_code}, {country}"

    parts = [p for p in [city, state, country] if p]
    return ", ".join(parts) if parts else None


async def lookup_location(partial: dict | None) -> dict | None:
    """Given whatever location fields are already known, fetch the rest (city/state/zip/country)
    from the Geocoding API. Never overwrites fields the caller already provided."""
    api_key = settings.GOOGLE_MAPS_GEOCODING_API_KEY
    if not api_key:
        return None

    address = build_geocode_address(partial)
    if not address:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                _GEOCODING_URL,
                params={"address": address, "key": api_key},
            )
        data = resp.json()
        if data.get("status") != "OK" or not data.get("results"):
            return None

        found: dict[str, str] = {}
        for component in data["results"][0]["address_components"]:
            types = component.get("types", [])
            if "locality" in types or "postal_town" in types:
                found.setdefault("city", component["long_name"])
            elif "administrative_area_level_1" in types:
                found.setdefault("state", component["long_name"])
            elif "postal_code" in types:
                found.setdefault("zip_code", component["long_name"])
            elif "country" in types:
                found.setdefault("country", component["long_name"])

        merged = dict(partial or {})
        for key, value in found.items():
            if not merged.get(key):
                merged[key] = value

        if merged.get("country"):
            merged["country"] = normalize_country(merged["country"])
        if is_us_country(merged.get("country")) and merged.get("state"):
            try:
                merged["state"] = validate_us_state(merged["state"])
            except ValueError:
                pass

        return merged
    except Exception:
        return None


async def geocode_location(location: dict | None) -> tuple[float, float] | None:
    api_key = settings.GOOGLE_MAPS_GEOCODING_API_KEY
    if not api_key:
        return None

    address = build_geocode_address(location)
    if not address:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                _GEOCODING_URL,
                params={"address": address, "key": api_key},
            )
        data = resp.json()
        if data.get("status") != "OK" or not data.get("results"):
            return None
        loc = data["results"][0]["geometry"]["location"]
        return float(loc["lat"]), float(loc["lng"])
    except Exception:
        return None
