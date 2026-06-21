import logging
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.schemas.extract import DirectoryExtractResponse
from app.schemas.location import SocialLinks
from app.services.images import sanitize_image_url

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_FETCH_TIMEOUT = 10.0
_MAX_TOTAL_FETCHES = 5
_MAX_FOLLOW_LINKS = 4

_SOCIAL_DOMAIN_MAP: dict[str, str] = {
    "instagram.com": "instagram",
    "tiktok.com": "tiktok",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "facebook.com": "facebook",
    "fb.com": "facebook",
    "twitter.com": "twitter",
    "x.com": "twitter",
}

_LINK_IN_BIO_DOMAINS = {"linktr.ee", "beacons.ai", "bio.link", "linkin.bio", "campsite.bio"}

_SKIP_LINK_PREFIXES = ("mailto:", "tel:", "javascript:", "#")


def _registrable_domain(netloc: str) -> str:
    host = netloc.lower().split(":")[0]
    return host[4:] if host.startswith("www.") else host


def _classify_link(href: str) -> str | None:
    domain = _registrable_domain(urlparse(href).netloc)
    for known_domain, field in _SOCIAL_DOMAIN_MAP.items():
        if domain == known_domain or domain.endswith(f".{known_domain}"):
            return field
    return None


def _is_link_in_bio(url: str) -> bool:
    return _registrable_domain(urlparse(url).netloc) in _LINK_IN_BIO_DOMAINS


async def _fetch_html(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        response = await client.get(
            url,
            headers={"User-Agent": _USER_AGENT},
            timeout=_FETCH_TIMEOUT,
            follow_redirects=True,
        )
        if response.status_code >= 400:
            return None
        return response.text
    except httpx.HTTPError as exc:
        logger.info("extract: failed to fetch %s: %s", url, exc)
        return None


def _parse_page(html: str, base_url: str) -> tuple[dict[str, str | None], dict[str, str], list[str]]:
    soup = BeautifulSoup(html, "lxml")
    base_domain = _registrable_domain(urlparse(base_url).netloc)

    def meta(*names: str) -> str | None:
        for name in names:
            tag = soup.find("meta", property=name) or soup.find("meta", attrs={"name": name})
            if tag and tag.get("content"):
                return tag["content"].strip()
        return None

    title = meta("og:title") or (soup.title.string.strip() if soup.title and soup.title.string else None)
    description = meta("og:description", "description")
    image = meta("og:image")

    social_links: dict[str, str] = {}
    other_links: list[str] = []
    seen: set[str] = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith(_SKIP_LINK_PREFIXES):
            continue
        resolved = urljoin(base_url, href)
        if resolved in seen:
            continue
        seen.add(resolved)

        link_domain = _registrable_domain(urlparse(resolved).netloc)
        if not link_domain or link_domain == base_domain:
            continue

        field = _classify_link(resolved)
        if field:
            social_links.setdefault(field, resolved)
        else:
            other_links.append(resolved)

    fields = {"name": title, "description": description, "image_url": image}
    return fields, social_links, other_links


async def extract_from_url(url: str) -> DirectoryExtractResponse:
    fetches_used = 0
    name = description = image_url = None
    social_links: dict[str, str] = {}
    other_links: list[str] = []

    async with httpx.AsyncClient() as client:
        html = await _fetch_html(client, url)
        fetches_used += 1

        if html:
            fields, page_social, page_other = _parse_page(html, url)
            name, description, image_url = fields["name"], fields["description"], fields["image_url"]
            social_links.update(page_social)
            other_links.extend(page_other)

            should_follow = _is_link_in_bio(url) or not page_social
            if should_follow:
                for link in page_other:
                    if fetches_used >= _MAX_TOTAL_FETCHES or len(social_links) >= len(
                        _SOCIAL_DOMAIN_MAP
                    ):
                        break
                    if fetches_used > _MAX_FOLLOW_LINKS:
                        break
                    follow_html = await _fetch_html(client, link)
                    fetches_used += 1
                    if not follow_html:
                        continue
                    follow_fields, follow_social, _ = _parse_page(follow_html, link)
                    for field, value in follow_social.items():
                        social_links.setdefault(field, value)
                    if image_url is None:
                        image_url = follow_fields["image_url"]
                    if description is None:
                        description = follow_fields["description"]

    sanitized_image, _ = sanitize_image_url(image_url)

    return DirectoryExtractResponse(
        name=name,
        description=description,
        image_url=sanitized_image,
        social_links=SocialLinks(**social_links) if social_links else None,
        other_links=[link for link in other_links if link not in social_links.values()],
        source_url=url,
    )
