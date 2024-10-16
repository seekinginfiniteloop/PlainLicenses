"""
The license canary, a build-time check to ensure all licenses are processed correctly. Since we dynamically generate most license content at build, we need to ensure that the resulting pages aren't broken.
"""
import logging
import os

from pathlib import Path
from typing import Any, ClassVar, Self, Literal

from mkdocs.config import Config as MkDocsConfig
from mkdocs.structure.files import Files
from mkdocs.structure.pages import Page
from mkdocs.utils.templates import TemplateContext

from hook_logger import get_logger
from content_assembly import LicenseContent

_canary_log_level = logging.WARNING

class LicenseBuildCanary:
    """
    LicenseBuildCanary helps us ensure that all licenses are processed correctly, and prevents broken from entering production. It's also a singleton, so it doubles as a global reference point for other hooks.
    """

    expected_licenses: ClassVar[set[str | None]]
    processed_licenses: ClassVar[set[LicenseContent | None]]
    processed_pages: ClassVar[set[TemplateContext | None]]
    processed_html: ClassVar[set[str | None]]
    errors: ClassVar[list[Any]]
    production: ClassVar[bool]
    _logger: ClassVar[logging.Logger]
    _instance: Self | None = None

    def __new__(cls) -> Self:
        """We create a singleton pattern so we're not going all Oprah on the instance creation."""
        if cls._instance is None:
            cls._instance = super(LicenseBuildCanary, cls).__new__(cls)
            cls._set_initial_classvars()
        return cls._instance

    @classmethod
    def _set_initial_classvars(cls) -> None:
        """Sets the initial class variables."""
        cls.expected_licenses = set()
        cls.processed_licenses = set()
        cls.processed_pages = set()
        cls.processed_html = set()
        cls.errors = []
        cls._logger = get_logger(__name__, _canary_log_level)

    @classmethod
    def _set_expected_licenses(cls) -> None:
        license_paths = Path("docs/licenses/").glob("**/index.md")

        cls.expected_licenses = {
            path.parent.name # license name is the parent directory
            for path in license_paths
            if path.parent.name
            not in [ # category and main info pages to exclude
                "copyleft",
                "licenses",
                "permissive",
                "proprietary",
                "public-domain",
                "source-available",
                ]
        }

    @classmethod
    def set_production(cls, command: str) -> None:
        """Sets the production flag based on the MKDocs command"""
        cls.production = command == "build" or command == "gh-deploy" or os.getenv("GITHUB_ACTIONS") == "true"

    @classmethod
    def add_value(cls, attr: str, value: Any) -> None:
        """
        Adds a value to the class variable collection for the specified attribute.

        Args:
            attr (str): The attribute to add the value to.
            value (Any): The value to add to the attribute collection.

        Raises:
            AttributeError: If the attribute is not a valid class variable. or if the attribute is a protected variable.

        Example:
            LicenseBuildCanary.add_value("processed_licenses", license_content)
        """
        match attr:
            case "expected_licenses" | "processed_licenses" | "processed_pages" | "processed_html":
                getattr(cls, attr).add(value)
            case "errors":
                cls.errors.append(value)
            case "production" | "_logger" | "_instance":
                raise AttributeError(f"Cannot add value to {attr}")
            case _:
                raise AttributeError(f"Attribute {attr} not a valid class variable")


def is_license_page(page: Page) -> bool:
    """
    Checks if the page is a license page.

    Args:
        page (Page): The page object containing metadata and content.

    Returns:
        bool: True if the page is a license page, False otherwise.
    """
    return any(
        name
        for name in LicenseBuildCanary.expected_licenses
        if isinstance(name, str) and name in page.url
    )

def check_placeholders(
    content: Any, step: Literal["boilerplate", "markdown", "html"]
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
        LicenseBuildCanary.add_value(
            "errors",
            f"Jinja placeholders still in content. Placeholders found at step: {step}. Provided content: {content}",
        )

def on_startup(command: str, config: MkDocsConfig) -> None:
    """
    We start the Build Canary.
    """
    canary = LicenseBuildCanary()
    canary.set_production(command)


def on_page_context(
    context: TemplateContext, page: Page, config: MkDocsConfig
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
    if is_license_page(page):
        LicenseBuildCanary.add_value("processed_pages", context)
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
    if is_license_page(page):
        check_placeholders(html, "html")
        LicenseBuildCanary.add_value("processed_html", html)
    return html
