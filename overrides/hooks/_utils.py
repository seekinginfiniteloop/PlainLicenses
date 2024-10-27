"""
Utility functions for hooks.
"""
import os
from pathlib import Path
from re import M
from typing import Literal, ClassVar, Self

from mkdocs.structure.pages import Page

type MkDocsCommand = Literal['gh-deploy', 'serve', 'build']

def _is_production(command: MkDocsCommand) -> bool:
    """
    Returns True if the environment is production.
    """
    return (
            command in {"build", "gh-deploy"} or os.getenv("GITHUB_ACTIONS") == "true"
        )

def is_license_page(page: Page) -> bool:
    """
    Returns True if the page is a license page.
    """
    _status = Status.status
    page_name = (
        page.url.split("/")[-2]
        if len(page.url.split("/")) > 2
        else "definitely not a license page"
    )
    return _status.expected_licenses and page_name in _status.expected_licenses

class Status:
    """
    Simple singleton class to store global status information.
    """

    _instance: ClassVar[Self] | None = None
    _initialized: ClassVar[bool] = False

    def __new__(cls, cmd: MkDocsCommand) -> Self:
        if cls._instance is None:
            cls._instance = super().__new__(cls, cmd)
        return cls._instance

    def __init__(self, cmd: MkDocsCommand) -> None:
        """Get this party started."""
        if type(self)._initialized:
            return
        self._production: bool = _is_production(cmd)
        self._expected_licenses: tuple[str | None] = []
        type(self)._initialized = True

    @property
    def expected_licenses(self) -> tuple[str]:
        """
        Returns the list of expected licenses based on the directory structure.
        """
        if not self._expected_licenses:
            license_paths = Path("docs/licenses/").glob("**/index.md")
            self._expected_licenses = tuple(
                path.parent.name
                for path in license_paths
                if path.parent.name
                not in {  # category and main info pages to exclude
                    "copyleft",
                    "licenses",
                    "permissive",
                    "proprietary",
                    "public-domain",
                    "source-available",
                }
            )
        return self._expected_licenses

    @property
    def production(self) -> bool:
        """
        Returns the production flag
        """
        return self._production

    @property
    def production_status(self) -> bool:
        """
        Returns the production status
        """
        if not type(self)._instance:
            raise ValueError("Status not initialized")
        return type(self)._instance.production

    @property
    def status(self) -> bool:
        """
        Returns the instance
        """
        return type(self)._instance
