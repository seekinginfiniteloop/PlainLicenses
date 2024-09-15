import logging
import re
import urllib.parse
from textwrap import dedent

from mkdocs.plugins import event_priority
from mkdocs.structure.pages import Page
from mkdocs.structure.files import Files
from mkdocs.config import Config

x_intent = "https://twitter.com/intent/tweet"
fb_sharer = "https://www.facebook.com/sharer/sharer.php"
include = re.compile(r"blog/[1-9].*|licenses/.+/index.md|licenses/.+/index.md|licenses/.+/.+/index.md")


@event_priority(-100)
def on_page_markdown(markdown: str, page: Page, config: Config, files: Files) -> str:
    if not include.match(page.url) or "index" in page.url:
        return markdown

    page_url: str = site_url + page.url
    page_title: str = urllib.parse.quote(page.title + "\n")
    logging.info("Adding social media buttons to %s", page.url)
    return markdown + dedent(f"""
    [Share on :simple-x:]({x_intent}?text={page_title}&url={page_url}){{ .md-button }}
    [Share on :simple-facebook:]({fb_sharer}?u={page_url}){{ .md-button }}
    """)
