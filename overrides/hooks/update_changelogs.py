"""Updates the changelog for each license page and checks for tags in the frontmatter."""
import json
import logging
import re
from pathlib import Path
from typing import Any, Sequence

import ez_yaml as yaml
from _logconfig import get_logger
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.structure.files import File, Files

if not hasattr(__name__, "CHANGELOG_LOGGER"):
    CHANGELOG_LOGGER = get_logger(__name__, logging.WARNING)

include = re.compile(
    r"^licenses/(copyleft|proprietary|public-domain|permissive|source-available)/.+?/index\..*$"
)

TAG_MAP = {
    "distribution": "can-share",  # allowances
    "commercial-use": "can-sell",
    "modifications": "can-change",
    "revokable": "can-revoke",
    "relicense": "relicense",
    "disclose-source": "share-source",  # requirements
    "document-changes": "describe-changes",
    "include-copyright": "give-credit",
    "same-license": "share-alike (strict)",
    "same-license--file": "share-alike (relaxed)",
    "same-license--library": "share-alike (relaxed)",
}

def get_tags(frontmatter: dict[str, Any]) -> list[str] | None:
    """
    Retrieves a list of tags from the provided frontmatter data dictionary.

    Args:
        frontmatter (dict[str, Any]): A dictionary containing frontmatter data that may include tags, conditions,
        permissions, and limitations.

    Returns:
        list[str] | None: A list of mapped tags if found, or None if no valid tags are present.

    Examples:
        tags = get_tags(frontmatter)
    """
    other_tags = []
    if conditions := frontmatter.get("conditions"):
        other_tags.extend(conditions)
    if permissions := frontmatter.get("permissions"):
        other_tags.extend(permissions)
    if limitations := frontmatter.get("limitations"):
        other_tags.extend(limitations)
    return [TAG_MAP[tag] for tag in other_tags if tag in TAG_MAP]


def check_for_tags(frontmatter: dict[str, Any]) -> None:
    """
    Checks for tags in the provided frontmatter data dictionary and updates them if necessary.
    """
    tags = frontmatter.get("tags")
    if tags and tags[0] != "placeholder":
        if tags := get_tags(frontmatter):
            frontmatter["tags"] = tags
    return frontmatter


def read_frontmatter(file: File) -> tuple[None, None] | tuple[dict[str, Any], str]:
    """Read the frontmatter from a file."""
    parts = file.content_string.split("---", 2)
    return (None, None) if len(parts) < 3 else yaml.to_object(parts[1]), parts[2]


def on_files(files: Files, config: MkDocsConfig) -> Files:
    """
    Update the changelog for each license page.
    Also, check for tags in the frontmatter and update them if necessary.
    """
    CHANGELOG_LOGGER.info("Updating changelogs and tags for license pages.")
    file_sequence: Sequence[File] = files.documentation_pages()
    for file in file_sequence:
        uri = file.src_uri
        changelog_content = ""
        if include.match(uri):
            CHANGELOG_LOGGER.info("Updating changelog for %s", uri)
            path = Path(uri)
            license_dir = path.parent
            if Path(license_dir / "package.json").exists():
                changelog_path = license_dir / "CHANGELOG.md"
                if changelog_path.exists():
                    changelog_content = changelog_path.read_text()
                    logging.info("Found changelog for %s, writing changelog content", uri)
                    json.dumps(changelog_content)
                else:
                    changelog_content = "No changelog."
            if parsed := read_frontmatter(file):
                frontmatter, body = parsed
                frontmatter = check_for_tags(frontmatter)
                CHANGELOG_LOGGER.info("Set tags for %s", uri)
                CHANGELOG_LOGGER.debug("Tags: %s", frontmatter.get("tags"))
                frontmatter["changelog"] = changelog_content
                updated: str = "---\n" + yaml.to_string(frontmatter) + "---" + body
                if updated != file.content_string:
                    abs_path = file.abs_src_path
                    file.content_string = updated
                    file.content_bytes = updated.encode("utf-8")
                    file.abs_src_path = abs_path
                    CHANGELOG_LOGGER.debug("Updated frontmatter for %s", uri)
    CHANGELOG_LOGGER.info("Finished updating changelogs and tags for license pages.")
    return files
