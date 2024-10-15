"""
Saves all aspects of a license in the build process. Currently only allows to write the data to a file. Eventually, we'll use this to run tests on the licenses to prevent broken builds.
"""
import datetime
import logging
import os

from pathlib import Path
from pprint import pformat
from typing import Any, Literal, MutableMapping, TypedDict

from regex import B

from _logconfig import get_logger
from jinja2.environment import Environment
from mkdocs.plugins import event_priority
from mkdocs.structure.pages import Page
from mkdocs.structure.files import Files
from mkdocs.structure.nav import Navigation
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.utils.templates import TemplateContext

if not hasattr(__name__, "BUILD_TEST_LOGGER"):
    BUILD_TEST_LOGGER = get_logger(
        __name__,
        logging.DEBUG,
    )

COMMAND: Literal["build", "serve", "gh-deploy"]
IS_PRODUCTION: bool
LICENSES: dict[str, "ProcessedLicense"]
WRITE_LICENSE_DATA = True
TODAY = datetime.datetime.now().strftime("%Y-%m-%d")
WRITE_PATH = Path(f".workbench/licenses/{TODAY}")

class ProcessedLicense(TypedDict):
    """A dictionary representing a processed license. We use this to keep track of the licenses we've processed, and then to evaluate whether everything was processed smoothly."""
    name: str
    file_path: Path
    plain_version: str | None
    frontmatter: MutableMapping[str, Any] | None
    markdown: str | None
    config: MkDocsConfig | None
    context: TemplateContext | None
    environment: Environment | None
    html: str | None
    output: str | None
    all_completed: bool

def get_licenses() -> dict[str, ProcessedLicense]:
    """Get the licenses that have been processed."""
    raw_paths = Path("docs/licenses/").glob("**/index.md")
    license_paths = [
        path
        for path in raw_paths
        if path.parent.name
        not in ["permissive", "copyleft", "public-domain", "source-available", "licenses", "proprietary"]
    ]  # We want to go a level deeper and .glob is always recursive
    return {
        path.parent.name: ProcessedLicense(
            name=path.parent.name,
            file_path=path,
            plain_version=None,
            frontmatter={},
            markdown=None,
            config={},
            context=None,
            environment=None,
            html=None,
            output=None,
            all_completed=False,
        )
        for path in license_paths
    }


@event_priority(100)
def on_startup(command: Literal['build', 'gh-deploy', 'serve'], dirty: bool) -> None:
    """This literally just exists to start the logger as soon as possible and create the globals."""
    BUILD_TEST_LOGGER.debug(f"Starting {command} command.")
    globals()["COMMAND"] = command
    globals()["IS_PRODUCTION"] = command == "build" or command == "gh-deploy" or os.getenv("GITHUB_ACTIONS") == "true"
    globals()["LICENSES"] = get_licenses()
    BUILD_TEST_LOGGER.debug(f"Production: {IS_PRODUCTION}")
    BUILD_TEST_LOGGER.debug(f"Licenses: {LICENSES.keys()}")

@event_priority(-100)
def on_page_markdown(
    markdown: str, page: Page, config: MkDocsConfig, files: dict[str, str]
) -> str:
    """
    Uses the final markdown to populate. This should be after all processing is over.

    Args:
        markdown (str): The final markdown content.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration object for the site.
        files (dict[str, str]): The files that are being processed.

    Returns:
        str: The final markdown content.
    """
    name = page.meta.get("spdx_id")
    BUILD_TEST_LOGGER.debug(f"Processing {name}")
    if not name:
        return markdown
    if name not in LICENSES:
        BUILD_TEST_LOGGER.error(
            f"License {name} not found in licenses dictionary. This is a bug."
        )
        return markdown
    LICENSES[name]["markdown"] = markdown
    return markdown

