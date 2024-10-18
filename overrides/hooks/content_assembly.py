# sourcery skip: avoid-global-variables, do-not-use-staticmethod
"""
Assembles license content for all license pages.

TODO: We can probably make more use of pyMarkdown to handle the processing of the license text; need to investigate further. We can also make much better use of mkdocs-macros to handle the processing of the license text.
"""
import difflib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from pprint import pprint
from re import Match, Pattern
from typing import Any
import sys


from jinja2 import Environment, FileSystemLoader, Template, TemplateError
from mkdocs.config.base import Config as MkDocsConfig
from mkdocs.plugins import event_priority
from mkdocs.structure.files import File
from mkdocs.structure.pages import Page

from hook_logger import get_logger
from license_canary import LicenseBuildCanary

# Change hook-level logging here
_assembly_log_level = logging.DEBUG

annotation_pattern: Pattern[str] = re.compile(
    r"(?P<citation>\([123]\)).*?(?P<class>\{\s\.annotate\s\})[\n\s]{1,4}[123]\.\s{1,2}(?P<annotation>.+?)\n",
    re.MULTILINE | re.DOTALL,
)
header_pattern: Pattern[str] = re.compile(
    r'<h2 class="license-first-header">(.*?)</h2>'
)

placeholders = re.compile(r"\{\{\s{0,2}(.*?)\s{0,2}\}\}")


if not hasattr(__name__, "assembly_logger"):
    assembly_logger = get_logger(
        "ASSEMBLER",
        _assembly_log_level,
    )

def clean_content(content: dict[str, Any]) -> dict[str, Any] | None:
    """
    Strips whitespace from string values in a dictionary, and from strings in lists.

    Args:
        content (dict[str, Any]): A dictionary containing content that may include strings and lists of strings.

    Returns:
        dict[str, Any]: The cleaned dictionary with whitespace removed from string values.

    Examples:
        cleaned_content = clean_content({"title": "  Example Title  ", "tags": ["  tag1  ", "tag2 "]})
    """
    for key, value in content.items():
        return (
            {key.strip(): value.strip()}
            if isinstance(value, str)
            else {key: [str(item).strip() for item in value]}
            if isinstance(value, list) and all(isinstance(item, str) for item in value)
            else {key: value}
        )


@event_priority(-90)
def on_page_markdown(
    markdown_content: str, page: Page, config: MkDocsConfig, files: list[File]
) -> str:
    """
    Pipeline function for processing license content and assembling the final Markdown content for the license page.

    Args:
        markdown_content (str): The original Markdown content of the page.
        page (Page): The page object containing metadata and content.
        config (MkDocsConfig): The configuration settings for MkDocs.
        files (list[File]): A list of files associated with the documentation.

    Returns:
        str: The combined Markdown content including the original content and the rendered license information.

    Raises:
        Exception: If there is an error during template rendering or logging.
    """
    canary = LicenseBuildCanary.canary()
    assembly_logger.info("Processing page %s in on_page_markdown", page.title)
    is_license_page = canary.is_license_page(page)
    if not is_license_page:
        return markdown_content
    all_data = dict(page.meta)
    d = difflib.Differ()
    boilerplate: dict[str, str] = config.extra["boilerplate"]
    boilerplate["year"] = boilerplate.get("year", datetime.now(timezone.utc).strftime("%Y"))
    license = LicenseContent(page)
    canary.add_value("processed_licenses", license)
    all_data |= license.attributes

    try:
        assembly_logger.debug("Rendering boilerplate for %s", page.title)
        before = json.dumps(boilerplate).splitlines()
        rendered_boilerplate = {
            key: Template(str(value)).render(all_data) if isinstance(value, str) else value
            for key, value in boilerplate.items()
        }
        after = json.dumps(rendered_boilerplate).splitlines()
        pprint(list(d.compare(before, after)))
        all_data |= rendered_boilerplate
        all_data = clean_content(all_data)
        env = Environment(loader=FileSystemLoader("overrides"))
        main_template = env.get_template("license_main.md", globals=all_data)
        rendered_content = main_template.render()
        page.markdown = f"{markdown_content}\n{rendered_content}"
        meta_before = json.dumps(page.meta).splitlines()
        page.meta |= all_data
        meta_after = json.dumps(page.meta).splitlines()
        pprint(list(d.compare(meta_before, meta_after)))
        return f"{markdown_content}\n{rendered_content}"

    except TemplateError as t:
        error_message = f"Error rendering template: {t}"
        assembly_logger.error(error_message)
        canary.add_value("errors", error_message)
        return markdown_content

def on_page_content(html: dict[str, Any], page: Page, config: MkDocsConfig, files: list[dict[str, Any]]) -> dict[str, Any]:
    """Adds the license content to the page context."""
    canary = LicenseBuildCanary.canary()
    if canary.is_license_page(page):
        pass
        #assembly_logger.debug("Page content before final render, page: %s", page.markdown)
        #assembly_logger.debug("Unrendered content, page: %s", html)
    return html

def on_post_page(output: str, page: Page, config: MkDocsConfig) -> Any:
    """Replaces year placeholders in the license pages with the current year.
    This was simpler than running a render on the page again, and it's a small change."""
    if LicenseBuildCanary().canary().is_license_page(page):
        if match := re.search(r"\{\{\s?year\s?\}\}", output):
            logging.info("Replacing year placeholder")
            output = output.replace(match[0], datetime.now().strftime("%Y"))
    return output


