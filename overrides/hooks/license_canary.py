"""
The license canary, a build-time check to ensure all licenses are processed correctly. Since we dynamically generate most license content at build, we need to ensure that the resulting pages aren't broken.
"""

import logging
import os
from pathlib import Path
from pprint import pformat
from typing import TYPE_CHECKING, Any, ClassVar, Literal, Self

from hook_logger import get_logger
from mkdocs.config import Config as MkDocsConfig
from mkdocs.exceptions import PluginError
from mkdocs.plugins import event_priority
from mkdocs.structure.files import Files
from mkdocs.structure.nav import Navigation
from mkdocs.structure.pages import Page
from mkdocs.utils.templates import TemplateContext

if TYPE_CHECKING:
    from content_assembly import LicenseContent

_canary_log_level = logging.WARNING


class LicenseBuildCanary:
    """
    LicenseBuildCanary helps us ensure that all licenses are processed correctly, and prevents broken from entering production. It's also a singleton, so it doubles as a global reference point for other hooks.
    """

    _instance: ClassVar[Self | None] = None
    _initialized: ClassVar[bool] = False

    def __new__(cls) -> Self:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        """Get this party started."""
        if self.__class__._initialized:
            return
        self.expected_licenses: list[str] = self._list_expected_licenses()
        self.processed_licenses: list["LicenseContent | None"] = []
        self.processed_context: list[TemplateContext | None] = []
        self.processed_html: list[str | None] = []
        self.assembled_pages: list[Page | None] = []
        self.errors: list[Any] = []
        self.production: bool = True  # Assume production by default
        self.logger: logging.Logger = get_logger("CANARY", _canary_log_level)
        self.__class__._initialized = True

    def _list_expected_licenses(self) -> list[str]:
        license_paths = Path("docs/licenses/").glob("**/index.md")
        return [
            path.parent.name  # license name is the parent directory
            for path in license_paths
            if path.parent.name
            not in [  # category and main info pages to exclude
                "copyleft",
                "licenses",
                "permissive",
                "proprietary",
                "public-domain",
                "source-available",
            ]
        ]

    def list_production(self, command: str) -> None:
        """Sets the production flag based on the MKDocs command"""
        self.production = (
            command in {"build", "gh-deploy"} or os.getenv("GITHUB_ACTIONS") == "true"
        )

    def add_value(self, attr: str, value: Any) -> None:
        """
        Adds a value to the instance variable collection for the specified attribute.

        Args:
            attr (str): The attribute to add the value to.
            value (Any): The value to add to the attribute collection.

        Raises:
            AttributeError: If the attribute is not a valid instance attribute, or if the attribute is a protected variable.

        Example:
            LicenseBuildCanary.add_value("processed_licenses", license_content)
        """
        self.logger.debug("Adding value to %s: %s", attr, value)
        if attr in {"production", "logger", "_instance"}:
            raise AttributeError(f"Cannot add value to {attr}")
        try:
            getattr(self, attr).append(value)
        except AttributeError as e:
            AttributeError(f"Attribute {attr} not a valid attribute {e}")

    @classmethod
    def canary(cls) -> Self:
        """Returns the LicenseBuildCanary instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_license_page(self, page: Page) -> bool:
        """
        Checks if the page is a license page.

        Args:
            page (Page): The page object containing metadata and content.

        Returns:
            bool: True if the page is a license page, False otherwise.
        """
        self.logger.debug("Checking if page is a license page. Page URL: %s", page.url)
        page_name = (
            page.url.split("/")[-2]
            if len(page.url.split("/")) > 2
            else "definitely not a license page"
        )
        return page_name in self.expected_licenses

    def check_placeholders(
        self, content: Any, step: Literal["boilerplate", "markdown", "html"]
    ) -> None:
        """
        Checks if jinja placeholders are still in the content.
        """

        def check_content(content: Any) -> bool:
            if not content:
                return False
            if isinstance(content, str):
                return "{{" in content
            if isinstance(content, dict):
                return any(check_content(value) for value in content.values())
            else:
                return any(check_content(item) for item in content)

        if check_content(content):
            self.add_value(
                "errors",
                f"Jinja placeholders still in content. Placeholders found at step: {step}. Provided content: {content}",
            )

    @property
    def licenses(
        self,
    ) -> dict[
        str,
        list[str | None]
        | list["LicenseContent | None"]
        | list[TemplateContext | None]
        | list[None],
    ]:
        """Returns the list of expected licenses."""
        return {
            "Expected licenses": self.expected_licenses,
            "Processed licenses": self.processed_licenses,
            "Processed pages": self.processed_context,
            "Processed HTML": self.processed_html,
        }

    @property
    def build_errors(self) -> list[str]:
        """Returns the list of build errors."""
        return self.errors

    @property
    def dead(self) -> bool:
        """Returns True if the canary is dead, False otherwise."""
        return bool(self.errors) or not bool(self.expected_licenses)


@event_priority(98)
def on_startup(command: str, dirty: bool) -> None:
    """
    We start the Build Canary.
    """
    canary = LicenseBuildCanary()
    canary.list_production(command)
    canary.logger.debug("Build Canary production flag is list to %s", canary.production)
    canary.logger.debug("Canary expected licenses: %s", canary.expected_licenses)

def on_page_context(
    context: TemplateContext, page: Page, config: MkDocsConfig, nav: Navigation
) -> TemplateContext:
    """
    We add the page context to the Build Canary.

    Args:
        context (TemplateContext): The current template context.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration object for the site.

    Returns:
        TemplateContext: The updated template context after processing the page.
    """
    canary = LicenseBuildCanary.canary()
    if canary.is_license_page(page):
        canary.add_value("processed_context", str(context))
    return context


def on_page_content(html: str, page: Page, config: MkDocsConfig, files: Files) -> str:
    """
    Uses the final HTML content to populate. This should be after all processing is over.

    Args:
        html (str): The rendered HTML content BEFORE it's passed to the template.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration object for the site.
        files (Files): The files that are being processed.

    Returns:
        str: The final HTML content.
    """
    canary = LicenseBuildCanary.canary()
    if canary.is_license_page(page):
        canary.check_placeholders(html, "html")
        canary.add_value("processed_html", html)
        canary.logger.debug("Processed HTML: %s", html)
    return html


def on_post_build(config: MkDocsConfig) -> None:
    """
    We check the Build Canary after the build is complete.
    """
    canary = LicenseBuildCanary.canary()
    canary.logger.info("Checking Build Canary for errors.")

    checks = [
        (
            canary.expected_licenses,
            canary.processed_licenses,
            "Expected licenses: {} do not match processed licenses: {}",
        ),
        (
            canary.processed_context,
            canary.processed_html,
            "Processed pages: {} do not match processed HTML: {}",
        ),
    ]

    for expected, processed, message in checks:
        if len(expected) != len(processed):
            canary.add_value("errors", str(message.format(expected, processed)))
    """
    if canary.logger.level == logging.DEBUG:
        for k, v in canary.licenses.items():
            canary.logger.debug("%s: %s\n", k, v)

    if empty := next((None if v else k for k, v in canary.licenses.items()), None):
        canary.add_value(
            "errors", "Build Canary found empty values. %s was empty." % empty)

    if canary.dead:
        canary.logger.error("Build Canary found errors.")
        raise PluginError("Build Canary found errors. ... here's a list of the errors.\n %s", pformat((canary.build_errors), indent=2))

    canary.logger.info("Build Canary passed without errors.")
    """

LicenseBuildCanary()
