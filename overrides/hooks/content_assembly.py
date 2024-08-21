import json
import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from re import Pattern
from typing import Any

from jinja2 import Environment, FileSystemLoader, Template
from mkdocs.config.defaults import MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import File
from mkdocs.structure.pages import Page

# add sticky sidebar

TAG_MAP = {
    "distribution": "can-share",
    "commercial-use": "commercial-OK",
    "modifications": "can-change",
    "disclose-source": "share-source",
    "revokable": "can-revoke",
    "document-changes": "describe-changes",
    "include-copyright": "give-credit",
    "same-license": "share-alike (strict)",
    "same-license--file": "share-alike (relaxed)",
    "same-license--library": "share-alike (relaxed)",
}

annotation_pattern: Pattern[str] = re.compile(
    r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\n\s]{1,4}[123]\.\s{1,2}(?P<annotation>.+?)\n",
    re.MULTILINE | re.DOTALL,
)
header_pattern: Pattern[str] = re.compile(
    r'<h2 class="license-first-header">(.*?)</h2>'
)

placeholders = re.compile(r"\{\{\s(.*?)\s\}\}")

logger = None

tags_plugin = None


def start_logging(level: int = logging.INFO) -> logging.Logger:
    global logger
    if logger is not None:
        return logger

    logger = logging.getLogger(__name__)
    logger.setLevel(level)

    if logger.hasHandlers():
        logger.handlers.clear()

    handlers = [
        logging.FileHandler(".workbench/content_assembly.log"),
        logging.StreamHandler(stream=sys.stdout),
    ]

    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    for handler in handlers:
        handler.setLevel(level)
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


def clean_content(content: dict[str, Any]) -> dict[str, Any]:
    for key, value in content.items():
        if isinstance(value, str):
            content[key] = value.strip()
        elif isinstance(value, list) and all(isinstance(item, str) for item in value):
            content[key] = [item.strip() for item in value]
    return content

@event_priority(100)
def on_page_markdown(
    markdown_content: str, page: Page, config: MkDocsConfig, files: list[File]
) -> str:
    if not logger:
        globals()["logger"] = start_logging()
    logger.debug("on_page_markdown called")
    if not page.meta.get("category"):
        logger.debug(f"No category found in page meta for page {page.title}")
        return markdown_content

    meta = page.meta
    boilerplate = config["extra"]["boilerplate"].copy()
    meta.update(LicenseContent(page).attributes)
    boilerplate["year"] = datetime.now(timezone.utc).year

    rendered_boilerplate = {
        key: Template(value).render(meta) if isinstance(value, str) else value
        for key, value in boilerplate.items()
    }

    meta.update(rendered_boilerplate)
    page.meta = clean_content(meta)
    context = page.meta

    env = Environment(loader=FileSystemLoader("overrides"))
    main_template = env.get_template("license_main.md")
    rendered_content = main_template.render(context)
    return (
        f"{markdown_content}\n{rendered_content}"
        if markdown_content
        else rendered_content
    )

def on_post_page(output, page, config):
    if re.match(
        r"licenses/(permissive|copyleft|public-domain/source-available|proprietary)/(.+?)/index.html",
        page.url,
    ):
        logger.info(f"Final processing page {page.url}")
    if match := re.search(r"\{\{\s?year\s?\}\}", output):
        logging.info("Replacing year placeholder")
        output = output.replace(match[0], str(datetime.now().year))
    return output


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


class LicenseContent:
    def __init__(self, page: Page) -> None:
        self.page = page
        self.meta = page.meta
        #self.tags = self.meta.get("tags") or self.get_tags(self.meta)
        self.year = str(datetime.now().year)
        self.license_type = (
            "dedication" if "public" in self.meta["category"] else "license"
        )
        self.reader: str = self.meta["reader_license_text"]
        self.markdown_license_text = self.process_mkdocs_to_markdown()
        self.plaintext_license_text = self.process_markdown_to_plaintext()
        self.plain_version = self.get_plain_version()

    @staticmethod
    def get_tags(meta: dict[str, Any]) -> list[str] | None:
        if not meta.get("tags") or meta.get("tags", [])[0] == "placeholder":
            other_tags = []
            if conditions := meta.get("conditions"):
                other_tags.extend(conditions)
            if permissions := meta.get("permissions"):
                other_tags.extend(permissions)
            if limitations := meta.get("limitations"):
                other_tags.extend(limitations)
            return [TAG_MAP[tag] for tag in other_tags if tag in TAG_MAP]

    def process_markdown_to_plaintext(self) -> str:
        text = self.markdown_license_text
        text = self.process_definitions(text, plaintext=True)
        text = re.sub(
            r"#+ |(\*\*|\*|`)(.*?)\1", r"\2", text
        )  # Remove headers, bold, italic, inline code
        text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)  # Handle links
        text = re.sub(r"!\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)
        text = re.sub(r"(`{3}plaintext)", "===", text)  # Remove plaintext code blocks
        text = re.sub(r"(`{3}\s*)", "===", text)  # Remove code blocks# Handle images
        return text

    @staticmethod
    def process_definitions(text: str, plaintext: bool = False) -> str:
        definition_pattern = re.compile(
            r"(?P<term>`[\w\s]+`)\s*?\n{1,2}[:]\s{1,4}(?P<def>[\w\s]+)\n{2}",
            re.MULTILINE,
        )
        if matches := definition_pattern.finditer(text):
            logger.debug(
                f"Processing definitions: {[match.group(0) for match in matches]}"
            )
            for match in matches:
                term = match.group("term")
                def_text = match.group("def")
                replacement = (
                    f"{term.replace('`', '')}\n- {def_text}\n\n"
                    if plaintext
                    else f"{term}\n: {def_text}\n\n"
                )
                text = text.replace(match.group(0), replacement)
        if matches := re.findall(r"\{\s?\.\w+\s?\}", text):
            for match in matches:
                text = text.replace(match, "")
        return text

    def get_plain_version(self) -> str:
        path = Path(self.page.url)
        path = path.parent / "package.json"
        if not path.exists():
            return "0.0.0"
        if path.exists():
            package = load_json(path)
            version = package.get("version")
            if not version:
                return "0.0.0"
            if "development" in version:
                return "0.0.0"

        return "0.0.0"

    def transform_text_to_footnotes(self, text: str) -> str:
        """
        Transforms text by replacing annotations with footnotes and adding footnote references at the end.
        Args:
            text: The text to transform by replacing annotations with footnotes.
        Returns:
            The transformed text with annotations replaced by footnotes and footnote references added at the end.
        """

        footnotes = []

        def replacement(match) -> str:
            footnote_num = len(footnotes) + 1
            footnotes.append(match.group("annotation").strip())
            return f"[^{footnote_num}]"

        transformed_text = annotation_pattern.sub(replacement, text)
        if footnotes:
            transformed_text += "\n\n"
            for i, footnote in enumerate(footnotes, 1):
                transformed_text += f"[^{i}]: {footnote}\n"
        return transformed_text

    def process_mkdocs_to_markdown(self) -> str:
        text = self.transform_text_to_footnotes(self.reader)
        logger.debug(f"Transformed text: {text}")
        text = header_pattern.sub(r"## \1", text)
        return self.process_definitions(text)

    @property
    def attributes(self) -> dict[str, Any | int | str]:
        return {
            #"tags": self.tags,
            "year": self.year,
            "markdown_license_text": self.markdown_license_text,
            "plaintext_license_text": self.plaintext_license_text,
            "plain_version": self.plain_version,
            "license_type": self.license_type,
        }
