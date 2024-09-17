import logging
import re
import urllib.parse
from textwrap import dedent

from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from mkdocs.structure.pages import Page

from _logconfig import get_logger

x_intent = "https://twitter.com/intent/tweet"
fb_sharer = "https://www.facebook.com/sharer/sharer.php"
include = re.compile(
    r"blog/[1-9].*|licenses/.+/index.md|licenses/.+/index.md|licenses/.+/.+/index.md"
)

if not hasattr(__name__, "SOCIAL_LOGGER"):
    SOCIAL_LOGGER = get_logger(__name__, logging.INFO)

@event_priority(-100)  # run last
def on_page_markdown(
    markdown: str, page: Page, config: MkDocsConfig, files: Files
) -> str:
    """
    Adds social media buttons to the bottom of each blog and license page.
    """
    SOCIAL_LOGGER.info
    if not include.match(page.url) or "index" in page.url:
        return markdown
    page_url: str = site_url + page.url
    page_title: str = urllib.parse.quote(page.title + "\n")
    SOCIAL_LOGGER.info("Adding social media buttons to %s", page.url)
    return markdown + dedent(f"""
    [Share on :simple-x:]({x_intent}?text={page_title}&url={page_url}){{ .md-button }}
    [Share on :simple-facebook:]({fb_sharer}?u={page_url}){{ .md-button }}
    """)
