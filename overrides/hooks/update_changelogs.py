"""Updates the changelog for each license page."""

import logging
from pathlib import Path

from hook_logger import get_logger
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.structure.pages import Page
from mkdocs.structure.files import Files, InclusionLevel
from mkdocs.plugins import event_priority

from _utils import is_license_page, find_repo_root

if not hasattr(__name__, "changelog_logger"):
    changelog_logger = get_logger("CHANGELOG", logging.WARNING)

@event_priority(50)
def on_pre_page(page: Page, config: MkDocsConfig, files: Files) -> Page:
    """Update the changelog for each license page.

    Also, check for tags in the frontmatter and update them if necessary.
    """
    if not is_license_page(page):
        return page
    license_name = page.meta.get("spdx_id", page.url.split("/")[-2])
    changelog_path = find_repo_root() / "packages" / "changelogs" / f"{license_name}.md"
    changelog_content = changelog_path.read_text() if changelog_path.exists() else "## such empty, much void :nounproject-doge:"
    changelog_logger.info("Updating changelog for %s", license_name)
    page.meta["changelog"] = changelog_content
    return page