@event_priority(-100)
def on_env(env: Environment, config: MkDocsConfig, files: Files) -> Environment:
    """
    Uses the final Jinja2 environment to populate. This should be after all processing is over.

    Args:
        env (Environment): The Jinja2 environment.
        config (MkDocsConfig): The configuration object for the site.
        files (Files): The files that are being processed.

    Returns:
        Environment: The Jinja2 environment.
    """
    BUILD_TEST_LOGGER.debug("Processing Jinja2 environment.")
    for license in LICENSES:
        LICENSES[license]["environment"] = env
    return env

@event_priority(-100)
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
    name = page.meta.get("spdx_id")
    if not name:
        return html
    if name not in LICENSES:
        BUILD_TEST_LOGGER.error(
            f"License {name} not found in licenses dictionary. This is a bug."
        )
        return html
    LICENSES[name]["html"] = html
    return html

@event_priority(-100)
def on_page_context(context: TemplateContext, page: Page, config: MkDocsConfig, nav: Navigation) -> TemplateContext:
    """
    Uses the final page context to populate. This should be after all processing is over.

    Args:
        context (TemplateContext): The current template context.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration object for the site.
        nav (Navigation): The navigation structure of the site.

    Returns:
        TemplateContext: The template context.
    """
    try:
        name = page.meta["spdx_id"]
    except KeyError:
        if missing := [name for name in LICENSES if name in page.url]:
            BUILD_TEST_LOGGER.error(f"License {missing[0]} not found in licenses dictionary. This is a bug.")
        return context
    if name not in LICENSES:
        BUILD_TEST_LOGGER.error(f"License {name} not found in licenses dictionary. This is a bug.")
        return context
    BUILD_TEST_LOGGER.debug(f"Processing {name} context.")
    LICENSES[name]["context"] = context
    LICENSES[name]["config"] = config
    LICENSES[name]["frontmatter"] = page.meta
    LICENSES[name]["plain_version"] = page.meta.get("plain_version")
    return context

@event_priority(-100)
def on_post_page(
    output_content: str, page: Page, config: MkDocsConfig
) -> str:
    """
    Uses the final page output to populate. This should be after all processing is over.

    Args:
        output_content (str): The final output content.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration object for the site.
        files (Files): The files that are being processed.

    Returns:
        str: The final output content.
    """
    name = page.meta.get("spdx_id")
    if not name:
        return output_content
    if name not in LICENSES:
        BUILD_TEST_LOGGER.error(
            f"License {name} not found in licenses dictionary. This is a bug."
        )
        return output_content
    BUILD_TEST_LOGGER.debug(f"Processing {name} output.")
    LICENSES[name]["output"] = output_content
    return output_content

def write_license_data() -> None:
    """Write the license data to a file."""
    BUILD_TEST_LOGGER.debug("Writing license data.")
    for license in LICENSES:
        destination = WRITE_PATH / f"{license['name']}.txt"
        if not destination.parent.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            destination.unlink()
        destination.write_text(pformat(LICENSES[license]))


@event_priority(-100)
def on_post_template(
    output_content: str, template_name: str, config: MkDocsConfig
) -> str:
    """
    Uses the final template output to populate. This should be after all processing is over.

    Args:
        output_content (str): The final output content.
        template_name (str): The name of the template.
        config (MkDocsConfig): The configuration object for the site.

    Returns:
        str: The final output content.
    """
    if template_name != "license.html":
        return output_content
    keys_to_check = {k for k in LICENSES.values() if k != "all_completed"}
    for license in LICENSES:
        if not all((LICENSES[license][key] for key in keys_to_check)):
            BUILD_TEST_LOGGER.error(f"License {license} was not fully processed.")
            LICENSES[license]["all_completed"] = False
        else:
            LICENSES[license]["all_completed"] = True
    if not all((LICENSES[license]["all_completed"] for license in LICENSES)):
        BUILD_TEST_LOGGER.error("Not all licenses were fully processed.")
    if WRITE_LICENSE_DATA:
        write_license_data()
    return output_content
