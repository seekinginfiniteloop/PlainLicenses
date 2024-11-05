"""Adds social media buttons to the bottom of each blog and license page."""

import logging
import re
import urllib.parse
from textwrap import dedent

from hook_logger import get_logger
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from mkdocs.structure.pages import Page

if not hasattr("SOCIAL", "social_logger"):
    social_logger = get_logger("SOCIAL", logging.WARNING)


@event_priority(-100)  # run last
def on_page_markdown(
    markdown: str, page: Page, config: MkDocsConfig, files: Files
) -> str:
    """
    Adds social media buttons to the bottom of each blog and license page.
    """
    x_intent = "https://twitter.com/intent/tweet"
    fb_sharer = "https://www.facebook.com/sharer/sharer.php"
    include = re.compile(
        r"blog/[1-9].*|licenses/.+/index.+|licenses/.+/index.+|licenses/.+/.+/index.+|helping/.+|faq/.+|about/.+"
    )
    social_logger.info
    if not include.match(page.url) or "index" in page.url:
        return markdown
    base_url: str = config.get("site_url", "https://plainlicense.org")
    page_url: str = (
        f"{base_url}{page.url}"
        if page.url.startswith("/")
        else f"{base_url}/{page.url}"
    )
    page_title: str = urllib.parse.quote(f"{page.title or 'Plain License'}\n")
    social_logger.info("Adding social media buttons to %s", page.url)
    return markdown + dedent(f"""
    [Share on :simple-x:]({x_intent}?text={page_title}&url={page_url}){{ .md-button }}
    [Share on :simple-facebook:]({fb_sharer}?u={page_url}){{ .md-button }}
    """)
