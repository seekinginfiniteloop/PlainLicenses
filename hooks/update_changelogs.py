import logging
import re
from pathlib import Path

import yaml
from _logconfig import get_logger
from mkdocs.config.base import Config
from mkdocs.structure.files import Files

logger = get_logger(
    __name__,
    logging_level=logging.DEBUG,
    stream_logging_level=logging.INFO,
    file_logging_level=logging.DEBUG,
)

include = re.compile(
    r"^licenses/(copyleft|proprietary|public-domain|permissive|source-available)/.+?/index\..*$"
)


def on_files(files: Files, config: Config) -> Files:
    file_sequence = files.documentation_pages()
    for file in file_sequence:
        uri = file.src_uri
        if include.match(uri):
            logger.info("Updating changelog for %s", uri)
            path = Path(uri)
            license_dir = path.parent
            if Path(license_dir / "package.json").exists():
                changelog_path = license_dir / "CHANGELOG.md"
                if changelog_path.exists():
                    changelog_content = changelog_path.read_text()
                else:
                    changelog_content = "No changelog."
                parts = file.read_content.split("---", 2)
                if len(parts) < 3:
                    continue
                logger.debug("Frontmatter: %s", parts[1])
                frontmatter = yaml.safe_load(parts[1])
                body = parts[2]
                frontmatter["changelog"] = changelog_content
                file.src_path = "---\n" + yaml.dump(frontmatter) + "---" + body
    return files