def load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON"""
    return json.loads(path.read_text())

def write_json(path: Path, data: dict[str, Any]) -> None:
    """Writes a JSON"""
    if path.exists():
        path.unlink()
    path.write_text(json.dumps(data, indent=2))


class LicenseContent:
    """
    Represents a license's content and metadata, including the license text and associated attributes. All license text processing happens here.
    """

    def __init__(self, page: Page) -> None:
        """
        Initializes a new instance of the class with the provided page object.
        This constructor sets up various attributes related to the page's metadata, including tags,
        license type, and processed license texts, ensuring that the object is ready for further operations.

        Args:
            page (Page): The page object containing metadata and content related to the license.

        Examples:
            license_instance = LicenseClass(page)
        """
        try:
            self.page = page
            self.meta = page.meta
            self.year = str(datetime.now().year)
            assembly_logger.debug("Processing license content, license meta: %s", self.meta)
            self.license_type = (
                "dedication" if "public" in self.meta["category"] else "license"
            )
            self.reader: str = self.meta["reader_license_text"]
            self.markdown_license_text = self.process_mkdocs_to_markdown()
            self.plaintext_license_text = self.process_markdown_to_plaintext()
            self.changelog = self.meta.get("changelog")
            self.plain_version = self.get_plain_version()
            self.tags = self.get_tags()
            assembly_logger.debug("Created License Content object for %s", self.meta["plain_name"])


        except (KeyError, AttributeError) as k:
            assembly_logger.error("Error processing license content: %s", k)
            LicenseBuildCanary.canary().add_value("errors", "Error processing license content: " + str(k))
            return

    def process_markdown_to_plaintext(self) -> str:
        """
        Strips Markdown formatting from the license text to produce a plaintext version.

        Returns:
            str: The processed plaintext version of the Markdown license text.

        Examples:
            plain_text = process_markdown_to_plaintext()
        """
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
        """
        Identifies and processes definitions in the input text, formatting them appropriately.

        Args:
            text (str): The input text containing definitions to be processed.
            plaintext (bool, optional): A flag indicating whether to return definitions in plaintext format.
                Defaults to False.

        Returns:
            str: The processed text with definitions formatted appropriately.
        """

        definition_pattern = re.compile(
            r"(?P<term>`[\w\s]+`)\s*?\n{1,2}[:]\s{1,4}(?P<def>[\w\s]+)\n{2}",
            re.MULTILINE,
        )
        if matches := definition_pattern.finditer(text):
            assembly_logger.debug(
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
        """
        Retrieves the plain version of the package from a JSON file.
        This function checks for the existence of a `package.json` file in the same directory as the page URL,
        and extracts the version information, returning a default value if the file does not exist or if the version is not valid.

        Returns:
            str: The version string from the package, or "0.0.0" if the file is missing or the version is not valid.
        """
        path = Path(self.page.url)
        path = path.parent / "package.json"
        if not path.exists():
            return "0.0.0"
        if path.exists():
            package = load_json(path)
            version = package.get("version")
            if not version:
                return "0.0.0"
            if "development" in version and LicenseBuildCanary.canary().production:
                package["version"] = "0.1.0"
                write_json(path, package)
                return "0.1.0"

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

        def replacement(match: Match[str]) -> str:
            """
            Generates a footnote reference and stores the corresponding annotation.
            We replace the annotation with a footnote reference and store the annotation in a list for later use.

            Args:
                match (re.Match): The match object containing the annotation to be processed.

            Returns:
                str: A formatted string representing the footnote reference.
            """
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
        """
        Processes MkDocs content and transforms it into standard Markdown (i.e. not markdown with extensions). This function converts the text to footnotes, applies a header transformation, and processes any definitions present in the text to produce a final Markdown string.

        Note: Footnotes aren't *strictly* standard markdown, but they still look fine if you're not using a markdown processor that supports them. GitHub is the primary use case here, and it renders footnotes.

        Returns:
            str: The processed Markdown text after transformations and definitions have been applied.
        """
        assembly_logger.debug("Processing mkdocs-style markdown to regular markdown for %s", self.meta["plain_name"])
        assembly_logger.debug("Reader content: ", self.reader)
        text = self.reader
        text = self.transform_text_to_footnotes(text)
        assembly_logger.debug("Transformed text: %s", text)
        text = header_pattern.sub(r"## \1", text)
        return self.process_definitions(text)

    def get_tags(self) -> list[str] | None:
        """
        Retrieves a list of tags from the provided frontmatter data dictionary.

        Args:
            frontmatter (dict[str, Any]): A dictionary containing frontmatter data that may include tags, conditions, permissions, and limitations.

        Returns:
            list[str] | None: A list of mapped tags if found, or None if no valid tags are present.

        Examples:
            tags = get_tags(frontmatter)
        """
        other_tags = []
        if conditions := self.meta.get("conditions"):
            other_tags.extend(conditions)
        if permissions := self.meta.get("permissions"):
            other_tags.extend(permissions)
        if limitations := self.meta.get("limitations"):
            other_tags.extend(limitations)
        return [self.tag_map[tag] for tag in other_tags if tag in self.tag_map]

    @property
    def attributes(self) -> dict[str, Any | int | str]:
        """
        Retrieves a dictionary of attributes related to the license.
        This property consolidates various license-related information into a single dictionary,
        making it easier to access and manage the relevant data.

        Returns:
            dict[str, Any | int | str]: A dictionary containing attributes such as year,
            markdown and plaintext license texts, plain version, and license type.
        """

        return {
            "year": self.year,
            "markdown_license_text": self.markdown_license_text,
            "plaintext_license_text": self.plaintext_license_text,
            "plain_version": self.plain_version,
            "license_type": self.license_type,
            "tags": self.tags,
        }

    @property
    def tag_map(self) -> dict[str, str]:
        """Returns the tag map for the license for setting tags."""
        return {
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
