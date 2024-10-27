"""
Hook that updates the site license to match the current version of the Plain Unlicense, so we're always up-to-date and aren't using an old version of the license.
"""

import logging
from pathlib import Path
from pprint import pformat
from textwrap import wrap
import re

from hook_logger import get_logger
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.structure.nav import Navigation
from mkdocs.structure.pages import Page
from mkdocs.utils.templates import TemplateContext

from license_canary import LicenseBuildCanary

_site_license_log_level = logging.WARNING

def on_page_context(
    context: TemplateContext, page: Page, config: MkDocsConfig, nav: Navigation
) -> TemplateContext:
    """
    Handles the page context for a specific page in the documentation site.
    This function checks the page's metadata and, if the original name indicates an unlicense,
    it creates a SiteLicense object and checks for updates.

    Args:
        context (TemplateContext): The current template context.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration object for the site.
        nav (Navigation): The navigation structure of the site.

    Returns:
        TemplateContext: The updated template context after processing the page.
    """
    logger = get_logger("SITE_LICENSE", _site_license_log_level)
    canary = LicenseBuildCanary.canary()
    if not (license := canary.is_license_page(page)):
        return context
    logger.debug("site license checking license %s if it's an unlicense", license)
    meta = page.meta
    if meta and 'original_name' not in meta:
        return context
    if (original_name := meta["original_name"].strip().lower()) and (
        "unlicense" in original_name or original_name == "unlicense"
    ):
        logger.info("found unlicense")
        logger.debug("PATH: %s", Path.cwd())
        license = SiteLicense(context, page)
        license.check_for_updates()
        logger.debug("license: %s", license.full_text)
    return context


class SiteLicense:
    """
    Represents the license information for the site, the license's text and metadata.
    Creates a structured representation of the license, including its title, text, interpretation, and version.

    Args:
        context (TemplateContext): The current template context.
        page (Page): The page object containing metadata and content.

    Methods:
        wrap_text(text): Wraps the provided text into formatted paragraphs.
        check_for_updates(): Checks if the license file exists and updates it if necessary.
    """

    def __init__(self, context: TemplateContext, page: Page) -> None:
        """
        Initializes a SiteLicense object with the provided context and page metadata.
        This constructor sets up the license information, including its title, text,
        interpretation, and version, while also preparing the path for the license file.

        Args:
            context (TemplateContext): The current template context for rendering.
            page (Page): The page object containing metadata and content related to the license.
        """
        self.logger = get_logger(__name__, _site_license_log_level)
        self.logger.info("Creating SiteLicense object")
        self.context = context
        self.self_location = "UNLICENSE"
        self.self_path = Path.cwd() / self.self_location
        self.logger.debug("self_location: %s", self.self_location)
        self.name = page.meta.get("plain_name", "Plain Unlicense").strip()
        self.title = f"\n# {self.name}"
        self.raw_text = page.meta.get("markdown_license_text", "").strip()
        self.text = self.wrap_text(self.raw_text)
        self.interpretation_text_raw = page.meta.get("interpretation_text", "").strip()
        self.interpretation_text = self.wrap_text(self.interpretation_text_raw)
        self.interpretation_title = page.meta.get("interpretation_title", "").strip()
        self.interpretation_section = (
            f"### {self.interpretation_title}\n\n{self.interpretation_text}"
        )
        self.version = page.meta.get("plain_version", "").strip()
        self.version_text = f"Plain Version: {self.version}"
        self.original_url = page.meta.get("original_url", "").strip()
        self._preamble = self.preamble
        self.full_text = f"{self._preamble}\n\n{self.title}\n\n{self.version_text}\n\n{self.text}\n\n{self.interpretation_section}\n\nOfficial Unlicense: [Unlicense.org]({self.original_url})"
        self.logger = get_logger(__name__, _site_license_log_level)

        self.logger.debug("license full text: %s", self.full_text)

    def wrap_text(self, text: str) -> str:
        """
        Wraps the provided text into formatted paragraphs, handling bullet points separately.
        This method processes the input text by splitting it into paragraphs and wrapping each
        paragraph to a specified width, ensuring that bullet points are formatted correctly.

        Args:
            text (str): The text to be wrapped into formatted paragraphs.

        Returns:
            str: The wrapped text with paragraphs and bullet points formatted appropriately.

        Examples:
            wrapped = wrap_text("Some text\n\n- Bullet 1\n- Bullet 2")
        """
        paragraphs = text.split("\n\n")
        bullet_paragraphs = []
        for i, paragraph in enumerate(paragraphs):
            if paragraph.strip().startswith("-"):
                bullets = paragraph.split("\n")
                bullets = [
                    wrap(bullet, width=80, break_long_words=False) for bullet in bullets
                ]
                bullet_paragraphs.append((i, bullets))
        paragraphs = [
            paragraph
            for i, paragraph in enumerate(paragraphs)
            if i not in [i for i, _ in bullet_paragraphs]
        ]
        wrapped_paragraphs = [
            "\n".join(wrap(paragraph, width=80, break_long_words=False))
            for paragraph in paragraphs
        ]
        for i, bullets in bullet_paragraphs:
            bullets = ["\n".join(bullet) for bullet in bullets]
            wrapped_paragraphs.insert(i, "\n".join(bullets))
        return "\n\n".join(wrapped_paragraphs)

    def __str__(self) -> str:
        """It's... a string!"""
        return self.full_text

    @property
    def preamble(self) -> str:
        """
        Returns the preamble for the license, which is a comment block indicating the license's status.
        """
        return """<!---\nAll original content on plainlicense.org is in the public domain.\nSome content may be subject to other licenses. Importantly, the site itself was built using Martin Donath's [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) under the MIT license,\n and Tom Christy's [MkDocs](https://www.mkdocs.org/) under the BSD-2 license.\n For any other parts of the site under a different license, we try make it clear.\n--->"""

    def check_for_updates(self) -> None:
        """
        Checks if the license file matches the current license and updates it if it doesn't.
        """
        if self.self_path.exists():
            existing_text = self.self_path.read_text()
            if existing_text != self.full_text:
                self.self_path.unlink()
                self.self_path.touch()
                self.logger.info("Updating UNLICENSE file")
                self.self_path.write_text(self.full_text)
                self.logger.info("UNLICENSE file updated")
        else:
            self.logger.debug("UNLICENSE file not found")
            self.logger.debug("PATH: %s", self.self_path)
