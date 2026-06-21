import json
import logging
import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession as CurlAsyncSession

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

# Domains that show up constantly in link-in-bio pages but are never the
# organization's own website (donation/payment/affiliate platforms).
_NON_WEBSITE_DOMAINS = _LINK_IN_BIO_DOMAINS | {
    "gofundme.com",
    "gofund.me",
    "buymeacoffee.com",
    "patreon.com",
    "venmo.com",
    "paypal.com",
    "paypal.me",
    "cash.app",
    "ko-fi.com",
    "eventbrite.com",
    "amazon.com",
    "etsy.com",
    "bit.ly",
    "tinyurl.com",
}

_SKIP_LINK_PREFIXES = ("mailto:", "tel:", "javascript:", "#")

# Instagram's public (undocumented) profile API. Static HTML for instagram.com
# profile pages is a JS app shell with no usable meta tags, so profile pages
# get fetched through this endpoint instead.
_IG_APP_ID = "936619743392459"
_IG_RESERVED_PATHS = {
    "p",
    "reel",
    "reels",
    "tv",
    "explore",
    "stories",
    "accounts",
    "direct",
    "about",
    "developer",
    "legal",
    "directory",
    "web",
}
_INSTAGRAM_PROFILE_PATH_RE = re.compile(r"^/([A-Za-z0-9_.]+)/?$")

# TikTok profile pages are server-rendered with a generic shell <title> (no
# usable og: tags), but embed the real profile data as JSON in this script tag.
_TIKTOK_PROFILE_PATH_RE = re.compile(r"^/@([A-Za-z0-9_.]+)/?$")

# SEO titles are commonly "Brand — tagline" / "Brand | tagline"; keep just the brand.
_TITLE_SEPARATOR_RE = re.compile(r"\s+[—–|]\s+|\s+-\s+")


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


def _clean_title(title: str | None) -> str | None:
    if not title:
        return title
    first = _TITLE_SEPARATOR_RE.split(title, maxsplit=1)[0].strip()
    return first or title


