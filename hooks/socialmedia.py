from textwrap import dedent
import urllib.parse
import re

from mkdocs.plugins import event_priority
from mkdocs.structure.pages import Page

x_intent = "https://twitter.com/intent/tweet"
fb_sharer = "https://www.facebook.com/sharer/sharer.php"
include = re.compile(r"blog/[1-9].*|licenses/.+/.*")

@event_priority(-100)
def on_page_markdown(markdown: str, **kwargs) -> str:
    page: Page = kwargs['page']
    config = kwargs['config']
    if not include.match(page.url) or 'index' in page.url:
        return markdown

    page_url = config.site_url+page.url
    page_title = urllib.parse.quote(page.title+'\n')

    return markdown + dedent(f"""
    [Share on :simple-x:]({x_intent}?text={page_title}&url={page_url}){{ .md-button }}
    [Share on :simple-facebook:]({fb_sharer}?u={page_url}){{ .md-button }}
    """)
