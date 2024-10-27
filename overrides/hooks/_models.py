    """
    TODO: This is the beginning of a rewrite of the license handling to use pydantic models. That way we can validate them and provide better error catching. We won't need the license canary anymore.
    """

from typing import Any

from mkdocs.structure.pages import Page
from mkdocs.structure.files import File
from mkdocs.structure.toc import TableOfContents
from pydantic import BaseModel, PastDatetime

class PageModel(BaseModel):
    content: str | None
    toc: TableOfContents
    meta: dict[str, Any]
    file: File
    abs_url: str | None
    canonical_url: str | None
    edit_url: str
    previous_page: Page | None
    next_page: Page | None
    children: None
    is_section: bool
    is_page: bool
    is_link: bool
    present_anchor_ids: set[str] | None
    links_to_anchors: dict[File, dict[str, str]] | None
    title: str
    markdown: str | None
    update_date: PastDatetime | None