def _normalize_for_match(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _looks_like_website(url: str, handle: str | None) -> bool:
    """Heuristic: is this link probably the org's own site (not a donation/affiliate link)?"""
    if not handle or _classify_link(url):
        return False
    domain = _registrable_domain(urlparse(url).netloc)
    if not domain or domain in _NON_WEBSITE_DOMAINS:
        return False
    name_part = _normalize_for_match(domain.rsplit(".", 1)[0])
    target = _normalize_for_match(handle)
    if len(name_part) < 4 or len(target) < 4:
        return False
    return name_part == target or name_part in target or target in name_part


def _instagram_username_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    if _registrable_domain(parsed.netloc) != "instagram.com":
        return None
    match = _INSTAGRAM_PROFILE_PATH_RE.match(parsed.path)
    if not match:
        return None
    username = match.group(1)
    return None if username.lower() in _IG_RESERVED_PATHS else username


def _tiktok_username_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    if _registrable_domain(parsed.netloc) != "tiktok.com":
        return None
    match = _TIKTOK_PROFILE_PATH_RE.match(parsed.path)
    return match.group(1) if match else None


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


async def _fetch_instagram_profile(username: str) -> dict | None:
    # Instagram's edge fingerprints the TLS/HTTP2 handshake and 429s plain httpx
    # requests to this endpoint even with browser-like headers, so impersonate
    # an actual Chrome client instead.
    try:
        async with CurlAsyncSession() as session:
            response = await session.get(
                "https://i.instagram.com/api/v1/users/web_profile_info/",
                params={"username": username},
                headers={"x-ig-app-id": _IG_APP_ID},
                impersonate="chrome",
                timeout=_FETCH_TIMEOUT,
            )
            if response.status_code != 200:
                return None
            return response.json().get("data", {}).get("user")
    except (OSError, ValueError) as exc:
        logger.info("extract: instagram profile fetch failed for %s: %s", username, exc)
        return None


def _tiktok_profile_from_html(html: str) -> dict | None:
    try:
        soup = BeautifulSoup(html, "lxml")
        tag = soup.find("script", id="__UNIVERSAL_DATA_FOR_REHYDRATION__")
        if not tag or not tag.string:
            return None
        detail = json.loads(tag.string)["__DEFAULT_SCOPE__"]["webapp.user-detail"]
        if detail.get("statusCode"):
            return None
        return detail["userInfo"]["user"]
    except (ValueError, KeyError, TypeError) as exc:
        logger.info("extract: failed to parse tiktok profile json: %s", exc)
        return None


def _social_links_from_ldjson(soup: BeautifulSoup) -> dict[str, str]:
    """Link-in-bio pages (e.g. Linktree) render social icons client-side, with no
    real <a href>. They do embed a schema.org Person/ProfilePage block with the
    social profiles under "sameAs" though, so pull from there too."""
    found: dict[str, str] = {}
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        if not tag.string:
            continue
        try:
            data = json.loads(tag.string)
        except ValueError:
            continue
        for node in data if isinstance(data, list) else [data]:
            if not isinstance(node, dict):
                continue
            entities = [node]
            main_entity = node.get("mainEntity")
            if isinstance(main_entity, dict):
                entities.append(main_entity)
            for entity in entities:
                for same_as in entity.get("sameAs") or []:
                    field = _classify_link(same_as)
                    if field:
                        found.setdefault(field, same_as)
    return found


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
    title = _clean_title(title)
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

    for field, value in _social_links_from_ldjson(soup).items():
        social_links.setdefault(field, value)

    fields = {"name": title, "description": description, "image_url": image}
    return fields, social_links, other_links


async def extract_from_url(url: str) -> DirectoryExtractResponse:
    fetches_used = 0
    follow_fetches = 0
    name = description = image_url = None
    social_links: dict[str, str] = {}
    other_links: list[str] = []
    frontier: list[str] = []

    async with httpx.AsyncClient() as client:
        ig_username = _instagram_username_from_url(url)
        tiktok_username = _tiktok_username_from_url(url) if not ig_username else None

        if ig_username:
            profile = await _fetch_instagram_profile(ig_username)
            fetches_used += 1
            if profile:
                social_links["instagram"] = profile.get("username") or ig_username
                description = profile.get("biography") or None
                image_url = profile.get("profile_pic_url_hd") or profile.get("profile_pic_url")
                bio_link = next(
                    (link.get("url") for link in (profile.get("bio_links") or []) if link.get("url")),
                    None,
                ) or profile.get("external_url")
                if bio_link:
                    frontier.append(bio_link)
        elif tiktok_username:
            html = await _fetch_html(client, url)
            fetches_used += 1
            profile = _tiktok_profile_from_html(html) if html else None
            if profile:
                social_links["tiktok"] = profile.get("uniqueId") or tiktok_username
                description = profile.get("signature") or None
                image_url = profile.get("avatarLarger") or profile.get("avatarMedium")
                bio_link = (profile.get("bioLink") or {}).get("link")
                if bio_link:
                    frontier.append(bio_link)
            elif html:
                # Profile JSON layout may have changed or the account is private/banned;
                # fall back to whatever the generic page parse can still salvage.
                fields, page_social, page_other = _parse_page(html, url)
                name, description, image_url = fields["name"], fields["description"], fields["image_url"]
                social_links.update(page_social)
                other_links.extend(page_other)
                frontier.extend(page_other)
        else:
            html = await _fetch_html(client, url)
            fetches_used += 1
            if html:
                fields, page_social, page_other = _parse_page(html, url)
                name, description, image_url = fields["name"], fields["description"], fields["image_url"]
                social_links.update(page_social)
                other_links.extend(page_other)
                frontier.extend(page_other)

        website_link: str | None = None

        while frontier and fetches_used < _MAX_TOTAL_FETCHES and follow_fetches < _MAX_FOLLOW_LINKS:
            link = frontier.pop(0)
            handle = (
                social_links.get("instagram")
                or social_links.get("tiktok")
                or ig_username
                or tiktok_username
            )

            if website_link is None and _looks_like_website(link, handle):
                follow_html = await _fetch_html(client, link)
                fetches_used += 1
                follow_fetches += 1
                if follow_html:
                    follow_fields, follow_social, _ = _parse_page(follow_html, link)
                    website_link = link
                    social_links.setdefault("website", link)
                    # The org's own site is the most authoritative source for its name,
                    # so it wins even if a link-in-bio landing page already set one.
                    name = follow_fields["name"] or name
                    description = description or follow_fields["description"]
                    image_url = image_url or follow_fields["image_url"]
                    for field, value in follow_social.items():
                        social_links.setdefault(field, value)
                continue

            # Only crawl link-in-bio aggregators for social links beyond this point - an
            # arbitrary other link (a donation page, an unrelated project's site, ...) has
            # its own footer/social icons that have nothing to do with this profile, and
            # merging them in would silently attach the wrong accounts.
            if not _is_link_in_bio(link) or len(social_links) >= len(_SOCIAL_DOMAIN_MAP):
                continue

            follow_html = await _fetch_html(client, link)
            fetches_used += 1
            follow_fetches += 1
            if not follow_html:
                continue
            follow_fields, follow_social, follow_other = _parse_page(follow_html, link)
            for field, value in follow_social.items():
                social_links.setdefault(field, value)
            image_url = image_url or follow_fields["image_url"]
            description = description or follow_fields["description"]
            other_links.extend(follow_other)
            frontier.extend(follow_other)

    sanitized_image, _ = sanitize_image_url(image_url)

    return DirectoryExtractResponse(
        name=name,
        description=description,
        image_url=sanitized_image,
        social_links=SocialLinks(**social_links) if social_links else None,
        other_links=[link for link in other_links if link not in social_links.values()],
        source_url=url,
    )
