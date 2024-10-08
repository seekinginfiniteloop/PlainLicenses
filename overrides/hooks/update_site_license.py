"""
Hook that updates the site license to match the current version of the Plain Unlicense, so we're always up-to-date and aren't using an old version of the license.
"""

import logging
from pathlib import Path
from textwrap import wrap

from _logconfig import get_logger
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.structure.nav import Navigation
from mkdocs.structure.pages import Page
from mkdocs.utils.templates import TemplateContext

if not hasattr(__name__, "SITE_LICENSE_LOGGER"):
    SITE_LICENSE_LOGGER = get_logger(__name__, logging.WARNING)


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
    globals()["SITE_LICENSE_LOGGER"] = get_logger(
        __name__,
        logging.WARNING,
    )
    meta = page.meta
    if "original_name" not in meta:
        return context
    if meta["original_name"].strip().lower() == "unlicense":
        SITE_LICENSE_LOGGER.debug("found unlicense")
        SITE_LICENSE_LOGGER.debug(f"PATH: {Path.cwd()}")
        license = SiteLicense(context, page)
        license.check_for_updates()
        SITE_LICENSE_LOGGER.debug(f"license: {license.full_text}")
    return context


class SiteLicense:
    """
    Represents the license information for a site, including its text and metadata.
    This class is responsible for creating a structured representation of the license,
    wrapping text for display, and checking for updates to the license file.

    Args:
        context (TemplateContext): The current template context.
        page (Page): The page object containing metadata and content.

    Methods:
        wrap_text(text): Wraps the provided text into formatted paragraphs.
        __str__(): Returns the full text representation of the license.
        check_for_updates(): Checks if the license file exists and updates it if necessary.

    Examples:
        license = SiteLicense(context, page)
        print(license)
    """

    def __init__(self, context: TemplateContext, page: Page) -> None:
        """
        Initializes a SiteLicense object with the provided context and page metadata.
        This constructor sets up the license information, including its title, text,
        interpretation, and version, while also preparing the path for the license file.

        Args:
            context (TemplateContext): The current template context for rendering.
            page (Page): The page object containing metadata and content related to the license.

        Examples:
            license = SiteLicense(context, page)
        """
        SITE_LICENSE_LOGGER.info("Creating SiteLicense object")
        self.context = context
        self.self_location = "UNLICENSE"
        self.self_path = Path.cwd() / self.self_location
        SITE_LICENSE_LOGGER.debug(f"self_location: {self.self_location}")
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

        self.full_text = f"{self.title}\n\n{self.version_text}\n\n{self.text}\n\n{self.interpretation_section}\n\nOfficial Unlicense: [Unlicense.org]({self.original_url})"

        SITE_LICENSE_LOGGER.debug(f"full_text: {self.full_text}")

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

    def check_for_updates(self) -> None:
        """
        Checks if the license file matches the current license and updates it if it doesn't.
        """
        if self.self_path.exists():
            existing_text = self.self_path.read_text()
            if existing_text != self.full_text:
                self.self_path.unlink()
                self.self_path.touch()
                SITE_LICENSE_LOGGER.info("Updating UNLICENSE file")
                self.self_path.write_text(self.full_text)
                SITE_LICENSE_LOGGER.info("UNLICENSE file updated")
        else:
            SITE_LICENSE_LOGGER.debug("UNLICENSE file not found")
            SITE_LICENSE_LOGGER.debug(f"PATH: {self.self_path}")
