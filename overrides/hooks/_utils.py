"""
Utility functions for hooks.
"""
import os
from pathlib import Path
from re import M
from typing import Literal, ClassVar, Literal, Self

from mkdocs.structure.pages import Page

type MkDocsCommand = Literal['gh-deploy', 'serve', 'build']

def strip_markdown(text: str) -> str:
    """
    Strips markdown from string.

    Args:
        text (str): The text to strip markdown from.

    Returns:
        str: The text with markdown stripped.
    """
    return text.replace("**", "").replace("*", "").replace("`", "").replace("#", "")

def find_repo_root() -> Path:
    """
    Find the repository's root directory by looking for the .git directory.

    Returns:
        Path: The path to the repository's root directory.

    Raises:
        FileNotFoundError: If the repository root directory cannot be found.
    """
    current_path = Path.cwd()
    while not (current_path / ".git").exists():
        if (
            current_path.parent == current_path
            and current_path.stem != "PlainLicense"
        ):
            raise FileNotFoundError("Could not find the repository root directory.")
        elif current_path.stem == "PlainLicense":
            return current_path
        current_path = current_path.parent
    return current_path

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
    _status = Status.status()
    page_name = (
        page.url.split("/")[-2]
        if len(page.url.split("/")) > 2
        else ""
    )
    return bool(page_name and page_name in _status.expected_licenses)

class Status:
    """
    Simple singleton class to store global status information.
    """

    _instance: ClassVar[Self | None] = None
    _initialized: ClassVar[bool] = False

    def __new__(cls: "type[Status]", cmd: MkDocsCommand) -> "Status":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, cmd: MkDocsCommand) -> None:
        """Get this party started."""
        if type(self)._initialized:
            return
        self.command: MkDocsCommand = cmd
        self._production: bool = _is_production(cmd)
        self._expected_licenses: tuple[str, ...] | None = None

        type(self)._initialized = True
    @property
    def expected_licenses(self) -> tuple[str, ...]:
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

    @classmethod
    def status(cls) -> Self | None:
        """
        Returns the instance
        """
        return cls._instance

    def is_expected(self, license_name: str) -> bool:
        """
        Returns True if the license is expected.
        """
        return license_name in self.expected_licenses if self.expected_licenses else False
