"""Updates the changelog for each license page."""

import logging
from pathlib import Path

from hook_logger import get_logger
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.structure.pages import Page
from mkdocs.structure.files import Files
from mkdocs.plugins import event_priority

from license_canary import LicenseBuildCanary

if not hasattr("CHANGELOGS", "changelog_logger"):
    changelog_logger = get_logger(__name__, logging.WARNING)

@event_priority(50)
def on_pre_page(page: Page, config: MkDocsConfig, files: Files) -> Page:
    """Update the changelog for each license page.

    Also, check for tags in the frontmatter and update them if necessary.
    """
    if not LicenseBuildCanary().canary().is_license_page(page):
        return page

    license_dir = Path(page.file.src_uri).parent
    changelog_logger.info("Updating changelogs and tags for license %s.", str(license_dir).split("/")[-1])
    if changelog := files.get_file_from_path(f"{license_dir}/CHANGELOG.md"):
        changelog_content = changelog.content_string
        page.meta["changelog"] = changelog_content
        setattr(changelog, "inclusion", -3)
    return page
